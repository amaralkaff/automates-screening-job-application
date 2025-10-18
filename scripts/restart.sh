#!/bin/bash

# Job Evaluation Application Restart Script
# This script restarts the application using PM2

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Restarting Job Evaluation Application...${NC}"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}PM2 is not installed.${NC}"
    exit 1
fi

# Restart the application
if [ "$NODE_ENV" = "production" ] || [ "$1" = "--prod" ]; then
    echo -e "${YELLOW}Restarting in production mode...${NC}"
    bun run build
    pm2 restart ecosystem.config.cjs --env production
else
    echo -e "${YELLOW}Restarting in development mode...${NC}"
    pm2 restart ecosystem.config.cjs
fi

echo -e "${GREEN}Application restarted successfully!${NC}"
echo -e "${YELLOW}Use 'npm run pm2:logs' to view logs${NC}"
echo -e "${YELLOW}Use 'npm run pm2:status' to check status${NC}"