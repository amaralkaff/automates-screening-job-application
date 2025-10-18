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

// Middleware
app.use('*', cors({
  origin: config.corsOrigins,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use('*', logger());

// Routes
app.route('/', authRoutes);
app.route('/', apiRoutes);

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

console.log(`Server ready on http://localhost:${port}`);
console.log(`📚 Swagger UI available at http://localhost:${port}/swagger`);
console.log(`Environment: ${config.env.NODE_ENV}`);