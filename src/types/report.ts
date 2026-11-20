export interface ConclusionData {
  collegeHeadName: string;
  collegeHeadDesignation: string;
  managerName: string;
  managerDesignation: string;
  trainer1Name: string;
  trainer1Email: string;
  trainer1Mobile: string;
  trainer2Name: string;
  trainer2Email: string;
  trainer2Mobile: string;
}

export interface DocumentAttachments {
  appreciationLetter: string;
  feedbackForm: string;
  attendanceSheet: string;
  mouPage: string;
}

export interface ExtraDocumentPage {
  id: string;
  title: string;
  image: string;
}

export type DayPhotosMap = Record<number, [string, string]>;

export type AttendanceMark = '' | 'P' | 'A';

export interface AttendanceStudentRow {
  sNo: number;
  name: string;
  days: AttendanceMark[]; // 12 days: Day 1 to Day 12
}

export interface AttendanceSheetData {
  organizationTitle: string;
  collegeBatchHeader: string;
  startRollNo: number;
  endRollNo: number;
  dayDates: string[];
  rows: AttendanceStudentRow[];
  useInReport: boolean;
}

export interface CyberSecurityStudentRow {
  uniqueId: string;
  fullName: string;
  program: string;
  qualification: string;
  emailId: string;
  mobileNo: string;
  preTest: string;
  postTest: string;
  signature: string;
}

export interface CyberSecurityAttendanceData {
  sheetTitle: string;
  funder: string;
  batchStartDate: string;
  batchEndDate: string;
  rowCount: number;
  rows: CyberSecurityStudentRow[];
}

export interface CyberSecurityReportData {
  projectName: string;
  programTitle: string;
  collegeName: string;
  trainerName: string;
  trainerDesignation: string;
  coTrainerName: string;
  coTrainerDesignation: string;
  totalStudents: string;
  boysCount: string;
  girlsCount: string;
  completedCount: string;
  batchCode: string;
  sessionDate: string;
  managerName: string;
  managerDesignation: string;
  teamName: string;
  customFedexLogo: string;
  sessionImages: [string, string];
  preTestImage: string;
  postTestImage: string;
  attendanceSheetImage: string;
  useDigitalAttendance: boolean;
}

export interface ReportFormData {
  yourName: string;
  roleDesignation: string;
  coTrainerName: string;
  coTrainerRole: string;
  collegeOrganization: string;
  batchId: string;
  totalBatchSize: string;
  fromDate: string;
  toDate: string;
  batchDateRange?: string;
  submittedToName: string;
  yourRole: string;
  teamName: string;
  dayPhotos: DayPhotosMap;
  conclusion: ConclusionData;
  documents: DocumentAttachments;
  extraPages: ExtraDocumentPage[];
  attendance: AttendanceSheetData;
  cyberAttendance: CyberSecurityAttendanceData;
  cyberReport: CyberSecurityReportData;
}

export interface SavedReport {
  id: string;
  createdAt: string;
  updatedAt?: string;
  data: Partial<ReportFormData>;
}

export type AttendanceSheetKind = '12days' | 'cyber' | 'cyber_report';

export interface SavedAttendanceSheet {
  id: string;
  sheetType: AttendanceSheetKind;
  title: string;
  createdAt: string;
  updatedAt: string;
  data: AttendanceSheetData | CyberSecurityAttendanceData | CyberSecurityReportData;
}

export interface DayPhotosSummary {
  totalPhotos: number;
  completedDays: number;
  highestDayWithPhoto: number;
  nextPendingDay: number;
}

export function getDayPhotosSummary(dayPhotos?: DayPhotosMap): DayPhotosSummary {
  let totalPhotos = 0;
  let completedDays = 0;
  let highestDayWithPhoto = 0;
  let nextPendingDay = 1;
  let foundPending = false;

  for (let day = 1; day <= 12; day += 1) {
    const pair = dayPhotos?.[day];
    const count = (pair?.[0] ? 1 : 0) + (pair?.[1] ? 1 : 0);
    totalPhotos += count;
    if (count === 2) {
      completedDays += 1;
    } else if (!foundPending) {
      nextPendingDay = day;
      foundPending = true;
    }
    if (count > 0) {
      highestDayWithPhoto = day;
    }
  }

  if (!foundPending) {
    nextPendingDay = 12;
  }

  return {
    totalPhotos,
    completedDays,
    highestDayWithPhoto,
    nextPendingDay,
  };
}

export const ROLE_OPTIONS = [
  'Program Manager',
  'Deputy General Manager',
  'Cluster Manager',
  'Master Trainer',
  'Director',
  'CEO',
  'Founder',
] as const;

export function createEmptyDayPhotos(): DayPhotosMap {
  const map: DayPhotosMap = {};
  for (let day = 1; day <= 12; day += 1) {
    map[day] = ['', ''];
  }
  return map;
}

export function createEmptyDaysArray(): AttendanceMark[] {
  return Array.from({ length: 12 }, () => '' as AttendanceMark);
}

export function normalizeAttendanceMark(raw: string): AttendanceMark {
  const clean = raw.trim().toUpperCase();
  if (clean === 'P' || clean === 'PRESENT' || clean === '1' || clean === 'YES') return 'P';
  if (clean === 'A' || clean === 'ABSENT' || clean === '0' || clean === 'NO') return 'A';
  return '';
}

export function buildAttendanceRowsForRange(
  startRollNo: number,
  endRollNo: number,
  existingRows: AttendanceStudentRow[] = []
): AttendanceStudentRow[] {
  const safeStart = Math.max(1, Math.min(500, Math.floor(startRollNo) || 1));
  const safeEnd = Math.max(safeStart, Math.min(safeStart + 199, Math.floor(endRollNo) || safeStart));
  const bySerial = new Map<number, AttendanceStudentRow>();
  existingRows.forEach((row) => {
    bySerial.set(row.sNo, row);
  });

  const result: AttendanceStudentRow[] = [];
  for (let sNo = safeStart; sNo <= safeEnd; sNo += 1) {
    const existing = bySerial.get(sNo);
    const days = createEmptyDaysArray();
    if (existing && Array.isArray(existing.days)) {
      for (let d = 0; d < 12; d += 1) {
        days[d] = normalizeAttendanceMark(existing.days[d] || '');
      }
    }
    result.push({
      sNo,
      name: existing?.name || '',
      days,
    });
  }
  return result;
}

export function createEmptyDayDatesArray(): string[] {
  return Array.from({ length: 12 }, () => '');
}

export function normalizeDayDates(raw?: unknown): string[] {
  const base = createEmptyDayDatesArray();
  if (!Array.isArray(raw)) return base;
  for (let i = 0; i < 12; i += 1) {
    const val = raw[i];
    base[i] = typeof val === 'string' ? val.trim() : '';
  }
  return base;
}

export function createInitialAttendanceData(
  startRollNo = 1,
  endRollNo = 30
): AttendanceSheetData {
  return {
    organizationTitle: 'Magic Bus India Foundation',
    collegeBatchHeader: '',
    startRollNo,
    endRollNo,
    dayDates: createEmptyDayDatesArray(),
    rows: buildAttendanceRowsForRange(startRollNo, endRollNo),
    useInReport: true,
  };
}

export function createEmptyCyberSecurityRow(
  defaultProgram = 'CWW AI',
  defaultQualification = 'GRADUATE'
): CyberSecurityStudentRow {
  return {
    uniqueId: '',
    fullName: '',
    program: defaultProgram,
    qualification: defaultQualification,
    emailId: '',
    mobileNo: '',
    preTest: '',
    postTest: '',
    signature: '',
  };
}

export function buildCyberSecurityRows(
  count: number,
  existingRows: CyberSecurityStudentRow[] = [],
  defaultProgram = 'CWW AI',
  defaultQualification = 'GRADUATE'
): CyberSecurityStudentRow[] {
  const safeCount = Math.max(1, Math.min(200, Math.floor(count) || 30));
  const result: CyberSecurityStudentRow[] = [];
  for (let i = 0; i < safeCount; i += 1) {
    const existing = existingRows[i];
    if (existing) {
      result.push({
        uniqueId: existing.uniqueId || '',
        fullName: existing.fullName || '',
        program: existing.program ?? defaultProgram,
        qualification: existing.qualification ?? defaultQualification,
        emailId: existing.emailId || '',
        mobileNo: existing.mobileNo || '',
        preTest: existing.preTest || '',
        postTest: existing.postTest || '',
        signature: existing.signature || '',
      });
    } else {
      result.push(createEmptyCyberSecurityRow(defaultProgram, defaultQualification));
    }
  }
  return result;
}

export function createInitialCyberSecurityData(rowCount = 30): CyberSecurityAttendanceData {
  return {
    sheetTitle: '',
    funder: 'INFOSYS FOUNDATION',
    batchStartDate: '',
    batchEndDate: '',
    rowCount,
    rows: buildCyberSecurityRows(rowCount, [], 'CWW AI', 'GRADUATE'),
  };
}

export const DEFAULT_CYBER_REPORT_VALUES: CyberSecurityReportData = {
  projectName: 'Magic Bus India Foundation - FedEx Project',
  programTitle: 'CYBER SECURITY AWARENESS PROGRAM',
  collegeName: 'Shri Gnanambica Degree College, Madanapalle',
  trainerName: 'Busi Reddy Yashwanth Reddy',
  trainerDesignation: 'AI Technical Trainer',
  coTrainerName: 'Pagadala Praveen Kumar',
  coTrainerDesignation: 'Soft Skill Trainer',
  totalStudents: '60',
  boysCount: '32',
  girlsCount: '28',
  completedCount: '58',
  batchCode: 'BT-4006',
  sessionDate: '17/11/2026',
  managerName: 'CH. Mohan Sir',
  managerDesignation: 'Program Manager',
  teamName: 'Chittoor Team',
  customFedexLogo: '',
  sessionImages: ['', ''],
  preTestImage: '',
  postTestImage: '',
  attendanceSheetImage: '',
  useDigitalAttendance: true,
};

export function createInitialCyberSecurityReportData(): CyberSecurityReportData {
  return {
    projectName: '',
    programTitle: '',
    collegeName: '',
    trainerName: '',
    trainerDesignation: '',
    coTrainerName: '',
    coTrainerDesignation: '',
    totalStudents: '',
    boysCount: '',
    girlsCount: '',
    completedCount: '',
    batchCode: '',
    sessionDate: '',
    managerName: '',
    managerDesignation: 'Program Manager',
    teamName: '',
    customFedexLogo: '',
    sessionImages: ['', ''],
    preTestImage: '',
    postTestImage: '',
    attendanceSheetImage: '',
    useDigitalAttendance: true,
  };
}

export function normalizeCyberSecurityReportData(
  raw?: Partial<CyberSecurityReportData> | null
): CyberSecurityReportData {
  const base = createInitialCyberSecurityReportData();
  if (!raw || typeof raw !== 'object') return base;
  const sessionImages: [string, string] = Array.isArray(raw.sessionImages)
    ? [String(raw.sessionImages[0] || ''), String(raw.sessionImages[1] || '')]
    : ['', ''];
  return {
    projectName: typeof raw.projectName === 'string' ? raw.projectName : '',
    programTitle: typeof raw.programTitle === 'string' ? raw.programTitle : '',
    collegeName: typeof raw.collegeName === 'string' ? raw.collegeName : '',
    trainerName: typeof raw.trainerName === 'string' ? raw.trainerName : '',
    trainerDesignation:
      typeof raw.trainerDesignation === 'string' ? raw.trainerDesignation : '',
    coTrainerName: typeof raw.coTrainerName === 'string' ? raw.coTrainerName : '',
    coTrainerDesignation:
      typeof raw.coTrainerDesignation === 'string' ? raw.coTrainerDesignation : '',
    totalStudents: typeof raw.totalStudents === 'string' ? raw.totalStudents : '',
    boysCount: typeof raw.boysCount === 'string' ? raw.boysCount : '',
    girlsCount: typeof raw.girlsCount === 'string' ? raw.girlsCount : '',
    completedCount: typeof raw.completedCount === 'string' ? raw.completedCount : '',
    batchCode: typeof raw.batchCode === 'string' ? raw.batchCode : '',
    sessionDate: typeof raw.sessionDate === 'string' ? raw.sessionDate : '',
    managerName: typeof raw.managerName === 'string' ? raw.managerName : '',
    managerDesignation:
      typeof raw.managerDesignation === 'string' && raw.managerDesignation.trim()
        ? raw.managerDesignation
        : base.managerDesignation,
    teamName: typeof raw.teamName === 'string' ? raw.teamName : '',
    customFedexLogo: typeof raw.customFedexLogo === 'string' ? raw.customFedexLogo : '',
    sessionImages,
    preTestImage: typeof raw.preTestImage === 'string' ? raw.preTestImage : '',
    postTestImage: typeof raw.postTestImage === 'string' ? raw.postTestImage : '',
    attendanceSheetImage:
      typeof raw.attendanceSheetImage === 'string' ? raw.attendanceSheetImage : '',
    useDigitalAttendance:
      typeof raw.useDigitalAttendance === 'boolean' ? raw.useDigitalAttendance : true,
  };
}

export function extractShortBatchCode(batchId: string): string {
  const trimmed = (batchId || '').trim();
  if (!trimmed) return 'BT-4006';
  const btMatch = trimmed.match(/\bBT-\d+\b/gi);
  if (btMatch && btMatch.length > 0) {
    return btMatch[btMatch.length - 1].toUpperCase();
  }
  const clean = trimmed.replace(/\(\d+\)\s*$/, '').trim();
  return clean.length > 24 ? clean.slice(-24).trim() : clean;
}

export const DEFAULT_CONCLUSION_VALUES: ConclusionData = {
  collegeHeadName: 'Mrs. S. Rama Devi',
  collegeHeadDesignation: 'Principal',
  managerName: 'CH Mohan Sir',
  managerDesignation: 'Program Manager',
  trainer1Name: 'Busi Reddy Yashwanth Reddy',
  trainer1Email: 'yashwanth.reddy@magicbusindia.org',
  trainer1Mobile: '+91 9392643879',
  trainer2Name: 'Pagadala Praveen Kumar',
  trainer2Email: 'praveen.kumar@magicbusindia.org',
  trainer2Mobile: '+91 9392643879',
};

export const INITIAL_CONCLUSION_DATA: ConclusionData = {
  collegeHeadName: '',
  collegeHeadDesignation: '',
  managerName: '',
  managerDesignation: '',
  trainer1Name: '',
  trainer1Email: '',
  trainer1Mobile: '',
  trainer2Name: '',
  trainer2Email: '',
  trainer2Mobile: '',
};

export const INITIAL_DOCUMENTS_DATA: DocumentAttachments = {
  appreciationLetter: '',
  feedbackForm: '',
  attendanceSheet: '',
  mouPage: '',
};

export const DEFAULT_PREVIEW_VALUES: ReportFormData = {
  yourName: 'Busi Reddy Yashwanth Reddy',
  roleDesignation: 'AI Technical Trainer',
  coTrainerName: 'Pagadala Praveen Kumar',
  coTrainerRole: 'Soft Skill Trainer',
  collegeOrganization: 'Shri Gnanambica Degree College, Madanapalle',
  batchId: 'BT-CHITTOOR INFOSYS FOUNDATION CWW-AI – BT-4006 (30)',
  totalBatchSize: '30',
  fromDate: '04/11/2026',
  toDate: '17/11/2026',
  batchDateRange: '04/11/2026 – 17/11/2026',
  submittedToName: 'CH. Mohan Sir',
  yourRole: 'Program Manager',
  teamName: 'Chittoor Team',
  dayPhotos: createEmptyDayPhotos(),
  conclusion: { ...DEFAULT_CONCLUSION_VALUES },
  documents: { ...INITIAL_DOCUMENTS_DATA },
  extraPages: [],
  attendance: createInitialAttendanceData(1, 30),
  cyberAttendance: createInitialCyberSecurityData(30),
  cyberReport: createInitialCyberSecurityReportData(),
};

export function createInitialFormData(): ReportFormData {
  return {
    yourName: '',
    roleDesignation: '',
    coTrainerName: '',
    coTrainerRole: '',
    collegeOrganization: '',
    batchId: '',
    totalBatchSize: '',
    fromDate: '',
    toDate: '',
    batchDateRange: '',
    submittedToName: '',
    yourRole: 'Program Manager',
    teamName: '',
    dayPhotos: createEmptyDayPhotos(),
    conclusion: { ...INITIAL_CONCLUSION_DATA },
    documents: { ...INITIAL_DOCUMENTS_DATA },
    extraPages: [],
    attendance: createInitialAttendanceData(1, 30),
    cyberAttendance: createInitialCyberSecurityData(30),
    cyberReport: createInitialCyberSecurityReportData(),
  };
}

export const INITIAL_FORM_DATA: ReportFormData = createInitialFormData();

export interface ComputedConclusionPreview {
  collegeHeadName: string;
  collegeHeadDesignation: string;
  managerName: string;
  managerDesignation: string;
  teamName: string;
  trainer1: {
    name: string;
    email: string;
    mobile: string;
  };
  trainer2: {
    name: string;
    email: string;
    mobile: string;
  } | null;
}

export interface ComputedReportPreview {
  collegeDisplay: string;
  trainerNameLines: string[];
  trainerSubtitle: string;
  batchPrimaryLine: string;
  batchSizeLine: string;
  batchDateLine: string;
  submittedToNameDisplay: string;
  submittedToRoleDisplay: string;
  submittedToTeamDisplay: string;
  downloadFileName: string;
  downloadPdfFileName: string;
  conclusion: ComputedConclusionPreview;
}

function extractBatchSize(batchId: string): string | null {
  const match = batchId.match(/\((\d+)\)\s*$/);
  if (match && match[1]) {
    return match[1];
  }
  const anyParen = batchId.match(/\((\d+)\)/);
  if (anyParen && anyParen[1]) {
    return anyParen[1];
  }
  return null;
}

function splitTrainerNames(rawName: string): string[] {
  const trimmed = rawName.trim();
  if (!trimmed) {
    return ['Busi Reddy Yashwanth Reddy &', 'Pagadala Praveen Kumar'];
  }
  if (trimmed.includes('\n')) {
    return trimmed
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }
  if (trimmed.includes('&')) {
    const parts = trimmed
      .split('&')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      return parts.map((part, idx) => (idx < parts.length - 1 ? `${part} &` : part));
    }
  }
  return [trimmed];
}

export function normalizeSavedFormData(saved?: Partial<ReportFormData>): ReportFormData {
  const base = createInitialFormData();
  if (!saved) return base;
  const mergedDayPhotos = createEmptyDayPhotos();
  if (saved.dayPhotos) {
    for (let day = 1; day <= 12; day += 1) {
      const pair = saved.dayPhotos[day];
      if (Array.isArray(pair)) {
        mergedDayPhotos[day] = [pair[0] || '', pair[1] || ''];
      }
    }
  }
  const savedAttendance = saved.attendance;
  const startNo = savedAttendance?.startRollNo ?? 1;
  const endNo = savedAttendance?.endRollNo ?? 30;
  const normalizedAttendance: AttendanceSheetData = savedAttendance
    ? {
        organizationTitle:
          savedAttendance.organizationTitle || 'Magic Bus India Foundation',
        collegeBatchHeader: savedAttendance.collegeBatchHeader || '',
        startRollNo: startNo,
        endRollNo: endNo,
        dayDates: normalizeDayDates(savedAttendance.dayDates),
        rows: buildAttendanceRowsForRange(startNo, endNo, savedAttendance.rows || []),
        useInReport:
          typeof savedAttendance.useInReport === 'boolean'
            ? savedAttendance.useInReport
            : true,
      }
    : createInitialAttendanceData(1, 30);

  const savedCyber = saved.cyberAttendance;
  const cyberCount = savedCyber?.rowCount ?? 30;
  const normalizedCyber: CyberSecurityAttendanceData = savedCyber
    ? {
        sheetTitle: savedCyber.sheetTitle || '',
        funder: savedCyber.funder || 'INFOSYS FOUNDATION',
        batchStartDate: savedCyber.batchStartDate || '',
        batchEndDate: savedCyber.batchEndDate || '',
        rowCount: cyberCount,
        rows: buildCyberSecurityRows(cyberCount, savedCyber.rows || []),
      }
    : createInitialCyberSecurityData(30);

  return {
    ...base,
    ...saved,
    dayPhotos: mergedDayPhotos,
    conclusion: {
      ...INITIAL_CONCLUSION_DATA,
      ...(saved.conclusion || {}),
    },
    documents: {
      ...INITIAL_DOCUMENTS_DATA,
      ...(saved.documents || {}),
    },
    extraPages: Array.isArray(saved.extraPages) ? saved.extraPages : [],
    attendance: normalizedAttendance,
    cyberAttendance: normalizedCyber,
    cyberReport: normalizeCyberSecurityReportData(saved.cyberReport),
  };
}

export function computeReportPreview(form: Partial<ReportFormData>): ComputedReportPreview {
  const collegeDisplay =
    (form.collegeOrganization || '').trim() || DEFAULT_PREVIEW_VALUES.collegeOrganization;

  const primaryName = (form.yourName || '').trim();
  const coTrainerName = (form.coTrainerName || '').trim();
  const primaryRole =
    (form.roleDesignation || '').trim() || DEFAULT_PREVIEW_VALUES.roleDesignation;
  const coTrainerRole = (form.coTrainerRole || '').trim();
  const teamName = (form.teamName || '').trim() || DEFAULT_PREVIEW_VALUES.teamName;

  const withRole = (name: string, role: string) => (role ? `${name} (${role})` : name);

  let trainerNameLines: string[];
  if (!primaryName && !coTrainerName) {
    trainerNameLines = [
      `${withRole(DEFAULT_PREVIEW_VALUES.yourName, primaryRole)} &`,
      withRole(
        DEFAULT_PREVIEW_VALUES.coTrainerName,
        coTrainerRole || DEFAULT_PREVIEW_VALUES.coTrainerRole
      ),
    ];
  } else if (primaryName && coTrainerName) {
    trainerNameLines = [
      `${withRole(primaryName, primaryRole)} &`,
      withRole(coTrainerName, coTrainerRole),
    ];
  } else if (!primaryName && coTrainerName) {
    trainerNameLines = [
      `${withRole(DEFAULT_PREVIEW_VALUES.yourName, primaryRole)} &`,
      withRole(coTrainerName, coTrainerRole),
    ];
  } else {
    const split = splitTrainerNames(primaryName);
    if (split.length >= 2) {
      trainerNameLines = split.map((line, idx) => {
        const hasAmp = line.endsWith(' &');
        const baseName = hasAmp ? line.slice(0, -2).trim() : line;
        const role = idx === 0 ? primaryRole : coTrainerRole;
        const formatted = withRole(baseName, role);
        return hasAmp ? `${formatted} &` : formatted;
      });
    } else {
      trainerNameLines = [withRole(split[0], primaryRole)];
    }
  }

  const trainerSubtitle = teamName;

  const rawBatchId = (form.batchId || '').trim() || DEFAULT_PREVIEW_VALUES.batchId;
  const batchPrimaryLine = rawBatchId;

  const explicitBatchSize = (form.totalBatchSize || '').trim();
  const extractedBatchSize = extractBatchSize(rawBatchId);
  const resolvedBatchSize =
    explicitBatchSize || extractedBatchSize || DEFAULT_PREVIEW_VALUES.totalBatchSize;
  const batchSizeLine = `(Total Batch Size - ${resolvedBatchSize})`;

  const fromDate = (form.fromDate || '').trim();
  const toDate = (form.toDate || '').trim();
  const legacyDateRange = (form.batchDateRange || '').trim();

  let batchDateLine: string;
  if (fromDate && toDate) {
    batchDateLine = `From ${fromDate} To ${toDate}`;
  } else if (fromDate) {
    batchDateLine = `From ${fromDate}`;
  } else if (toDate) {
    batchDateLine = `To ${toDate}`;
  } else if (legacyDateRange) {
    batchDateLine = `From ${legacyDateRange}`;
  } else {
    batchDateLine = `From ${DEFAULT_PREVIEW_VALUES.fromDate} To ${DEFAULT_PREVIEW_VALUES.toDate}`;
  }

  const submittedToNameDisplay =
    (form.submittedToName || '').trim() || DEFAULT_PREVIEW_VALUES.submittedToName;
  const submittedToRoleDisplay =
    (form.yourRole || '').trim() || DEFAULT_PREVIEW_VALUES.yourRole;
  const submittedToTeamDisplay = teamName;

  // Compute Page 8 Conclusion & Acknowledgment data with smart defaults synced from Page 1
  const c = form.conclusion || INITIAL_CONCLUSION_DATA;
  const resolvedTrainer1Name =
    (c.trainer1Name || '').trim() || primaryName || DEFAULT_CONCLUSION_VALUES.trainer1Name;
  const resolvedTrainer1Email =
    (c.trainer1Email || '').trim() || DEFAULT_CONCLUSION_VALUES.trainer1Email;
  const resolvedTrainer1Mobile =
    (c.trainer1Mobile || '').trim() || DEFAULT_CONCLUSION_VALUES.trainer1Mobile;

  const hasCoTrainerInput = Boolean(
    coTrainerName ||
      (c.trainer2Name || '').trim() ||
      (c.trainer2Email || '').trim() ||
      (c.trainer2Mobile || '').trim()
  );
  const showDefaultCoTrainer = !primaryName && !hasCoTrainerInput;

  const trainer2 =
    hasCoTrainerInput || showDefaultCoTrainer
      ? {
          name:
            (c.trainer2Name || '').trim() ||
            coTrainerName ||
            DEFAULT_CONCLUSION_VALUES.trainer2Name,
          email:
            (c.trainer2Email || '').trim() || DEFAULT_CONCLUSION_VALUES.trainer2Email,
          mobile:
            (c.trainer2Mobile || '').trim() || DEFAULT_CONCLUSION_VALUES.trainer2Mobile,
        }
      : null;

  const conclusion: ComputedConclusionPreview = {
    collegeHeadName:
      (c.collegeHeadName || '').trim() || DEFAULT_CONCLUSION_VALUES.collegeHeadName,
    collegeHeadDesignation:
      (c.collegeHeadDesignation || '').trim() ||
      DEFAULT_CONCLUSION_VALUES.collegeHeadDesignation,
    managerName:
      (c.managerName || '').trim() ||
      (form.submittedToName || '').trim() ||
      DEFAULT_CONCLUSION_VALUES.managerName,
    managerDesignation:
      (c.managerDesignation || '').trim() ||
      (form.yourRole || '').trim() ||
      DEFAULT_CONCLUSION_VALUES.managerDesignation,
    teamName,
    trainer1: {
      name: resolvedTrainer1Name,
      email: resolvedTrainer1Email,
      mobile: resolvedTrainer1Mobile,
    },
    trainer2,
  };

  const safeSlug = rawBatchId
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  const downloadFileName = `Magic_Bus_Training_Report_${safeSlug || 'Report'}.png`;
  const downloadPdfFileName = `Magic_Bus_Training_Report_${safeSlug || 'Report'}.pdf`;

  return {
    collegeDisplay,
    trainerNameLines,
    trainerSubtitle,
    batchPrimaryLine,
    batchSizeLine,
    batchDateLine,
    submittedToNameDisplay,
    submittedToRoleDisplay,
    submittedToTeamDisplay,
    downloadFileName,
    downloadPdfFileName,
    conclusion,
  };
}
