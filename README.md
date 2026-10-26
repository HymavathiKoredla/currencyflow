# CurrencyFlow — Currency Converter & Rate History

A complete, production-ready, full-stack currency conversion and rate history dashboard designed with a dark navy fintech aesthetic, interactive charts, and local SQLite persistence.

CurrencyFlow delivers live European Central Bank (ECB) reference exchange rates via the free, public [Frankfurter API](https://api.frankfurter.dev/v2), allowing users to convert currencies, analyze historical exchange-rate volatility over 7-day, 30-day, 90-day, and 1-year periods, and audit their conversion history locally.

---

## Key Features

1. **Fintech Dashboard Experience**
   - Dark navy palette (`#080C16`) with glassmorphic cards, purple/indigo gradient accents, and responsive layout.
   - Light and Dark mode toggle with persistent local storage preference.
   - Real-time online/live indicator with reference update dates.
   - Fully accessible controls, keyboard navigation, and formatted monetary numbers via `Intl.NumberFormat`.

2. **Real-Time Currency Converter**
   - Supports 30+ official currencies returned by Frankfurter (USD, EUR, GBP, INR, JPY, AUD, CAD, SGD, AED, CNY, CHF, etc.).
   - Input validation rejecting negative, zero, and non-numeric values.
   - Quick amount chips (+10, +100, +1,000, +5,000, +10,000) and popular currency selector shortcuts.
   - Animated swap currencies button.
   - Conversion result with exchange rate formula, inverse rate, reference date, and source attribution.
   - Copy-result action with animated clipboard confirmation.
   - Handles identical source and target currencies correctly (rate 1.0).

3. **Interactive Rate History & Volatility Analytics**
   - High-performance Recharts responsive area chart with smooth gradient fill and hover tooltips.
   - Dynamic range switching: **7 Days**, **30 Days**, **90 Days**, and **1 Year**.
   - Automatically computes **Period High**, **Period Low**, and **Net Percentage Change**.
   - Handles weekends and market holidays gracefully without synthetic data fabrication.

4. **Local SQLite Persistence & Audit Trail**
   - Saves all performed conversions into a local SQLite database (`currencyflow.db`).
   - Indexes for fast retrieval by date and currency pairs.
   - Recent conversions table with re-convert quick loader.
   - Clear conversion history with custom confirmation modal.
   - Automatic local rate caching: if the public API is temporarily unreachable or offline, the system safely falls back to local cached observations with an explicit cached/offline indicator.

---

## Architecture & Tech Stack

```
currencyflow/
├── client/                     # Frontend (React 18 + Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx             # Top bar, logo, status badge, theme toggle
│   │   │   ├── SummaryCards.jsx       # 4 high-level KPI cards (Rate, High, Low, Trend)
│   │   │   ├── CurrencyConverter.jsx  # Main interactive conversion card
│   │   │   ├── RateHistory.jsx        # Recharts time series & range selector
│   │   │   └── ConversionHistory.jsx  # SQLite-backed conversion audit table
│   │   ├── services/
│   │   │   └── api.js                 # Frontend API client
│   │   ├── App.jsx                    # Root state & data coordinator
│   │   ├── index.css                  # Modern fintech styling & theme variables
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js                 # Vite dev proxy forwarding /api to Express
├── server/                     # Backend (Node.js + Express + SQLite)
│   ├── data/                   # SQLite database directory (auto-created)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── currencyRoutes.js      # /currencies, /rate, /history, /stats
│   │   │   └── conversionRoutes.js    # /convert, /conversions (GET/POST/DELETE)
│   │   ├── services/
│   │   │   └── frankfurter.js         # External API client with memory & SQLite caching
│   │   ├── db.js                      # Universal SQLite initialization & queries
│   │   ├── app.js                     # Express app, middleware, error handling
│   │   └── server.js                  # HTTP server & static client serving
│   ├── test/
│   │   └── api.test.js                # Automated backend test suite (node:test)
│   ├── package.json
│   └── .env.example
├── package.json                # Root orchestrator scripts
├── .gitignore
├── .env.example
└── README.md
```

- **Frontend**: React 18, Vite, Recharts, Lucide React, CSS Variables.
- **Backend**: Node.js (ES Modules), Express 4, SQLite (`better-sqlite3` with universal fallback to Node.js native `node:sqlite` `DatabaseSync`).
- **External Provider**: Frankfurter API (`https://api.frankfurter.dev/v2`) — European Central Bank reference exchange rates.
- **Testing**: Node built-in test runner (`node --test`), Supertest.

---

## Prerequisites

- **Node.js**: v18.0.0 or later (Tested on Node v20, v22, and v26).
- **npm**: v9.0.0 or later.
- Windows PowerShell, macOS Terminal, or Linux bash.

---

## Installation & Setup

### 1. Clone or navigate to the workspace
```powershell
cd "c:\Users\kkore\OneDrive\Desktop\fsd 22"
```

### 2. Install Dependencies
Run the root install script which configures root, server, and client packages:
```powershell
npm run install:all
```

Or install individually:
```powershell
npm install
npm --prefix server install
npm --prefix client install
```

---

## Running the Application

### Development Mode (Concurrent Frontend + Backend)
Starts the Express API server on `http://localhost:5000` and Vite dev server on `http://localhost:5173` with hot module replacement:
```powershell
npm run dev
```

Open your browser to:
**[http://localhost:5173](http://localhost:5173)**

### Running the Services Separately
To run the backend only:
```powershell
npm run dev:server
```

To run the frontend only:
```powershell
npm run dev:client
```

### Production Build & Full-Stack Serving
To build the frontend production assets and serve everything directly from Express:
```powershell
npm run build
npm start
```
Then visit **[http://localhost:5000](http://localhost:5000)**.

---

## Running Automated Tests

The backend test suite covers:
- Backend health check (`GET /api/health`)
- Supported currencies list (`GET /api/currencies`)
- Reference exchange rate retrieval (`GET /api/rate`)
- Same-currency conversion edge case (`USD` to `USD` = 1.0)
- Validation rejects for negative, zero, and invalid amounts (HTTP 400)
- Validation rejects for invalid 3-letter currency codes (HTTP 400)
- Conversion calculation and database persistence (`POST /api/convert`)
- Convenience GET conversion endpoint (`GET /api/convert`)
- Historical time series and statistics computation (`GET /api/history`)
- Audit trail listing and deletion (`GET /api/conversions`, `DELETE /api/conversions`)
- System statistics (`GET /api/stats`)

Run tests with:
```powershell
npm test
```
All tests mock external API calls to execute deterministically without network dependencies.

---

## Backend REST API Reference

### 1. Health Check
```http
GET /api/health
```
**Response (200 OK):**
```json
{
  "status": "ok",
  "service": "CurrencyFlow Backend API",
  "uptime": 128,
  "timestamp": "2026-10-26T15:20:00.000Z"
}
```

### 2. Supported Currencies
```http
GET /api/currencies
```
**Response (200 OK):**
```json
{
  "success": true,
  "count": 31,
  "currencies": [
    { "code": "AUD", "name": "Australian Dollar", "symbol": "A$" },
    { "code": "EUR", "name": "Euro", "symbol": "€" },
    { "code": "INR", "name": "Indian Rupee", "symbol": "₹" },
    { "code": "USD", "name": "United States Dollar", "symbol": "$" }
  ]
}
```

### 3. Latest Reference Rate
```http
GET /api/rate?base=USD&quote=INR
```
*(Also supports aliases: `?from=USD&to=INR`)*
**Response (200 OK):**
```json
{
  "success": true,
  "base": "USD",
  "quote": "INR",
  "rate": 94.93,
  "date": "2026-10-26",
  "isCached": false,
  "source": "Frankfurter Reference Rates"
}
```

### 4. Convert Currency & Save to Audit Log
```http
POST /api/convert
Content-Type: application/json

{
  "amount": 250,
  "from": "USD",
  "to": "INR"
}
```
**Response (201 Created):**
```json
{
  "success": true,
  "result": {
    "id": 1,
    "amount": 250,
    "from_currency": "USD",
    "to_currency": "INR",
    "exchange_rate": 94.93,
    "converted_amount": 23732.5,
    "rate_date": "2026-10-26",
    "created_at": "2026-10-26T15:25:00.123Z",
    "rate": 94.93,
    "isCached": false,
    "source": "Frankfurter Reference Rates"
  }
}
```

### 5. Historical Exchange Rates
```http
GET /api/history?base=USD&quote=INR&range=30d
```
*(Supported ranges: `7d`, `30d`, `90d`, `1y`)*
**Response (200 OK):**
```json
{
  "success": true,
  "base": "USD",
  "quote": "INR",
  "range": "30d",
  "from": "2026-09-26",
  "to": "2026-10-26",
  "isCached": false,
  "history": [
    { "date": "2026-09-28", "rate": 96.10 },
    { "date": "2026-10-26", "rate": 94.93 }
  ],
  "stats": {
    "highestRate": 96.20,
    "highestDate": "2026-10-04",
    "lowestRate": 94.50,
    "lowestDate": "2026-10-18",
    "percentageChange": -1.22,
    "latestRate": 94.93,
    "dataPoints": 21
  }
}
```

### 6. Conversion History
```http
GET /api/conversions?limit=20
```
**Response (200 OK):**
```json
{
  "success": true,
  "count": 1,
  "conversions": [
    {
      "id": 1,
      "amount": 250,
      "from_currency": "USD",
      "to_currency": "INR",
      "exchange_rate": 94.93,
      "converted_amount": 23732.5,
      "rate_date": "2026-10-26",
      "created_at": "2026-10-26T15:25:00.123Z"
    }
  ]
}
```

### 7. Clear History
```http
DELETE /api/conversions
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Conversion history cleared successfully",
  "deleted": 1
}
```

---

## Database Schema & Behavior

The local SQLite database is stored at `server/data/currencyflow.db` and is auto-generated on server boot:

### Table `conversions`
```sql
CREATE TABLE IF NOT EXISTS conversions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount REAL NOT NULL,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  exchange_rate REAL NOT NULL,
  converted_amount REAL NOT NULL,
  rate_date TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_conversions_created_at ON conversions(created_at DESC);
CREATE INDEX idx_conversions_pair ON conversions(from_currency, to_currency);
```

### Table `rate_observations` (Offline Cache)
```sql
CREATE TABLE IF NOT EXISTS rate_observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  base_currency TEXT NOT NULL,
  quote_currency TEXT NOT NULL,
  rate REAL NOT NULL,
  rate_date TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  UNIQUE(base_currency, quote_currency, rate_date)
);

CREATE INDEX idx_rate_obs_pair_date ON rate_observations(base_currency, quote_currency, rate_date DESC);
```

---

## Troubleshooting

1. **Port 5000 or 5173 is already in use:**
   - Override the server port by setting the `PORT` environment variable:
     ```powershell
     $env:PORT=5050; npm start
     ```
   - For Vite, configure `server.port` in `client/vite.config.js`.

2. **Offline or Firewalled Network:**
   - CurrencyFlow contains automatic offline resilience. If an external API request fails or times out, it checks the local SQLite cache for previous observations of that currency pair and presents the cached rate with an orange `(Offline Cached)` indicator.

3. **Node.js Native Addon Warnings:**
   - On bleeding-edge Node versions without precompiled Visual C++ binaries, CurrencyFlow automatically uses Node's standard built-in `node:sqlite` (`DatabaseSync`), guaranteeing zero-dependency native SQLite execution.

---

## License

MIT License. Open source for educational and portfolio demonstration.
