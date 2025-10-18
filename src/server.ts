import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { swaggerUI } from '@hono/swagger-ui';
import { config } from './config';
import authRoutes from './interfaces/routes/auth';
import apiRoutes from './interfaces/routes/api';
import { createOpenAPISpec } from './shared/utils/openapi';

const app = new Hono();

// Simple CORS configuration - less strict
const corsOptions = {
  origin: ['*'], // Allow all origins - using array format for Hono compatibility
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  optionsSuccessStatus: 200
};

// Apply CORS middleware to all routes
app.use('*', cors(corsOptions));

// Handle preflight requests explicitly for all routes
app.options('*', cors(corsOptions));

app.use('*', logger());

// Security headers middleware
app.use('*', async (c, next) => {
  // Add security headers
  c.res.headers.set('X-Content-Type-Options', 'nosniff');
  c.res.headers.set('X-Frame-Options', 'DENY');
  c.res.headers.set('X-XSS-Protection', '1; mode=block');
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (config.isProduction) {
    // HSTS in production (HTTPS only)
    c.res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    // Content Security Policy for production
    c.res.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;");
  } else {
    // More permissive CSP for development
    c.res.headers.set('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' http: https: ws: wss:;");
  }

  await next();
});

// Routes
app.route('/', authRoutes);
app.route('/', apiRoutes);

// Additional auth routes for API compatibility (support both /api/auth/* and /auth/*)
app.route('/api', authRoutes);

// Explicit CORS preflight handling for auth endpoints
app.options('/api/auth/*', cors(corsOptions));
app.options('/auth/*', cors(corsOptions));

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.env.NODE_ENV
  });
});

// OpenAPI specification
const openAPISpec = createOpenAPISpec();

// Swagger UI
app.get('/swagger', swaggerUI({ url: '/api-spec' }));

// OpenAPI Spec endpoint
app.get('/api-spec', (c) => {
  return c.json(openAPISpec);
});

// Start server
const port = Number.parseInt(config.env.PORT, 10);

serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0',
});

console.log(`Server ready on ${config.serverUrl}`);
console.log(`📚 Swagger UI available at ${config.serverUrl}/swagger`);
console.log(`🔗 API endpoints available at ${config.serverUrl}/api`);
console.log(`🔐 Auth endpoints available at ${config.serverUrl}/auth`);
console.log(`Environment: ${config.env.NODE_ENV}`);
console.log(`CORS Origins: ${config.isDevelopment ? 'Permissive (development mode)' : 'Restricted (production mode)'}`);

// Log a helpful message about HTTPS in production
if (config.isProduction) {
  console.log('🔒 Running in production mode with HTTPS URLs');
  console.log('⚠️  Ensure SSL certificates are properly configured');
} else {
  console.log('🛠️  Running in development mode');
  console.log('💡 Tip: Use HTTPS URLs to avoid mixed content issues in development');
}