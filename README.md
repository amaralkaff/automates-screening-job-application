# AI CV Evaluation System

Automated job application screening using AI to evaluate CVs and project reports.

## Features

- PDF document processing and text extraction
- AI-powered evaluation using Google Gemini
- Vector database for semantic search (ChromaDB)
- RESTful API with async job processing
- Standardized scoring system (1-5 scale)
- **Interactive Swagger UI for API testing**
- **Web-based test interface**

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

Server starts on port 3000.

## API Testing

### Option 1: Swagger UI (Recommended)
Open your browser and navigate to:
```
http://localhost:3000/swagger
```

The Swagger UI provides an interactive interface to:
- View all available endpoints
- See request/response schemas
- Test API calls directly from the browser
- View example requests and responses

### Option 2: Test Web UI
Open `test-ui.html` in your browser for a user-friendly interface to:
- Upload CV and project report files
- Start evaluations
- Monitor progress in real-time
- View detailed results

### Option 3: cURL Commands

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

## VPS Deployment

### Prerequisites
- VPS with Node.js 18+ or Bun installed
- Domain name (optional but recommended)
- SSL certificate (recommended for production)
- OpenAI API key

### Deployment Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/amaralkaff/automates-screening-job-application.git
   cd automates-screening-job-application
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   nano .env
   ```
   
   Update the following variables:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `PORT`: Server port (default: 3000)
   - `NODE_ENV`: Set to "production"
   - `CHROMA_PATH`: Path to ChromaDB data (default: ./chroma)
   - `UPLOAD_DIR`: Path to upload directory (default: ./uploads)

4. **Create necessary directories**:
   ```bash
   mkdir -p uploads chroma
   ```

5. **Initialize the database**:
   ```bash
   bun run init
   ```

6. **Build the application** (if using TypeScript):
   ```bash
   bun run build
   ```

7. **Start the server**:
   ```bash
   # Development
   bun start
   
   # Production (with PM2)
   pm2 start bun --name "cv-screening" -- start
   pm2 save
   pm2 startup
   ```

### Using PM2 for Process Management

1. **Install PM2**:
   ```bash
   npm install -g pm2
   ```

2. **Start the application**:
   ```bash
   pm2 start bun --name "cv-screening" -- start
   ```

3. **Monitor the application**:
   ```bash
   pm2 status
   pm2 logs cv-screening
   pm2 monit
   ```

4. **Auto-restart on server reboot**:
   ```bash
   pm2 startup
   pm2 save
   ```

### Nginx Configuration (Optional)

Create a reverse proxy with Nginx:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL Configuration (Recommended)

Use Let's Encrypt for free SSL certificates:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Security Considerations

- Keep `.env` file secure and never commit it to version control
- Use strong API keys
- Implement rate limiting for production
- Enable CORS only for trusted domains
- Regularly update dependencies
- Monitor logs for suspicious activity
- Set up firewall rules (ufw/iptables)

### Monitoring and Maintenance

- Use PM2 for process monitoring
- Set up log rotation to prevent disk space issues
- Monitor disk usage (uploads and database)
- Regularly backup the ChromaDB database
- Set up alerts for system resources

## License

Case study submission for backend developer evaluation.
