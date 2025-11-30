# Fall Detection Server

Simplified Node.js/Express server for the Fall Detection System. Processes accelerometer data from mobile apps, detects falls, and sends emergency notifications via Discord.

## Features

- **Fall detection algorithm** using accelerometer data (X, Y, Z axes)
- **RESTful API** for mobile app integration
- **Discord notifications** for detected falls
- **CSV file storage** of accelerometer data
- **No database required** - all data stored as files

## Prerequisites

- Node.js (ES Modules support)
- Discord bot token (for notifications)

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**

   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Discord configuration:
   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   DISCORD_CHANNEL_ID=your_discord_channel_id_here
   ```

## Running the Server

### Development Mode (with auto-restart)
```bash
npm start
```

### Production Mode
```bash
npm run start:prod
```

The server will start on `http://0.0.0.0:3030`

## API Endpoints

### Fall Detection

#### POST `/fall-detection/receive-data`
Receives accelerometer CSV data from mobile app and analyzes for falls.

**Content-Type:** `text/csv` OR `application/json`

**Request Body (CSV):**
```csv
"Time (s)","Acceleration x (m/s^2)","Acceleration y (m/s^2)","Acceleration z (m/s^2)","Absolute acceleration (m/s^2)"
0.0,0.50,1.23,9.81,9.95
0.1,0.52,1.25,9.80,9.94
```

**Request Body (JSON):**
```json
{
  "csvData": "CSV content as string..."
}
```

**Response:**
```json
{
  "message": "CSV data saved and analyzed successfully",
  "filename": "acceleration-data-2025-11-30T14-30-00-123Z.csv",
  "timestamp": "2025-11-30T14:30:00.123Z",
  "dataLength": 1234,
  "fallDetected": true
}
```

#### POST `/fall-detection/analyze`
Analyzes an existing CSV file for fall detection.

**Request:**
```json
{
  "filePath": "path/to/file.csv"
}
```

**Response:**
```json
{
  "message": "Analysis complete",
  "filePath": "path/to/file.csv",
  "fallDetected": true,
  "timestamp": "2025-11-30T14:30:00.123Z"
}
```

#### GET `/fall-detection/files`
Lists all saved data files.

**Response:**
```json
{
  "message": "Files retrieved successfully",
  "csvFiles": ["file1.csv", "file2.csv"],
  "jsonFiles": ["result1.json", "result2.json"],
  "totalFiles": 4
}
```

### Utility Endpoints

#### GET `/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "Fall Detection Server",
  "timestamp": "2025-11-30T14:30:00.123Z"
}
```

#### GET `/`
Landing page (renders EJS template).

#### GET `/analyzeData`
Test endpoint for analyzing sample data.

## Fall Detection Algorithm

The algorithm uses a two-phase approach:

### Phase 1: Dominant Axis Identification
1. Reads CSV file with accelerometer data (X, Y, Z axes)
2. Calculates deviations from gravity (9.81 m/s²) for each axis
3. Identifies which axis shows the least deviation (dominant axis)
4. This represents the axis most aligned with gravity during rest

### Phase 2: Fall Event Detection
1. Monitors the dominant axis values over time
2. Detects **"falling"** state when absolute value < 0.5 m/s²
   - Indicates free-fall or near-weightlessness
3. Detects **"impact"** when dominant axis value equals 0.0 m/s²
   - Indicates the moment of ground impact
4. Fall is confirmed only if **BOTH** conditions are met

### Output
Creates a JSON file in `FallDetectionResults/` directory:
```json
{
  "fallDetected": true,
  "dominantAxis": "Z",
  "events": [
    {
      "event": "falling",
      "timestamp": 1.2,
      "Z": 0.3
    },
    {
      "event": "impact",
      "timestamp": 1.5,
      "Z": 0.0
    }
  ]
}
```

## Discord Notifications

When a fall is detected, the system automatically sends a Discord notification:

```
🚨 **ESÉS ÉRZÉKELVE!** 🚨

⏰ Idő: 2025-11-30 14:30:00

📊 Domináns Tengely: Z
📁 Esés adatokat tartalmazó fájl neve: 2025-11-30T14-30-06-789Z.json

🆘 Emergency services may need to be contacted!
------------------------------------------------------------
```

## Configuration

All configuration is managed through environment variables in `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3030` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `NODE_ENV` | `development` | Environment (development/production) |
| `DISCORD_TOKEN` | - | Discord bot token (required) |
| `DISCORD_CHANNEL_ID` | - | Discord channel ID for notifications |
| `RESULTS_DIR` | `./FallDetectionResults` | Directory for storing CSV and JSON files |

See `src/config.js` for all configuration options.

## Project Structure

```
/server
  /src
    /discord         - Discord bot integration
    /fall-detection  - Fall detection algorithm and routes
    config.js        - Centralized configuration
    app.js           - Express app setup
    index.js         - Server entry point
  /views             - EJS templates
  /FallDetectionResults - CSV files and analysis results
  .env               - Environment variables (not in git)
  .env.example       - Example environment configuration
  package.json       - Dependencies and scripts
```

## File Storage

All fall detection data is stored as files:

- **CSV files:** Raw accelerometer data
  - `acceleration-data-TIMESTAMP.csv`
- **JSON files:** Analysis results
  - `TIMESTAMP.json`

Files are stored in the `FallDetectionResults/` directory.

## Development

The server uses **ES Modules** (`import/export` syntax).

### Key Dependencies

- `express` - Web framework
- `discord.js` - Discord bot integration
- `dotenv` - Environment variable management
- `ejs` - Template engine (for landing page)

### Adding New Features

1. Follow existing code patterns
2. Add proper error handling with try-catch
3. Use the centralized config (`src/config.js`) for environment-specific values
4. Update this README if adding new endpoints

## Error Handling

All routes use Express error handling middleware. Errors are automatically caught and returned as JSON:

```json
{
  "error": "Error message here",
  "stack": "..." // Only in development mode
}
```

## Logging

The server logs all HTTP requests:
```
GET /health - 200 - 5ms
POST /fall-detection/receive-data - 200 - 234ms
```

## Removed Features

**Version 2.0.0** removed the following features to simplify the server:
- MongoDB database
- Motorcycle management (`/moto` endpoints)
- User management (`/user` endpoints)

The server now focuses solely on **fall detection**.

## License

ISC
