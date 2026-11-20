import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

export interface AuthenticatedUser {
  uid: string;
  email: string;
  name?: string | null;
  picture?: string | null;
  provider: 'firebase' | 'password';
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

const SESSION_COOKIE_NAME = 'mb_session';
const SESSION_TOKEN_PREFIX = 'mb_v1.';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const MAX_SESSION_TOKEN_LENGTH = 2048;
const MAX_BEARER_TOKEN_LENGTH = 8192;

let cachedSessionSecret: string | null = null;

function getSessionSecret(): string {
  if (cachedSessionSecret) return cachedSessionSecret;
  const seed =
    process.env.SESSION_SECRET ||
    process.env.SQL_PASSWORD ||
    `${firebaseConfig.projectId}:${firebaseConfig.apiKey}`;
  cachedSessionSecret = crypto
    .createHash('sha256')
    .update(`magic-bus-auth:${seed}`)
    .digest('hex');
  return cachedSessionSecret;
}

interface SessionPayload {
  uid: string;
  email: string;
  name: string | null;
  iat?: number;
  exp: number;
}

export function createSessionToken(user: {
  uid: string;
  email: string;
  name?: string | null;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    uid: user.uid,
    email: user.email,
    name: user.name || null,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');
  return `${SESSION_TOKEN_PREFIX}${encoded}.${sig}`;
}

export function verifySessionToken(token: string): AuthenticatedUser | null {
  if (
    !token ||
    token.length > MAX_SESSION_TOKEN_LENGTH ||
    !token.startsWith(SESSION_TOKEN_PREFIX)
  ) {
    return null;
  }
  const body = token.slice(SESSION_TOKEN_PREFIX.length);
  const dotIdx = body.indexOf('.');
  if (dotIdx <= 0 || body.indexOf('.', dotIdx + 1) !== -1) return null;

  const encoded = body.slice(0, dotIdx);
  const providedSig = body.slice(dotIdx + 1);
  if (!encoded || !providedSig) return null;

  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');

  const providedBuf = Buffer.from(providedSig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (
    providedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as SessionPayload;
    if (
      !parsed ||
      typeof parsed.uid !== 'string' ||
      typeof parsed.email !== 'string' ||
      !parsed.uid ||
      !parsed.email ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }
    const now = Math.floor(Date.now() / 1000);
    if (parsed.exp < now) return null;
    if (typeof parsed.iat === 'number' && parsed.iat > now + 300) return null;

    return {
      uid: parsed.uid,
      email: parsed.email,
      name: typeof parsed.name === 'string' ? parsed.name : null,
      picture: null,
      provider: 'password',
    };
  } catch {
    return null;
  }
}

export function parseSessionCookie(req: Request): string | null {
  const raw = req.headers.cookie;
  if (!raw || raw.length > 16_384) return null;
  const parts = raw.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === SESSION_COOKIE_NAME) {
      const value = part.slice(idx + 1).trim();
      if (!value || value.length > MAX_SESSION_TOKEN_LENGTH * 2) return null;
      try {
        return decodeURIComponent(value);
      } catch {
        return null;
      }
    }
  }
  return null;
}

function isSecureRequest(req: Request): boolean {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  return Boolean(
    req.secure || proto === 'https' || process.env.NODE_ENV === 'production'
  );
}

export function setSessionCookie(req: Request, res: Response, token: string): void {
  const isSecure = isSecureRequest(req);

  const attributes = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${SESSION_TTL_SECONDS}`,
    isSecure ? 'SameSite=None' : 'SameSite=Lax',
    ...(isSecure ? ['Secure', 'Partitioned'] : []),
  ];
  res.setHeader('Set-Cookie', attributes.join('; '));
}

export function clearSessionCookie(req: Request, res: Response): void {
  const isSecure = isSecureRequest(req);

  if (isSecure) {
    // Clear both Partitioned and legacy non-Partitioned variants cleanly
    const base = [
      `${SESSION_COOKIE_NAME}=`,
      'HttpOnly',
      'Path=/',
      'Max-Age=0',
      'SameSite=None',
      'Secure',
    ];
    res.setHeader('Set-Cookie', [
      [...base, 'Partitioned'].join('; '),
      base.join('; '),
    ]);
    return;
  }

  const attributes = [
    `${SESSION_COOKIE_NAME}=`,
    'HttpOnly',
    'Path=/',
    'Max-Age=0',
    'SameSite=Lax',
  ];
  res.setHeader('Set-Cookie', attributes.join('; '));
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const bearerToken =
    typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : null;
  const cookieToken = parseSessionCookie(req);
  const token = bearerToken || cookieToken;

  if (!token || token.length > MAX_BEARER_TOKEN_LENGTH) {
    res.status(401).json({ error: 'Unauthorized: Please log in to continue.' });
    return;
  }

  // Verify signed email/password session token first
  if (token.startsWith(SESSION_TOKEN_PREFIX)) {
    const sessionUser = verifySessionToken(token);
    if (!sessionUser) {
      res.status(401).json({ error: 'Session expired. Please log in again.' });
      return;
    }
    req.user = sessionUser;
    next();
    return;
  }

  // Otherwise verify Firebase ID token (Google Sign-In)
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      name: decodedToken.name || null,
      picture: decodedToken.picture || null,
      provider: 'firebase',
    };
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid session token.' });
  }
};
