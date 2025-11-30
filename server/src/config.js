import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

export const config = {
    // Server Configuration
    port: process.env.PORT || 3030,
    host: process.env.HOST || '0.0.0.0',

    // Discord Configuration
    discordToken: process.env.DISCORD_TOKEN,
    discordChannelId: process.env.DISCORD_CHANNEL_ID || '1392588317056565351',

    // File Storage
    fallDetectionResultsDir: process.env.RESULTS_DIR || './FallDetectionResults',

    // Environment
    nodeEnv: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV !== 'production',
    isProduction: process.env.NODE_ENV === 'production'
}
