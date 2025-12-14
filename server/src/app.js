import express from 'express'
import CreateFallDetectionRouter from './fall-detection/router.js'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import detectFall from './fall-detection/index.js'
import { startBot, sendMessage } from './discord/bot.js'

export function CreateApp() {
    const app = express()
    const __dirname = dirname(fileURLToPath(import.meta.url))

    // Initialize Discord bot for notifications
    const discord = startBot()

    // Middleware
    app.use(express.json())
    app.use(express.text({ type: 'text/csv' }))

    // Request logging middleware
    app.use((req, res, next) => {
        const start = Date.now()
        res.on('finish', () => {
            console.log(`${req.method} ${req.path} - ${res.statusCode} - ${Date.now() - start}ms`)
        })
        next()
    })

    // EJS template setup (for simple landing page)
    app.set('views', join(__dirname, '../views'))
    app.set('view engine', 'ejs')

    // Routes
    app.get('/', (req, res) => {
        res.render('index')
    })

    app.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            service: 'Fall Detection Server',
            timestamp: new Date().toISOString()
        })
    })

    // Test endpoint for analyzing sample data
    app.get('/analyzeData', async (req, res, next) => {
        try {
            const testFilePath = join(__dirname, '../../Docs/pls.csv')
            const result = await detectFall(testFilePath, discord)
            res.status(200).json({ result })
        } catch (error) {
            console.error('Error analyzing test data:', error)
            next(error)
        }
    })

    // Mock data endpoints - serve generated test datasets
    app.get('/mock-data/positive', async (req, res, next) => {
        try {
            const mockFilePath = join(__dirname, '../../FallDetectionResults/script_generated/mock_crash_positive.csv')
            const fileContent = await readFile(mockFilePath, 'utf-8')
            res.setHeader('Content-Type', 'text/csv')
            res.send(fileContent)
        } catch (error) {
            console.error('Error reading mock positive data:', error)
            next(error)
        }
    })

    app.get('/mock-data/false-positive', async (req, res, next) => {
        try {
            const mockFilePath = join(__dirname, '../../FallDetectionResults/script_generated/mock_crash_false_positive.csv')
            const fileContent = await readFile(mockFilePath, 'utf-8')
            res.setHeader('Content-Type', 'text/csv')
            res.send(fileContent)
        } catch (error) {
            console.error('Error reading mock false positive data:', error)
            next(error)
        }
    })

    // User confirmation endpoint
    app.post('/user-fine', async (req, res, next) => {
        console.log('✅ User confirmed they are fine')

        try {
            const message = `✅ **User is Fine** ✅\n\n` +
                          `⏰ ${new Date().toLocaleString('hu-HU')}\n\n` +
                          `👤 The user has confirmed they are okay and doing well.`

            await sendMessage(discord, message)

            res.status(200).json({
                success: true,
                message: "User fine notification sent to Discord"
            })
        } catch (error) {
            console.error('❌ Error sending user fine notification:', error)
            next(error)
        }
    })

    // Fall Detection API
    app.use('/fall-detection', CreateFallDetectionRouter(discord))

    // Error handler (must be last)
    app.use((err, req, res, next) => {
        console.error('Error:', err)
        res.status(err.status || 500).json({
            error: err.message || 'Internal server error',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        })
    })

    return app
}