import type { NextFunction, Request, Response } from 'express';

const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const ENTITY_ID_PATTERN = /^[a-zA-Z0-9._:-]{1,128}$/;

/**
 * Resolves the client IP safely even behind Cloud Run / reverse proxies.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
    return forwarded.split(',')[0].trim().slice(0, 64);
  }
  return (req.ip || req.socket?.remoteAddress || 'unknown').slice(0, 64);
}

/**
 * Sets hardened HTTP security headers compatible with HTTPS previews, iframes,
 * Firebase Google Sign-In popups, and Blob/PDF/CSV downloads.
 */
export function applySecurityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );
  // Allow Google Sign-In popup communication without weakening tab isolation
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  const isHttps =
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    (Array.isArray(req.headers['x-forwarded-proto']) &&
      req.headers['x-forwarded-proto'][0] === 'https');

  if (isHttps && process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  next();
}

/**
 * Prevents browsers and intermediary proxies from caching authenticated API responses.
 */
export function noCacheApiHeaders(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  message: string;
  keyGenerator?: (req: Request) => string;
  maxTrackedKeys?: number;
}

/**
 * Lightweight, memory-bounded sliding-window rate limiter with automatic cleanup.
 * Protects email login, registration, and API routes against brute-force and floods.
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const {
    windowMs,
    maxRequests,
    message,
    keyGenerator = (req) => getClientIp(req),
    maxTrackedKeys = 10_000,
  } = options;

  const buckets = new Map<string, RateLimitBucket>();

  const pruneExpired = (now: number) => {
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt <= now) {
        buckets.delete(key);
      }
    }
    // Hard memory cap if flooded by spoofed keys
    if (buckets.size > maxTrackedKeys) {
      const overflow = buckets.size - maxTrackedKeys;
      let removed = 0;
      for (const key of buckets.keys()) {
        buckets.delete(key);
        removed += 1;
        if (removed >= overflow) break;
      }
    }
  };

  const cleanupInterval = setInterval(() => {
    pruneExpired(Date.now());
  }, Math.min(windowMs, 60_000));

  if (typeof cleanupInterval.unref === 'function') {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = keyGenerator(req);
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      if (buckets.size >= maxTrackedKeys) {
        pruneExpired(now);
      }
      const resetAt = now + windowMs;
      buckets.set(key, { count: 1, resetAt });
      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - 1)));
      next();
      return;
    }

    existing.count += 1;
    const remaining = Math.max(0, maxRequests - existing.count);
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    if (existing.count > maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({ error: message });
      return;
    }

    next();
  };
}

/**
 * Strips non-printable ASCII control characters and trims single-line text inputs.
 */
export function sanitizeSingleLineText(value: unknown, maxLength: number): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates and normalizes an email address safely without ReDoS risk.
 */
export function normalizeAndValidateEmail(raw: unknown): string | null {
  const email = sanitizeSingleLineText(raw, 254).toLowerCase();
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return null;
  }
  return email;
}

/**
 * Enforces safe password bounds (prevents CPU DoS on scrypt with huge strings).
 */
export function validatePasswordBounds(raw: unknown): {
  valid: boolean;
  password: string;
  error?: string;
} {
  if (typeof raw !== 'string') {
    return { valid: false, password: '', error: 'Please enter a valid password.' };
  }
  if (raw.length < 6) {
    return {
      valid: false,
      password: '',
      error: 'Password must be at least 6 characters.',
    };
  }
  if (raw.length > 128) {
    return {
      valid: false,
      password: '',
      error: 'Password must be 128 characters or fewer.',
    };
  }
  return { valid: true, password: raw };
}

/**
 * Validates report/sheet entity IDs to prevent path-like or oversized identifiers.
 */
export function isValidEntityId(id: string): boolean {
  return ENTITY_ID_PATTERN.test(id);
}

/**
 * Guards against deeply nested JSON payloads that could degrade parser/DB performance.
 */
export function isWithinJsonDepth(value: unknown, maxDepth = 12, current = 0): boolean {
  if (current > maxDepth) return false;
  if (value === null || typeof value !== 'object') return true;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      if (!isWithinJsonDepth(value[i], maxDepth, current + 1)) return false;
    }
    return true;
  }
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return false;
    }
    if (
      !isWithinJsonDepth(
        (value as Record<string, unknown>)[key],
        maxDepth,
        current + 1
      )
    ) {
      return false;
    }
  }
  return true;
}
