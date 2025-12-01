import fs from 'fs';
import path from 'path';
import { startBot, sendMessage } from '../discord/bot.js';

// Initialize Discord bot
const discord = startBot();

/**
 * Formats a timestamp as [minutes:seconds:milliseconds]
 * @param {Date} date - The date object to format
 * @returns {string} - Formatted timestamp
 */
function formatTimestamp(date) {
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
    return `[${minutes}-${seconds}-${milliseconds}]`;
}

function detectFall(filePath) {
    /**
     * Detects if a fall occurred based on accelerometer data from a CSV file.
     *
     * @param {string} filePath - Path to the input CSV file.
     * @returns {boolean} - True if a fall was detected, False otherwise.
     */

    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        const rows = data.split('\n');

        rows.shift();

        const axisSums = { X: 0, Y: 0, Z: 0 };
        let rowCount = 0;
        const allValues = []; // Store all accelerometer values for CSV export

        for (const row of rows) {
            if (!row.trim()) continue;

            // Handle both comma and tab separated values
            const values = row.includes('\t') ? row.split('\t') : row.split(',');
            const [timestamp, accelX, accelY, accelZ, absoluteAccel] = values.map(value => parseFloat(value.replace(/"/g, '')));

            // Skip if we get NaN values (like from header row)
            if (isNaN(accelX) || isNaN(accelY) || isNaN(accelZ)) continue;

            // Store values for CSV export
            allValues.push({ timestamp, accelX, accelY, accelZ, absoluteAccel });

            axisSums.X += Math.abs(accelX - 9.81);
            axisSums.Y += Math.abs(accelY - 9.81);
            axisSums.Z += Math.abs(accelZ - 9.81);
            rowCount++;
        }

        const dominantAxis = Object.keys(axisSums).reduce((a, b) => (axisSums[a] / rowCount < axisSums[b] / rowCount ? a : b));

        let isFalling = false;
        let hitGround = false;
        const fallEvents = [];

        for (const row of rows) {
            if (!row.trim()) continue;

            // Handle both comma and tab separated values
            const values = row.includes('\t') ? row.split('\t') : row.split(',');
            const [timestamp, accelX, accelY, accelZ, absoluteAccel] = values.map(value => parseFloat(value.replace(/"/g, '')));
            
            // Skip if we get NaN values (like from header row)
            if (isNaN(accelX) || isNaN(accelY) || isNaN(accelZ)) continue;

            const dominantValue = dominantAxis === 'X' ? accelX : dominantAxis === 'Y' ? accelY : accelZ;

            if (Math.abs(dominantValue) < 0.5) {
                isFalling = true;
                fallEvents.push({ event: 'falling', timestamp: parseFloat(timestamp), [dominantAxis]: parseFloat(dominantValue) });
            }

            if (isFalling && dominantValue === 0.0) {
                hitGround = true;
                fallEvents.push({ event: 'impact', timestamp: parseFloat(timestamp), [dominantAxis]: parseFloat(dominantValue) });
            }
        }

        const result = {
            fallDetected: isFalling && hitGround,
            dominantAxis,
            events: fallEvents
        };

        const outputDir = path.join(process.cwd(), 'FallDetectionResults');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        // Generate timestamp for file naming
        const now = new Date();
        const timestamp = formatTimestamp(now);

        // Save JSON result
        const outputFileName = path.join(outputDir, `${now.toISOString().replace(/[:.]/g, '-')}.json`);
        fs.writeFileSync(outputFileName, JSON.stringify(result, null, 2));

        // Export all accelerometer values to CSV
        const valuesCSV = ['Time (s),Acceleration x (m/s^2),Acceleration y (m/s^2),Acceleration z (m/s^2),Absolute acceleration (m/s^2)'];
        allValues.forEach(v => {
            valuesCSV.push(`${v.timestamp},${v.accelX},${v.accelY},${v.accelZ},${v.absoluteAccel}`);
        });
        const valuesFileName = path.join(outputDir, `${timestamp}-values.csv`);
        fs.writeFileSync(valuesFileName, valuesCSV.join('\n'));

        // Export fall events to CSV
        const eventsCSV = ['Event,Time (s),Value,Axis'];
        fallEvents.forEach(event => {
            const axis = event.X !== undefined ? 'X' : event.Y !== undefined ? 'Y' : 'Z';
            const value = event[axis];
            eventsCSV.push(`${event.event},${event.timestamp},${value},${axis}`);
        });
        const eventsFileName = path.join(outputDir, `${timestamp}-event.csv`);
        fs.writeFileSync(eventsFileName, eventsCSV.join('\n'));

        // Send Discord notification if fall is detected
        if (isFalling && hitGround) {
            const message = `🚨 **ESÉS ÉRZÉKELVE!** 🚨\n\n` +
                          `⏰ Idő: ${new Date().toLocaleString()}\n\n` +
                          `📊 Domináns Tengely: ${dominantAxis}\n` +
                          `📁 JSON adatok: ${path.basename(outputFileName)}\n` +
                          `📈 Értékek CSV: ${path.basename(valuesFileName)}\n` +
                          `⚡ Események CSV: ${path.basename(eventsFileName)}\n\n` +
                          `🆘 Emergency services may need to be contacted!` +
                          "\n------------------------------------------------------------";
            
            sendMessage(discord, message).catch(error => {
                console.error('❌ Failed to send Discord notification:', error);
            });
            
            console.log('🚨 Fall detected! Discord notification sent.');
        }

        return isFalling && hitGround;

    } catch (error) {
        console.error(`An error occurred: ${error.message}`);
        return false;
    }
}
export default detectFall;