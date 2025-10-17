# AI CV Evaluation System

Automated job application screening using AI to evaluate CVs and project reports.

## Features

- PDF document processing and text extraction
- AI-powered evaluation using Google Gemini
- Vector database for semantic search
- RESTful API with async job processing
- Standardized scoring system (1-5 scale)

## Setup

### Prerequisites
- Node.js 18+ or Bun
- Google Gemini API key
- ChromaDB (vector database)

### Installation

1. **Install dependencies**:
   ```bash
   bun install
   bun add chromadb
   ```

2. **Start ChromaDB** (required for vector storage):
   ```bash
   bunx chroma run
   ```
   ChromaDB will start on http://localhost:8000

3. **Set environment variables**:
   ```bash
   export GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Start the server**:
   ```bash
   bun start
   ```

Server starts on port 3000 and connects to ChromaDB automatically.

## API Endpoints

### POST `/upload`
Upload CV and project report PDFs.
- **cv**: PDF file (candidate's CV)
- **project-report**: PDF file (candidate's project report)

Returns document IDs for evaluation.

### POST `/evaluate`
Start evaluation for uploaded documents.
```json
{
  "jobTitle": "Product Engineer (Backend)",
  "cvDocumentId": "abc123",
  "projectReportId": "def456"
}
```

Returns job ID for tracking.

### GET `/status/:jobId`
Check evaluation progress and results.

### GET `/health`
Health check endpoint.

## Testing

1. **Upload files**:
   ```bash
   curl -X POST http://localhost:3001/upload \
     -F "cv=@cv.pdf" \
     -F "project-report=@project.pdf"
   ```

2. **Start evaluation**:
   ```bash
   curl -X POST http://localhost:3001/evaluate \
     -H "Content-Type: application/json" \
     -d '{"jobTitle": "Backend Engineer", "cvDocumentId": "abc123", "projectReportId": "def456"}'
   ```

3. **Check results**:
   ```bash
   curl http://localhost:3001/status/job789
   ```

## Scoring

### CV Evaluation (1-5 scale)
- Technical Skills (40%)
- Experience Level (25%)
- Achievements (20%)
- Cultural Fit (15%)

### Project Evaluation (1-5 scale)
- Correctness (30%)
- Code Quality (25%)
- Resilience (20%)
- Documentation (15%)
- Creativity (10%)

## License

Case study submission for backend developer evaluation.
