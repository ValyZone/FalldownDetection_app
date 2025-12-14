import express from 'express'
import fs from 'node:fs/promises'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import detectFall from './index.js'

const CLEANUP_CONFIG = {
    MAX_FILES: 100,
    MAX_TOTAL_SIZE_MB: 50,
    MIN_FREE_SPACE_GB: 5,
    CLEANUP_BATCH_SIZE: 20,
};

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

async function cleanupOldFiles(resultsDir) {
    try {
        console.log('🧹 Starting automatic cleanup...');

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

        const csvFiles = fileStats.filter(f => f.isCsv && f.name.startsWith('acceleration-data-'));
        const totalSizeMB = csvFiles.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024);
        const fileCount = csvFiles.length;

        console.log(`📊 Current status: ${fileCount} CSV files, ${totalSizeMB.toFixed(2)} MB total`);
        csvFiles.sort((a, b) => a.mtime - b.mtime);
        let filesToDelete = [];

        if (fileCount > CLEANUP_CONFIG.MAX_FILES) {
            const excess = fileCount - CLEANUP_CONFIG.MAX_FILES;
            filesToDelete = csvFiles.slice(0, excess);
            console.log(`🗑️ File count (${fileCount}) exceeds limit (${CLEANUP_CONFIG.MAX_FILES}), deleting ${excess} oldest files`);
        }

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

    router.post('/receive-data', async (req, res) => {
        console.log("📱 Fall detection data received")
        console.log("Content-Type:", req.headers['content-type'])
        console.log("Body type:", typeof req.body)

        try {
            let csvContent;

            if (req.headers['content-type'] && req.headers['content-type'].startsWith('text/csv')) {
                csvContent = req.body;
                console.log('📊 Received raw CSV data, length:', csvContent ? csvContent.length : 0);
            } else {
                if (typeof req.body === 'object' && req.body.csvData) {
                    csvContent = req.body.csvData;
                    console.log('📊 Received JSON CSV data, length:', csvContent.length);
                } else {
                    return res.status(400).json({ error: "No CSV data provided in JSON format" });
                }
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `acceleration-data-${timestamp}.csv`;
            const resultsDir = join(dirname(fileURLToPath(import.meta.url)), '../../../FallDetectionResults');
            const filePath = join(resultsDir, filename);
            await cleanupOldFiles(resultsDir);
            await fs.writeFile(filePath, csvContent, 'utf8');
            
            console.log(`✅ CSV file saved: ${filename}`);

            const fallDetectionResult = await detectFall(filePath, discord);

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

    router.post('/analyze', async (req, res) => {
        try {
            const { filePath } = req.body;
            const result = await detectFall(filePath, discord);

            res.status(200).json({
                message: "Analysis complete",
                filePath: filePath,
                fallDetected: result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.get('/files', async (req, res) => {
        try {
            const resultsDir = join(dirname(fileURLToPath(import.meta.url)), '../../../FallDetectionResults');
            const files = await fs.readdir(resultsDir);
            const csvFiles = files.filter(file => file.endsWith('.csv'));
            const jsonFiles = files.filter(file => file.endsWith('.json'));

            res.status(200).json({
                csvFiles,
                jsonFiles,
                totalFiles: files.length
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/cleanup', async (req, res) => {
        console.log('🧹 Manual cleanup triggered');

        try {
            const resultsDir = join(dirname(fileURLToPath(import.meta.url)), '../../../FallDetectionResults');
            await cleanupOldFiles(resultsDir);

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
