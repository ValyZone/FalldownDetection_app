import express from 'express';
import {startBot} from './bot.js'

function CreateDiscordRouter(dependencies) {
    const discordClient = startBot(dependencies);

    const discordRouter = express.Router();

    discordRouter.post('/sendMessage', async (req, res, next) => {
        try {
            discordClient.channels.cache.get('1328731691170267136').send(res.locals.parsed.message)
            res.status(201).send("Message sent.");
        } catch (err) {
            next(err);
        }
    });

    discordRouter.get('/alarm', async (req, res) => {
        try {
            discordClient.channels.cache.get('1328731691170267136').send("Alert.")
            res.status(201).send("Message sent.");
        } catch (err) {
            next(err);
        }
    })

    discordRouter.get('/falseAlarm', async (req, res) => {
        try {
            discordClient.channels.cache.get('1328731691170267136').send("False Alert.")
            res.status(201).send("Message sent.");
        } catch (err) {
            next(err);
        }
    })

    return {discordRouter, discordClient} ;
}


export default CreateDiscordRouter