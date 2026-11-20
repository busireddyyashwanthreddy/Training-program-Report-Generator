import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  FileText,
  GitCompareArrows,
  History,
  Loader2,
  Minus,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import {
  CyberSecurityReportData,
  extractShortBatchCode,
  getDayPhotosSummary,
  ReportFormData,
  SavedAttendanceSheet,
  SavedReport,
} from '../types/report';

export interface BatchHistoryEntry {
  id: string;
  kind: '12days' | 'cyber_report';
  programLabel: string;
  collegeName: string;
  projectName: string;
  batchCode: string;
  batchFullLabel: string;
  dateLabel: string;
  trainers: string;
  teamName: string;
  totalStudents: number | null;
  completedStudents: number | null;
  boysCount: number | null;
  girlsCount: number | null;
  attendanceRatePct: number | null;
  attendanceMetricLabel: string;
  photosUploaded: number;
  photosTarget: number;
  docsUploaded: number;
  docsTarget: number;
  readinessPct: number;
  updatedAt: string;
  sortTimestamp: number;
  isCurrentDraft?: boolean;
  rawReport?: SavedReport;
  rawCyberSheet?: SavedAttendanceSheet;
}

interface BatchHistorySectionProps {
  /** Saved 12-Days training reports belonging to the signed-in trainer */
  saved12DayReports: SavedReport[];
  /** Saved Cyber Security reports (sheetType === 'cyber_report') belonging to the signed-in trainer */
  savedCyberReports: SavedAttendanceSheet[];
  /** Currently open report ID (either 12-days or cyber report) */
  activeReportId?: string | null;
  /** Currently active college name to auto-match previous batches */
  currentCollegeName?: string;
  /** Currently active project name to auto-match previous batches */
  currentProjectName?: string;
  /** Optional active draft entry so trainers can compare unsaved changes against past batches */
  currentDraftEntry?: BatchHistoryEntry | null;
  /** Context label controlling default scope and copy */
  context: 'home' | 'cyber' | 'reports';
  /** Callbacks to open a past batch directly */
  onOpen12DayReport?: (report: SavedReport) => void;
  onOpenCyberReport?: (sheet: SavedAttendanceSheet) => void;
  /** Callbacks to permanently delete a batch from history */
  onDelete12DayReport?: (id: string) => void | Promise<unknown>;
  onDeleteCyberReport?: (id: string) => void | Promise<unknown>;
}

function normalizeMatchText(raw?: string): string {
  return (raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'of',
  'in',
  'at',
  'to',
  'magic',
  'bus',
  'india',
  'foundation',
  'project',
  'program',
  'training',
  'college',
  'degree',
  'institute',
  'school',
  'university',
]);

function extractMeaningfulTokens(raw?: string): string[] {
  return normalizeMatchText(raw)
    .split(' ')
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function stringsMatchCollegeOrProject(aRaw?: string, bRaw?: string): boolean {
  const a = normalizeMatchText(aRaw);
  const b = normalizeMatchText(bRaw);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 5 && b.length >= 5 && (a.includes(b) || b.includes(a))) {
    return true;
  }
  const tokensA = extractMeaningfulTokens(a);
  const tokensB = extractMeaningfulTokens(b);
  if (tokensA.length === 0 || tokensB.length === 0) return false;
  const setB = new Set(tokensB);
  const shared = tokensA.filter((t) => setB.has(t));
  const minLen = Math.min(tokensA.length, tokensB.length);
  return shared.length >= 2 || (minLen === 1 && shared.length === 1 && shared[0].length >= 5);
}

function parsePositiveInt(raw?: string): number | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;
  const match = trimmed.match(/\d+/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function extractSizeFromBatchId(batchId?: string): number | null {
  const raw = (batchId || '').trim();
  if (!raw) return null;
  const match = raw.match(/\((\d+)\)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseDateToTimestamp(raw?: string): number | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;
  // Support DD/MM/YYYY or DD-MM-YYYY
  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]) - 1;
    const year = Number(dmy[3]) < 100 ? 2000 + Number(dmy[3]) : Number(dmy[3]);
    const dt = new Date(year, month, day);
    if (!Number.isNaN(dt.getTime())) return dt.getTime();
  }
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

function infer12DayProjectName(batchId?: string): string {
  const raw = (batchId || '').trim();
  if (!raw) return 'Infosys Foundation Project';
  const upper = raw.toUpperCase();
  if (upper.includes('INFOSYS') && upper.includes('CWW')) {
    return 'Infosys Foundation CWW-AI';
  }
  if (upper.includes('INFOSYS')) {
    return 'Infosys Foundation Project';
  }
  if (upper.includes('FEDEX')) {
    return 'FedEx Project';
  }
  const beforeDash = raw.split(/[–-]/)[0]?.trim();
  if (beforeDash && beforeDash.length >= 4 && !/^BT\b/i.test(beforeDash)) {
    return beforeDash;
  }
  return '12-Days AI & Life Skills';
}

function compute12DayAttendanceStats(data: Partial<ReportFormData>): {
  attendanceRatePct: number | null;
  completedStudents: number | null;
} {
  const rows = data.attendance?.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return { attendanceRatePct: null, completedStudents: null };
  }
  let totalPresent = 0;
  let totalAbsent = 0;
  let studentsWithPresent = 0;
  for (const row of rows) {
    const days = Array.isArray(row.days) ? row.days : [];
    let rowPresent = 0;
    for (const mark of days) {
      if (mark === 'P') {
        totalPresent += 1;
        rowPresent += 1;
      } else if (mark === 'A') {
        totalAbsent += 1;
      }
    }
    if (rowPresent > 0) {
      studentsWithPresent += 1;
    }
  }
  const totalMarked = totalPresent + totalAbsent;
  if (totalMarked === 0) {
    return { attendanceRatePct: null, completedStudents: null };
  }
  return {
    attendanceRatePct: Math.round((totalPresent / totalMarked) * 100),
    completedStudents: studentsWithPresent,
  };
}

function count12DayDocs(data: Partial<ReportFormData>): number {
  const docs = data.documents;
  const hasDigitalAttendance = Boolean(
    data.attendance?.useInReport &&
      Array.isArray(data.attendance.rows) &&
      data.attendance.rows.some((r) => r.name.trim().length > 0)
  );
  return (
    (docs?.appreciationLetter ? 1 : 0) +
    (docs?.feedbackForm ? 1 : 0) +
    (docs?.attendanceSheet || hasDigitalAttendance ? 1 : 0) +
    (docs?.mouPage ? 1 : 0)
  );
}

export function build12DayDraftEntry(
  formData: ReportFormData,
  activeReportId?: string | null
): BatchHistoryEntry {
  const photoSummary = getDayPhotosSummary(formData.dayPhotos);
  const docsUploaded = count12DayDocs(formData);
  const { attendanceRatePct, completedStudents } = compute12DayAttendanceStats(formData);
  const totalStudents =
    parsePositiveInt(formData.totalBatchSize) ?? extractSizeFromBatchId(formData.batchId);
  const fromDate = formData.fromDate.trim();
  const toDate = formData.toDate.trim();
  const dateLabel =
    fromDate && toDate
      ? `${fromDate} – ${toDate}`
      : fromDate || toDate || formData.batchDateRange?.trim() || 'Dates not set';

  const trainers = [formData.yourName.trim(), formData.coTrainerName.trim()]
    .filter(Boolean)
    .join(' & ') || 'Trainer not set';

  const readinessPct = Math.round(((photoSummary.totalPhotos / 24) * 0.7 + (docsUploaded / 4) * 0.3) * 100);

  return {
    id: activeReportId || 'current-12days-draft',
    kind: '12days',
    programLabel: '12-Days AI & Life Skills',
    collegeName: formData.collegeOrganization.trim() || 'College not set',
    projectName: infer12DayProjectName(formData.batchId),
    batchCode: formData.batchId.trim() ? extractShortBatchCode(formData.batchId) : 'Current Draft',
    batchFullLabel: formData.batchId.trim() || 'Batch ID not entered',
    dateLabel,
    trainers,
    teamName: formData.teamName.trim() || 'Team not set',
    totalStudents,
    completedStudents,
    boysCount: null,
    girlsCount: null,
    attendanceRatePct,
    attendanceMetricLabel: attendanceRatePct !== null ? 'Avg. Attendance' : 'Report Readiness',
    photosUploaded: photoSummary.totalPhotos,
    photosTarget: 24,
    docsUploaded,
    docsTarget: 4,
    readinessPct,
    updatedAt: new Date().toISOString(),
    sortTimestamp: parseDateToTimestamp(fromDate) ?? Date.now(),
    isCurrentDraft: true,
  };
}

export function buildCyberDraftEntry(
  report: CyberSecurityReportData,
  activeReportId?: string | null
): BatchHistoryEntry {
  const totalStudents = parsePositiveInt(report.totalStudents);
  const completedStudents = parsePositiveInt(report.completedCount);
  const boysCount = parsePositiveInt(report.boysCount);
  const girlsCount = parsePositiveInt(report.girlsCount);
  const attendanceRatePct =
    totalStudents && totalStudents > 0 && completedStudents !== null
      ? Math.min(100, Math.round((completedStudents / totalStudents) * 100))
      : null;

  const photosUploaded =
    (report.sessionImages[0] ? 1 : 0) +
    (report.sessionImages[1] ? 1 : 0) +
    (report.preTestImage ? 1 : 0) +
    (report.postTestImage ? 1 : 0);
  const docsUploaded = report.attendanceSheetImage || report.useDigitalAttendance ? 1 : 0;
  const readinessPct = Math.round(((photosUploaded / 4) * 0.75 + docsUploaded * 0.25) * 100);

  const trainers = [report.trainerName.trim(), report.coTrainerName.trim()]
    .filter(Boolean)
    .join(' & ') || 'Trainer not set';

  return {
    id: activeReportId || 'current-cyber-draft',
    kind: 'cyber_report',
    programLabel: 'Cyber Security Program',
    collegeName: report.collegeName.trim() || 'College not set',
    projectName: report.projectName.trim() || 'FedEx Cyber Security Project',
    batchCode: report.batchCode.trim() || 'Current Draft',
    batchFullLabel: report.batchCode.trim() || report.programTitle.trim() || 'Cyber Security Batch',
    dateLabel: report.sessionDate.trim() || 'Date not set',
    trainers,
    teamName: report.teamName.trim() || 'Team not set',
    totalStudents,
    completedStudents,
    boysCount,
    girlsCount,
    attendanceRatePct,
    attendanceMetricLabel: attendanceRatePct !== null ? 'Completion Rate' : 'Report Readiness',
    photosUploaded,
    photosTarget: 4,
    docsUploaded,
    docsTarget: 1,
    readinessPct,
    updatedAt: new Date().toISOString(),
    sortTimestamp: parseDateToTimestamp(report.sessionDate) ?? Date.now(),
    isCurrentDraft: true,
  };
}

function saved12DayToEntry(report: SavedReport): BatchHistoryEntry {
  const data = report.data || {};
  const photoSummary = getDayPhotosSummary(data.dayPhotos);
  const docsUploaded = count12DayDocs(data);
  const { attendanceRatePct, completedStudents } = compute12DayAttendanceStats(data);
  const totalStudents =
    parsePositiveInt(data.totalBatchSize) ?? extractSizeFromBatchId(data.batchId);

  const fromDate = (data.fromDate || '').trim();
  const toDate = (data.toDate || '').trim();
  const dateLabel =
    fromDate && toDate
      ? `${fromDate} – ${toDate}`
      : fromDate || toDate || (data.batchDateRange || '').trim() || 'Dates not set';

  const trainers = [(data.yourName || '').trim(), (data.coTrainerName || '').trim()]
    .filter(Boolean)
    .join(' & ') || 'Trainer not set';

  const updatedAt = report.updatedAt || report.createdAt;
  const sortTimestamp =
    parseDateToTimestamp(fromDate) ??
    parseDateToTimestamp(updatedAt) ??
    Date.parse(report.createdAt) ??
    0;

  const readinessPct = Math.round(((photoSummary.totalPhotos / 24) * 0.7 + (docsUploaded / 4) * 0.3) * 100);

  return {
    id: report.id,
    kind: '12days',
    programLabel: '12-Days AI & Life Skills',
    collegeName: (data.collegeOrganization || '').trim() || 'College not set',
    projectName: infer12DayProjectName(data.batchId),
    batchCode: (data.batchId || '').trim() ? extractShortBatchCode(data.batchId || '') : 'Batch',
    batchFullLabel: (data.batchId || '').trim() || 'Batch ID not set',
    dateLabel,
    trainers,
    teamName: (data.teamName || '').trim() || 'Team not set',
    totalStudents,
    completedStudents,
    boysCount: null,
    girlsCount: null,
    attendanceRatePct,
    attendanceMetricLabel: attendanceRatePct !== null ? 'Avg. Attendance' : 'Report Readiness',
    photosUploaded: photoSummary.totalPhotos,
    photosTarget: 24,
    docsUploaded,
    docsTarget: 4,
    readinessPct,
    updatedAt,
    sortTimestamp,
    rawReport: report,
  };
}

function savedCyberToEntry(sheet: SavedAttendanceSheet): BatchHistoryEntry {
  const data = (sheet.data || {}) as Partial<CyberSecurityReportData>;
  const totalStudents = parsePositiveInt(data.totalStudents);
  const completedStudents = parsePositiveInt(data.completedCount);
  const boysCount = parsePositiveInt(data.boysCount);
  const girlsCount = parsePositiveInt(data.girlsCount);
  const attendanceRatePct =
    totalStudents && totalStudents > 0 && completedStudents !== null
      ? Math.min(100, Math.round((completedStudents / totalStudents) * 100))
      : null;

  const sessionArr = Array.isArray(data.sessionImages) ? data.sessionImages : ['', ''];
  const photosUploaded =
    (sessionArr[0] ? 1 : 0) +
    (sessionArr[1] ? 1 : 0) +
    (data.preTestImage ? 1 : 0) +
    (data.postTestImage ? 1 : 0);
  const docsUploaded = data.attendanceSheetImage || data.useDigitalAttendance ? 1 : 0;
  const readinessPct = Math.round(((photosUploaded / 4) * 0.75 + docsUploaded * 0.25) * 100);

  const trainers = [(data.trainerName || '').trim(), (data.coTrainerName || '').trim()]
    .filter(Boolean)
    .join(' & ') || 'Trainer not set';

  const updatedAt = sheet.updatedAt || sheet.createdAt;
  const sortTimestamp =
    parseDateToTimestamp(data.sessionDate) ??
    parseDateToTimestamp(updatedAt) ??
    Date.parse(sheet.createdAt) ??
    0;

  return {
    id: sheet.id,
    kind: 'cyber_report',
    programLabel: 'Cyber Security Program',
    collegeName: (data.collegeName || '').trim() || 'College not set',
    projectName: (data.projectName || '').trim() || 'FedEx Cyber Security Project',
    batchCode: (data.batchCode || '').trim() || 'Cyber Batch',
    batchFullLabel:
      (data.batchCode || '').trim() ||
      (data.programTitle || '').trim() ||
      sheet.title ||
      'Cyber Security Batch',
    dateLabel: (data.sessionDate || '').trim() || 'Date not set',
    trainers,
    teamName: (data.teamName || '').trim() || 'Team not set',
    totalStudents,
    completedStudents,
    boysCount,
    girlsCount,
    attendanceRatePct,
    attendanceMetricLabel: attendanceRatePct !== null ? 'Completion Rate' : 'Report Readiness',
    photosUploaded,
    photosTarget: 4,
    docsUploaded,
    docsTarget: 1,
    readinessPct,
    updatedAt,
    sortTimestamp,
    rawCyberSheet: sheet,
  };
}

function formatShortUpdated(iso?: string): string {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function DeltaIndicator({
  current,
  previous,
  unit = '',
}: {
  current: number | null;
  previous: number | null;
  unit?: string;
}) {
  if (current === null || previous === null) {
    return <span className="text-[#64748B] font-semibold">—</span>;
  }
  const diff = current - previous;
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[#475569] font-bold tabular-nums">
        <Minus className="w-3.5 h-3.5" />
        <span>No change</span>
      </span>
    );
  }
  const positive = diff > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-extrabold tabular-nums ${
        positive ? 'text-[#15803D]' : 'text-[#B91C1C]'
      }`}
    >
      {positive ? (
        <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
      )}
      <span>
        {positive ? `+${diff}` : diff}
        {unit}
      </span>
    </span>
  );
}

export const BatchHistorySection: React.FC<BatchHistorySectionProps> = ({
  saved12DayReports,
  savedCyberReports,
  activeReportId = null,
  currentCollegeName = '',
  currentProjectName = '',
  currentDraftEntry = null,
  context,
  onOpen12DayReport,
  onOpenCyberReport,
  onDelete12DayReport,
  onDeleteCyberReport,
}) => {
  const hasContextFilter = Boolean(
    currentCollegeName.trim() || (context === 'cyber' && currentProjectName.trim())
  );
  const [scope, setScope] = useState<'matching' | 'all'>(
    context === 'reports' ? 'all' : 'matching'
  );
  const [selectedGroupKey, setSelectedGroupKey] = useState<string>('ALL');
  const [programFilter, setProgramFilter] = useState<'all' | '12days' | 'cyber_report'>('all');
  const [compareTargetId, setCompareTargetId] = useState<string | null>(null);
  const [confirmDeleteEntryId, setConfirmDeleteEntryId] = useState<string | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [confirmDeleteAllListed, setConfirmDeleteAllListed] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState<string | null>(null);

  // Build unified saved entries list sorted newest-first
  const allSavedEntries = useMemo(() => {
    const list: BatchHistoryEntry[] = [
      ...saved12DayReports.map(saved12DayToEntry),
      ...savedCyberReports.map(savedCyberToEntry),
    ];
    list.sort((a, b) => b.sortTimestamp - a.sortTimestamp);
    return list;
  }, [saved12DayReports, savedCyberReports]);

  // Distinct College / Project groups for dropdown selector (especially useful in My Reports or All mode)
  const collegeOptions = useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number }>();
    for (const entry of allSavedEntries) {
      const rawName = entry.collegeName !== 'College not set' ? entry.collegeName : entry.projectName;
      const norm = normalizeMatchText(rawName);
      if (!norm) continue;
      const existing = map.get(norm);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(norm, { key: norm, label: rawName, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [allSavedEntries]);

  // Filter matching saved entries
  const filteredEntries = useMemo(() => {
    let base = allSavedEntries;

    if (programFilter !== 'all') {
      base = base.filter((entry) => entry.kind === programFilter);
    }

    if (context === 'reports') {
      if (selectedGroupKey !== 'ALL') {
        const chosen = collegeOptions.find((opt) => opt.key === selectedGroupKey);
        if (chosen) {
          base = base.filter(
            (entry) =>
              stringsMatchCollegeOrProject(entry.collegeName, chosen.label) ||
              stringsMatchCollegeOrProject(entry.projectName, chosen.label)
          );
        }
      }
      return base;
    }

    // Home or Cyber workspace
    if (scope === 'matching' && hasContextFilter) {
      return base.filter((entry) => {
        const matchesCollege =
          Boolean(currentCollegeName.trim()) &&
          stringsMatchCollegeOrProject(entry.collegeName, currentCollegeName);
        const matchesProject =
          context === 'cyber' &&
          Boolean(currentProjectName.trim()) &&
          stringsMatchCollegeOrProject(entry.projectName, currentProjectName);
        return matchesCollege || matchesProject;
      });
    }

    if (selectedGroupKey !== 'ALL') {
      const chosen = collegeOptions.find((opt) => opt.key === selectedGroupKey);
      if (chosen) {
        return base.filter(
          (entry) =>
            stringsMatchCollegeOrProject(entry.collegeName, chosen.label) ||
            stringsMatchCollegeOrProject(entry.projectName, chosen.label)
        );
      }
    }

    return base;
  }, [
    allSavedEntries,
    programFilter,
    context,
    scope,
    hasContextFilter,
    currentCollegeName,
    currentProjectName,
    selectedGroupKey,
    collegeOptions,
  ]);

  // Previous batches excluding the currently open saved report (for clear comparison count)
  const previousBatchesCount = useMemo(() => {
    if (!activeReportId) return filteredEntries.length;
    return filteredEntries.filter((e) => e.id !== activeReportId).length;
  }, [filteredEntries, activeReportId]);

  // Baseline entry used on the LEFT side of side-by-side comparison
  const primaryComparisonEntry = useMemo<BatchHistoryEntry | null>(() => {
    if (currentDraftEntry) return currentDraftEntry;
    if (filteredEntries.length > 0) return filteredEntries[0];
    return null;
  }, [currentDraftEntry, filteredEntries]);

  // Selected previous batch on the RIGHT side of comparison
  const selectedCompareEntry = useMemo<BatchHistoryEntry | null>(() => {
    if (!compareTargetId) return null;
    return allSavedEntries.find((e) => e.id === compareTargetId) || null;
  }, [compareTargetId, allSavedEntries]);

  // Aggregate progress KPIs across filtered entries (+ current unsaved draft if matching)
  const metrics = useMemo(() => {
    const entriesForStats = [...filteredEntries];
    const includeUnsavedDraft =
      Boolean(currentDraftEntry) &&
      !activeReportId &&
      Boolean(currentCollegeName.trim()) &&
      (scope === 'matching' || selectedGroupKey === 'ALL');

    if (includeUnsavedDraft && currentDraftEntry) {
      const hasAnyData =
        currentDraftEntry.totalStudents !== null ||
        currentDraftEntry.photosUploaded > 0 ||
        currentDraftEntry.batchFullLabel !== 'Batch ID not entered';
      if (hasAnyData) {
        entriesForStats.unshift(currentDraftEntry);
      }
    }

    const totalBatches = entriesForStats.length;
    const count12Days = entriesForStats.filter((e) => e.kind === '12days').length;
    const countCyber = entriesForStats.filter((e) => e.kind === 'cyber_report').length;

    const studentCounts = entriesForStats
      .map((e) => e.totalStudents)
      .filter((v): v is number => v !== null && v > 0);
    const totalStudentsReached = studentCounts.reduce((acc, n) => acc + n, 0);

    // Latest vs Previous batch size delta
    const latestWithStudents = entriesForStats.find(
      (e) => e.totalStudents !== null && e.totalStudents > 0
    );
    const previousWithStudents = entriesForStats.find(
      (e) =>
        e.id !== latestWithStudents?.id &&
        e.totalStudents !== null &&
        e.totalStudents > 0
    );

    const rates = entriesForStats
      .map((e) => e.attendanceRatePct)
      .filter((v): v is number => v !== null);
    const avgRatePct =
      rates.length > 0
        ? Math.round(rates.reduce((acc, r) => acc + r, 0) / rates.length)
        : null;

    const avgReadinessPct =
      entriesForStats.length > 0
        ? Math.round(
            entriesForStats.reduce((acc, e) => acc + e.readinessPct, 0) /
              entriesForStats.length
          )
        : null;

    return {
      totalBatches,
      count12Days,
      countCyber,
      totalStudentsReached,
      latestStudents: latestWithStudents?.totalStudents ?? null,
      previousStudents: previousWithStudents?.totalStudents ?? null,
      avgRatePct,
      avgReadinessPct,
    };
  }, [filteredEntries, currentDraftEntry, activeReportId, currentCollegeName, scope, selectedGroupKey]);

  const activeFilterDescription = useMemo(() => {
    if (context === 'reports') {
      if (selectedGroupKey === 'ALL') {
        return 'Showing batch progression across all saved colleges and projects';
      }
      const match = collegeOptions.find((opt) => opt.key === selectedGroupKey);
      return match ? `Filtered to ${match.label}` : 'Batch comparison history';
    }
    if (scope === 'matching' && hasContextFilter) {
      const target = currentCollegeName.trim() || currentProjectName.trim();
      return `Previous training batches matching "${target}"`;
    }
    return 'Showing all saved batches across colleges & projects';
  }, [context, selectedGroupKey, collegeOptions, scope, hasContextFilter, currentCollegeName, currentProjectName]);

  const handleOpenEntry = (entry: BatchHistoryEntry) => {
    if (entry.kind === '12days' && entry.rawReport && onOpen12DayReport) {
      onOpen12DayReport(entry.rawReport);
    } else if (entry.kind === 'cyber_report' && entry.rawCyberSheet && onOpenCyberReport) {
      onOpenCyberReport(entry.rawCyberSheet);
    }
  };

  const canDeleteEntry = (entry: BatchHistoryEntry): boolean =>
    entry.kind === '12days'
      ? Boolean(onDelete12DayReport)
      : Boolean(onDeleteCyberReport);

  const deletableFilteredEntries = useMemo(
    () => filteredEntries.filter((entry) => canDeleteEntry(entry)),
    [filteredEntries, onDelete12DayReport, onDeleteCyberReport]
  );

  const showDeleteNotice = (message: string) => {
    setDeleteFeedback(message);
    window.setTimeout(() => {
      setDeleteFeedback((prev) => (prev === message ? null : prev));
    }, 4500);
  };

  const handleConfirmDeleteSingle = async (entry: BatchHistoryEntry) => {
    if (deletingEntryId || isDeletingBulk) return;
    setDeletingEntryId(entry.id);
    try {
      if (entry.kind === '12days' && onDelete12DayReport) {
        await Promise.resolve(onDelete12DayReport(entry.id));
      } else if (entry.kind === 'cyber_report' && onDeleteCyberReport) {
        await Promise.resolve(onDeleteCyberReport(entry.id));
      }
      if (compareTargetId === entry.id) {
        setCompareTargetId(null);
      }
      setConfirmDeleteEntryId(null);
      showDeleteNotice(
        `Deleted batch "${entry.batchCode}" (${entry.collegeName}) from Batch History.`
      );
    } finally {
      setDeletingEntryId(null);
    }
  };

  const handleConfirmDeleteAllListed = async () => {
    if (isDeletingBulk || deletingEntryId || deletableFilteredEntries.length === 0) return;
    setIsDeletingBulk(true);
    const targets = [...deletableFilteredEntries];
    try {
      for (const entry of targets) {
        if (entry.kind === '12days' && onDelete12DayReport) {
          await Promise.resolve(onDelete12DayReport(entry.id));
        } else if (entry.kind === 'cyber_report' && onDeleteCyberReport) {
          await Promise.resolve(onDeleteCyberReport(entry.id));
        }
      }
      setCompareTargetId(null);
      setConfirmDeleteEntryId(null);
      setConfirmDeleteAllListed(false);
      showDeleteNotice(
        `Deleted ${targets.length} ${targets.length === 1 ? 'batch' : 'batches'} from Batch History.`
      );
    } finally {
      setIsDeletingBulk(false);
    }
  };

  return (
    <section
      aria-label="Batch History and Progress Comparison"
      className="bg-white rounded-xl shadow-[0_3px_16px_rgba(8,37,82,0.08)] border border-[#E1E6EF] overflow-hidden"
    >
      {/* Navy Institutional Header */}
      <div
        className="px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
        style={{ background: 'linear-gradient(90deg, #072754 0%, #0C366F 100%)' }}
      >
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <History className="w-5 h-5 text-[#FFD100] shrink-0 mt-0.5 sm:mt-0" strokeWidth={2.2} />
          <div className="min-w-0">
            <h2 className="text-white text-[16px] sm:text-[17.5px] font-bold tracking-tight leading-snug">
              Batch History &amp; Progress Comparison
            </h2>
            <p className="text-[#CBDDF5] text-[12px] sm:text-[12.5px] truncate">
              {activeFilterDescription}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {context !== 'reports' && (
            <div className="inline-flex items-center p-0.5 rounded-lg bg-white/12 border border-white/20">
              <button
                type="button"
                onClick={() => setScope('matching')}
                className={`px-2.5 py-1.5 rounded-md text-[12px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  scope === 'matching'
                    ? 'bg-[#FFD100] text-[#07234B]'
                    : 'text-[#E2ECF8] hover:text-white'
                }`}
              >
                Same College / Project
              </button>
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`px-2.5 py-1.5 rounded-md text-[12px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  scope === 'all'
                    ? 'bg-[#FFD100] text-[#07234B]'
                    : 'text-[#E2ECF8] hover:text-white'
                }`}
              >
                All Batches ({allSavedEntries.length})
              </button>
            </div>
          )}

          <span className="text-[12px] font-semibold text-[#D6E6FF] tabular-nums whitespace-nowrap">
            {previousBatchesCount} {previousBatchesCount === 1 ? 'Previous Batch' : 'Previous Batches'}
          </span>
        </div>
      </div>

      {/* Filter Controls Row */}
      {(context === 'reports' || scope === 'all' || allSavedEntries.length > 0) && (
        <div className="px-4 sm:px-6 py-3 bg-[#F4F7FC] border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {(context === 'reports' || scope === 'all') && collegeOptions.length > 0 && (
              <div className="flex items-center gap-1.5 min-w-0">
                <Building2 className="w-4 h-4 text-[#0B336B] shrink-0" />
                <select
                  aria-label="Filter batch history by college or project"
                  value={selectedGroupKey}
                  onChange={(e) => {
                    setSelectedGroupKey(e.target.value);
                    setCompareTargetId(null);
                  }}
                  className="max-w-[260px] sm:max-w-[320px] px-2.5 py-1.5 rounded-md border border-[#CBD4E1] bg-white text-[12.5px] font-semibold text-[#0A254E] focus:outline-none focus:border-[#0B336B] cursor-pointer truncate"
                >
                  <option value="ALL">All Colleges &amp; Projects ({allSavedEntries.length})</option>
                  {collegeOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label} ({opt.count})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="inline-flex items-center rounded-md border border-[#CBD4E1] bg-white p-0.5 text-[12px]">
              {(
                [
                  { id: 'all', label: 'All Programs' },
                  { id: '12days', label: '12-Days' },
                  { id: 'cyber_report', label: 'Cyber Security' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setProgramFilter(tab.id)}
                  className={`px-2.5 py-1 rounded font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    programFilter === tab.id
                      ? 'bg-[#082B59] text-white'
                      : 'text-[#475569] hover:text-[#0A254E]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {selectedCompareEntry && (
              <button
                type="button"
                onClick={() => setCompareTargetId(null)}
                className="px-2.5 py-1.5 rounded-md border border-[#CBD4E1] bg-white text-[#334155] text-[12px] font-bold inline-flex items-center gap-1 hover:bg-[#EDF2F9] cursor-pointer whitespace-nowrap"
              >
                <X className="w-3.5 h-3.5" />
                <span>Close Comparison</span>
              </button>
            )}

            {deletableFilteredEntries.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setConfirmDeleteEntryId(null);
                  setConfirmDeleteAllListed((v) => !v);
                }}
                disabled={isDeletingBulk}
                className={`px-2.5 py-1.5 rounded-md text-[12px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap border ${
                  confirmDeleteAllListed
                    ? 'bg-[#DC2626] text-white border-[#DC2626]'
                    : 'border-[#FECACA] bg-white text-[#B91C1C] hover:bg-[#FEF2F2]'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Delete Batch History ({deletableFilteredEntries.length})
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="p-4 sm:p-6 space-y-5">
        {/* Bulk Delete Confirmation Banner */}
        {confirmDeleteAllListed && deletableFilteredEntries.length > 0 && (
          <div
            role="alert"
            className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
              <div className="text-[12.5px] text-[#7F1D1D]">
                <p className="font-extrabold">
                  Delete {deletableFilteredEntries.length}{' '}
                  {deletableFilteredEntries.length === 1 ? 'batch record' : 'batch records'} from
                  Batch History?
                </p>
                <p className="text-[#991B1B] mt-0.5">
                  This permanently removes the listed saved{' '}
                  {deletableFilteredEntries.length === 1 ? 'report' : 'reports'} from your account
                  and cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmDeleteAllListed(false)}
                disabled={isDeletingBulk}
                className="px-3 py-1.5 rounded-md border border-[#CBD4E1] bg-white text-[#334155] text-[12px] font-bold hover:bg-[#F8FAFC] cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDeleteAllListed()}
                disabled={isDeletingBulk}
                className="px-3.5 py-1.5 rounded-md bg-[#DC2626] text-white text-[12px] font-extrabold inline-flex items-center gap-1.5 hover:bg-[#B91C1C] disabled:opacity-65 cursor-pointer whitespace-nowrap"
              >
                {isDeletingBulk ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Confirm Delete All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Feedback */}
        {deleteFeedback && (
          <div
            role="status"
            className="rounded-lg border border-[#C6DCFA] bg-[#EDF4FD] px-3.5 py-2.5 text-[12.5px] font-semibold text-[#0B336B] flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
            <span>{deleteFeedback}</span>
          </div>
        )}
        {/* 4-Column Progress Summary Strip */}
        {metrics.totalBatches > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-lg border border-[#E2E8F0] bg-[#FAFBFD] px-3.5 py-3">
              <div className="flex items-center justify-between gap-2 text-[#64748B]">
                <span className="text-[11.5px] font-bold uppercase tracking-wider">
                  Batches Tracked
                </span>
                <History className="w-4 h-4 text-[#0B3C82] shrink-0" />
              </div>
              <p className="mt-1.5 text-[22px] font-extrabold text-[#0A254E] tabular-nums leading-none">
                {metrics.totalBatches}
              </p>
              <p className="mt-1 text-[11.5px] font-medium text-[#64748B] truncate">
                {metrics.count12Days} 12-Days &middot; {metrics.countCyber} Cyber
              </p>
            </div>

            <div className="rounded-lg border border-[#E2E8F0] bg-[#FAFBFD] px-3.5 py-3">
              <div className="flex items-center justify-between gap-2 text-[#64748B]">
                <span className="text-[11.5px] font-bold uppercase tracking-wider">
                  Students Reached
                </span>
                <Users className="w-4 h-4 text-[#0B3C82] shrink-0" />
              </div>
              <p className="mt-1.5 text-[22px] font-extrabold text-[#0A254E] tabular-nums leading-none">
                {metrics.totalStudentsReached > 0 ? metrics.totalStudentsReached : '—'}
              </p>
              <p className="mt-1 text-[11.5px] font-medium text-[#64748B] truncate">
                Cumulative across batches
              </p>
            </div>

            <div className="rounded-lg border border-[#E2E8F0] bg-[#FAFBFD] px-3.5 py-3">
              <div className="flex items-center justify-between gap-2 text-[#64748B]">
                <span className="text-[11.5px] font-bold uppercase tracking-wider">
                  Batch Size Trend
                </span>
                <TrendingUp className="w-4 h-4 text-[#0B3C82] shrink-0" />
              </div>
              <div className="mt-1.5 text-[18px] font-extrabold text-[#0A254E] leading-tight">
                {metrics.latestStudents !== null && metrics.previousStudents !== null ? (
                  <DeltaIndicator
                    current={metrics.latestStudents}
                    previous={metrics.previousStudents}
                    unit=" students"
                  />
                ) : metrics.latestStudents !== null ? (
                  <span className="tabular-nums">{metrics.latestStudents} students</span>
                ) : (
                  <span className="text-[#64748B]">—</span>
                )}
              </div>
              <p className="mt-1 text-[11.5px] font-medium text-[#64748B] truncate">
                {metrics.previousStudents !== null
                  ? `Latest (${metrics.latestStudents}) vs Prev (${metrics.previousStudents})`
                  : 'Baseline batch size'}
              </p>
            </div>

            <div className="rounded-lg border border-[#E2E8F0] bg-[#FAFBFD] px-3.5 py-3">
              <div className="flex items-center justify-between gap-2 text-[#64748B]">
                <span className="text-[11.5px] font-bold uppercase tracking-wider">
                  {metrics.avgRatePct !== null ? 'Avg. Completion' : 'Avg. Readiness'}
                </span>
                <GitCompareArrows className="w-4 h-4 text-[#0B3C82] shrink-0" />
              </div>
              <p className="mt-1.5 text-[22px] font-extrabold text-[#0A254E] tabular-nums leading-none">
                {metrics.avgRatePct !== null
                  ? `${metrics.avgRatePct}%`
                  : metrics.avgReadinessPct !== null
                    ? `${metrics.avgReadinessPct}%`
                    : '—'}
              </p>
              <p className="mt-1 text-[11.5px] font-medium text-[#64748B] truncate">
                {metrics.avgRatePct !== null
                  ? 'Attendance / completion avg.'
                  : 'Photos & docs uploaded'}
              </p>
            </div>
          </div>
        )}

        {/* Side-by-Side Batch Progress Comparison Panel */}
        {selectedCompareEntry && primaryComparisonEntry && (
          <div className="rounded-xl border-2 border-[#0B3C82]/25 bg-[#F4F8FE] p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <GitCompareArrows className="w-4 h-4 text-[#0B3C82] shrink-0" />
                <h3 className="text-[14.5px] font-extrabold text-[#08234D]">
                  Side-by-Side Progress Comparison
                </h3>
              </div>
              <span className="text-[12px] font-semibold text-[#475569]">
                {currentDraftEntry ? 'Current Active Report' : 'Latest Batch'} vs. Selected Previous Batch
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12.5px]">
                <thead>
                  <tr className="border-b border-[#CBD8EB] text-[#475569]">
                    <th className="py-2 pr-3 font-bold w-[22%]">Metric</th>
                    <th className="py-2 px-3 font-extrabold text-[#08234D] w-[30%]">
                      {currentDraftEntry ? 'Current Active Batch' : 'Latest Batch'} ({primaryComparisonEntry.batchCode})
                    </th>
                    <th className="py-2 px-3 font-extrabold text-[#334155] w-[30%]">
                      Previous Batch ({selectedCompareEntry.batchCode})
                    </th>
                    <th className="py-2 pl-3 font-bold text-right w-[18%]">Progress Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE6F5]">
                  <tr>
                    <td className="py-2.5 pr-3 font-semibold text-[#475569]">Program</td>
                    <td className="py-2.5 px-3 font-bold text-[#0A254E]">
                      {primaryComparisonEntry.programLabel}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-[#334155]">
                      {selectedCompareEntry.programLabel}
                    </td>
                    <td className="py-2.5 pl-3 text-right text-[#64748B]">—</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-semibold text-[#475569]">Dates</td>
                    <td className="py-2.5 px-3 font-semibold text-[#0A254E]">
                      {primaryComparisonEntry.dateLabel}
                    </td>
                    <td className="py-2.5 px-3 text-[#334155]">
                      {selectedCompareEntry.dateLabel}
                    </td>
                    <td className="py-2.5 pl-3 text-right text-[#64748B]">—</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-semibold text-[#475569]">Trainer(s)</td>
                    <td className="py-2.5 px-3 font-semibold text-[#0A254E]">
                      {primaryComparisonEntry.trainers}
                    </td>
                    <td className="py-2.5 px-3 text-[#334155]">
                      {selectedCompareEntry.trainers}
                    </td>
                    <td className="py-2.5 pl-3 text-right text-[#64748B]">—</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-semibold text-[#475569]">Total Students</td>
                    <td className="py-2.5 px-3 font-extrabold text-[#0A254E] tabular-nums">
                      {primaryComparisonEntry.totalStudents ?? '—'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[#334155] tabular-nums">
                      {selectedCompareEntry.totalStudents ?? '—'}
                    </td>
                    <td className="py-2.5 pl-3 text-right">
                      <DeltaIndicator
                        current={primaryComparisonEntry.totalStudents}
                        previous={selectedCompareEntry.totalStudents}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-semibold text-[#475569]">
                      Attendance / Completion
                    </td>
                    <td className="py-2.5 px-3 font-extrabold text-[#0A254E] tabular-nums">
                      {primaryComparisonEntry.attendanceRatePct !== null
                        ? `${primaryComparisonEntry.attendanceRatePct}%`
                        : 'Not logged'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[#334155] tabular-nums">
                      {selectedCompareEntry.attendanceRatePct !== null
                        ? `${selectedCompareEntry.attendanceRatePct}%`
                        : 'Not logged'}
                    </td>
                    <td className="py-2.5 pl-3 text-right">
                      <DeltaIndicator
                        current={primaryComparisonEntry.attendanceRatePct}
                        previous={selectedCompareEntry.attendanceRatePct}
                        unit="%"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-semibold text-[#475569]">Photos Uploaded</td>
                    <td className="py-2.5 px-3 font-bold text-[#0A254E] tabular-nums">
                      {primaryComparisonEntry.photosUploaded}/{primaryComparisonEntry.photosTarget}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-[#334155] tabular-nums">
                      {selectedCompareEntry.photosUploaded}/{selectedCompareEntry.photosTarget}
                    </td>
                    <td className="py-2.5 pl-3 text-right">
                      <DeltaIndicator
                        current={Math.round(
                          (primaryComparisonEntry.photosUploaded /
                            primaryComparisonEntry.photosTarget) *
                            100
                        )}
                        previous={Math.round(
                          (selectedCompareEntry.photosUploaded /
                            selectedCompareEntry.photosTarget) *
                            100
                        )}
                        unit="%"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-semibold text-[#475569]">
                      Documents &amp; Attendance
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[#0A254E] tabular-nums">
                      {primaryComparisonEntry.docsUploaded}/{primaryComparisonEntry.docsTarget} Attached
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-[#334155] tabular-nums">
                      {selectedCompareEntry.docsUploaded}/{selectedCompareEntry.docsTarget} Attached
                    </td>
                    <td className="py-2.5 pl-3 text-right">
                      <DeltaIndicator
                        current={primaryComparisonEntry.readinessPct}
                        previous={selectedCompareEntry.readinessPct}
                        unit="%"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Batch List or Empty State */}
        {filteredEntries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-[#FAFBFD] px-5 py-8 text-center">
            <div className="w-11 h-11 rounded-full bg-[#EDF4FD] text-[#0B336B] flex items-center justify-center mx-auto mb-2.5">
              <History className="w-5 h-5" />
            </div>
            <h3 className="text-[15px] font-bold text-[#0A254E]">
              {scope === 'matching' && hasContextFilter
                ? 'No previous batches found for this college/project yet'
                : 'No saved batch history yet'}
            </h3>
            <p className="text-[13px] text-[#475569] mt-1 max-w-lg mx-auto">
              {scope === 'matching' && hasContextFilter
                ? `Once you save training reports for "${currentCollegeName.trim() || currentProjectName.trim()}", every past batch will appear here so you can compare student counts, attendance rates, and documentation progress.`
                : 'Save your 12-Days Training Reports or Cyber Security Reports to build a chronological batch history and compare progress across programs.'}
            </p>
            {scope === 'matching' && allSavedEntries.length > 0 && context !== 'reports' && (
              <button
                type="button"
                onClick={() => setScope('all')}
                className="mt-3.5 px-4 py-2 rounded-md border border-[#CBD4E1] bg-white text-[#082B59] text-[12.5px] font-bold hover:bg-[#EDF4FD] transition-colors cursor-pointer"
              >
                View All {allSavedEntries.length} Saved Batches
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-lg overflow-hidden">
            {filteredEntries.map((entry, idx) => {
              const isCurrent = Boolean(activeReportId && entry.id === activeReportId);
              const isSelectedForCompare = compareTargetId === entry.id;
              const previousChronological = filteredEntries[idx + 1] || null;
              const canCompare =
                Boolean(primaryComparisonEntry) &&
                (!isCurrent || context === 'reports') &&
                primaryComparisonEntry?.id !== entry.id;

              return (
                <div
                  key={`${entry.kind}-${entry.id}`}
                  className={`p-3.5 sm:px-4 sm:py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 transition-colors ${
                    isSelectedForCompare
                      ? 'bg-[#EDF4FD]'
                      : isCurrent
                        ? 'bg-[#F8FBFF]'
                        : 'bg-white hover:bg-[#FAFBFD]'
                  }`}
                >
                  {/* Left: Batch identity & metadata */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      {entry.kind === 'cyber_report' ? (
                        <ShieldCheck className="w-4 h-4 text-[#0B3C82] shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-[#0B3C82] shrink-0" />
                      )}
                      <span className="text-[14px] font-extrabold text-[#0A254E] truncate max-w-full">
                        {entry.collegeName}
                      </span>
                      <span className="text-[12px] font-bold text-[#0B3C82] whitespace-nowrap">
                        &middot; {entry.batchCode}
                      </span>
                      {isCurrent && (
                        <span className="text-[11.5px] font-bold text-[#15803D] whitespace-nowrap">
                          &middot; Currently Open
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12px] text-[#475569]">
                      <span className="font-semibold text-[#334155]">
                        {entry.programLabel}
                      </span>
                      <span aria-hidden="true">&middot;</span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                        <span>{entry.dateLabel}</span>
                      </span>
                      <span aria-hidden="true">&middot;</span>
                      <span className="truncate max-w-[260px]">{entry.trainers}</span>
                    </div>

                    {/* Progress Stats Row */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#334155] pt-0.5 tabular-nums">
                      <span>
                        <strong className="text-[#0A254E]">
                          {entry.totalStudents !== null ? entry.totalStudents : '—'}
                        </strong>{' '}
                        Students
                        {entry.boysCount !== null && entry.girlsCount !== null
                          ? ` (${entry.boysCount}B / ${entry.girlsCount}G)`
                          : ''}
                      </span>

                      {entry.attendanceRatePct !== null && (
                        <>
                          <span aria-hidden="true" className="text-[#CBD5E1]">|</span>
                          <span>
                            {entry.attendanceMetricLabel}:{' '}
                            <strong className="text-[#0E5066]">
                              {entry.attendanceRatePct}%
                            </strong>
                            {entry.completedStudents !== null && entry.totalStudents
                              ? ` (${entry.completedStudents}/${entry.totalStudents})`
                              : ''}
                          </span>
                        </>
                      )}

                      <span aria-hidden="true" className="text-[#CBD5E1]">|</span>
                      <span>
                        Photos:{' '}
                        <strong className="text-[#0A254E]">
                          {entry.photosUploaded}/{entry.photosTarget}
                        </strong>
                      </span>

                      <span aria-hidden="true" className="text-[#CBD5E1]">|</span>
                      <span>
                        Docs:{' '}
                        <strong className="text-[#0A254E]">
                          {entry.docsUploaded}/{entry.docsTarget}
                        </strong>
                      </span>

                      {previousChronological &&
                        entry.totalStudents !== null &&
                        previousChronological.totalStudents !== null && (
                          <>
                            <span aria-hidden="true" className="text-[#CBD5E1]">|</span>
                            <span className="inline-flex items-center gap-1 text-[11.5px]">
                              <span className="text-[#64748B]">vs prior:</span>
                              <DeltaIndicator
                                current={entry.totalStudents}
                                previous={previousChronological.totalStudents}
                              />
                            </span>
                          </>
                        )}

                      {entry.updatedAt && (
                        <>
                          <span aria-hidden="true" className="text-[#CBD5E1]">|</span>
                          <span className="text-[#64748B]">
                            Updated {formatShortUpdated(entry.updatedAt)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: Compare + Open + Delete Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {confirmDeleteEntryId === entry.id ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleConfirmDeleteSingle(entry)}
                          disabled={deletingEntryId === entry.id || isDeletingBulk}
                          className="px-3 py-1.5 min-h-[36px] rounded-md bg-[#DC2626] text-white text-[12px] font-bold inline-flex items-center gap-1 hover:bg-[#B91C1C] disabled:opacity-65 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          {deletingEntryId === entry.id && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                          )}
                          <span>Confirm Delete</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteEntryId(null)}
                          disabled={deletingEntryId === entry.id}
                          className="px-2.5 py-1.5 min-h-[36px] rounded-md border border-[#CBD4E1] bg-white text-[#475569] text-[12px] font-semibold hover:bg-[#F8FAFC] transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        {canCompare && (
                          <button
                            type="button"
                            onClick={() =>
                              setCompareTargetId((prev) => (prev === entry.id ? null : entry.id))
                            }
                            className={`px-3 py-1.5 min-h-[36px] rounded-md text-[12.5px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                              isSelectedForCompare
                                ? 'bg-[#082B59] text-white'
                                : 'border border-[#BFD2EB] bg-[#F2F7FE] text-[#082B59] hover:bg-[#E1EEFD]'
                            }`}
                          >
                            <GitCompareArrows className="w-3.5 h-3.5 shrink-0" />
                            <span>{isSelectedForCompare ? 'Comparing' : 'Compare'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenEntry(entry)}
                          className="px-3 py-1.5 min-h-[36px] rounded-md border border-[#CBD4E1] bg-white text-[#0A254E] text-[12.5px] font-semibold inline-flex items-center gap-1 hover:bg-[#F1F5FA] transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <span>{isCurrent ? 'Viewing' : 'Open Report'}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                        </button>

                        {canDeleteEntry(entry) && (
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDeleteAllListed(false);
                              setConfirmDeleteEntryId(entry.id);
                            }}
                            disabled={isDeletingBulk}
                            aria-label={`Delete batch ${entry.batchCode}`}
                            title="Delete this batch from history"
                            className="p-2 min-h-[36px] min-w-[36px] rounded-md border border-[#E2E8F0] text-[#64748B] hover:text-[#DC2626] hover:border-[#FCA5A5] hover:bg-[#FEF2F2] transition-colors cursor-pointer flex items-center justify-center shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
