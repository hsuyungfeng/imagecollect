# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a medical image search system for 緻妍外科診所 that connects to an FTP server to search and manage patient comparison images. The system provides a web interface for searching images by month, day, and patient name, with automatic caching and image preview functionality.

## Development Commands

- **Build**: `npm run build` - Compiles TypeScript to JavaScript using `tsc`
- **Start**: `npm start` - Runs the compiled application from `dist/app.js`
- **Development**: `npm run dev` - Runs TypeScript compiler in watch mode and starts the server with nodemon
- **Test**: `npm test` - Currently no tests configured (echoes error message)

## TypeScript Configuration

- **Target**: ES2022
- **Module**: NodeNext
- **Out Directory**: `./dist`
- **Root Directory**: `./src`
- **Strict Mode**: Enabled
- **Source Maps**: Not configured

## Architecture

### Backend (Node.js + Express + TypeScript)
- **src/app.ts**: Main Express server with routes for:
  - `/` - Home page with search interface
  - `/api/files` - File search and download API (supports searchId and month/day/name queries)
  - `/api/sync` - FTP synchronization endpoint with retry logic
  - `/results` - Results page rendering with EXIF metadata extraction
- **src/ftpClient.js**: FTP client module for connecting to NAS FTP server
  - Supports multiple encodings (utf8, binary, gbk, big5)
  - File listing with recursive directory traversal
  - Smart downloading with MD5 hash comparison
  - Automatic connection management

### Frontend
- **views/index.ejs**: Search interface template with month/day/name input fields
- **views/results.ejs**: Results display template with responsive image grid
- **public/style.css**: CSS styles for responsive design and image preview
- **public/script.js**: Client-side JavaScript for image preview and interaction
- **public/results.js**: Results page JavaScript for image grid functionality

### Key Features
- FTP integration with 192.168.68.105:21 (NAS server)
- Automatic month-to-folder mapping (01-02 → "生日1-2月")
- Image metadata extraction (EXIF data for creation time sorting)
- Local caching system in `/cache/` directory with pattern: `MM.DD姓名/`
- Responsive image grid with zoom/preview functionality
- Connection retry logic with exponential backoff
- Comprehensive error handling and user-friendly messages

## Environment Configuration

Required environment variables in `.env`:
```
FTP_HOST=192.168.68.105
FTP_PORT=21
FTP_USER=nas123
FTP_PASSWORD=Abc123abc
FTP_BASE_PATH=緻妍外科診所/顧客比對圖
PORT=3001
```

## API Endpoints

### GET /api/files
Search and retrieve files with optional parameters:
- `month`, `day`, `name`: Search and download from FTP
- `searchId`: Retrieve cached files from local storage

### GET /api/sync
Synchronize files from FTP to local cache:
- Requires `month`, `day`, `name` parameters
- Returns download statistics

### GET /results
Render results page for a specific search:
- Requires `searchId` parameter
- Displays images sorted by EXIF creation time

## File Structure

- **FTP Structure**: Organized by birth month folders (生日1-2月, 生日3-4月, etc.)
- **Local Cache**: `cache/MM.DD姓名/` pattern
- **Supported Formats**: JPG, JPEG, PNG, BMP, GIF
- **Image Sorting**: EXIF DateTimeOriginal → CreateDate → filesystem mtime

## Dependencies

### Production Dependencies
- `express`: Web framework
- `ejs`: Template engine
- `basic-ftp`: FTP client library
- `dotenv`: Environment variable management
- `exif-parser`: Image metadata extraction
- `pinyin`: Chinese character romanization
- `uuid`: Unique identifier generation
- `lodash`: Utility functions

### Development Dependencies
- `@types/express`, `@types/node`: TypeScript definitions
- `typescript`: TypeScript compiler
- `ts-node`: TypeScript execution
- `nodemon`: Development server with auto-restart

## Error Handling

- FTP 550 errors (directory not found) handled gracefully
- Automatic surname correction (e.g., "叔華" → "淑華")
- Connection retry mechanism with exponential backoff
- Comprehensive error logging and user-friendly messages

## Security Notes

- FTP credentials stored in environment variables only
- No sensitive data committed to repository
- System designed for internal clinic use only
- Local cache directory exposed as static content

## Development Workflow

1. Set up environment variables in `.env`
2. Install dependencies: `npm install`
3. Develop with: `npm run dev` (watch mode)
4. Build for production: `npm run build`
5. Start production server: `npm start`

## Important Notes

- The system uses TypeScript but some files are JavaScript (.js)
- FTP client is in JavaScript with TypeScript definitions
- Cache directory structure: `cache/MM.DD姓名/`
- Images are sorted by metadata creation time when available
- Supports multiple concurrent users and searches