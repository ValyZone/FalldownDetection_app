import express from 'express'
import { startBot, sendMessage } from './bot.js'

function CreateDiscordRouter(dependencies) {
    const discordClient = startBot()
    const discordRouter = express.Router()

    discordRouter.post('/sendMessage', async (req, res, next) => {
        try {
            const message = res.locals.parsed?.message || req.body.message
            if (!message) {
                return res.status(400).json({ error: 'Message is required' })
            }
            await sendMessage(discordClient, message)
            res.status(201).json({ success: true, message: 'Message sent successfully' })
        } catch (err) {
            next(err)
        }
    })

    discordRouter.post('/alarm', async (req, res, next) => {
        try {
            await sendMessage(discordClient, '🚨 ALERT: Potential fall detected!')
            res.status(201).json({ success: true, message: 'Alert sent successfully' })
        } catch (err) {
            next(err)
        }
    })

    discordRouter.post('/falseAlarm', async (req, res, next) => {
        try {
            await sendMessage(discordClient, '✅ False alarm - User confirmed they are okay')
            res.status(201).json({ success: true, message: 'False alarm notification sent' })
        } catch (err) {
            next(err)
        }
    })

    discordRouter.post('/userFine', async (req, res, next) => {
        try {
            await sendMessage(discordClient, '✅ User is fine - Everything is okay')
            res.status(201).json({ success: true, message: 'User fine notification sent' })
        } catch (err) {
            next(err)
        }
    })

    return { discordRouter, discordClient }
}

export default CreateDiscordRouter