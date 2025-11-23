# Excalidraw DB Sync Backend

Simple Node.js/Express backend for syncing Excalidraw canvas state to MongoDB.

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Create `.env` file with MongoDB connection:
```
MONGODB_URI=mongodb+srv://chemo:sDZuokLuUk5RYr51@swapnil.wfwy9.mongodb.net/?appName=swapnil
PORT=5000
NODE_ENV=development
```

3. Start the server:
```bash
npm run dev        # Development mode with watch
npm run build      # Build TypeScript
npm start          # Run production build
```

## Endpoints

### Canvas State

**PUT /api/canvas** - Save canvas state
```json
{
  "clientId": "unique_client_id",
  "dataState": {
    "elements": [...],
    "appState": {...},
    "libraryItems": [...]
  },
  "timestamp": 1234567890
}
```

**GET /api/canvas** - Load canvas state
Returns the latest saved canvas state with server timestamp.

### Files

**POST /api/files** - Save files (images)
```json
{
  "clientId": "unique_client_id",
  "files": [
    {
      "id": "file_id",
      "dataURL": "data:image/png;base64,...",
      "mimeType": "image/png",
      "created": 1234567890,
      "lastRetrieved": 1234567890,
      "version": 1
    }
  ],
  "timestamp": 1234567890
}
```

**GET /api/files?ids=file1,file2** - Load files by IDs
Returns array of files and any errored file IDs.

## Configuration

Frontend configuration in `excalidraw-app/.env`:
```
VITE_ENABLE_REMOTE_SYNC=true
VITE_REMOTE_SYNC_ENDPOINT=http://localhost:5000
```

## How It Works

1. When user draws/edits canvas, `LocalData` saves to localStorage immediately (local-first).
2. In parallel (non-blocking), it calls `DBAdapter.saveDataState()` to push to MongoDB.
3. When tab regains focus, `App.tsx` checks `syncData()`:
   - If local browser storage is newer: use local data.
   - Else: fetch latest from remote DB via `DBAdapter.loadDataState()`.
4. Images/files follow the same pattern: save locally first, then push to DB.
5. On failure (network error), the app continues working offline; retries happen on next save/focus.

## Testing

Run the backend:
```bash
npm run dev
```

In a separate terminal, run Excalidraw app:
```bash
cd excalidraw-app
npm run dev
```

Open http://localhost:5173 (or your app port), configure env vars to point to backend, and test:
1. Draw on canvas in Tab A.
2. Open Tab B (same app).
3. Focus Tab B → should sync canvas state from MongoDB if newer.
4. Upload an image → should sync to MongoDB.

## MongoDB Collections

- **canvas**: Stores canvas state (elements, appState)
  - Fields: clientId, dataState, timestamp, serverTimestamp
- **files**: Stores file blobs (images)
  - Fields: fileId, clientId, dataURL, mimeType, metadata, timestamp

## Error Handling

- Network failures fall back to local storage (app continues working).
- Individual file save failures don't block canvas save.
- Server returns partial success/failure for file operations.
