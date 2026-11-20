import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { activeDrafts, trainingReports, users } from './schema.ts';
import { getOrCreateUser } from './users.ts';
import type { ReportFormData, SavedReport } from '../types/report.ts';

export interface CloudActiveDraft {
  activeReportId: string | null;
  formData: Partial<ReportFormData>;
  updatedAt: string;
}

export async function getUserReportsAndDraft(
  uid: string,
  email: string,
  displayName?: string | null,
  photoUrl?: string | null
): Promise<{ reports: SavedReport[]; activeDraft: CloudActiveDraft | null }> {
  try {
    const user = await getOrCreateUser(uid, email, displayName, photoUrl);

    const [reportRows, draftRows] = await Promise.all([
      db
        .select()
        .from(trainingReports)
        .where(eq(trainingReports.userId, user.id))
        .orderBy(desc(trainingReports.updatedAt)),
      db
        .select()
        .from(activeDrafts)
        .where(eq(activeDrafts.userId, user.id))
        .limit(1),
    ]);

    const reports: SavedReport[] = reportRows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      data: row.reportData,
    }));

    const draftRow = draftRows[0];
    const activeDraft: CloudActiveDraft | null = draftRow
      ? {
          activeReportId: draftRow.activeReportId,
          formData: draftRow.reportData,
          updatedAt: draftRow.updatedAt.toISOString(),
        }
      : null;

    return { reports, activeDraft };
  } catch (error) {
    console.error('Database query failed in getUserReportsAndDraft:', error);
    throw new Error('Unable to load your saved reports. Please try again later.', {
      cause: error,
    });
  }
}

export async function upsertUserReport(
  uid: string,
  email: string,
  report: SavedReport,
  displayName?: string | null,
  photoUrl?: string | null
): Promise<SavedReport> {
  try {
    const user = await getOrCreateUser(uid, email, displayName, photoUrl);
    const now = new Date();
    const createdAt = report.createdAt ? new Date(report.createdAt) : now;

    // Verify ownership if the report ID already exists
    const existing = await db
      .select({ id: trainingReports.id, userId: trainingReports.userId })
      .from(trainingReports)
      .where(eq(trainingReports.id, report.id))
      .limit(1);

    if (existing[0] && existing[0].userId !== user.id) {
      throw new Error('You do not have permission to update this report.');
    }

    const data = report.data || {};
    const collegeOrganization = (data.collegeOrganization || '').trim();
    const batchId = (data.batchId || '').trim();
    const trainerName = (data.yourName || '').trim();

    const rows = await db
      .insert(trainingReports)
      .values({
        id: report.id,
        userId: user.id,
        collegeOrganization,
        batchId,
        trainerName,
        reportData: data,
        createdAt: Number.isNaN(createdAt.getTime()) ? now : createdAt,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: trainingReports.id,
        set: {
          collegeOrganization,
          batchId,
          trainerName,
          reportData: data,
          updatedAt: now,
        },
      })
      .returning();

    const saved = rows[0];
    return {
      id: saved.id,
      createdAt: saved.createdAt.toISOString(),
      updatedAt: saved.updatedAt.toISOString(),
      data: saved.reportData,
    };
  } catch (error) {
    console.error('Database query failed in upsertUserReport:', error);
    if (
      error instanceof Error &&
      error.message === 'You do not have permission to update this report.'
    ) {
      throw error;
    }
    throw new Error('Unable to save your report right now. Please try again later.', {
      cause: error,
    });
  }
}

export async function deleteUserReport(uid: string, reportId: string): Promise<boolean> {
  try {
    const userRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);

    const user = userRows[0];
    if (!user) return false;

    const deleted = await db
      .delete(trainingReports)
      .where(
        and(
          eq(trainingReports.id, reportId),
          eq(trainingReports.userId, user.id)
        )
      )
      .returning({ id: trainingReports.id });

    return deleted.length > 0;
  } catch (error) {
    console.error('Database query failed in deleteUserReport:', error);
    throw new Error('Unable to delete the report right now. Please try again later.', {
      cause: error,
    });
  }
}

export async function upsertUserActiveDraft(
  uid: string,
  email: string,
  draft: { activeReportId: string | null; formData: Partial<ReportFormData> },
  displayName?: string | null,
  photoUrl?: string | null
): Promise<CloudActiveDraft> {
  try {
    const user = await getOrCreateUser(uid, email, displayName, photoUrl);
    const now = new Date();

    const rows = await db
      .insert(activeDrafts)
      .values({
        userId: user.id,
        activeReportId: draft.activeReportId,
        reportData: draft.formData,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: activeDrafts.userId,
        set: {
          activeReportId: draft.activeReportId,
          reportData: draft.formData,
          updatedAt: now,
        },
      })
      .returning();

    const saved = rows[0];
    return {
      activeReportId: saved.activeReportId,
      formData: saved.reportData,
      updatedAt: saved.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error('Database query failed in upsertUserActiveDraft:', error);
    throw new Error('Unable to save your working draft. Please try again later.', {
      cause: error,
    });
  }
}
