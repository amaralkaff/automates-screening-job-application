#!/bin/bash

# AI CV Evaluation System Startup Script

echo "🚀 Starting AI CV Evaluation System..."

# Check if GEMINI_API_KEY is set
if [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ Error: GEMINI_API_KEY environment variable is not set"
    echo "Please set it with: export GEMINI_API_KEY=your_api_key_here"
    exit 1
fi

echo "✅ Environment variables configured"

# Start the server
bun run src/start.ts