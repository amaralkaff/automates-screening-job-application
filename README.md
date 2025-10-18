# AI CV Screening System

Automated job application screening using AI to evaluate CVs and project reports.

## Architecture

![architecture](architecture.png)

## Features

- PDF upload and processing
- AI-powered evaluation with detailed scoring
- Background job processing
- REST API with Swagger documentation

## Quick Start

### 1. Install Dependencies
```bash
bun install
```

### 2. Set Environment
```bash
cp .env.example .env
# Add your GEMINI_API_KEY to .env
```

### 3. Start Services
```bash
# Start ChromaDB and Redis
docker-compose up -d

# Start application
bun start
# or with PM2
pm2 start bun --name cv-screening -- src/server.ts
```

### 4. Access API
- **API**: http://localhost:3000
- **Swagger**: http://localhost:3000/swagger
- **Health**: http://localhost:3000/health

## API Usage

### Upload Documents
```bash
curl -X POST http://localhost:3000/upload \
  -F "cv=@cv.pdf" \
  -F "project-report=@project.pdf"
```

### Start Evaluation
```bash
curl -X POST http://localhost:3000/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "jobTitle": "Product Engineer (Backend)",
    "cvDocumentId": "cv_id",
    "projectReportId": "project_id"
  }'
```

### Check Results
```bash
curl http://localhost:3000/status/{jobId}
```

## Scoring System

**CV Evaluation (1-5 scale)**
- Technical Skills Match (40%)
- Experience Level (25%)
- Relevant Achievements (20%)
- Cultural Fit (15%)

**Project Evaluation (1-5 scale)**
- Correctness (30%)
- Code Quality (25%)
- Resilience (20%)
- Documentation (15%)
- Creativity (10%)

## Environment Configuration

### Local Development
The `.env` file is already configured for local development with Docker:
```bash
CHROMA_URL=http://localhost:8000
REDIS_URL=redis://localhost:6379
```

### Production Deployment
For production on `http://34.101.92.66`, either:

**Option 1: Use `.env.production`**
```bash
cp .env.production .env
bun start
```

**Option 2: Update `.env` manually**
```bash
# Uncomment and use production URLs in .env:
CHROMA_URL=http://34.101.92.66:8000
REDIS_URL=redis://34.101.92.66:6379
```

### Required Environment Variables
```bash
# Required
GEMINI_API_KEY=your_gemini_api_key_here

# Server
PORT=3000
NODE_ENV=development  # or production

# ChromaDB (auto-detects local vs production)
CHROMA_URL=http://localhost:8000

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
```

## License

Case study submission for backend developer evaluation.
