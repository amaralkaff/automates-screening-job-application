# AI-Powered CV Screening System

Automated job application screening using AI to evaluate CVs and project reports against job requirements.

## Features

- **PDF Processing**: Extract and analyze text from CV and project report PDFs
- **AI Evaluation**: Google Gemini-powered assessment with LLM chaining
- **RAG System**: Vector database (ChromaDB) for context-aware evaluations
- **Redis Job Queue**: Persistent job processing with Bull Queue
- **RESTful API**: Complete API with Swagger documentation
- **Standardized Scoring**: Structured 1-5 scale evaluation criteria

## Quick Start

### Prerequisites
- Node.js 18+ or Bun
- Google Gemini API key
- Redis (for job queue)
- ChromaDB (vector database)

### Installation

1. **Install dependencies**:
   ```bash
   bun install
   ```

2. **Set environment variables**:
   ```bash
   export GEMINI_API_KEY=your_gemini_api_key
   export REDIS_URL=redis://localhost:6379
   ```

3. **Start the services**:
   ```bash
   # Start Redis
   redis-server

   # Start ChromaDB (in another terminal)
   bunx chroma run

   # Start application
   bun start
   ```

Server starts on http://localhost:3000

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
    "cvDocumentId": "cv_123",
    "projectReportId": "project_456"
  }'
```

### Check Results
```bash
curl http://localhost:3000/status/job_789
```

## Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Client    │───▶│   REST API    │───▶│  Bull Queue  │
└─────────────┘    └──────────────┘    │  (Redis)    │
                           │           └─────────────┘
                           ▼                    │
                   ┌─────────────┐            ▼
                   │   ChromaDB   │    ┌─────────────┐
                   │ (Vectors)    │    │   Gemini     │
                   └─────────────┘    │    (AI)     │
                                      └─────────────┘
```

## Scoring System

### CV Evaluation (Weighted)
- Technical Skills Match: 40%
- Experience Level: 25%
- Relevant Achievements: 20%
- Cultural Fit: 15%

### Project Evaluation (Weighted)
- Correctness: 30%
- Code Quality: 25%
- Resilience: 20%
- Documentation: 15%
- Creativity: 10%

## Environment Variables

```bash
# Required
GEMINI_API_KEY=your_gemini_api_key
REDIS_URL=redis://localhost:6379

# Optional
PORT=3000
NODE_ENV=development
UPLOAD_DIR=./uploads
```

## Documentation

- **Swagger UI**: http://localhost:3000/swagger
- **Health Check**: http://localhost:3000/health

## License

Case study submission for backend developer evaluation.