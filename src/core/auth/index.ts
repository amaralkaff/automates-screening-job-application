import type { User, Session } from '../../shared/types';
import { config } from '../../config';
import { db } from '../../infrastructure/database';
import jwt from 'jsonwebtoken';

export class AuthService {
  // Validation helpers
  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
  }

  private validatePassword(password: string): void {
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
  }

  private validateName(name: string): void {
    if (!name || name.trim().length < 2) {
      throw new Error('Name must be at least 2 characters long');
    }
  }

  async signUp(email: string, password: string, name: string): Promise<User> {
    // Input validation
    this.validateEmail(email);
    this.validatePassword(password);
    this.validateName(name);

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await db.getUserByEmail(normalizedEmail);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Create user (password should be hashed in production)
    const user = await db.createUser({
      email: normalizedEmail,
      name: name.trim(),
      password // In production, hash this password!
    });

    return user;
  }

  async signIn(email: string, password: string): Promise<Session> {
    // Input validation
    this.validateEmail(email);

    if (!password) {
      throw new Error('Password is required');
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Get user from database
    const user = await db.getUserByEmail(normalizedEmail);
    if (!user || user.password !== password) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await db.updateUserLastLogin(user.id);

    // Generate JWT token
    const jwtToken = this.generateJWTToken(user);

    // Create session in database (optional, for tracking)
    const session = await db.createSession({
      userId: user.id,
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });

    return {
      token: jwtToken,
      user: session.user
    };
  }

  async getSession(authHeader?: string, cookieHeader?: string): Promise<Session | null> {
    let token = '';

    // Try Bearer token first
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (cookieHeader) {
      // Try session cookie
      const cookies = this.parseCookies(cookieHeader);
      token = cookies.session || '';
    }

    if (!token) {
      return null;
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, config.env.SESSION_SECRET || 'fallback-secret') as { userId: string; email: string; name: string };

      // Get user from database to ensure user still exists
      const user = await db.getUserById(decoded.userId);
      if (!user) {
        return null;
      }

      return {
        token: token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      };
    } catch (_error) {
      // Invalid JWT token
      return null;
    }
  }

  async signOut(authHeader?: string, cookieHeader?: string): Promise<void> {
    let token = '';

    // Try Bearer token first
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (cookieHeader) {
      // Try session cookie
      const cookies = this.parseCookies(cookieHeader);
      token = cookies.session || '';
    }

    if (token) {
      await db.deleteSession(token);
    }
  }

  async signOutAllSessions(authHeader?: string, cookieHeader?: string): Promise<void> {
    // Get current session to find user ID
    const currentSession = await this.getSession(authHeader, cookieHeader);
    if (currentSession) {
      const sessionData = await db.getSessionByToken(currentSession.token);
      if (sessionData) {
        await db.deleteSessionsByUserId(sessionData.userId);
      }
    }
  }

  // Cleanup expired sessions (can be called periodically)
  async cleanupExpiredSessions(): Promise<number> {
    return await db.cleanupExpiredSessions();
  }

  private generateJWTToken(user: User): string {
    // Create JWT payload
    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      iat: Math.floor(Date.now() / 1000), // issued at
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // expires in 24 hours
    };

    // Sign and return JWT token
    return jwt.sign(payload, config.env.SESSION_SECRET || 'fallback-secret');
  }

  private parseCookies(cookieHeader: string): Record<string, string> {
    return cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
  }

  // Debug methods
  async getUsers() {
    // For debugging only - return user count
    const stats = await db.getStats();
    return stats.totalUsers;
  }

  async getSessions() {
    // For debugging only - return session count
    const stats = await db.getStats();
    return stats.activeSessions;
  }

  async getStats() {
    return await db.getStats();
  }
}

export const authService = new AuthService();