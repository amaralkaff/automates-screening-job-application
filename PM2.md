# PM2 Setup and Usage Guide

This project has been migrated from Docker to PM2 for process management.

## Quick Start

### 1. Install Dependencies
```bash
bun install
```

### 2. Start the Application
```bash
# Development mode
npm run app:start

# Production mode
NODE_ENV=production npm run app:start
```

### 3. Monitor the Application
```bash
# Check status
npm run pm2:status

# View logs
npm run pm2:logs

# Monitor in real-time
npm run pm2:monit
```

## Available Scripts

### PM2 Direct Commands
- `npm run pm2:start` - Start application in development mode
- `npm run pm2:start:prod` - Start application in production mode
- `npm run pm2:stop` - Stop the application
- `npm run pm2:restart` - Restart application
- `npm run pm2:restart:prod` - Restart in production mode
- `npm run pm2:delete` - Remove from PM2 process list
- `npm run pm2:logs` - View logs
- `npm run pm2:monit` - Open PM2 monitor
- `npm run pm2:status` - Check status

### Convenience Scripts
- `npm run app:start` - Start application (development)
- `npm run app:stop` - Stop application
- `npm run app:restart` - Restart application
- `npm run setup:pm2` - Setup PM2 startup on system boot

## Production Deployment

### 1. Setup Environment
```bash
cp .env.example .env
# Edit .env with your production values
```

### 2. Setup PM2 Startup
```bash
npm run setup:pm2
# Follow the instructions to enable PM2 startup
```

### 3. Start in Production Mode
```bash
NODE_ENV=production npm run app:start
```

### 4. Save Process List
```bash
pm2 save
```

## Configuration

The PM2 configuration is defined in `ecosystem.config.js`:

- **Instances**: 1 (can be scaled)
- **Max Memory Restart**: 1G
- **Log Files**: Stored in `./logs/` directory
- **Environment Variables**: Defined for development and production

## Log Management

Logs are automatically created in the `logs/` directory:
- `out.log` - Standard output
- `err.log` - Error output
- `combined.log` - Combined logs with timestamps

## Monitoring

PM2 provides built-in monitoring:
```bash
# Real-time monitoring
pm2 monit

# Check status
pm2 status

# View logs
pm2 logs job-evaluation-app

# Restart on file changes (development)
pm2 restart job-evaluation-app
```

## Troubleshooting

### Common Issues

1. **PM2 command not found**
   ```bash
   npm install -g pm2
   ```

2. **Application fails to start**
   - Check logs: `npm run pm2:logs`
   - Verify environment variables
   - Ensure database is running

3. **Memory issues**
   - Monitor with `pm2 monit`
   - Adjust `max_memory_restart` in ecosystem.config.js

### Reset PM2
```bash
pm2 delete all
pm2 kill
```

## Migration from Docker

The following Docker components have been replaced:
- **Docker containers** → PM2 processes
- **docker-compose.yml** → ecosystem.config.js
- **Docker networking** → Local services (PostgreSQL, ChromaDB)
- **Nginx reverse proxy** → Direct application access

Note: You'll need to run PostgreSQL and ChromaDB separately or use cloud services.