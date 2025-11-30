import { CreateApp } from './app.js'
import { config } from './config.js'

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason)
    process.exit(1)
})

const app = CreateApp()

app.listen(config.port, config.host, () => {
    console.log(`🚀 Fall Detection Server running on http://${config.host}:${config.port}`)
    console.log(`📊 Environment: ${config.nodeEnv}`)
})