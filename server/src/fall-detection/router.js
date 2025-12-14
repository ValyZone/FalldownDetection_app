import express from 'express'
import fs from 'node:fs/promises'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import detectFall from './index.js'
import { sendMessage } from '../discord/bot.js'

// Configuration for automatic cleanup
const CLEANUP_CONFIG = {
    MAX_FILES: 100,              // Maximum number of CSV files to keep
    MAX_TOTAL_SIZE_MB: 50,      // Maximum total size in MB
    MIN_FREE_SPACE_GB: 5,       // Minimum free disk space in GB
    CLEANUP_BATCH_SIZE: 20,     // Number of old files to delete at once
};

/**
 * Get disk usage information for a given path
 */
async function getDiskUsage(filePath) {
    try {
        const stats = await fs.statfs(filePath);
        const freeSpaceGB = (stats.bsize * stats.bavail) / (1024 * 1024 * 1024);
        return { freeSpaceGB };
    } catch (error) {
        console.warn('⚠️ Could not get disk usage:', error.message);
        return { freeSpaceGB: null };
    }
}

/**
 * Cleanup old files from the results directory
 * Deletes oldest files first until constraints are met
 */
async function cleanupOldFiles(resultsDir) {
    try {
        console.log('🧹 Starting automatic cleanup...');

        // Get all files with their stats
        const files = await fs.readdir(resultsDir);
        const fileStats = await Promise.all(
            files.map(async (file) => {
                const filePath = join(resultsDir, file);
                const stats = await fs.stat(filePath);
                return {
                    name: file,
                    path: filePath,
                    size: stats.size,
                    mtime: stats.mtime,
                    isCsv: file.endsWith('.csv'),
                };
            })
        );

        // Separate CSV files (data files) from result files (JSON, events CSV, etc.)
        const csvFiles = fileStats.filter(f => f.isCsv && f.name.startsWith('acceleration-data-'));
        const totalSizeMB = csvFiles.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024);
        const fileCount = csvFiles.length;

        console.log(`📊 Current status: ${fileCount} CSV files, ${totalSizeMB.toFixed(2)} MB total`);

        // Sort by modification time (oldest first)
        csvFiles.sort((a, b) => a.mtime - b.mtime);

        let filesToDelete = [];

        // Check if we need to cleanup based on file count
        if (fileCount > CLEANUP_CONFIG.MAX_FILES) {
            const excess = fileCount - CLEANUP_CONFIG.MAX_FILES;
            filesToDelete = csvFiles.slice(0, excess);
            console.log(`🗑️ File count (${fileCount}) exceeds limit (${CLEANUP_CONFIG.MAX_FILES}), deleting ${excess} oldest files`);
        }

        // Check if we need to cleanup based on total size
        if (totalSizeMB > CLEANUP_CONFIG.MAX_TOTAL_SIZE_MB) {
            const targetDeleteSize = (totalSizeMB - CLEANUP_CONFIG.MAX_TOTAL_SIZE_MB) * 1024 * 1024;
            let deletedSize = 0;
            let deleteCount = 0;

            for (const file of csvFiles) {
                if (deletedSize >= targetDeleteSize) break;
                if (!filesToDelete.some(f => f.path === file.path)) {
                    filesToDelete.push(file);
                    deletedSize += file.size;
                    deleteCount++;
                }
            }

            if (deleteCount > 0) {
                console.log(`🗑️ Total size (${totalSizeMB.toFixed(2)} MB) exceeds limit (${CLEANUP_CONFIG.MAX_TOTAL_SIZE_MB} MB), deleting ${deleteCount} files`);
            }
        }

        // Delete the files
        if (filesToDelete.length > 0) {
            for (const file of filesToDelete) {
                await fs.unlink(file.path);
                console.log(`   Deleted: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
            }

            console.log(`✅ Cleanup complete: Deleted ${filesToDelete.length} files, freed ${(filesToDelete.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB`);
        } else {
            console.log('✅ No cleanup needed');
        }

    } catch (error) {
        console.error('❌ Error during cleanup:', error.message);
    }
}

export default function CreateFallDetectionRouter(discord) {
    const router = express.Router()

    // Endpoint to receive CSV data from mobile app and save it
    router.post('/receive-data', async (req, res) => {
        console.log("📱 Fall detection data received")
        console.log("Content-Type:", req.headers['content-type'])
        console.log("Body type:", typeof req.body)

        try {
            let csvContent;

            // Check if the content type is text/csv
            if (req.headers['content-type'] && req.headers['content-type'].startsWith('text/csv')) {
                // Raw CSV data sent directly in body
                csvContent = req.body;
                console.log('📊 Received raw CSV data, length:', csvContent ? csvContent.length : 0);
            } else {
                // JSON format with csvData field
                if (typeof req.body === 'object' && req.body.csvData) {
                    csvContent = req.body.csvData;
                    console.log('📊 Received JSON CSV data, length:', csvContent.length);
                } else {
                    return res.status(400).json({ error: "No CSV data provided in JSON format" });
                }
            }

            if (!csvContent || csvContent.trim() === '') {
                console.log('❌ Empty CSV content received');
                return res.status(400).json({ error: "Empty CSV data provided" });
            }

            // Create filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `acceleration-data-${timestamp}.csv`;
            const resultsDir = join(dirname(fileURLToPath(import.meta.url)), '../../../FallDetectionResults');
            const filePath = join(resultsDir, filename);

            // Run automatic cleanup before saving new file
            await cleanupOldFiles(resultsDir);

            // Write the CSV data to file with better error handling
            try {
                await fs.writeFile(filePath, csvContent, 'utf8');
            } catch (writeError) {
                if (writeError.code === 'ENOSPC') {
                    console.error('💾 Disk space critically low! Running emergency cleanup...');

                    // Try emergency cleanup - delete more files
                    const originalMaxFiles = CLEANUP_CONFIG.MAX_FILES;
                    CLEANUP_CONFIG.MAX_FILES = 50; // Reduce to 50 files
                    await cleanupOldFiles(resultsDir);
                    CLEANUP_CONFIG.MAX_FILES = originalMaxFiles;

                    // Try writing again
                    try {
                        await fs.writeFile(filePath, csvContent, 'utf8');
                        console.log('✅ File saved after emergency cleanup');
                    } catch (retryError) {
                        console.error('❌ Still cannot save file after cleanup. Disk may be full.');
                        return res.status(507).json({
                            error: "Insufficient storage space. Please free up disk space.",
                            code: "ENOSPC",
                            suggestion: "Delete old files or increase disk space"
                        });
                    }
                } else {
                    throw writeError; // Re-throw other errors
                }
            }
            
            console.log(`✅ CSV file saved: ${filename}`);
            console.log(`📁 File path: ${filePath}`);
            
            // Analyze the data for fall detection
            let fallDetectionResult = null;
            try {
                fallDetectionResult = await detectFall(filePath, discord);
                console.log(`🔍 Fall detection analysis complete: ${fallDetectionResult ? 'FALL DETECTED' : 'No fall detected'}`);
            } catch (analysisError) {
                console.error('⚠️ Fall detection analysis failed:', analysisError);
            }
            
            res.status(200).json({ 
                message: "CSV data saved and analyzed successfully", 
                filename: filename,
                timestamp: new Date().toISOString(),
                dataLength: csvContent.length,
                fallDetected: fallDetectionResult
            });
            
        } catch (error) {
            console.error('❌ Error processing fall detection data:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Endpoint to analyze existing CSV file
    router.post('/analyze', async (req, res) => {
        console.log("🔍 Fall detection analysis requested");
        
        try {
            const { filePath } = req.body;
            
            if (!filePath) {
                return res.status(400).json({ error: "File path is required" });
            }
            
            // Check if file exists
            try {
                await fs.access(filePath);
            } catch {
                return res.status(404).json({ error: "File not found" });
            }

            const result = await detectFall(filePath, discord);

            res.status(200).json({
                message: "Analysis complete",
                filePath: filePath,
                fallDetected: result,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('❌ Error analyzing file:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Endpoint to get list of saved data files
    router.get('/files', async (req, res) => {
        try {
            const resultsDir = join(dirname(fileURLToPath(import.meta.url)), '../../../FallDetectionResults');

            try {
                const files = await fs.readdir(resultsDir);
                const csvFiles = files.filter(file => file.endsWith('.csv'));
                const jsonFiles = files.filter(file => file.endsWith('.json'));

                res.status(200).json({
                    message: "Files retrieved successfully",
                    csvFiles: csvFiles,
                    jsonFiles: jsonFiles,
                    totalFiles: files.length
                });
            } catch {
                res.status(200).json({
                    message: "No files found",
                    csvFiles: [],
                    jsonFiles: [],
                    totalFiles: 0
                });
            }

        } catch (error) {
            console.error('❌ Error retrieving files:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Endpoint to manually trigger cleanup
    router.post('/cleanup', async (req, res) => {
        console.log('🧹 Manual cleanup triggered');

        try {
            const resultsDir = join(dirname(fileURLToPath(import.meta.url)), '../../../FallDetectionResults');
            await cleanupOldFiles(resultsDir);

            // Get updated file count
            const files = await fs.readdir(resultsDir);
            const csvFiles = files.filter(file => file.endsWith('.csv') && file.startsWith('acceleration-data-'));

            res.status(200).json({
                message: "Cleanup completed successfully",
                remainingFiles: csvFiles.length,
                config: {
                    maxFiles: CLEANUP_CONFIG.MAX_FILES,
                    maxSizeMB: CLEANUP_CONFIG.MAX_TOTAL_SIZE_MB
                }
            });
        } catch (error) {
            console.error('❌ Error during cleanup:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // Run initial cleanup when router is created
    (async () => {
        try {
            const resultsDir = join(dirname(fileURLToPath(import.meta.url)), '../../../FallDetectionResults');
            console.log('\n🔧 Running initial cleanup check...');
            await cleanupOldFiles(resultsDir);
        } catch (error) {
            console.error('❌ Initial cleanup failed:', error.message);
        }
    })();

    return router;
}
