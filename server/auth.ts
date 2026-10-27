/**
 * SpendWise Authentication and Session Management
 */

import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { db } from './db.js';
import { UserProfile } from './types.js';

const AUTH_SECRET = process.env.AUTH_SECRET || 'spendwise_super_secret_auth_token_key_2026';

export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

export function createSessionToken(userId: string): string {
  const payload = {
    userId,
    issuedAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${signature}`;
}

export function verifySessionToken(token: string): { userId: string } | null {
  try {
    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) return null;

    const expectedSig = crypto
      .createHmac('sha256', AUTH_SECRET)
      .update(payloadB64)
      .digest('base64url');

    if (signature !== expectedSig) return null;

    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    if (decoded.expiresAt && Date.now() > decoded.expiresAt) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    return;
  }

  const token = authHeader.slice(7).trim();
  const decoded = verifySessionToken(token);
  if (!decoded) {
    res.status(401).json({ error: 'Unauthorized: Session expired or invalid' });
    return;
  }

  const user = db.getUserById(decoded.userId);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized: User does not exist' });
    return;
  }

  req.user = user;
  next();
}
