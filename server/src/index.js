import { CreateApp } from "./app.js"
import { connectToMongo } from './mongo/mongo-storage.js'

process.on('unhandledRejection', (reason, promise) => {
    console.log('ALERT ALERT ALERT (Graceful shutdown..): ', reason)
    //...
    process.exit(1)
})

const client = await connectToMongo('mongodb://localhost:27017')
const app = CreateApp(client)

app.listen(3030, '0.0.0.0', () => {
    console.log('App is running 🚀')
})