#!/bin/bash

# Backup Script for Production Environment
# This script creates backups of the database and uploaded files

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

# Load environment variables
if [ -f .env ]; then
    set -a
    source .env
    set +a
else
    error ".env file not found"
fi

# Create backup directory with timestamp
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

log "Starting backup process..."

# Backup PostgreSQL database
log "Backing up PostgreSQL database..."
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U $POSTGRES_USER job_evaluation | gzip > "$BACKUP_DIR/database.sql.gz"

# Backup uploaded files
log "Backing up uploaded files..."
docker run --rm -v job-evaluation-prod_uploads_data:/data -v "$(pwd)/$BACKUP_DIR":/backup alpine tar czf /backup/uploads.tar.gz -C /data .

# Backup ChromaDB data
log "Backing up ChromaDB data..."
docker run --rm -v job-evaluation-prod_chromadb_data:/data -v "$(pwd)/$BACKUP_DIR":/backup alpine tar czf /backup/chromadb.tar.gz -C /data .

# Backup configuration files
log "Backing up configuration files..."
cp .env "$BACKUP_DIR/"
cp nginx/nginx.conf "$BACKUP_DIR/"
cp docker-compose.prod.yml "$BACKUP_DIR/"

# Create backup info file
cat > "$BACKUP_DIR/backup_info.txt" << EOF
Backup created: $(date)
Application: AI CV Screening System
Version: $APP_VERSION
Environment: Production

Contents:
- database.sql.gz: PostgreSQL database backup
- uploads.tar.gz: Uploaded files
- chromadb.tar.gz: ChromaDB vector data
- env.production: Environment configuration
- nginx.conf: Nginx configuration
- docker-compose.prod.yml: Docker Compose configuration

Restore Instructions:
1. Stop services: docker-compose -f docker-compose.prod.yml down
2. Restore volumes: docker run --rm -v job-evaluation-prod_postgres_data:/data -v $(pwd)/$BACKUP_DIR:/backup alpine tar xzf /backup/database.tar.gz -C /data
3. Start services: docker-compose -f docker-compose.prod.yml up -d
4. Restore database: gunzip -c database.sql.gz | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U $POSTGRES_USER job_evaluation
EOF

# Clean up old backups (keep last 7 days)
log "Cleaning up old backups..."
find backups/ -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true

log "Backup completed successfully!"
log "Backup location: $BACKUP_DIR"
log "Backup size: $(du -sh "$BACKUP_DIR" | cut -f1)"

# Verify backup integrity
log "Verifying backup integrity..."
if gzip -t "$BACKUP_DIR/database.sql.gz" && tar tzf "$BACKUP_DIR/uploads.tar.gz" >/dev/null && tar tzf "$BACKUP_DIR/chromadb.tar.gz" >/dev/null; then
    log "Backup integrity verified!"
else
    error "Backup integrity check failed!"
fi