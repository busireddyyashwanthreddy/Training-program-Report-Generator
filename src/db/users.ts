import crypto from 'crypto';
import { eq, sql } from 'drizzle-orm';
import { db } from './index.ts';
import { users } from './schema.ts';

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;
const DUMMY_SALT = '00000000000000000000000000000000';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto
    .scryptSync(password, salt, 64, SCRYPT_PARAMS)
    .toString('hex');
  return `scrypt:${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hashHex] = parts;
  if (!salt || !hashHex || hashHex.length !== 128 || !/^[0-9a-f]+$/i.test(hashHex)) {
    return false;
  }
  try {
    const derived = crypto.scryptSync(password, salt, 64, SCRYPT_PARAMS);
    const expected = Buffer.from(hashHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string | null,
  photoUrl?: string | null
) {
  try {
    const now = new Date();
    const normalizedEmail = email.trim().toLowerCase();
    const result = await db
      .insert(users)
      .values({
        uid,
        email: normalizedEmail,
        displayName: displayName || null,
        photoUrl: photoUrl || null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: normalizedEmail,
          displayName: displayName || null,
          photoUrl: photoUrl || null,
          updatedAt: now,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Unable to synchronize user profile. Please try again later.', {
      cause: error,
    });
  }
}

export async function registerEmailPasswordUser(
  fullName: string,
  email: string,
  password: string
) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${normalizedEmail}`)
      .limit(1);

    if (existing[0]) {
      throw new Error('An account with this email already exists. Please log in instead.');
    }

    const uid = `local_${crypto.randomUUID()}`;
    const passwordHash = hashPassword(password);
    const now = new Date();

    const inserted = await db
      .insert(users)
      .values({
        uid,
        email: normalizedEmail,
        passwordHash,
        displayName: cleanName,
        photoUrl: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: users.id,
        uid: users.uid,
        email: users.email,
        displayName: users.displayName,
        photoUrl: users.photoUrl,
      });

    return inserted[0];
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('already exists')
    ) {
      throw error;
    }
    console.error('Database query failed in registerEmailPasswordUser:', error);
    throw new Error('Unable to create your account right now. Please try again later.', {
      cause: error,
    });
  }
}

export async function authenticateEmailPasswordUser(email: string, password: string) {
  try {
    const normalizedEmail = email.trim().toLowerCase();

    const found = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${normalizedEmail}`)
      .limit(1);

    const user = found[0];
    if (!user) {
      // Equalize CPU work to prevent timing-based email enumeration
      crypto.scryptSync(password, DUMMY_SALT, 64, SCRYPT_PARAMS);
      throw new Error('Invalid email address or password.');
    }

    if (!user.passwordHash) {
      throw new Error(
        'This email is registered with Google Sign-In. Please click "Continue with Google" to log in.'
      );
    }

    const valid = verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid email address or password.');
    }

    return {
      id: user.id,
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoUrl: user.photoUrl,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('Invalid email') ||
        error.message.includes('Google Sign-In'))
    ) {
      throw error;
    }
    console.error('Database query failed in authenticateEmailPasswordUser:', error);
    throw new Error('Unable to log in right now. Please try again later.', {
      cause: error,
    });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const found = await db
      .select()
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);
    return found[0] || null;
  } catch (error) {
    console.error('Database query failed in getUserByUid:', error);
    throw new Error('Unable to load user profile. Please try again later.', {
      cause: error,
    });
  }
}
