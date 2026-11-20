import {
  normalizeSavedFormData,
  ReportFormData,
  SavedAttendanceSheet,
  SavedReport,
} from '../types/report';

const DB_NAME = 'magic_bus_user_reports_v2';
const DB_VERSION = 2;
const STORE_REPORTS = 'user_reports';
const STORE_DRAFTS = 'user_drafts';
const STORE_ATTENDANCE_SHEETS = 'user_attendance_sheets';

export interface ActiveDraftState {
  activeReportId: string | null;
  formData: ReportFormData;
  updatedAt: string;
}

interface StoredUserReport extends SavedReport {
  storageKey: string;
  ownerUid: string;
}

interface StoredAttendanceSheet extends SavedAttendanceSheet {
  storageKey: string;
  ownerUid: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_REPORTS)) {
        const store = db.createObjectStore(STORE_REPORTS, {
          keyPath: 'storageKey',
        });
        store.createIndex('by_owner', 'ownerUid', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        db.createObjectStore(STORE_DRAFTS);
      }
      if (!db.objectStoreNames.contains(STORE_ATTENDANCE_SHEETS)) {
        const attStore = db.createObjectStore(STORE_ATTENDANCE_SHEETS, {
          keyPath: 'storageKey',
        });
        attStore.createIndex('by_owner', 'ownerUid', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error || new Error('Failed to open IndexedDB.'));
    };
  });

  return dbPromise;
}

function makeReportKey(ownerUid: string, reportId: string): string {
  return `${ownerUid}::${reportId}`;
}

function sortByUpdated<T extends { createdAt: string; updatedAt?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.createdAt).getTime() || 0;
    const timeB = new Date(b.updatedAt || b.createdAt).getTime() || 0;
    return timeB - timeA;
  });
}

export async function loadUserCachedReports(ownerUid: string): Promise<SavedReport[]> {
  if (!ownerUid) return [];
  try {
    const db = await openDatabase();
    const records = await new Promise<StoredUserReport[]>((resolve, reject) => {
      const tx = db.transaction(STORE_REPORTS, 'readonly');
      const store = tx.objectStore(STORE_REPORTS);
      const index = store.index('by_owner');
      const req = index.getAll(ownerUid);
      req.onsuccess = () => resolve((req.result as StoredUserReport[]) || []);
      req.onerror = () => reject(req.error);
    });

    return sortByUpdated(
      records.map((item) => ({
        id: item.id,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
        data: normalizeSavedFormData(item.data),
      }))
    );
  } catch {
    return [];
  }
}

export async function replaceUserCachedReports(
  ownerUid: string,
  reports: SavedReport[]
): Promise<void> {
  if (!ownerUid) return;
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_REPORTS, 'readwrite');
      const store = tx.objectStore(STORE_REPORTS);
      const index = store.index('by_owner');
      const keyReq = index.getAllKeys(ownerUid);

      keyReq.onsuccess = () => {
        const existingKeys = (keyReq.result as IDBValidKey[]) || [];
        existingKeys.forEach((key) => store.delete(key));
        reports.forEach((report) => {
          const record: StoredUserReport = {
            ...report,
            storageKey: makeReportKey(ownerUid, report.id),
            ownerUid,
          };
          store.put(record);
        });
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore cache write errors
  }
}

export async function saveUserCachedReport(
  ownerUid: string,
  report: SavedReport
): Promise<void> {
  if (!ownerUid) return;
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_REPORTS, 'readwrite');
      const store = tx.objectStore(STORE_REPORTS);
      const record: StoredUserReport = {
        ...report,
        storageKey: makeReportKey(ownerUid, report.id),
        ownerUid,
      };
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore cache write errors
  }
}

export async function deleteUserCachedReport(
  ownerUid: string,
  reportId: string
): Promise<void> {
  if (!ownerUid) return;
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_REPORTS, 'readwrite');
      const store = tx.objectStore(STORE_REPORTS);
      store.delete(makeReportKey(ownerUid, reportId));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore cache delete errors
  }
}

export async function loadUserCachedAttendanceSheets(
  ownerUid: string
): Promise<SavedAttendanceSheet[]> {
  if (!ownerUid) return [];
  try {
    const db = await openDatabase();
    const records = await new Promise<StoredAttendanceSheet[]>((resolve, reject) => {
      const tx = db.transaction(STORE_ATTENDANCE_SHEETS, 'readonly');
      const store = tx.objectStore(STORE_ATTENDANCE_SHEETS);
      const index = store.index('by_owner');
      const req = index.getAll(ownerUid);
      req.onsuccess = () => resolve((req.result as StoredAttendanceSheet[]) || []);
      req.onerror = () => reject(req.error);
    });

    return sortByUpdated(
      records.map((item) => ({
        id: item.id,
        sheetType:
          item.sheetType === 'cyber_report'
            ? 'cyber_report'
            : item.sheetType === 'cyber'
              ? 'cyber'
              : '12days',
        title: item.title || 'Saved Attendance Sheet',
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
        data: item.data,
      }))
    );
  } catch {
    return [];
  }
}

export async function replaceUserCachedAttendanceSheets(
  ownerUid: string,
  sheets: SavedAttendanceSheet[]
): Promise<void> {
  if (!ownerUid) return;
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_ATTENDANCE_SHEETS, 'readwrite');
      const store = tx.objectStore(STORE_ATTENDANCE_SHEETS);
      const index = store.index('by_owner');
      const keyReq = index.getAllKeys(ownerUid);

      keyReq.onsuccess = () => {
        const existingKeys = (keyReq.result as IDBValidKey[]) || [];
        existingKeys.forEach((key) => store.delete(key));
        sheets.forEach((sheet) => {
          const record: StoredAttendanceSheet = {
            ...sheet,
            storageKey: makeReportKey(ownerUid, sheet.id),
            ownerUid,
          };
          store.put(record);
        });
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore cache write errors
  }
}

export async function saveUserCachedAttendanceSheet(
  ownerUid: string,
  sheet: SavedAttendanceSheet
): Promise<void> {
  if (!ownerUid) return;
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_ATTENDANCE_SHEETS, 'readwrite');
      const store = tx.objectStore(STORE_ATTENDANCE_SHEETS);
      const record: StoredAttendanceSheet = {
        ...sheet,
        storageKey: makeReportKey(ownerUid, sheet.id),
        ownerUid,
      };
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore cache write errors
  }
}

export async function deleteUserCachedAttendanceSheet(
  ownerUid: string,
  sheetId: string
): Promise<void> {
  if (!ownerUid) return;
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_ATTENDANCE_SHEETS, 'readwrite');
      const store = tx.objectStore(STORE_ATTENDANCE_SHEETS);
      store.delete(makeReportKey(ownerUid, sheetId));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore cache delete errors
  }
}

export async function loadUserCachedDraft(
  ownerUid: string
): Promise<ActiveDraftState | null> {
  if (!ownerUid) return null;
  try {
    const db = await openDatabase();
    const record = await new Promise<ActiveDraftState | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_DRAFTS, 'readonly');
      const store = tx.objectStore(STORE_DRAFTS);
      const req = store.get(ownerUid);
      req.onsuccess = () => resolve(req.result as ActiveDraftState | undefined);
      req.onerror = () => reject(req.error);
    });

    if (!record || !record.formData) return null;
    return {
      activeReportId: record.activeReportId || null,
      formData: normalizeSavedFormData(record.formData),
      updatedAt: record.updatedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function saveUserCachedDraft(
  ownerUid: string,
  draft: ActiveDraftState
): Promise<void> {
  if (!ownerUid) return;
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_DRAFTS, 'readwrite');
      const store = tx.objectStore(STORE_DRAFTS);
      store.put(draft, ownerUid);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore cache write errors
  }
}

export async function clearUserCachedData(ownerUid: string): Promise<void> {
  if (!ownerUid) return;
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        [STORE_REPORTS, STORE_DRAFTS, STORE_ATTENDANCE_SHEETS],
        'readwrite'
      );
      const reportStore = tx.objectStore(STORE_REPORTS);
      const reportKeyReq = reportStore.index('by_owner').getAllKeys(ownerUid);
      reportKeyReq.onsuccess = () => {
        const keys = (reportKeyReq.result as IDBValidKey[]) || [];
        keys.forEach((key) => reportStore.delete(key));
      };

      const attStore = tx.objectStore(STORE_ATTENDANCE_SHEETS);
      const attKeyReq = attStore.index('by_owner').getAllKeys(ownerUid);
      attKeyReq.onsuccess = () => {
        const keys = (attKeyReq.result as IDBValidKey[]) || [];
        keys.forEach((key) => attStore.delete(key));
      };

      tx.objectStore(STORE_DRAFTS).delete(ownerUid);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore cache cleanup errors
  }
}
