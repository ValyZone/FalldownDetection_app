import dotenv from 'dotenv'

dotenv.config()

export const config = {
    port: process.env.PORT || 3030,
    host: process.env.HOST || '0.0.0.0',
    discordToken: process.env.DISCORD_TOKEN,
    discordChannelId: process.env.DISCORD_CHANNEL_ID || '1392588317056565351',
    fallDetectionResultsDir: process.env.RESULTS_DIR || './FallDetectionResults',
    nodeEnv: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV !== 'production',
    isProduction: process.env.NODE_ENV === 'production'
}
