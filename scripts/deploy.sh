#!/bin/bash

# Production Deployment Script
# This script deploys the AI CV Screening System to production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Check if running as root (for production deployment)
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root for security reasons"
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    error "Docker is not installed. Please install Docker first."
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose is not installed. Please install Docker Compose first."
fi

# Check if .env exists
if [ ! -f .env ]; then
    error ".env file not found. Please create it from .env.example and configure for production."
fi

# Load environment variables
set -a
source .env
set +a

# Validate required environment variables
required_vars=("GEMINI_API_KEY" "BETTER_AUTH_SECRET" "DOMAIN")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ] || [ "${!var}" = "your-domain.com" ] || [ "${!var}" = "your-production-"* ]; then
        error "Environment variable $var is not set or is using a placeholder value. Please update .env"
    fi
done

log "Starting production deployment..."

# Create necessary directories
log "Creating necessary directories..."
mkdir -p nginx/ssl
mkdir -p logs
mkdir -p backups

# SSL Certificate Check
if [ ! -f nginx/ssl/cert.pem ] || [ ! -f nginx/ssl/key.pem ]; then
    warn "SSL certificates not found. Generating self-signed certificates for testing..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    warn "Self-signed certificates generated. For production, replace with proper certificates."
fi

# Stop existing services
log "Stopping existing services..."
docker-compose -f docker-compose.prod.yml down || true

# Pull latest images
log "Pulling latest images..."
docker-compose -f docker-compose.prod.yml pull

# Build application
log "Building application..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Start services
log "Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
log "Waiting for services to be healthy..."
sleep 30

# Check service health
max_attempts=30
attempt=1
while [ $attempt -le $max_attempts ]; do
    if curl -f http://localhost/health > /dev/null 2>&1; then
        log "Application is healthy!"
        break
    fi

    if [ $attempt -eq $max_attempts ]; then
        error "Application failed to become healthy after $max_attempts attempts"
    fi

    log "Waiting for application to be healthy... (attempt $attempt/$max_attempts)"
    sleep 10
    ((attempt++))
done

# Run database migrations if needed
log "Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T app bun run src/init.ts || true

# Create backup
log "Creating initial backup..."
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U $POSTGRES_USER job_evaluation > backups/initial_backup_$(date +%Y%m%d_%H%M%S).sql

log "Deployment completed successfully!"
log "Application is available at: http://localhost"
log "API is available at: http://localhost/api"
log "Swagger documentation: http://localhost/swagger"
log "Health check: http://localhost/health"

# Show running containers
log "Running containers:"
docker-compose -f docker-compose.prod.yml ps

log "To view logs: docker-compose -f docker-compose.prod.yml logs -f"
log "To stop services: docker-compose -f docker-compose.prod.yml down"