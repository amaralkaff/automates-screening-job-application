import { Hono } from 'hono';
import { authService } from '../../core/auth';
import { config } from '../../config';

const router = new Hono();

// Sign up
router.post('/auth/sign-up', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name } = body;

    // Input validation
    if (!email || !password || !name) {
      return c.json({
        error: 'Missing required fields',
        details: {
          email: !email ? 'Email is required' : null,
          password: !password ? 'Password is required' : null,
          name: !name ? 'Name is required' : null
        }
      }, 400);
    }

    // Type validation
    if (typeof email !== 'string' || typeof password !== 'string' || typeof name !== 'string') {
      return c.json({
        error: 'Invalid input types',
        details: 'All fields must be strings'
      }, 400);
    }

    const user = await authService.signUp(email, password, name);

    return c.json({
      message: 'User created successfully',
      user
    });
  } catch (error: unknown) {
    const status = error instanceof Error && error.message.includes('already exists') ? 409 : 400;
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    }, status);
  }
});

// Sign in
router.post('/auth/sign-in', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    // Input validation
    if (!email || !password) {
      return c.json({
        error: 'Missing required fields',
        details: {
          email: !email ? 'Email is required' : null,
          password: !password ? 'Password is required' : null
        }
      }, 400);
    }

    // Type validation
    if (typeof email !== 'string' || typeof password !== 'string') {
      return c.json({
        error: 'Invalid input types',
        details: 'Email and password must be strings'
      }, 400);
    }

    const session = await authService.signIn(email, password);

    // Set session in a cookie with secure options
    const cookieOptions = [
      `session=${session.token}`,
      'HttpOnly',
      'Path=/',
      `Max-Age=${config.session.expiresIn / 1000}`,
      config.isProduction ? 'Secure' : '',
      config.isProduction ? 'SameSite=Strict' : 'SameSite=Lax'
    ].filter(Boolean).join('; ');

    c.res.headers.set('Set-Cookie', cookieOptions);

    return c.json({
      message: 'Sign in successful',
      user: session.user,
      sessionToken: session.token
    });
  } catch (error: unknown) {
    return c.json({
      error: error instanceof Error ? error.message : 'Authentication failed',
      status: 'error'
    }, 401);
  }
});

// Sign out
router.post('/auth/sign-out', async (c) => {
  try {
    await authService.signOut(
      c.req.header('Authorization'),
      c.req.header('Cookie')
    );

    // Clear cookie
    c.res.headers.set('Set-Cookie',
      'session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax'
    );

    return c.json({
      message: 'Signed out successfully',
      status: 'success'
    });
  } catch (error: unknown) {
    return c.json({
      error: error instanceof Error ? error.message : 'Sign out failed',
      status: 'error'
    }, 500);
  }
});

// Get current user
router.get('/auth/me', async (c) => {
  try {
    const session = await authService.getSession(
      c.req.header('Authorization'),
      c.req.header('Cookie')
    );

    if (!session) {
      return c.json({
        user: null,
        error: 'Not authenticated',
        status: 'error'
      }, 401);
    }

    return c.json({
      user: session.user,
      status: 'success'
    });
  } catch (error: unknown) {
    return c.json({
      user: null,
      error: error instanceof Error ? error.message : 'Failed to get user',
      status: 'error'
    }, 500);
  }
});

export default router;