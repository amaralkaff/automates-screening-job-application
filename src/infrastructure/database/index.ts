import { Pool, } from 'pg';
import { config } from '../../config';
import type { User, Session, Job, DocumentMetadata, EvaluationResult } from '../../shared/types';

interface QueryResultRow {
  [key: string]: unknown;
  id: string;
  job_title: string;
  cv_document_id: string;
  project_report_id: string;
  status: Job['status'];
  progress: number;
  result: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export class DatabaseService {
  private pool: Pool;

  constructor() {
    // Use DATABASE_URL if available, otherwise fallback to local SQLite
    if (config.env.DATABASE_URL) {
      this.pool = new Pool({
        connectionString: config.env.DATABASE_URL,
        max: 20, // Maximum number of connections in the pool
        idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
        connectionTimeoutMillis: 2000, // How long to wait when connecting a new client
      });
      console.log('🐘 Using PostgreSQL database');
    } else {
      throw new Error('DATABASE_URL is required for PostgreSQL connection');
    }

    // Initialize database
    this.initializeDatabase();
  }

  private safeJsonParse(data: unknown): unknown {
    if (!data) return null;
    
    // If it's already an object, return it directly
    if (typeof data === "object") return data;
    
    // If it's not a string, we can't parse it
    if (typeof data !== "string") return null;

    try {
      return JSON.parse(data);
    } catch (_error) {
      // Try to fix common JSON issues - unquoted property names
      try {
        // Fix unquoted property names by adding quotes around word characters followed by :
        // This handles cases like: { key: "value" } -> { "key": "value" }
        const fixedJson = data
          .replace(/(\w+):/g, '"$1":')
          .replace(/'/g, '"'); // Replace single quotes with double quotes

        return JSON.parse(fixedJson);
      } catch (_fixError) {
        console.error("Invalid JSON string:", data);
        return null;
      }
    }
  }

  private async initializeDatabase(): Promise<void> {
    try {
      // Test connection
      const client = await this.pool.connect();
      console.log('✅ PostgreSQL database connected successfully');

      // Check if tables exist
      const result = await client.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      `);

      if (result.rows.length === 0) {
        console.log('📋 Database tables not found. Please run the migration script.');
      } else {
        console.log('✅ Database tables exist');
      }

      client.release();
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw error;
    }
  }

  // User operations
  async createUser(user: Omit<User, 'id'> & { password: string }): Promise<User> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO users (email, name, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, email, name, created_at
      `;
      const result = await client.query(query, [user.email.toLowerCase(), user.name, user.password]);
      const row = result.rows[0];

      return {
        id: row.id,
        email: row.email,
        name: row.name
      };
    } finally {
      client.release();
    }
  }

  async getUserByEmail(email: string): Promise<(User & { password: string }) | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, email, name, password_hash as password, created_at, updated_at, last_login
        FROM users
        WHERE email = $1
      `;
      const result = await client.query(query, [email.toLowerCase()]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async getUserById(id: string): Promise<User | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, email, name, created_at, updated_at, last_login
        FROM users
        WHERE id = $1
      `;
      const result = await client.query(query, [id]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async updateUserLastLogin(id: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    } finally {
      client.release();
    }
  }

  // Session operations
  async createSession(session: { userId: string; token: string; user: User }): Promise<Session> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO sessions (user_id, token, expires_at)
        VALUES ($1, $2, $3)
        RETURNING id, token, created_at
      `;
      const expiresAt = new Date(Date.now() + config.session.expiresIn);
      const _result = await client.query(query, [session.userId, session.token, expiresAt]);

      return {
        token: session.token,
        user: session.user
      };
    } finally {
      client.release();
    }
  }

  async getSessionByToken(token: string): Promise<(Session & { userId: string; expiresAt: string }) | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT s.id, s.user_id as userId, s.token, s.expires_at as expiresAt,
               u.id as user_id, u.email, u.name
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = $1 AND s.expires_at > CURRENT_TIMESTAMP
      `;
      const result = await client.query(query, [token]);
      const row = result.rows[0];

      if (!row) return null;

      // Update last accessed time
      await this.updateSessionLastAccessed(token);

      return {
        token: row.token,
        user: {
          id: row.user_id,
          email: row.email,
          name: row.name
        },
        userId: row.userId,
        expiresAt: row.expiresAt
      };
    } finally {
      client.release();
    }
  }

  async updateSessionLastAccessed(token: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('UPDATE sessions SET last_accessed = CURRENT_TIMESTAMP WHERE token = $1', [token]);
    } finally {
      client.release();
    }
  }

  async deleteSession(token: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('DELETE FROM sessions WHERE token = $1', [token]);
    } finally {
      client.release();
    }
  }

  async deleteSessionsByUserId(userId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    } finally {
      client.release();
    }
  }

  // Cleanup expired sessions
  async cleanupExpiredSessions(): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP
      `);
      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  // Job operations
  async createJob(job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'> & { userId: string }): Promise<Job> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO jobs (user_id, job_title, cv_document_id, project_report_id, status, progress, result, error)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, job_title, cv_document_id, project_report_id, status, progress, result, error, created_at, updated_at
      `;
      const result = await client.query(query, [
        job.userId,
        job.jobTitle,
        job.cvDocumentId,
        job.projectReportId,
        job.status,
        job.progress || 0,
        job.result ? JSON.stringify(job.result) : null,
        job.error || null
      ]);
      const row = result.rows[0];

      return {
        id: row.id,
        jobTitle: row.job_title,
        cvDocumentId: row.cv_document_id,
        projectReportId: row.project_report_id,
        status: row.status,
        progress: row.progress,
        result: row.result ? (this.safeJsonParse(row.result) as EvaluationResult) : undefined,
        error: row.error,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    } finally {
      client.release();
    }
  }

  async getJobById(id: string): Promise<Job | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, job_title, cv_document_id, project_report_id, status, progress, result, error, created_at, updated_at
        FROM jobs
        WHERE id = $1
      `;
      const result = await client.query(query, [id]);
      const row = result.rows[0];

      if (!row) return null;

      return {
        id: row.id,
        jobTitle: row.job_title,
        cvDocumentId: row.cv_document_id,
        projectReportId: row.project_report_id,
        status: row.status,
        progress: row.progress,
        result: row.result ? (this.safeJsonParse(row.result) as EvaluationResult) : undefined,
        error: row.error,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    } finally {
      client.release();
    }
  }

  async updateJobStatus(id: string, status: Job['status'], progress?: number, result?: Record<string, unknown>, error?: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE jobs
        SET status = $1, progress = $2, result = $3, error = $4
        WHERE id = $5
      `;
      await client.query(query, [
        status,
        progress || 0,
        result ? JSON.stringify(result) : null,
        error || null,
        id
      ]);
    } finally {
      client.release();
    }
  }

  async getJobsByUserId(userId: string): Promise<Job[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, job_title, cv_document_id, project_report_id, status, progress, result, error, created_at, updated_at
        FROM jobs
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;
      const result = await client.query(query, [userId]);

      return result.rows.map((row: QueryResultRow) => ({
        id: row.id,
        jobTitle: row.job_title,
        cvDocumentId: row.cv_document_id,
        projectReportId: row.project_report_id,
        status: row.status,
        progress: row.progress,
        result: row.result ? (this.safeJsonParse(row.result) as EvaluationResult) : undefined,
        error: row.error || undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } finally {
      client.release();
    }
  }

  async getAllJobs(): Promise<Job[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, job_title, cv_document_id, project_report_id, status, progress, result, error, created_at, updated_at
        FROM jobs
        ORDER BY created_at DESC
      `;
      const result = await client.query(query);

      return result.rows.map((row: QueryResultRow) => ({
        id: row.id,
        jobTitle: row.job_title,
        cvDocumentId: row.cv_document_id,
        projectReportId: row.project_report_id,
        status: row.status,
        progress: row.progress,
        result: row.result ? (this.safeJsonParse(row.result) as EvaluationResult) : undefined,
        error: row.error || undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } finally {
      client.release();
    }
  }

  // Document metadata operations
  async createDocumentMetadata(metadata: {
    userId: string;
    type: string;
    filename: string;
    filePath?: string;
    fileSize?: number;
    mimeType?: string;
    processed?: boolean;
    chromaCollectionId?: string;
  }): Promise<DocumentMetadata> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO document_metadata (user_id, type, filename, file_path, file_size, mime_type, processed, chroma_collection_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, type, filename, created_at, processed
      `;
      const result = await client.query(query, [
        metadata.userId,
        metadata.type,
        metadata.filename,
        metadata.filePath || '',
        metadata.fileSize || 0,
        metadata.mimeType || '',
        metadata.processed || false,
        metadata.chromaCollectionId || null
      ]);
      const row = result.rows[0];

      return {
        id: row.id,
        type: row.type as DocumentMetadata['type'],
        filename: row.filename,
        uploadedAt: new Date(row.created_at),
        processed: row.processed,
        userId: metadata.userId,
        filePath: metadata.filePath,
        fileSize: metadata.fileSize,
        mimeType: metadata.mimeType,
        chromaCollectionId: metadata.chromaCollectionId
      };
    } finally {
      client.release();
    }
  }

  async updateDocumentProcessed(id: string, processed: boolean, chromaCollectionId?: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE document_metadata
        SET processed = $1, chroma_collection_id = $2
        WHERE id = $3
      `;
      await client.query(query, [processed, chromaCollectionId || null, id]);
    } finally {
      client.release();
    }
  }

  async getDocumentById(id: string): Promise<DocumentMetadata | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT id, type, filename, created_at, processed
        FROM document_metadata
        WHERE id = $1
      `;
      const result = await client.query(query, [id]);
      const row = result.rows[0];

      if (!row) return null;

      return {
        id: row.id,
        type: row.type,
        filename: row.filename,
        uploadedAt: new Date(row.created_at),
        processed: row.processed
      };
    } finally {
      client.release();
    }
  }

  // Statistics
  async getStats() {
    const client = await this.pool.connect();
    try {
      const userCount = await client.query('SELECT COUNT(*) as count FROM users');
      const sessionCount = await client.query('SELECT COUNT(*) as count FROM sessions WHERE expires_at > CURRENT_TIMESTAMP');
      const jobCount = await client.query('SELECT COUNT(*) as count FROM jobs');

      return {
        totalUsers: parseInt(userCount.rows[0].count, 10),
        activeSessions: parseInt(sessionCount.rows[0].count, 10),
        totalJobs: parseInt(jobCount.rows[0].count, 10)
      };
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export const db = new DatabaseService();