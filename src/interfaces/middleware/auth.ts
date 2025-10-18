import { authService } from '../../core/auth';
import type { MiddlewareHandler } from 'hono';

// Middleware to protect routes that require authentication
export const requireAuth: MiddlewareHandler = async (c, next) => {
  const session = await authService.getSession(
    c.req.header('Authorization'),
    c.req.header('Cookie')
  );

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Add user and session to context for downstream handlers
  c.set('user', session.user);
  c.set('session', session);

  await next();
};

// Optional auth middleware - doesn't fail if not authenticated
export const optionalAuth: MiddlewareHandler = async (c, next) => {
  const session = await authService.getSession(
    c.req.header('Authorization'),
    c.req.header('Cookie')
  );

  if (session) {
    c.set('user', session.user);
    c.set('session', session);
  }

  await next();
};