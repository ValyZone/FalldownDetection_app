import express from 'express'
import { errorHandler } from './motos/error-handling.js'
import CreateMotosRouter from './motos/router.js'
import CreateUserRouter from './users/router.js'
import CreateDiscordRouter from './discord/router.js'
import CreateFallDetectionRouter from './fall-detection/router.js'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import detectFall from './fall-detection/index.js'
import { Console } from 'node:console'
import fs from 'node:fs/promises'

export function CreateApp(dependencies) {

    const app = express()
    app.use(express.json())
    app.use(express.text({ type: 'text/csv' })) // Add support for text/csv content type
    const __dirname = dirname(fileURLToPath(import.meta.url))
    app.set('views', join(__dirname, '../views'))
    app.set('view engine', 'ejs')

    app.get('/', (req, res, next) => {
        res.render('index')
    })

    app.get('/analyzeData', async (req, res) => {
        const nonMozgasFall = 'D:\\repos\\FalldownDetection_app\\Docs\\NonMozgasFall.csv'
        const seta = 'D:\\repos\\FalldownDetection_app\\Docs\\Seta.csv'
        const futas = 'D:\\repos\\FalldownDetection_app\\Docs\\Futas.csv'
        const fallOnMousePad = 'D:\\repos\\FalldownDetection_app\\Docs\\fallonMousePad.csv'
        const verticalNonMovementFallOnBedWithAdditionalRotationsAfterFall = 'D:\\repos\\FalldownDetection_app\\Docs\\verticalNonMovementFallOnBedWithAdditionalRotationsAfterFall.csv'
        const noFallUpDown = 'D:\\repos\\FalldownDetection_app\\Docs\\noFallUpDown.csv'
        const pls = 'D:\\repos\\FalldownDetection_app\\Docs\\pls.csv'

        try {
            const result = await detectFall(pls);
            res.status(200).json({ result });
        } catch (error) {
            console.error('Hiba akadt az adatok ellenorzese kozben:', error);
            res.status(500).json({ error: error.message });
        }
    })

    // Legacy endpoint for backward compatibility with mobile app
    app.post('/testApi', async (req, res) => {
        console.log("📍 Legacy /testApi called");
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
            const filePath = join(dirname(fileURLToPath(import.meta.url)), '../../FallDetectionResults', filename);
            
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

    app.get('/getMotos', async (req, res) => {
        res.render('getmotos');
    })

    app.get('/getMotos/allMotos', async (req, res) => {
        
        const allMotos = await dependencies.loadMotos()
        res.json(allMotos);
    })

    app.get('/postMoto', (req, res) =>{
        console.log("hi")
        res.render('postMoto')
    })

    app.post('/postMotos/processed', async (req, res) => {
        try{
            const {ownerId, type, brand, model, cc, year, deleted} = req.body
            const newMotorbike = {ownerId, type, brand, model, cc, year, deleted}
            
            const exists = await dependencies.getMotoByModel(model)
            if(exists){
                res.render('postMoto-failed')
            }
            else{
                dependencies.saveMoto(newMotorbike)
                res.render('postMoto-successful')
            }
        } catch(err){
            next(err)
        }
    })

    app.get('/putMoto', (req, res, next) => {
        res.render('putMoto')
    })

    app.put('/putMoto/newMoto', async (req, res, next) => {
        const {ownerId, type, brand, model, cc, year, deleted} = req.body
        const oldMotorbike = await dependencies.getMotoByModel(model)

        const updatedMotorbike = {
            ownerId: ownerId,
            type: type == oldMotorbike.type ? oldMotorbike.type : type,
            brand: brand == oldMotorbike.brand ? oldMotorbike.brand : brand,
            model : model == oldMotorbike.model ? oldMotorbike.model : model,
            cc : cc == oldMotorbike.cc ? oldMotorbike.cc : cc,
            year : year == oldMotorbike.year ? oldMotorbike.year : year,
            deleted : deleted == oldMotorbike.deleted ? oldMotorbike.deleted : deleted
        }

        dependencies.updateMoto(updatedMotorbike);
        res.sendStatus(204)
    })

    app.get('/putMoto/updated', (req, res, next) => {
        res.render('putMoto-updated')
    })

    app.get('/deleteMoto', (req, res, next) => {
        res.render('deleteMoto')
    })

    app.delete('/deleteMoto/deleted', (req, res, next) => {
        const model = req.body
        dependencies.removeMoto(model)
        res.sendStatus(204)
    })

    app.get('/deleteMoto/successful', (req, res, next) => {
        res.render('deleteMoto-successful')
    })

    app.get('/deleteMoto/failed', (req, res, next) => {
        res.render('deleteMoto-failed')
    })

    app.use(myMiddleware)

    async function myMiddleware(req, res, next) {
        console.log(req.method)
        console.log(req.path)
        const start = Date.now()

        res.on('finish', () => {
            console.log(`${req.method.toUpperCase()} ${req.path} took ${Date.now() - start}ms`)
        })
        next()
    }

    app.use("/moto", CreateMotosRouter(dependencies))
    app.use("/user", CreateUserRouter(dependencies))
    app.use("/fall-detection", CreateFallDetectionRouter())
    // app.use("/discord", CreateDiscordRouter(dependencies))

    app.use(errorHandler)

    return app
}