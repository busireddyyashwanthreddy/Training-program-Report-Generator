import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  clearSessionCookie,
  createSessionToken,
  requireAuth,
  setSessionCookie,
  type AuthRequest,
} from './src/middleware/auth.ts';
import {
  applySecurityHeaders,
  createRateLimiter,
  getClientIp,
  isValidEntityId,
  isWithinJsonDepth,
  noCacheApiHeaders,
  normalizeAndValidateEmail,
  sanitizeSingleLineText,
  validatePasswordBounds,
} from './src/middleware/security.ts';
import { checkDatabaseHealth, closeDatabasePool } from './src/db/index.ts';
import {
  authenticateEmailPasswordUser,
  getUserByUid,
  registerEmailPasswordUser,
} from './src/db/users.ts';
import {
  deleteUserReport,
  getUserReportsAndDraft,
  upsertUserActiveDraft,
  upsertUserReport,
} from './src/db/reports.ts';
import {
  deleteUserAttendanceSheet,
  getUserAttendanceSheets,
  upsertUserAttendanceSheet,
} from './src/db/attendanceSheets.ts';
import type {
  AttendanceSheetData,
  AttendanceSheetKind,
  CyberSecurityAttendanceData,
  CyberSecurityReportData,
  ReportFormData,
  SavedReport,
} from './src/types/report.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(applySecurityHeaders);

  // Protect API responses from shared/browser caching
  app.use('/api', noCacheApiHeaders);

  // Rate limiters tuned for real trainer workloads while blocking brute-force & floods
  const authAttemptLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 20,
    message:
      'Too many login or registration attempts. Please wait a few minutes and try again.',
    keyGenerator: (req) => {
      const ip = getClientIp(req);
      const rawEmail =
        req.body && typeof req.body === 'object' && 'email' in req.body
          ? String((req.body as { email?: unknown }).email || '')
              .trim()
              .toLowerCase()
              .slice(0, 128)
          : '';
      return `auth:${ip}:${rawEmail}`;
    },
  });

  const apiGeneralLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 400,
    message: 'Too many requests in a short time. Please pause briefly and try again.',
    keyGenerator: (req) => `api:${getClientIp(req)}`,
  });

  // Strict small JSON limit for auth routes; 50MB for report/photo payloads
  app.use('/api/auth', express.json({ limit: '32kb' }));
  app.use('/api', express.json({ limit: '50mb' }));
  app.use('/api', apiGeneralLimiter);

  // Lightweight health endpoint for load balancers & scale-to-zero readiness
  app.get('/api/health', async (_req, res) => {
    const dbOk = await checkDatabaseHealth();
    res.status(dbOk ? 200 : 503).json({ status: dbOk ? 'ok' : 'degraded' });
  });

  // Email & Password Registration
  app.post('/api/auth/register', authAttemptLimiter, async (req, res) => {
    try {
      const body = req.body as {
        fullName?: unknown;
        email?: unknown;
        password?: unknown;
      };
      const fullName = sanitizeSingleLineText(body?.fullName, 120);
      const email = normalizeAndValidateEmail(body?.email);
      const passwordCheck = validatePasswordBounds(body?.password);

      if (fullName.length < 2) {
        res.status(400).json({ error: 'Please enter your full name.' });
        return;
      }
      if (!email) {
        res.status(400).json({ error: 'Please enter a valid email address.' });
        return;
      }
      if (!passwordCheck.valid) {
        res.status(400).json({
          error: passwordCheck.error || 'Password must be at least 6 characters.',
        });
        return;
      }

      const created = await registerEmailPasswordUser(
        fullName,
        email,
        passwordCheck.password
      );
      const token = createSessionToken({
        uid: created.uid,
        email: created.email,
        name: created.displayName,
      });
      setSessionCookie(req, res, token);

      res.status(201).json({
        token,
        user: {
          uid: created.uid,
          email: created.email,
          displayName: created.displayName,
          photoURL: created.photoUrl,
          provider: 'password',
        },
      });
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : '';
      if (rawMessage.includes('already exists')) {
        res.status(409).json({ error: rawMessage });
        return;
      }
      console.error('POST /api/auth/register failed:', error);
      res
        .status(500)
        .json({ error: 'Unable to create your account right now. Please try again later.' });
    }
  });

  // Email & Password Login
  app.post('/api/auth/login', authAttemptLimiter, async (req, res) => {
    try {
      const body = req.body as { email?: unknown; password?: unknown };
      const email = normalizeAndValidateEmail(body?.email);
      const password = typeof body?.password === 'string' ? body.password : '';

      if (!email || !password || password.length > 128) {
        res
          .status(400)
          .json({ error: 'Please enter your email address and password.' });
        return;
      }

      const user = await authenticateEmailPasswordUser(email, password);
      const token = createSessionToken({
        uid: user.uid,
        email: user.email,
        name: user.displayName,
      });
      setSessionCookie(req, res, token);

      res.json({
        token,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoUrl,
          provider: 'password',
        },
      });
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : '';
      if (
        rawMessage.includes('Invalid email') ||
        rawMessage.includes('Google Sign-In')
      ) {
        res.status(401).json({ error: rawMessage });
        return;
      }
      console.error('POST /api/auth/login failed:', error);
      res
        .status(500)
        .json({ error: 'Unable to log in right now. Please try again later.' });
    }
  });

  // Restore active Email/Password session from HttpOnly cookie or Bearer token
  app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const authUser = req.user;
      if (!authUser) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
      }

      const dbUser = await getUserByUid(authUser.uid);
      res.json({
        user: {
          uid: authUser.uid,
          email: dbUser?.email || authUser.email,
          displayName: dbUser?.displayName || authUser.name || null,
          photoURL: dbUser?.photoUrl || authUser.picture || null,
          provider: authUser.provider === 'password' ? 'password' : 'google',
        },
      });
    } catch (error) {
      console.error('GET /api/auth/me failed:', error);
      res.status(500).json({ error: 'Unable to verify session.' });
    }
  });

  // Logout (clears HttpOnly session cookie)
  app.post('/api/auth/logout', (req, res) => {
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  // User-scoped Reports & Active Draft Endpoints (strictly isolated by req.user.uid)
  app.get('/api/reports', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await getUserReportsAndDraft(
        uid,
        req.user?.email || '',
        req.user?.name || null,
        req.user?.picture || null
      );
      res.json(result);
    } catch (error) {
      console.error('GET /api/reports failed:', error);
      res
        .status(500)
        .json({ error: 'Unable to load your saved reports. Please try again later.' });
    }
  });

  app.put('/api/reports/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const reportId = String(req.params.id || '').trim();
      const body = req.body as Partial<SavedReport>;
      if (
        !isValidEntityId(reportId) ||
        !body ||
        typeof body.data !== 'object' ||
        body.data === null ||
        Array.isArray(body.data) ||
        !isWithinJsonDepth(body.data)
      ) {
        res.status(400).json({ error: 'Invalid report payload.' });
        return;
      }

      const saved = await upsertUserReport(
        uid,
        req.user?.email || '',
        {
          id: reportId,
          createdAt: body.createdAt || new Date().toISOString(),
          updatedAt: body.updatedAt || new Date().toISOString(),
          data: body.data,
        },
        req.user?.name || null,
        req.user?.picture || null
      );
      res.json(saved);
    } catch (error) {
      console.error('PUT /api/reports/:id failed:', error);
      const rawMessage = error instanceof Error ? error.message : '';
      if (rawMessage.includes('permission')) {
        res.status(403).json({ error: rawMessage });
        return;
      }
      res
        .status(500)
        .json({ error: 'Unable to save your report right now. Please try again later.' });
    }
  });

  app.delete('/api/reports/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const reportId = String(req.params.id || '').trim();
      if (!isValidEntityId(reportId)) {
        res.status(400).json({ error: 'Invalid report ID.' });
        return;
      }

      await deleteUserReport(uid, reportId);
      res.json({ deleted: true, id: reportId });
    } catch (error) {
      console.error('DELETE /api/reports/:id failed:', error);
      res
        .status(500)
        .json({ error: 'Unable to delete the report right now. Please try again later.' });
    }
  });

  app.put('/api/draft', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const body = req.body as {
        activeReportId?: string | null;
        formData?: Partial<ReportFormData>;
      };
      if (
        !body ||
        typeof body.formData !== 'object' ||
        body.formData === null ||
        Array.isArray(body.formData) ||
        !isWithinJsonDepth(body.formData)
      ) {
        res.status(400).json({ error: 'Invalid draft payload.' });
        return;
      }

      const cleanActiveId =
        typeof body.activeReportId === 'string' && isValidEntityId(body.activeReportId)
          ? body.activeReportId
          : null;

      const saved = await upsertUserActiveDraft(
        uid,
        req.user?.email || '',
        {
          activeReportId: cleanActiveId,
          formData: body.formData,
        },
        req.user?.name || null,
        req.user?.picture || null
      );
      res.json(saved);
    } catch (error) {
      console.error('PUT /api/draft failed:', error);
      res
        .status(500)
        .json({ error: 'Unable to save your working draft. Please try again later.' });
    }
  });

  // User-scoped Saved Attendance Sheets (12-Days Attendance & Cyber Security Attendance)
  app.get('/api/attendance-sheets', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const sheets = await getUserAttendanceSheets(
        uid,
        req.user?.email || '',
        req.user?.name || null,
        req.user?.picture || null
      );
      res.json({ sheets });
    } catch (error) {
      console.error('GET /api/attendance-sheets failed:', error);
      res
        .status(500)
        .json({ error: 'Unable to load saved attendance sheets right now.' });
    }
  });

  app.put('/api/attendance-sheets/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const sheetId = String(req.params.id || '').trim();
      const body = req.body as {
        sheetType?: AttendanceSheetKind;
        title?: string;
        createdAt?: string;
        data?: AttendanceSheetData | CyberSecurityAttendanceData | CyberSecurityReportData;
      };

      if (
        !isValidEntityId(sheetId) ||
        !body ||
        typeof body.data !== 'object' ||
        body.data === null ||
        Array.isArray(body.data) ||
        !isWithinJsonDepth(body.data)
      ) {
        res.status(400).json({ error: 'Invalid attendance sheet payload.' });
        return;
      }

      const resolvedSheetType: AttendanceSheetKind =
        body.sheetType === 'cyber_report'
          ? 'cyber_report'
          : body.sheetType === 'cyber'
            ? 'cyber'
            : '12days';

      const saved = await upsertUserAttendanceSheet(
        uid,
        req.user?.email || '',
        {
          id: sheetId,
          sheetType: resolvedSheetType,
          title: sanitizeSingleLineText(body.title, 200),
          createdAt: body.createdAt,
          data: body.data,
        },
        req.user?.name || null,
        req.user?.picture || null
      );
      res.json(saved);
    } catch (error) {
      console.error('PUT /api/attendance-sheets/:id failed:', error);
      const rawMessage = error instanceof Error ? error.message : '';
      if (rawMessage.includes('permission')) {
        res.status(403).json({ error: rawMessage });
        return;
      }
      res
        .status(500)
        .json({ error: 'Unable to save attendance sheet right now. Please try again.' });
    }
  });

  app.delete('/api/attendance-sheets/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const sheetId = String(req.params.id || '').trim();
      if (!isValidEntityId(sheetId)) {
        res.status(400).json({ error: 'Invalid attendance sheet ID.' });
        return;
      }

      await deleteUserAttendanceSheet(uid, sheetId);
      res.json({ deleted: true, id: sheetId });
    } catch (error) {
      console.error('DELETE /api/attendance-sheets/:id failed:', error);
      res
        .status(500)
        .json({ error: 'Unable to delete attendance sheet right now. Please try again.' });
    }
  });

  // Safe JSON / payload error handler for /api routes (never leaks stack traces)
  app.use(
    '/api',
    (
      err: { status?: number; type?: string },
      _req: Request,
      res: Response,
      next: NextFunction
    ) => {
      if (!err) {
        next();
        return;
      }
      if (err.type === 'entity.too.large') {
        res.status(413).json({
          error:
            'Upload payload is too large. Please compress large photos and try again.',
        });
        return;
      }
      if (err.type === 'entity.parse.failed' || err.status === 400) {
        res.status(400).json({ error: 'Invalid JSON request payload.' });
        return;
      }
      console.error('Unhandled API middleware error:', err);
      res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
    }
  );

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    // Long-term immutable cache for hashed JS/CSS bundles
    app.use(
      '/assets',
      express.static(path.join(distPath, 'assets'), {
        maxAge: '1y',
        immutable: true,
        dotfiles: 'ignore',
      })
    );
    app.use(
      express.static(distPath, {
        maxAge: '1h',
        dotfiles: 'ignore',
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache, must-revalidate');
          }
        },
      })
    );
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });

  // Align timeouts with Google Cloud Run / reverse-proxy load balancers to prevent 502s
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  let shuttingDown = false;
  const gracefulShutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}. Closing server and database pool cleanly...`);
    server.close(async () => {
      await closeDatabasePool();
      process.exit(0);
    });
    setTimeout(() => {
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
