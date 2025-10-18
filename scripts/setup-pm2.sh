#!/bin/bash

# PM2 Setup Script for Job Evaluation Application
# This script sets up PM2 to start on system boot

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up PM2 startup configuration...${NC}"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}PM2 is not installed. Installing PM2 globally...${NC}"
    npm install -g pm2
fi

# Generate PM2 startup script
echo -e "${YELLOW}Generating PM2 startup script...${NC}"
pm2 startup

# Save current process list
echo -e "${YELLOW}Saving current PM2 process list...${NC}"
pm2 save

echo -e "${GREEN}PM2 setup completed!${NC}"
echo -e "${YELLOW}Important: Run the command displayed above with sudo to enable PM2 startup${NC}"
echo -e "${YELLOW}Then run 'pm2 save' to save the current process list${NC}"
echo -e "${YELLOW}Your application will now automatically start on system boot${NC}"