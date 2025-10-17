# AI CV Evaluation System

A backend service that automates the initial screening of job applications using AI-powered evaluation of CVs and project reports.

## 🚀 Features

- **RESTful API** for uploading and evaluating candidate documents
- **PDF Processing** with text extraction and chunking
- **Vector Database** (ChromaDB) for semantic search and RAG
- **AI Evaluation Pipeline** using Google Gemini with LLM chaining
- **Asynchronous Processing** with job queue system
- **Standardized Scoring** based on predefined rubrics
- **Error Handling & Resilience** with retry mechanisms

## 📋 Architecture & Design

### System Components

1. **Document Processor**: Extracts text from PDFs, chunks content, and stores in vector database
2. **Evaluation Pipeline**: Orchestrates LLM calls for CV and project evaluation
3. **Job Queue**: Manages asynchronous evaluation tasks
4. **Vector Database**: ChromaDB with Google Gemini embeddings for RAG
5. **API Server**: Hono-based REST API with file upload support

### AI Workflow

1. **CV Evaluation**:
   - Retrieve candidate CV and job requirements from vector DB
   - Evaluate technical skills, experience, achievements, and cultural fit
   - Score 1-5 with detailed reasoning

2. **Project Report Evaluation**:
   - Retrieve project report and case study requirements
   - Evaluate correctness, code quality, resilience, documentation, creativity
   - Score 1-5 with detailed reasoning

3. **Final Synthesis**:
   - Generate comprehensive summary highlighting strengths and areas for improvement
   - Calculate weighted scores for final evaluation

### Design Decisions

- **ChromaDB + Gemini Embeddings**: Semantic search for accurate context retrieval
- **Async Processing**: Non-blocking evaluation with job tracking
- **LLM Chaining**: Structured evaluation pipeline with specialized prompts
- **Temperature Control**: Low temperature (0.2-0.4) for consistent evaluations
- **Retry Logic**: Exponential backoff for API failures
- **Modular Architecture**: Separated concerns for maintainability

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+ or Bun
- Google Gemini API key

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd automates-screening-job-application
   bun install
   ```

2. **Set up environment variables**:
   ```bash
   # Edit .env with your Gemini API key
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Start the server**:
   ```bash
   bun start
   ```

The server will automatically:
- Initialize the vector database
- Ingest reference documents (job description, case study, scoring rubrics)
- Start listening on port 3001

## 📡 API Endpoints

### POST `/upload`
Upload and process CV and Project Report PDFs.

**Request**: `multipart/form-data`
- `cv`: PDF file (candidate's CV)
- `project-report`: PDF file (candidate's project report)

**Response**:
```json
{
  "cvDocumentId": "abc123",
  "projectReportId": "def456",
  "message": "Files uploaded and processed successfully"
}
```

### POST `/evaluate`
Start evaluation pipeline for uploaded documents.

**Request Body**:
```json
{
  "jobTitle": "Product Engineer (Backend)",
  "cvDocumentId": "abc123",
  "projectReportId": "def456"
}
```

**Response**:
```json
{
  "jobId": "job789",
  "status": "queued",
  "message": "Evaluation started. Use jobId to track progress."
}
```

### GET `/status/:jobId`
Check evaluation status and retrieve results.

**Response**:
```json
{
  "id": "job789",
  "status": "completed",
  "progress": 100,
  "result": {
    "cvEvaluation": {
      "technicalSkillsMatch": {
        "score": 4,
        "details": "Strong backend skills with modern frameworks"
      },
      "experienceLevel": {
        "score": 4,
        "details": "3-4 years with mid-scale projects"
      },
      "relevantAchievements": {
        "score": 3,
        "details": "Some measurable outcomes"
      },
      "culturalFit": {
        "score": 4,
        "details": "Good communication and learning mindset"
      }
    },
    "projectEvaluation": {
      "correctness": { "score": 4, "details": "Meets requirements well" },
      "codeQuality": { "score": 4, "details": "Clean, modular code" },
      "resilience": { "score": 4, "details": "Good error handling" },
      "documentation": { "score": 4, "details": "Clear explanations" },
      "creativity": { "score": 3, "details": "Useful extras" }
    },
    "overallSummary": "Strong candidate with solid technical skills and good project implementation. Recommended for further consideration.",
    "finalScore": {
      "cvScore": 3.85,
      "projectScore": 3.8,
      "overallScore": 3.83
    }
  },
  "createdAt": "2025-01-17T10:30:00.000Z",
  "updatedAt": "2025-01-17T10:35:00.000Z"
}
```

### GET `/jobs`
List all evaluation jobs (for debugging).

### GET `/health`
Health check endpoint.

## 🧪 Testing

### Test the API

1. **Start the server**:
   ```bash
   bun start
   ```

2. **Upload files** (using curl or Postman):
   ```bash
   curl -X POST http://localhost:3001/upload \
     -F "cv=@candidate-cv.pdf" \
     -F "project-report=@project-report.pdf"
   ```

3. **Start evaluation**:
   ```bash
   curl -X POST http://localhost:3001/evaluate \
     -H "Content-Type: application/json" \
     -d '{
       "jobTitle": "Product Engineer (Backend)",
       "cvDocumentId": "abc123",
       "projectReportId": "def456"
     }'
   ```

4. **Check status**:
   ```bash
   curl http://localhost:3001/status/job789
   ```

## 📊 Scoring System

### CV Evaluation (Weighted)
- **Technical Skills Match** (40%): Alignment with backend requirements
- **Experience Level** (25%): Years and complexity of experience
- **Relevant Achievements** (20%): Impact and scale of past work
- **Cultural Fit** (15%): Communication and collaboration skills

### Project Evaluation (Weighted)
- **Correctness** (30%): Meets requirements, proper implementation
- **Code Quality** (25%): Clean, modular, tested code
- **Resilience** (20%): Error handling and robustness
- **Documentation** (15%): Clear explanations and setup
- **Creativity** (10%): Additional features and improvements

## 🛡️ Error Handling & Resilience

### API Failures
- **Exponential Backoff**: Retry failed LLM calls with increasing delays
- **Timeout Handling**: 30-second timeouts for LLM responses
- **Fallback Responses**: Default scores when evaluation fails
- **Error Logging**: Comprehensive error tracking for debugging

### Data Validation
- **File Type Checking**: Only PDF files accepted
- **Request Validation**: Zod schemas for API requests
- **JSON Parsing**: Safe parsing with fallback values
- **Score Range Validation**: Ensure scores stay within 1-5 range

### Job Processing
- **Async Processing**: Non-blocking evaluation pipeline
- **Progress Tracking**: Real-time progress updates
- **Status Management**: Clear job states (queued, processing, completed, failed)
- **Cleanup**: Automatic cleanup of old jobs (24-hour retention)

## 🔄 Trade-offs & Considerations

### Technical Decisions

1. **ChromaDB vs Production Vector DB**: ChromaDB chosen for simplicity, but consider Pinecone/Weaviate for production scale
2. **Gemini vs Other LLMs**: Gemini offers good performance-to-cost ratio, but GPT-4 may provide more consistent results
3. **In-memory Job Queue**: Simple implementation works for single-instance, but consider Redis for distributed systems
4. **PDF Processing**: Current implementation extracts text only, could add OCR for scanned documents

### Performance Considerations

- **Embedding Caching**: Consider caching embeddings for repeated queries
- **Batch Processing**: For high-volume scenarios, implement batch evaluation
- **Rate Limiting**: Add API rate limiting to prevent abuse
- **Database Optimization**: Add proper indexing for job queries

### Scalability Limitations

- **Single Instance**: Current design works for single-server deployment
- **Memory Usage**: Large PDFs may impact memory consumption
- **Concurrent Evaluations**: Limited by Gemini API rate limits
- **File Storage**: Local file system not suitable for production

## 🚀 Future Improvements

1. **Database Migration**: Move to PostgreSQL with proper job persistence
2. **Authentication**: Add API key authentication for security
3. **Webhook Support**: Notify clients when evaluation completes
4. **Evaluation Templates**: Support for different job roles and requirements
5. **Dashboard**: Web interface for monitoring evaluations
6. **A/B Testing**: Compare different evaluation prompts and models
7. **Audit Trail**: Track evaluation history and model versions
8. **Performance Metrics**: Add monitoring and alerting

## 📝 License

This project is part of a case study submission for backend developer evaluation.

## 🤝 Contributing

This is a demonstration project. For production use, consider the scalability improvements mentioned above.# automates-screening-job-application
