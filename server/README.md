> **Részletes dokumentáció:** A teljes algoritmus működéséről, API endpointokról, és egyéb részletekről a projekt dokumentációjában olvashatsz.

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
   DISCORD_TOKEN=saját_discord_bot_token
   DISCORD_CHANNEL_ID=csatorna_id_ahova_az_üzeneteket_akarod_hogy_küldje_a_bot
   PORT=3030
   ```

3. **Run server:**
   ```bash
   npm start              # Development (with auto-restart)
   npm run start:prod     # Production
   ```

Server runs on `http://0.0.0.0:3030`

## Available Scripts

A package.json fájlban elérhető npm scriptek:

### Development & Production

- **`npm start`** - Szerver indítása development módban (nodemon-nal, automatikus újraindítással)
- **`npm run start:prod`** - Szerver indítása production módban (közvetlenül node-dal)

### Testing

- **`npm test`** - Teljes fájl tesztek futtatása (run_full_file_tests.js)
- **`npm run test:full`** - Ugyanaz, mint az `npm test`
- **`npm run test:normalized`** - Normalizált tesztek futtatása (run_normalized_tests.js)
- **`npm run test:chunked`** - Ugyanaz, mint a `test:normalized`
- **`npm run test:manual`** - Interaktív manuális teszt eszköz (manual-test.js)

