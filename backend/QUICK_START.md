# Quick Start Guide

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your settings:
   ```env
   PORT=4000
   HOST=0.0.0.0
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:3000
   ```

3. **Start the server**:
   
   Development mode (with auto-reload):
   ```bash
   npm run dev
   ```
   
   Production mode:
   ```bash
   npm start
   ```

## Verify Installation

The server should start with output like:
```
✓ Backend server running on http://0.0.0.0:4000
✓ Environment: development
✓ CORS Origin: http://localhost:3000
```

## Test Endpoints

### Health Check
```bash
curl http://localhost:4000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "rooms": 0,
  "connections": 0
}
```

### Get Events
```bash
curl http://localhost:4000/api/events
```

### Create Event
```bash
curl -X POST http://localhost:4000/api/events \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Event","date":"2024-01-01"}'
```

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration
│   ├── controllers/     # Business logic
│   ├── middleware/      # Request processing
│   ├── routes/          # API endpoints
│   ├── socket/          # WebSocket handlers
│   ├── utils/           # Helper functions
│   ├── app.js           # Express setup
│   └── server.js        # Entry point
├── data/                # Data storage
├── .env                 # Environment variables
└── package.json         # Dependencies
```

## Common Tasks

### Add New Endpoint

1. Create controller in `src/controllers/`
2. Create route in `src/routes/`
3. Register route in `src/routes/index.js`

### Add New Socket Event

1. Add event name to `src/config/constants.js`
2. Add handler in `src/socket/socketHandlers.js`

### Add New Constant

Edit `src/config/constants.js`:
```javascript
const MY_CONSTANT = 'value';
module.exports = { MY_CONSTANT };
```

### Add New Environment Variable

1. Add to `.env.example`
2. Add to `src/config/environment.js`
3. Use via `config.myVariable`

## Troubleshooting

### Port Already in Use
Change `PORT` in `.env` file

### CORS Errors
Update `CORS_ORIGIN` in `.env` file

### File Upload Errors
Check `MAX_FILE_SIZE` in `.env` file

### Module Not Found
Run `npm install`

## Documentation

- `REFACTORING_GUIDE.md` - Detailed documentation
- `PROJECT_STRUCTURE.md` - Architecture overview
- `MIGRATION.md` - Migration guide
- `SUMMARY.md` - Refactoring summary

## Support

For issues or questions, check the documentation files above.
