import { z } from 'zod';

const envSchema = z.object({
  // Server
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FORCE_HTTPS: z.string().transform(val => val === 'true').optional(),

  // APIs
  GEMINI_API_KEY: z.string().optional(),

  // ChromaDB
  CHROMA_URL: z.string().default('http://localhost:8000'),
  CHROMA_TENANT: z.string().optional(),
  CHROMA_API_KEY: z.string().optional(),

  // File handling
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.string().transform(Number).default('10485760'),

  // Queue
  QUEUE_CONCURRENCY: z.string().transform(Number).default('3'),

  // Database
  DATABASE_URL: z.string().optional(),
  DATABASE_PATH: z.string().default('./data/app.db'),
  DATA_DIR: z.string().default('./data'),

  // Security
  SESSION_SECRET: z.string().optional(),
});

function generateDefaultSecret(): string {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set in production');
  }
  const crypto = require('node:crypto');
  return crypto.randomBytes(32).toString('hex');
}

function safeParseEnv() {
  // Provide default session secret for development
  if (!process.env.SESSION_SECRET && process.env.NODE_ENV !== 'production') {
    process.env.SESSION_SECRET = generateDefaultSecret();
    console.log('🔑 Generated default SESSION_SECRET for development');
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.warn('⚠️  Environment configuration issues:');
    result.error.issues.forEach(issue => {
      console.warn(`  - ${issue.path.join('.')}: ${issue.message}`);
    });

    // Continue with partial environment for development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Continuing in development mode with defaults...');
      return envSchema.parse(process.env);
    }

    throw new Error('Environment configuration failed');
  }

  return result.data;
}

export type Env = z.infer<typeof envSchema>;

export const config = {
  env: safeParseEnv(),
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // CORS origins - simple configuration (not used when origin: true)
  get corsOrigins() {
    // Keeping this for compatibility, but using simple CORS with origin: true
    return [
      'http://localhost:3000',
      'https://localhost:3000',
      'http://localhost:5173',
      'https://localhost:5173',
      'http://localhost:3001',
      'https://localhost:3001',
      'http://amangly.web.id',
      'https://amangly.web.id',
      'https://exquisite-beijinho-f79139.netlify.app'
    ];
  },

  // Server URLs for generating links and redirects
  get serverUrl() {
    // Determine protocol based on environment and FORCE_HTTPS setting
    let protocol = 'http';
    if (this.isProduction || this.env.FORCE_HTTPS) {
      protocol = 'https';
    }

    const host = this.isProduction ? 'amangly.web.id' : 'localhost';
    const port = this.env.PORT;

    // In production or when forcing HTTPS, use standard HTTPS port (443), otherwise use the configured port
    const displayPort = (this.isProduction || this.env.FORCE_HTTPS) ? '' : `:${port}`;

    return `${protocol}://${host}${displayPort}`;
  },

  // File validation
  allowedMimeTypes: [
    'application/pdf',
    'text/plain'
  ],

  // Session settings
  session: {
    expiresIn: 7 * 24 * 60 * 60 * 1000, // 7 days
    cookieName: 'session',
  }
};