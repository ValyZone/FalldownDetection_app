# Fall Detection Server

Node.js/Express server that analyzes accelerometer data to detect motorcycle crashes using a sophisticated 3-phase detection algorithm.

## How It Works

The server uses a **research-based 3-phase detection algorithm**:

```
Phase 1: DECELERATION
└─ Detects sudden negative acceleration (< -15 m/s²)
   └─ Indicates motorcycle losing speed rapidly

Phase 2: FREEFALL
└─ Detects near-weightlessness (< 2.0 m/s²)
   └─ Indicates rider/bike airborne

Phase 3: IMPACT
└─ Detects spike in acceleration (> 14.22 m/s²)
   └─ Indicates ground impact

VALIDATION
└─ All 3 phases must occur in sequence within 2 seconds
   └─ If yes → CRASH DETECTED
   └─ If no → Check for low-speed tip-over (impact + stillness)
```

### Algorithm Features

- **Sequential Validation:** Phases must occur in order
- **Time Windows:** Max 2 seconds between phases
- **Minimum Duration:** Events must last ≥ 200ms to filter noise
- **Fallback Detection:** Low-speed crashes (impact + post-impact stillness)
- **Post-Impact Analysis:** Checks for device stillness after impact

### Thresholds

| Parameter | Value | Purpose |
|-----------|-------|---------|
| Deceleration | -15 m/s² | Sudden braking/crash |
| Freefall | 2.0 m/s² | Near-weightlessness |
| Impact | 14.22 m/s² (1.45g) | Ground collision |
| Time Window | 2.0 seconds | Phase sequence limit |
| Min Duration | 0.2 seconds | Noise filtering |

## Setup

### Prerequisites
- Node.js (ES Modules support)
- Discord bot token

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**

   Create `.env` file:
   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   DISCORD_CHANNEL_ID=your_channel_id_here
   PORT=3030
   ```

3. **Run server:**
   ```bash
   npm start              # Development (with auto-restart)
   npm run start:prod     # Production
   ```

Server runs on `http://0.0.0.0:3030`

## API Endpoints

### POST /fall-detection/receive-data
Receives CSV data from mobile app and analyzes for crashes.

**Content-Type:** `text/csv` OR `application/json`

**Request (CSV):**
```csv
"Time (s)","Acceleration x","Acceleration y","Acceleration z","Absolute acceleration","Gyroscope x","Gyroscope y","Gyroscope z","Gyroscope magnitude"
0.0,0.5,1.2,9.8,9.9,0.01,-0.03,0.01,0.03
```

**Request (JSON):**
```json
{
  "csvData": "CSV string..."
}
```

**Response:**
```json
{
  "message": "CSV data saved and analyzed successfully",
  "filename": "acceleration-data-2025-12-14T10-30-00-000Z.csv",
  "timestamp": "2025-12-14T10:30:00.000Z",
  "dataLength": 1234,
  "fallDetected": true
}
```

### POST /fall-detection/analyze
Analyzes existing CSV file.

**Request:**
```json
{
  "filePath": "path/to/file.csv"
}
```

### GET /fall-detection/files
Lists all saved data files.

**Response:**
```json
{
  "csvFiles": ["file1.csv"],
  "jsonFiles": ["result1.json"],
  "totalFiles": 2
}
```

### POST /fall-detection/cleanup
Triggers automatic file cleanup (deletes oldest files if limits exceeded).

### POST /user-fine
User confirms they're okay (sends Discord notification).

### GET /health
Health check endpoint.

### GET /mock-data/positive
Returns mock crash data for testing.

### GET /mock-data/false-positive
Returns mock non-crash data for testing.

## File Storage

Data is stored in `FallDetectionResults/`:

- **CSV files:** Raw sensor data (`acceleration-data-TIMESTAMP.csv`)
- **JSON files:** Analysis results (`TIMESTAMP.json`)
- **Event files:** Detected events (`TIMESTAMP-events.csv`)

### Automatic Cleanup

Server automatically removes old files when:
- File count exceeds **100 files**
- Total size exceeds **50 MB**
- Triggered before saving new file

## Discord Notifications

When crash detected, sends notification:

```
🚨 **ESÉS ÉRZÉKELVE** 🚨

⏰ 2025-12-14 10:30:00

⚠️ Még nem érkezett visszajelzés a felhasználótól
```

Detailed crash info logged to console:
```
═══════════════════════════════════════════════════════
🚨 ESÉS ÉRZÉKELVE - DISCORD RIASZTÁS KÜLDÉSE
═══════════════════════════════════════════════════════
⏰ Időpont: 2025-12-14 10:30:00
📍 Helyszín: FallDetectionResults/2025-12-14T10-30-00-000Z.json

📊 TÍPUS: Háromfázisú esés

📊 FÁZIS BONTÁS:
   1️⃣ Lassulás: 8.2s → -1.8g a X-tengelyen
   2️⃣ Szabadesés: 8.5s → 0.25s időtartam
   3️⃣ Becsapódás: 8.8s → 2.1g erő

⏱️ Teljes időtartam: 0.6s
📨 Discord értesítés elküldve a csatornára
═══════════════════════════════════════════════════════
```

## Configuration

Environment variables (`.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3030 | Server port |
| `HOST` | 0.0.0.0 | Server host |
| `DISCORD_TOKEN` | - | Discord bot token (required) |
| `DISCORD_CHANNEL_ID` | - | Discord channel ID |
| `RESULTS_DIR` | ./FallDetectionResults | Storage directory |
| `NODE_ENV` | development | Environment mode |

## Project Structure

```
server/
├── src/
│   ├── discord/
│   │   └── bot.js               # Discord integration
│   ├── fall-detection/
│   │   ├── index.js             # Main detection algorithm
│   │   ├── constants.js         # Thresholds and config
│   │   ├── utils.js             # Helper functions
│   │   └── router.js            # API endpoints
│   ├── config.js                # Environment config
│   ├── app.js                   # Express app setup
│   └── index.js                 # Server entry point
├── scripts/
│   ├── run_full_file_tests.js   # Full file test runner
│   └── run_normalized_tests.js  # Normalized test runner
├── test-cases/                  # Test datasets
├── views/                       # EJS templates
├── FallDetectionResults/        # Output files
├── .env                         # Environment variables
└── package.json                 # Dependencies
```

## Testing

### Run Comprehensive Tests
```bash
npm test                # Run full file tests
npm run test:normalized # Run normalized tests
```

### Manual Testing
```bash
node manual-test.js     # Interactive test tool
```

### Mock Data Testing
Test with pre-generated crash/non-crash data:
- `GET /mock-data/positive` - Should detect crash
- `GET /mock-data/false-positive` - Should NOT detect crash

## Development

The server uses **ES Modules** (`import/export`).

### Key Files

- **index.js** - 3-phase detection algorithm
- **constants.js** - All thresholds and config
- **utils.js** - Peak detection, time windows, statistics
- **router.js** - API endpoints, file cleanup

### Adding Features

1. Update `constants.js` for new thresholds
2. Add functions to `utils.js` for reusable logic
3. Modify `index.js` for algorithm changes
4. Add endpoints to `router.js`

## Dependencies

```json
{
  "express": "^4.19.2",      // Web framework
  "discord.js": "^14.17.3",  // Discord bot
  "dotenv": "^17.2.3",       // Environment vars
  "ejs": "^3.1.9"            // Templates
}
```

## Logging

All requests logged:
```
POST /fall-detection/receive-data - 200 - 234ms
GET /health - 200 - 5ms
```

Crash analysis logged to console with detailed phase breakdown.

## License

ISC
