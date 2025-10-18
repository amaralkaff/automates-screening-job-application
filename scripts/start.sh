#!/bin/bash

# Job Evaluation Application Startup Script
# This script starts the application using PM2

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Job Evaluation Application with PM2...${NC}"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}PM2 is not installed. Installing PM2 globally...${NC}"
    npm install -g pm2
fi

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo -e "${RED}Bun is not installed. Please install Bun first.${NC}"
    echo "Visit: https://bun.sh/docs/installation"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    bun install
fi

# Build the application for production
if [ "$NODE_ENV" = "production" ] || [ "$1" = "--prod" ]; then
    echo -e "${YELLOW}Building application for production...${NC}"
    bun run build
    NODE_ENV=production pm2 start ecosystem.config.cjs --env production
else
    echo -e "${YELLOW}Starting application in development mode...${NC}"
    pm2 start ecosystem.config.cjs
fi

echo -e "${GREEN}Application started successfully!${NC}"
echo -e "${YELLOW}Use 'npm run pm2:logs' to view logs${NC}"
echo -e "${YELLOW}Use 'npm run pm2:status' to check status${NC}"
echo -e "${YELLOW}Use 'npm run pm2:monit' to monitor${NC}"
echo -e "${YELLOW}Use 'npm run pm2:stop' to stop the application${NC}"