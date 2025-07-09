import express from 'express'
import fs from 'node:fs/promises'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import detectFall from './index.js'

export default function CreateFallDetectionRouter() {
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
            const filePath = join(dirname(fileURLToPath(import.meta.url)), '../../../FallDetectionResults', filename);
            
            // Write the CSV data to file
            await fs.writeFile(filePath, csvContent, 'utf8');
            
            console.log(`✅ CSV file saved: ${filename}`);
            console.log(`📁 File path: ${filePath}`);
            
            // Analyze the data for fall detection
            let fallDetectionResult = null;
            try {
                fallDetectionResult = await detectFall(filePath);
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
            
            const result = await detectFall(filePath);
            
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

    return router;
}
