# AI CV Screening System

Automated job application screening using AI to evaluate CVs and project reports against job requirements.

## 🚀 Features

- **PDF Upload & Processing**: Extract and analyze text from CV and project report PDFs
- **AI-Powered Evaluation**: Google Gemini assessment with detailed scoring
- **Vector Database**: ChromaDB for context-aware evaluations
- **Background Processing**: Redis-based job queue for async evaluation
- **REST API**: Complete API with Swagger documentation
- **Standardized Scoring**: Structured 1-5 scale evaluation criteria

## 📋 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ or Bun
- Google Gemini API key

### Setup

1. **Clone and install**:
   ```bash
   git clone <repository-url>
   cd automates-screening-job-application
   bun install
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env
   # Add your GEMINI_API_KEY to .env
   ```

3. **Start services**:
   ```bash
   # Start ChromaDB and Redis
   docker-compose up -d

   # Start the application
   bun start
   # or with PM2
   pm2 start bun --name cv-screening -- src/server.ts
   ```

4. **Access the API**:
   - API: http://localhost:3000
   - Swagger UI: http://localhost:3000/swagger
   - Health Check: http://localhost:3000/health

## 📡 API Usage

### 1. Upload Documents
```bash
curl -X POST http://localhost:3000/upload \
  -F "cv=@path/to/cv.pdf" \
  -F "project-report=@path/to/project.pdf"
```

**Response**:
```json
{
  "cvDocumentId": "abc123",
  "projectReportId": "xyz789",
  "message": "Files uploaded and processed successfully"
}
```

### 2. Start Evaluation
```bash
curl -X POST http://localhost:3000/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "jobTitle": "Product Engineer (Backend)",
    "cvDocumentId": "abc123",
    "projectReportId": "xyz789"
  }'
```

**Response**:
```json
{
  "jobId": "job_456",
  "status": "queued",
  "message": "Evaluation started. Use jobId to track progress."
}
```

### 3. Check Results
```bash
curl http://localhost:3000/status/job_456
```

**Response**:
```json
{
  "id": "job_456",
  "status": "completed",
  "progress": 100,
  "result": {
    "cvEvaluation": {
      "technicalSkillsMatch": {"score": 5, "details": "..."},
      "experienceLevel": {"score": 4, "details": "..."},
      "relevantAchievements": {"score": 5, "details": "..."},
      "culturalFit": {"score": 4, "details": "..."}
    },
    "projectEvaluation": {
      "correctness": {"score": 4, "details": "..."},
      "codeQuality": {"score": 4, "details": "..."},
      "resilience": {"score": 4, "details": "..."},
      "documentation": {"score": 4, "details": "..."},
      "creativity": {"score": 3, "details": "..."}
    },
    "overallSummary": "...",
    "finalScore": {
      "cvScore": 4.6,
      "projectScore": 3.9,
      "overallScore": 4.25
    }
  }
}
```

## 📊 Scoring System

### CV Evaluation (1-5 scale)
- **Technical Skills Match** (40%): Backend technologies, databases, cloud, AI/LLM
- **Experience Level** (25%): Years of experience and project complexity
- **Relevant Achievements** (20%): Impact of past work and measurable outcomes
- **Cultural Fit** (15%): Communication, learning mindset, teamwork

### Project Evaluation (1-5 scale)
- **Correctness** (30%): Implementation of requirements, RAG, LLM chaining
- **Code Quality** (25%): Clean, modular, tested code
- **Resilience** (20%): Error handling, retries, production readiness
- **Documentation** (15%): README clarity, setup instructions
- **Creativity** (10%): Extra features and innovations

## 🏗️ Architecture

```
Client → Nginx (Port 80) → Hono API (Port 3000) → Bull Queue (Redis)
                                      ↓
                               ChromaDB + Gemini AI
```

## 🔧 Environment Variables

```bash
# Required
GEMINI_API_KEY=your_gemini_api_key

# Optional
PORT=3000
NODE_ENV=development
UPLOAD_DIR=./uploads
REDIS_URL=redis://localhost:6379
CHROMA_URL=http://localhost:8000
```

## 📝 License

Case study submission for backend developer evaluation.