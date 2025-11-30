import { Client, IntentsBitField } from 'discord.js'
import { config } from '../config.js'

export function startBot() {
    const discord = new Client({
        intents: [
            IntentsBitField.Flags.Guilds,
            IntentsBitField.Flags.GuildMessages,
        ],
    })

    discord.login(config.discordToken)

    discord.on('ready', (client) => {
        console.log(`🤖 ${client.user.displayName} is online!`)
    })

    return discord
}

export async function sendMessage(discord, message) {
    try {
        const channel = await discord.channels.fetch(config.discordChannelId)
        if (channel) {
            await channel.send(message)
            console.log(`📨 Discord notification sent successfully`)
        } else {
            console.error(`❌ Discord channel not found: ${config.discordChannelId}`)
        }
    } catch (error) {
        console.error('❌ Error sending Discord message:', error.message)
    }
}