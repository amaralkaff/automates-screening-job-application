# AI CV Screening System

 **Automated job application screening using AI with Gemini AI, ChromaDB (Vector Database), Hono API, PostgreSQL and Docker.**

## ARCHITECTURE

![architecture](architecture.png)

## Quick Start

### 1. Get Gemini API Key
- Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
- Copy your API key

### 2. Setup Environment
```bash
cp .env.example .env
```

Edit `.env` and add your API key:
```bash
GEMINI_API_KEY=your-gemini-api-key-here
```

**Important for Docker:** Make sure your `.env` file has the correct Docker configuration:
```bash
# For Docker usage (already set in docker-compose.yml)
CHROMA_URL=http://chromadb:8000
DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/job_evaluation
```

### 3. Start Application
```bash
docker-compose up -d
```

### 4. Access Application
- **API**: http://localhost:3000
- **Swagger**: http://localhost:3000/swagger
- **Health**: http://localhost:3000/health

## API Usage

Visit **Swagger Documentation** at http://localhost:3000/swagger for:

- 📖 **Complete API Documentation**
- 🧪 **Interactive API Testing**
- 📝 **Request/Response Examples**
- 🔍 **Authentication Guide**

### Quick API Workflow:
1. **Create Account** → `/api/auth/signup`
2. **Upload Documents** → `/api/upload`
3. **Start Evaluation** → `/api/evaluate`
4. **Check Results** → `/api/status/{jobId}`

All endpoints include detailed examples and can be tested directly in Swagger!

## Docker Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Rebuild and start (use after configuration changes)
docker-compose down
docker-compose up --build

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

## Troubleshooting

### ChromaDB Connection Issues
If you see "ChromaDB initialization temporarily skipped", ensure:
1. Your `.env` file has `CHROMA_URL=http://chromadb:8000` (not localhost)
2. Rebuild containers after changing configuration:
   ```bash
   docker-compose down
   docker-compose up --build
   ```

### Port already in use?
```bash
lsof -i :3000
kill -9 <PID>
```

### Check services:
```bash
docker-compose ps
curl http://localhost:3000/health
```

### View specific service logs:
```bash
# App logs
docker-compose logs -f app

# ChromaDB logs
docker-compose logs -f chromadb

# Database logs
docker-compose logs -f postgres
```

## Development Setup

For local development (without Docker):

1. Install dependencies:
```bash
bun install
```

2. Start PostgreSQL and ChromaDB:
```bash
docker-compose up postgres chromadb -d
```

3. Run the application:
```bash
bun run dev
```

## License

Case study submission for backend developer evaluation.