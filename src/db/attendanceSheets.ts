import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { savedAttendanceSheets, users } from './schema.ts';
import { getOrCreateUser } from './users.ts';
import type {
  AttendanceSheetData,
  AttendanceSheetKind,
  CyberSecurityAttendanceData,
  CyberSecurityReportData,
  SavedAttendanceSheet,
} from '../types/report.ts';

function normalizeSheetKind(raw?: string): AttendanceSheetKind {
  if (raw === 'cyber_report') return 'cyber_report';
  if (raw === 'cyber') return 'cyber';
  return '12days';
}

export async function getUserAttendanceSheets(
  uid: string,
  email: string,
  displayName?: string | null,
  photoUrl?: string | null
): Promise<SavedAttendanceSheet[]> {
  try {
    const user = await getOrCreateUser(uid, email, displayName, photoUrl);

    const rows = await db
      .select()
      .from(savedAttendanceSheets)
      .where(eq(savedAttendanceSheets.userId, user.id))
      .orderBy(desc(savedAttendanceSheets.updatedAt));

    return rows.map((row) => ({
      id: row.id,
      sheetType: normalizeSheetKind(row.sheetType),
      title: row.title,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      data: row.sheetData,
    }));
  } catch (error) {
    console.error('Database query failed in getUserAttendanceSheets:', error);
    throw new Error('Unable to load saved attendance sheets right now.', {
      cause: error,
    });
  }
}

export async function upsertUserAttendanceSheet(
  uid: string,
  email: string,
  sheet: {
    id: string;
    sheetType: AttendanceSheetKind;
    title: string;
    createdAt?: string;
    data: AttendanceSheetData | CyberSecurityAttendanceData | CyberSecurityReportData;
  },
  displayName?: string | null,
  photoUrl?: string | null
): Promise<SavedAttendanceSheet> {
  try {
    const user = await getOrCreateUser(uid, email, displayName, photoUrl);
    const now = new Date();
    const createdAt = sheet.createdAt ? new Date(sheet.createdAt) : now;

    // Verify ownership if ID already exists
    const existing = await db
      .select({ id: savedAttendanceSheets.id, userId: savedAttendanceSheets.userId })
      .from(savedAttendanceSheets)
      .where(eq(savedAttendanceSheets.id, sheet.id))
      .limit(1);

    if (existing[0] && existing[0].userId !== user.id) {
      throw new Error('You do not have permission to update this attendance sheet.');
    }

    const cleanTitle = (sheet.title || '').trim() || 'Untitled Attendance Sheet';
    const cleanType: AttendanceSheetKind = normalizeSheetKind(sheet.sheetType);

    const rows = await db
      .insert(savedAttendanceSheets)
      .values({
        id: sheet.id,
        userId: user.id,
        sheetType: cleanType,
        title: cleanTitle,
        sheetData: sheet.data,
        createdAt: Number.isNaN(createdAt.getTime()) ? now : createdAt,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: savedAttendanceSheets.id,
        set: {
          sheetType: cleanType,
          title: cleanTitle,
          sheetData: sheet.data,
          updatedAt: now,
        },
      })
      .returning();

    const saved = rows[0];
    return {
      id: saved.id,
      sheetType: normalizeSheetKind(saved.sheetType),
      title: saved.title,
      createdAt: saved.createdAt.toISOString(),
      updatedAt: saved.updatedAt.toISOString(),
      data: saved.sheetData,
    };
  } catch (error) {
    console.error('Database query failed in upsertUserAttendanceSheet:', error);
    if (
      error instanceof Error &&
      error.message === 'You do not have permission to update this attendance sheet.'
    ) {
      throw error;
    }
    throw new Error('Unable to save attendance sheet right now. Please try again.', {
      cause: error,
    });
  }
}

export async function deleteUserAttendanceSheet(
  uid: string,
  sheetId: string
): Promise<boolean> {
  try {
    const userRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);

    const user = userRows[0];
    if (!user) return false;

    const deleted = await db
      .delete(savedAttendanceSheets)
      .where(
        and(
          eq(savedAttendanceSheets.id, sheetId),
          eq(savedAttendanceSheets.userId, user.id)
        )
      )
      .returning({ id: savedAttendanceSheets.id });

    return deleted.length > 0;
  } catch (error) {
    console.error('Database query failed in deleteUserAttendanceSheet:', error);
    throw new Error('Unable to delete attendance sheet right now. Please try again.', {
      cause: error,
    });
  }
}
