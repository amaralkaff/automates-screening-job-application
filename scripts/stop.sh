#!/bin/bash

# Job Evaluation Application Stop Script
# This script stops the application using PM2

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Stopping Job Evaluation Application...${NC}"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}PM2 is not installed.${NC}"
    exit 1
fi

# Stop the application
pm2 stop ecosystem.config.cjs

echo -e "${GREEN}Application stopped successfully!${NC}"
echo -e "${YELLOW}Use 'npm run pm2:start' to start the application again${NC}"
echo -e "${YELLOW}Use 'npm run pm2:delete' to remove from PM2 list${NC}"