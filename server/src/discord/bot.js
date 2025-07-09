import { Client, IntentsBitField } from 'discord.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export function startBot(){

    const discord = new Client({
        intents: [
            IntentsBitField.Flags.Guilds,
            IntentsBitField.Flags.GuildMessages,
        ],
    });
    
    discord.login(process.env.DISCORD_TOKEN);
    
    discord.on('ready', (c) => {
        console.log(`🤖 ${c.user.displayName} is Online!`);
    });
    
    return discord;
}

export async function sendMessage(discord, message) {
    const channelId = '1392588317056565351';
    try {
        const channel = await discord.channels.fetch(channelId);
        if (channel) {
            await channel.send(message);
            console.log(`📨 Message sent to channel ${channelId}: ${message}`);
        } else {
            console.error(`❌ Channel ${channelId} not found`);
        }
    } catch (error) {
        console.error('❌ Error sending message:', error);
    }
}