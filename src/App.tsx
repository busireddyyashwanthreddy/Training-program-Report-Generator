/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileDown,
  FileText,
  Globe,
  Home,
  Info,
  Layers,
  Loader2,
  LogOut,
  Menu,
  ShieldCheck,
  Table2,
  X,
} from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { AboutView } from './components/AboutView';
import { AuthMode, AuthScreen } from './components/AuthScreen';
import {
  AttendancePortraitReportPage,
  chunkAttendanceRows,
  PORTRAIT_ROWS_PER_PAGE,
} from './components/AttendanceReportPage';
import { AttendanceSheetView } from './components/AttendanceSheetView';
import { CyberSecurityAttendanceView } from './components/CyberSecurityAttendanceView';
import { CyberSecurityReportView } from './components/CyberSecurityReportView';
import { MagicBusLogo } from './components/MagicBusLogo';
import { MyReportsView } from './components/MyReportsView';
import { FormStep, ReportForm } from './components/ReportForm';
import {
  ConclusionPage,
  CurriculumPage,
  DocumentAttachmentPage,
  SkillsPage,
  TrainingPhotosPage,
} from './components/ReportPages';
import { ReportPreviewCard } from './components/ReportPreviewCard';
import { SplashScreen } from './components/SplashScreen';
import {
  AttendanceSheetData,
  buildAttendanceRowsForRange,
  buildCyberSecurityRows,
  computeReportPreview,
  ConclusionData,
  createEmptyDayPhotos,
  createInitialAttendanceData,
  createInitialCyberSecurityData,
  createInitialCyberSecurityReportData,
  createInitialFormData,
  CyberSecurityAttendanceData,
  CyberSecurityReportData,
  DEFAULT_PREVIEW_VALUES,
  DocumentAttachments,
  extractShortBatchCode,
  ExtraDocumentPage,
  normalizeCyberSecurityReportData,
  normalizeDayDates,
  normalizeSavedFormData,
  ReportFormData,
  SavedAttendanceSheet,
  SavedReport,
} from './types/report';
import {
  A4_PAGE_HEIGHT,
  A4_PAGE_WIDTH,
  exportCoverPageToPng,
  exportReportPagesToPdf,
} from './utils/exportPdf';
import {
  clearUserCachedData,
  deleteUserCachedAttendanceSheet,
  deleteUserCachedReport,
  loadUserCachedAttendanceSheets,
  loadUserCachedDraft,
  loadUserCachedReports,
  replaceUserCachedAttendanceSheets,
  replaceUserCachedReports,
  saveUserCachedAttendanceSheet,
  saveUserCachedDraft,
  saveUserCachedReport,
} from './utils/reportStorage';
import {
  deleteCloudAttendanceSheet,
  deleteCloudReport,
  fetchCloudAttendanceSheets,
  fetchCloudReportsAndDraft,
  saveCloudActiveDraft,
  saveCloudAttendanceSheet,
  saveCloudReport,
} from './utils/cloudApi';

function normalize12DaySheetData(
  raw?: Partial<AttendanceSheetData> | null
): AttendanceSheetData {
  const base = createInitialAttendanceData(1, 30);
  if (!raw || typeof raw !== 'object') return base;
  const startRollNo = Math.max(1, Math.min(500, Math.floor(Number(raw.startRollNo)) || 1));
  const rawEnd = Math.floor(Number(raw.endRollNo)) || Math.max(startRollNo, 30);
  const endRollNo = Math.max(startRollNo, Math.min(startRollNo + 199, rawEnd));
  const existingRows = Array.isArray(raw.rows) ? raw.rows : [];
  return {
    organizationTitle:
      typeof raw.organizationTitle === 'string' && raw.organizationTitle.trim()
        ? raw.organizationTitle
        : base.organizationTitle,
    collegeBatchHeader: typeof raw.collegeBatchHeader === 'string' ? raw.collegeBatchHeader : '',
    startRollNo,
    endRollNo,
    dayDates: normalizeDayDates(raw.dayDates),
    rows: buildAttendanceRowsForRange(startRollNo, endRollNo, existingRows),
    useInReport: typeof raw.useInReport === 'boolean' ? raw.useInReport : true,
  };
}

function normalizeCyberSheetData(
  raw?: Partial<CyberSecurityAttendanceData> | null
): CyberSecurityAttendanceData {
  const base = createInitialCyberSecurityData(30);
  if (!raw || typeof raw !== 'object') return base;
  const existingRows = Array.isArray(raw.rows) ? raw.rows : [];
  const rowCount = Math.max(
    1,
    Math.min(200, Math.floor(Number(raw.rowCount)) || existingRows.length || 30)
  );
  return {
    sheetTitle: typeof raw.sheetTitle === 'string' ? raw.sheetTitle : '',
    funder: typeof raw.funder === 'string' && raw.funder.trim() ? raw.funder : base.funder,
    batchStartDate: typeof raw.batchStartDate === 'string' ? raw.batchStartDate : '',
    batchEndDate: typeof raw.batchEndDate === 'string' ? raw.batchEndDate : '',
    rowCount,
    rows: buildCyberSecurityRows(rowCount, existingRows, 'CWW AI', 'GRADUATE'),
  };
}

function normalizeSavedAttendanceSheet(sheet: SavedAttendanceSheet): SavedAttendanceSheet {
  if (sheet.sheetType === 'cyber_report') {
    return {
      id: sheet.id,
      sheetType: 'cyber_report',
      title: (sheet.title || '').trim() || 'Cyber Security Report',
      createdAt: sheet.createdAt || new Date().toISOString(),
      updatedAt: sheet.updatedAt || sheet.createdAt || new Date().toISOString(),
      data: normalizeCyberSecurityReportData(
        sheet.data as Partial<CyberSecurityReportData>
      ),
    };
  }
  const isCyber = sheet.sheetType === 'cyber';
  return {
    id: sheet.id,
    sheetType: isCyber ? 'cyber' : '12days',
    title:
      (sheet.title || '').trim() ||
      (isCyber ? 'Cyber Security Attendance Sheet' : '12-Days Attendance Sheet'),
    createdAt: sheet.createdAt || new Date().toISOString(),
    updatedAt: sheet.updatedAt || sheet.createdAt || new Date().toISOString(),
    data: isCyber
      ? normalizeCyberSheetData(sheet.data as Partial<CyberSecurityAttendanceData>)
      : normalize12DaySheetData(sheet.data as Partial<AttendanceSheetData>),
  };
}

type ActiveTab = 'home' | 'attendance' | 'cyber' | 'reports' | 'about';
type CyberSubTab = 'report' | 'attendance';
type PreviewMode = 'single' | 'all';

interface ReportPageDescriptor {
  id: string;
  pageNumber: number;
  label: string;
  render: () => React.ReactNode;
}

export default function App() {
  const {
    user,
    loading: authLoading,
    signingIn,
    authError,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signOutUser,
    getIdToken,
    clearAuthError,
  } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [authScreenMode, setAuthScreenMode] = useState<AuthMode>('signup');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [cyberSubTab, setCyberSubTab] = useState<CyberSubTab>('report');
  const [activeStep, setActiveStep] = useState<FormStep>('cover');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('single');
  const [activePageIdx, setActivePageIdx] = useState(0);
  const [formData, setFormData] = useState<ReportFormData>(() => createInitialFormData());
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [savedAttendanceSheets, setSavedAttendanceSheets] = useState<SavedAttendanceSheet[]>(
    []
  );
  const [active12DaySheetId, setActive12DaySheetId] = useState<string | null>(null);
  const [activeCyberSheetId, setActiveCyberSheetId] = useState<string | null>(null);
  const [activeCyberReportId, setActiveCyberReportId] = useState<string | null>(null);
  const [isSaving12DaySheet, setIsSaving12DaySheet] = useState(false);
  const [isSavingCyberSheet, setIsSavingCyberSheet] = useState(false);
  const [isSavingCyberReport, setIsSavingCyberReport] = useState(false);
  const [photoFocusDay, setPhotoFocusDay] = useState<number | null>(null);
  const [isUserDataLoading, setIsUserDataLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);
  const [isDownloadingPng, setIsDownloadingPng] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(
    null
  );
  const [previewScale, setPreviewScale] = useState(1);

  const previewStageRef = useRef<HTMLDivElement | null>(null);
  const coverCaptureRef = useRef<HTMLDivElement | null>(null);
  const exportPageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const latestFormRef = useRef<ReportFormData>(formData);
  const latestActiveIdRef = useRef<string | null>(activeReportId);
  const latestSavedReportsRef = useRef<SavedReport[]>(savedReports);
  const latestSavedAttendanceRef = useRef<SavedAttendanceSheet[]>(savedAttendanceSheets);
  const hydratedUidRef = useRef<string | null>(null);

  latestFormRef.current = formData;
  latestActiveIdRef.current = activeReportId;
  latestSavedReportsRef.current = savedReports;
  latestSavedAttendanceRef.current = savedAttendanceSheets;

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  const computedPreview = useMemo(() => computeReportPreview(formData), [formData]);

  const defaultAttendanceCollegeBatch = useMemo(() => {
    const shortBatch = extractShortBatchCode(computedPreview.batchPrimaryLine);
    return `${computedPreview.collegeDisplay} (${shortBatch})`;
  }, [computedPreview.batchPrimaryLine, computedPreview.collegeDisplay]);

  const defaultCyberSheetTitle = useMemo(() => {
    const shortBatch = extractShortBatchCode(computedPreview.batchPrimaryLine);
    return `Cyber Security Attendance Sheet ( ${shortBatch})`;
  }, [computedPreview.batchPrimaryLine]);

  const defaultCyberStartDate = useMemo(
    () =>
      (formData.fromDate.trim() || DEFAULT_PREVIEW_VALUES.fromDate).replace(/\//g, '-'),
    [formData.fromDate]
  );

  const defaultCyberEndDate = useMemo(
    () => (formData.toDate.trim() || DEFAULT_PREVIEW_VALUES.toDate).replace(/\//g, '-'),
    [formData.toDate]
  );

  const filledAttendanceStudents = useMemo(
    () => formData.attendance.rows.filter((row) => row.name.trim().length > 0).length,
    [formData.attendance.rows]
  );

  const hasAnyAttendanceEntries = useMemo(
    () =>
      formData.attendance.rows.some(
        (row) => row.name.trim().length > 0 || row.days.some((d) => d !== '')
      ),
    [formData.attendance.rows]
  );

  const digitalAttendanceActive = Boolean(
    formData.attendance.useInReport &&
      hasAnyAttendanceEntries &&
      !formData.documents.attendanceSheet
  );

  const portraitAttendanceChunks = useMemo(
    () => chunkAttendanceRows(formData.attendance.rows, PORTRAIT_ROWS_PER_PAGE),
    [formData.attendance.rows]
  );

  const attendancePageCount = digitalAttendanceActive ? portraitAttendanceChunks.length : 1;

  // Assemble the complete report pages in exact institutional order
  const reportPages: ReportPageDescriptor[] = useMemo(() => {
    const preAttendancePages: ReportPageDescriptor[] = [
      {
        id: 'page-1-cover',
        pageNumber: 1,
        label: 'Page 1: Cover Sheet',
        render: () => (
          <ReportPreviewCard preview={computedPreview} captureRef={coverCaptureRef} />
        ),
      },
      {
        id: 'page-2-curriculum',
        pageNumber: 2,
        label: 'Page 2: 12-Days Curriculum (Fixed)',
        render: () => <CurriculumPage />,
      },
      {
        id: 'page-3-skills',
        pageNumber: 3,
        label: 'Page 3: Employability Skills (Fixed)',
        render: () => <SkillsPage />,
      },
      {
        id: 'page-4-photos-1-3',
        pageNumber: 4,
        label: 'Page 4: Training Photos (Day 1–3)',
        render: () => (
          <TrainingPhotosPage
            days={[1, 2, 3]}
            dayPhotos={formData.dayPhotos}
            showMainTitle
          />
        ),
      },
      {
        id: 'page-5-photos-4-6',
        pageNumber: 5,
        label: 'Page 5: Training Photos (Day 4–6)',
        render: () => (
          <TrainingPhotosPage days={[4, 5, 6]} dayPhotos={formData.dayPhotos} />
        ),
      },
      {
        id: 'page-6-photos-7-9',
        pageNumber: 6,
        label: 'Page 6: Training Photos (Day 7–9)',
        render: () => (
          <TrainingPhotosPage days={[7, 8, 9]} dayPhotos={formData.dayPhotos} />
        ),
      },
      {
        id: 'page-7-photos-10-12',
        pageNumber: 7,
        label: 'Page 7: Training Photos (Day 10–12)',
        render: () => (
          <TrainingPhotosPage days={[10, 11, 12]} dayPhotos={formData.dayPhotos} />
        ),
      },
      {
        id: 'page-8-conclusion',
        pageNumber: 8,
        label: 'Page 8: Conclusion & Acknowledgment',
        render: () => <ConclusionPage conclusion={computedPreview.conclusion} />,
      },
      {
        id: 'page-9-appreciation',
        pageNumber: 9,
        label: 'Page 9: Appreciation Letter',
        render: () => (
          <DocumentAttachmentPage
            heading="APPRECIATION LETTER"
            image={formData.documents.appreciationLetter}
          />
        ),
      },
      {
        id: 'page-10-feedback',
        pageNumber: 10,
        label: 'Page 10: Feedback Form',
        render: () => (
          <DocumentAttachmentPage
            heading="FEEDBACK FORM"
            image={formData.documents.feedbackForm}
          />
        ),
      },
    ];

    const effectiveCollegeBatch =
      formData.attendance.collegeBatchHeader.trim() || defaultAttendanceCollegeBatch;

    const attendancePages: ReportPageDescriptor[] = digitalAttendanceActive
      ? portraitAttendanceChunks.map((chunk, chunkIdx) => {
          const pageNumber = 11 + chunkIdx;
          const partSuffix =
            portraitAttendanceChunks.length > 1
              ? ` (Part ${chunkIdx + 1}/${portraitAttendanceChunks.length})`
              : '';
          return {
            id: `page-attendance-digital-${chunkIdx}`,
            pageNumber,
            label: `Page ${pageNumber}: Attendance Sheet${partSuffix}`,
            render: () => (
              <AttendancePortraitReportPage
                organizationTitle={formData.attendance.organizationTitle}
                collegeBatchHeader={effectiveCollegeBatch}
                dayDates={formData.attendance.dayDates}
                rows={chunk}
                pageIndex={chunkIdx}
                totalPages={portraitAttendanceChunks.length}
              />
            ),
          };
        })
      : [
          {
            id: 'page-11-attendance',
            pageNumber: 11,
            label: 'Page 11: Attendance Sheet',
            render: () => (
              <DocumentAttachmentPage
                heading="ATTENDANCE SHEET"
                image={formData.documents.attendanceSheet}
              />
            ),
          },
        ];

    const moePageNumber = 11 + attendancePages.length;
    const moePage: ReportPageDescriptor = {
      id: 'page-12-moe',
      pageNumber: moePageNumber,
      label: `Page ${moePageNumber}: MOE Letter`,
      render: () => (
        <DocumentAttachmentPage
          heading="MOE LETTER"
          image={formData.documents.mouPage}
        />
      ),
    };

    const optionalPages: ReportPageDescriptor[] = formData.extraPages.map(
      (extra, idx) => {
        const pageNumber = moePageNumber + 1 + idx;
        return {
          id: `page-extra-${extra.id}`,
          pageNumber,
          label: `Page ${pageNumber}: ${extra.title.trim() || 'Additional Document'}`,
          render: () => (
            <DocumentAttachmentPage
              heading={extra.title.trim() || 'ADDITIONAL DOCUMENT'}
              image={extra.image}
            />
          ),
        };
      }
    );

    return [...preAttendancePages, ...attendancePages, moePage, ...optionalPages];
  }, [
    computedPreview,
    defaultAttendanceCollegeBatch,
    digitalAttendanceActive,
    formData.attendance,
    formData.dayPhotos,
    formData.documents,
    formData.extraPages,
    portraitAttendanceChunks,
  ]);

  // Clamp activePageIdx if an optional extra page is removed
  useEffect(() => {
    if (activePageIdx >= reportPages.length) {
      setActivePageIdx(Math.max(0, reportPages.length - 1));
    }
  }, [activePageIdx, reportPages.length]);

  // Strict per-user data hydration: wipe everything on logout, load ONLY the signed-in user's reports, attendance sheets & draft
  useEffect(() => {
    if (!user) {
      hydratedUidRef.current = null;
      setSavedReports([]);
      setSavedAttendanceSheets([]);
      setActive12DaySheetId(null);
      setActiveCyberSheetId(null);
      setActiveCyberReportId(null);
      setFormData(createInitialFormData());
      setActiveReportId(null);
      setPhotoFocusDay(null);
      setStatusMessage(null);
      setDownloadFeedback(null);
      setSyncError(null);
      setIsUserDataLoading(false);
      return;
    }

    let cancelled = false;
    const currentUid = user.uid;

    // Immediately reset in-memory state before loading the new account so zero prior-user data ever flashes
    hydratedUidRef.current = null;
    setSavedReports([]);
    setSavedAttendanceSheets([]);
    setActive12DaySheetId(null);
    setActiveCyberSheetId(null);
    setFormData(createInitialFormData());
    setActiveReportId(null);
    setPhotoFocusDay(null);
    setStatusMessage(null);
    setSyncError(null);
    setIsUserDataLoading(true);

    async function hydrateUserAccount() {
      try {
        const token = await getIdToken();
        if (cancelled) return;

        const [{ reports: remoteReports, activeDraft: remoteDraft }, remoteSheets] =
          await Promise.all([
            fetchCloudReportsAndDraft(token),
            fetchCloudAttendanceSheets(token).catch(async (sheetErr) => {
              console.error('Saved attendance sheets load fallback to local cache:', sheetErr);
              return loadUserCachedAttendanceSheets(currentUid);
            }),
          ]);
        if (cancelled) return;

        const normalizedReports: SavedReport[] = remoteReports
          .map((r) => ({
            ...r,
            data: normalizeSavedFormData(r.data),
          }))
          .sort((a, b) => {
            const tA = new Date(a.updatedAt || a.createdAt).getTime() || 0;
            const tB = new Date(b.updatedAt || b.createdAt).getTime() || 0;
            return tB - tA;
          });

        const normalizedSheets: SavedAttendanceSheet[] = remoteSheets
          .map(normalizeSavedAttendanceSheet)
          .sort((a, b) => {
            const tA = new Date(a.updatedAt || a.createdAt).getTime() || 0;
            const tB = new Date(b.updatedAt || b.createdAt).getTime() || 0;
            return tB - tA;
          });

        setSavedReports(normalizedReports);
        setSavedAttendanceSheets(normalizedSheets);
        await Promise.all([
          replaceUserCachedReports(currentUid, normalizedReports),
          replaceUserCachedAttendanceSheets(currentUid, normalizedSheets),
        ]);

        if (remoteDraft && remoteDraft.formData) {
          const normalizedDraft = normalizeSavedFormData(remoteDraft.formData);
          const linkedExists =
            remoteDraft.activeReportId &&
            normalizedReports.some((r) => r.id === remoteDraft.activeReportId);
          const resolvedActiveId = linkedExists ? remoteDraft.activeReportId : null;
          setFormData(normalizedDraft);
          setActiveReportId(resolvedActiveId);
          await saveUserCachedDraft(currentUid, {
            activeReportId: resolvedActiveId,
            formData: normalizedDraft,
            updatedAt: remoteDraft.updatedAt || new Date().toISOString(),
          });
        } else {
          const fresh = createInitialFormData();
          setFormData(fresh);
          setActiveReportId(null);
          await saveUserCachedDraft(currentUid, {
            activeReportId: null,
            formData: fresh,
            updatedAt: new Date().toISOString(),
          });
        }

        if (!cancelled) {
          hydratedUidRef.current = currentUid;
          setIsUserDataLoading(false);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Account report load failed, falling back to user-scoped cache:', err);

        const [cachedReports, cachedDraft, cachedSheets] = await Promise.all([
          loadUserCachedReports(currentUid),
          loadUserCachedDraft(currentUid),
          loadUserCachedAttendanceSheets(currentUid),
        ]);
        if (cancelled) return;

        setSavedReports(cachedReports);
        setSavedAttendanceSheets(cachedSheets.map(normalizeSavedAttendanceSheet));
        if (cachedDraft && cachedDraft.formData) {
          const linkedExists =
            cachedDraft.activeReportId &&
            cachedReports.some((r) => r.id === cachedDraft.activeReportId);
          setFormData(normalizeSavedFormData(cachedDraft.formData));
          setActiveReportId(linkedExists ? cachedDraft.activeReportId : null);
        } else {
          setFormData(createInitialFormData());
          setActiveReportId(null);
        }

        setSyncError(
          'Unable to reach your account right now. Showing your last cached work on this device.'
        );
        hydratedUidRef.current = currentUid;
        setIsUserDataLoading(false);
      }
    }

    void hydrateUserAccount();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, getIdToken]);

  // Permanently auto-save the active working draft & sync updates strictly for the authenticated user
  useEffect(() => {
    if (!user || hydratedUidRef.current !== user.uid) return;
    const ownerUid = user.uid;

    const timer = window.setTimeout(() => {
      if (hydratedUidRef.current !== ownerUid) return;
      const now = new Date().toISOString();

      void saveUserCachedDraft(ownerUid, {
        activeReportId,
        formData,
        updatedAt: now,
      });

      let updatedRecord: SavedReport | null = null;
      if (activeReportId) {
        const existing = latestSavedReportsRef.current.find(
          (r) => r.id === activeReportId
        );
        if (existing) {
          updatedRecord = {
            ...existing,
            updatedAt: now,
            data: formData,
          };
          void saveUserCachedReport(ownerUid, updatedRecord);
          setSavedReports((prev) =>
            prev.map((item) => (item.id === activeReportId ? updatedRecord! : item))
          );
        }
      }

      void (async () => {
        const token = await getIdToken();
        try {
          await saveCloudActiveDraft(token, { activeReportId, formData });
          if (updatedRecord) {
            await saveCloudReport(token, updatedRecord);
          }
          setSyncError(null);
        } catch (err) {
          console.error('Auto-sync failed:', err);
        }
      })();
    }, 450);

    return () => window.clearTimeout(timer);
  }, [formData, activeReportId, user, getIdToken]);

  // Flush draft immediately when authenticated user closes/hides tab so zero recent uploads are lost
  useEffect(() => {
    if (!user || hydratedUidRef.current !== user.uid) return;
    const ownerUid = user.uid;

    const flushNow = () => {
      if (hydratedUidRef.current !== ownerUid) return;
      const now = new Date().toISOString();
      const currentForm = latestFormRef.current;
      const currentId = latestActiveIdRef.current;

      void saveUserCachedDraft(ownerUid, {
        activeReportId: currentId,
        formData: currentForm,
        updatedAt: now,
      });

      if (currentId) {
        const existing = latestSavedReportsRef.current.find((r) => r.id === currentId);
        if (existing) {
          void saveUserCachedReport(ownerUid, {
            ...existing,
            updatedAt: now,
            data: currentForm,
          });
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushNow();
      }
    };

    window.addEventListener('pagehide', flushNow);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flushNow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, isUserDataLoading]);

  // Measure preview container width so the 540x764 A4 pages scale cleanly on every screen
  useEffect(() => {
    const stageEl = previewStageRef.current;
    if (!stageEl) return;

    const updateDimensions = () => {
      const style = window.getComputedStyle(stageEl);
      const padX =
        (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
      const availableWidth = Math.max(0, stageEl.clientWidth - padX - 4);
      const nextScale =
        availableWidth > 0 ? Math.min(1, availableWidth / A4_PAGE_WIDTH) : 1;
      setPreviewScale(nextScale);
    };

    updateDimensions();

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(stageEl);
    window.addEventListener('resize', updateDimensions);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, [activeTab, previewMode, showSplash, authLoading, user?.uid, isUserDataLoading]);

  const handleFieldChange = (field: keyof ReportFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (statusMessage) setStatusMessage(null);
  };

  const handleUpdateDayPhoto = (day: number, slot: 0 | 1, dataUrl: string) => {
    setFormData((prev) => {
      const existing = prev.dayPhotos[day] || ['', ''];
      const nextPair: [string, string] =
        slot === 0 ? [dataUrl, existing[1]] : [existing[0], dataUrl];
      return {
        ...prev,
        dayPhotos: {
          ...prev.dayPhotos,
          [day]: nextPair,
        },
      };
    });
  };

  const handleClearAllPhotos = () => {
    setFormData((prev) => ({
      ...prev,
      dayPhotos: createEmptyDayPhotos(),
    }));
    setPhotoFocusDay(1);
    setStatusMessage('Cleared all day photos from this report.');
  };

  const handleUpdateConclusion = (field: keyof ConclusionData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      conclusion: {
        ...prev.conclusion,
        [field]: value,
      },
    }));
  };

  const handleUpdateDocument = (field: keyof DocumentAttachments, dataUrl: string) => {
    setFormData((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [field]: dataUrl,
      },
    }));
  };

  const handleUpdateAttendance = (next: AttendanceSheetData) => {
    setFormData((prev) => ({ ...prev, attendance: next }));
  };

  const handleUpdateCyberAttendance = (next: CyberSecurityAttendanceData) => {
    setFormData((prev) => ({ ...prev, cyberAttendance: next }));
  };

  const handleUpdateCyberReport = (next: CyberSecurityReportData) => {
    setFormData((prev) => ({ ...prev, cyberReport: next }));
  };

  const handleSave12DaySheet = async (
    options?: { asNew?: boolean }
  ): Promise<{ ok: boolean; message: string }> => {
    if (!user) {
      return { ok: false, message: 'Please sign in to save your attendance sheet.' };
    }
    setIsSaving12DaySheet(true);
    try {
      const now = new Date().toISOString();
      const currentData = normalize12DaySheetData(latestFormRef.current.attendance);
      const title =
        currentData.collegeBatchHeader.trim() ||
        defaultAttendanceCollegeBatch ||
        '12-Days Attendance Sheet';

      const existing =
        !options?.asNew && active12DaySheetId
          ? latestSavedAttendanceRef.current.find(
              (s) => s.id === active12DaySheetId && s.sheetType === '12days'
            )
          : undefined;

      const sheetRecord: SavedAttendanceSheet = {
        id:
          existing?.id ||
          `att12-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sheetType: '12days',
        title,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        data: currentData,
      };

      setActive12DaySheetId(sheetRecord.id);
      setSavedAttendanceSheets((prev) => [
        sheetRecord,
        ...prev.filter((item) => item.id !== sheetRecord.id),
      ]);
      await saveUserCachedAttendanceSheet(user.uid, sheetRecord);

      try {
        const token = await getIdToken();
        await saveCloudAttendanceSheet(token, sheetRecord);
      } catch (cloudErr) {
        console.error('Failed to sync 12-Days attendance sheet to account:', cloudErr);
        return {
          ok: true,
          message:
            'Progress saved on this device. Your student attendance remains preserved until you delete it.',
        };
      }

      return {
        ok: true,
        message: existing
          ? `Progress updated for "${title}". Student attendance is safely preserved until you delete it.`
          : `Saved "${title}". Your student attendance is permanently preserved until you delete it.`,
      };
    } catch (err) {
      console.error('Save 12-Days attendance sheet failed:', err);
      return {
        ok: false,
        message: 'Could not save attendance progress. Please try again.',
      };
    } finally {
      setIsSaving12DaySheet(false);
    }
  };

  const handleSaveCyberSheet = async (
    options?: { asNew?: boolean }
  ): Promise<{ ok: boolean; message: string }> => {
    if (!user) {
      return { ok: false, message: 'Please sign in to save your attendance sheet.' };
    }
    setIsSavingCyberSheet(true);
    try {
      const now = new Date().toISOString();
      const currentData = normalizeCyberSheetData(latestFormRef.current.cyberAttendance);
      const title =
        currentData.sheetTitle.trim() ||
        defaultCyberSheetTitle ||
        'Cyber Security Attendance Sheet';

      const existing =
        !options?.asNew && activeCyberSheetId
          ? latestSavedAttendanceRef.current.find(
              (s) => s.id === activeCyberSheetId && s.sheetType === 'cyber'
            )
          : undefined;

      const sheetRecord: SavedAttendanceSheet = {
        id:
          existing?.id ||
          `cyber-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sheetType: 'cyber',
        title,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        data: currentData,
      };

      setActiveCyberSheetId(sheetRecord.id);
      setSavedAttendanceSheets((prev) => [
        sheetRecord,
        ...prev.filter((item) => item.id !== sheetRecord.id),
      ]);
      await saveUserCachedAttendanceSheet(user.uid, sheetRecord);

      try {
        const token = await getIdToken();
        await saveCloudAttendanceSheet(token, sheetRecord);
      } catch (cloudErr) {
        console.error('Failed to sync Cyber Security attendance sheet to account:', cloudErr);
        return {
          ok: true,
          message:
            'Progress saved on this device. Your student attendance remains preserved until you delete it.',
        };
      }

      return {
        ok: true,
        message: existing
          ? `Progress updated for "${title}". Student attendance is safely preserved until you delete it.`
          : `Saved "${title}". Your student attendance is permanently preserved until you delete it.`,
      };
    } catch (err) {
      console.error('Save Cyber Security attendance sheet failed:', err);
      return {
        ok: false,
        message: 'Could not save Cyber Security attendance progress. Please try again.',
      };
    } finally {
      setIsSavingCyberSheet(false);
    }
  };

  const handleSaveCyberReport = async (
    options?: { asNew?: boolean }
  ): Promise<{ ok: boolean; message: string }> => {
    if (!user) {
      return { ok: false, message: 'Please sign in to save your Cyber Security report.' };
    }
    setIsSavingCyberReport(true);
    try {
      const now = new Date().toISOString();
      const currentData = normalizeCyberSecurityReportData(latestFormRef.current.cyberReport);
      const title =
        currentData.collegeName.trim() ||
        currentData.projectName.trim() ||
        'Cyber Security Report';

      const existing =
        !options?.asNew && activeCyberReportId
          ? latestSavedAttendanceRef.current.find(
              (s) => s.id === activeCyberReportId && s.sheetType === 'cyber_report'
            )
          : undefined;

      const record: SavedAttendanceSheet = {
        id:
          existing?.id ||
          `cyberrep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sheetType: 'cyber_report',
        title,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        data: currentData,
      };

      setActiveCyberReportId(record.id);
      setSavedAttendanceSheets((prev) => [
        record,
        ...prev.filter((item) => item.id !== record.id),
      ]);
      await saveUserCachedAttendanceSheet(user.uid, record);

      try {
        const token = await getIdToken();
        await saveCloudAttendanceSheet(token, record);
      } catch (cloudErr) {
        console.error('Failed to sync Cyber Security report to account:', cloudErr);
        return {
          ok: true,
          message:
            'Report saved on this device. Your Cyber Security report remains preserved until you delete it.',
        };
      }

      return {
        ok: true,
        message: existing
          ? `Updated Cyber Security report "${title}". All details, photos, and attendance remain safely saved.`
          : `Saved Cyber Security report "${title}". It stays permanently saved until you delete it.`,
      };
    } catch (err) {
      console.error('Save Cyber Security report failed:', err);
      return {
        ok: false,
        message: 'Could not save Cyber Security report. Please try again.',
      };
    } finally {
      setIsSavingCyberReport(false);
    }
  };

  const handleLoadAttendanceSheet = (sheet: SavedAttendanceSheet) => {
    if (sheet.sheetType === 'cyber_report') {
      const restored = normalizeCyberSecurityReportData(
        sheet.data as Partial<CyberSecurityReportData>
      );
      setFormData((prev) => ({ ...prev, cyberReport: restored }));
      setActiveCyberReportId(sheet.id);
    } else if (sheet.sheetType === 'cyber') {
      const restored = normalizeCyberSheetData(
        sheet.data as Partial<CyberSecurityAttendanceData>
      );
      setFormData((prev) => ({ ...prev, cyberAttendance: restored }));
      setActiveCyberSheetId(sheet.id);
    } else {
      const restored = normalize12DaySheetData(sheet.data as Partial<AttendanceSheetData>);
      setFormData((prev) => ({ ...prev, attendance: restored }));
      setActive12DaySheetId(sheet.id);
    }
  };

  const handleDeleteAttendanceSheet = async (
    sheetId: string
  ): Promise<{ ok: boolean; message: string }> => {
    if (!user) {
      return { ok: false, message: 'Please sign in to manage saved items.' };
    }
    const target = latestSavedAttendanceRef.current.find((s) => s.id === sheetId);
    setSavedAttendanceSheets((prev) => prev.filter((item) => item.id !== sheetId));
    if (active12DaySheetId === sheetId) {
      setActive12DaySheetId(null);
    }
    if (activeCyberSheetId === sheetId) {
      setActiveCyberSheetId(null);
    }
    if (activeCyberReportId === sheetId) {
      setActiveCyberReportId(null);
    }

    await deleteUserCachedAttendanceSheet(user.uid, sheetId);
    try {
      const token = await getIdToken();
      await deleteCloudAttendanceSheet(token, sheetId);
      const label = target?.sheetType === 'cyber_report' ? 'report' : 'sheet';
      return {
        ok: true,
        message: `Deleted saved ${label}${target ? ` "${target.title}"` : ''}.`,
      };
    } catch (err) {
      console.error('Failed to delete saved item from account:', err);
      return {
        ok: false,
        message: 'Removed locally, but could not complete deletion on your account right now.',
      };
    }
  };

  const handleNewBlank12DaySheet = () => {
    setActive12DaySheetId(null);
    setFormData((prev) => ({
      ...prev,
      attendance: createInitialAttendanceData(1, 30),
    }));
  };

  const handleNewBlankCyberSheet = () => {
    setActiveCyberSheetId(null);
    setFormData((prev) => ({
      ...prev,
      cyberAttendance: createInitialCyberSecurityData(30),
    }));
  };

  const handleNewBlankCyberReport = () => {
    setActiveCyberReportId(null);
    setFormData((prev) => ({
      ...prev,
      cyberReport: createInitialCyberSecurityReportData(),
    }));
  };

  const handleAddExtraPage = () => {
    const nextNumber = formData.extraPages.length + 1;
    const newPage: ExtraDocumentPage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: `ADDITIONAL DOCUMENT ${nextNumber}`,
      image: '',
    };
    const nextPageIndex = 11 + attendancePageCount + formData.extraPages.length;
    setFormData((prev) => ({
      ...prev,
      extraPages: [...prev.extraPages, newPage],
    }));
    setActivePageIdx(nextPageIndex);
  };

  const handleUpdateExtraPage = (
    id: string,
    patch: Partial<Pick<ExtraDocumentPage, 'title' | 'image'>>
  ) => {
    setFormData((prev) => ({
      ...prev,
      extraPages: prev.extraPages.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  };

  const handleRemoveExtraPage = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      extraPages: prev.extraPages.filter((p) => p.id !== id),
    }));
  };

  const persistReportToAccount = (report: SavedReport) => {
    if (!user) return;
    void (async () => {
      const token = await getIdToken();
      try {
        await saveCloudReport(token, report);
        await saveCloudActiveDraft(token, {
          activeReportId: report.id,
          formData: report.data,
        });
        setSyncError(null);
      } catch (err) {
        console.error('Failed to save report to account:', err);
        setSyncError('Saved on this device, but could not sync to your account right now.');
      }
    })();
  };

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const now = new Date().toISOString();
    const existing = activeReportId
      ? savedReports.find((r) => r.id === activeReportId)
      : undefined;

    if (existing) {
      const updatedReport: SavedReport = {
        ...existing,
        updatedAt: now,
        data: formData,
      };
      setSavedReports((prev) => [
        updatedReport,
        ...prev.filter((item) => item.id !== existing.id),
      ]);
      void saveUserCachedReport(user.uid, updatedReport);
      void saveUserCachedDraft(user.uid, {
        activeReportId: existing.id,
        formData,
        updatedAt: now,
      });
      persistReportToAccount(updatedReport);
      setStatusMessage(
        'Report updated in My Reports with all daily photos and details.'
      );
    } else {
      const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const newReport: SavedReport = {
        id: newId,
        createdAt: now,
        updatedAt: now,
        data: formData,
      };
      setActiveReportId(newId);
      setSavedReports((prev) => [newReport, ...prev]);
      void saveUserCachedReport(user.uid, newReport);
      void saveUserCachedDraft(user.uid, {
        activeReportId: newId,
        formData,
        updatedAt: now,
      });
      persistReportToAccount(newReport);
      setStatusMessage(
        'Saved to My Reports. Your photos and details stay permanently saved until you delete them.'
      );
    }

    if (window.innerWidth < 1024 && previewStageRef.current) {
      previewStageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSaveAsNewReport = () => {
    if (!user) return;
    const now = new Date().toISOString();
    const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newReport: SavedReport = {
      id: newId,
      createdAt: now,
      updatedAt: now,
      data: formData,
    };
    setActiveReportId(newId);
    setSavedReports((prev) => [newReport, ...prev]);
    void saveUserCachedReport(user.uid, newReport);
    void saveUserCachedDraft(user.uid, {
      activeReportId: newId,
      formData,
      updatedAt: now,
    });
    persistReportToAccount(newReport);
    setStatusMessage('Saved as a new copy in My Reports.');
  };

  const handleStartNewReport = () => {
    if (!user) return;
    const fresh = createInitialFormData();
    const now = new Date().toISOString();
    setActiveReportId(null);
    setActive12DaySheetId(null);
    setActiveCyberSheetId(null);
    setActiveCyberReportId(null);
    setFormData(fresh);
    setPhotoFocusDay(null);
    setActiveTab('home');
    setActiveStep('cover');
    setPreviewMode('single');
    setActivePageIdx(0);
    setStatusMessage(
      'Started a new blank report. All previously saved reports and attendance sheets remain preserved.'
    );
    void saveUserCachedDraft(user.uid, {
      activeReportId: null,
      formData: fresh,
      updatedAt: now,
    });
    void (async () => {
      const token = await getIdToken();
      try {
        await saveCloudActiveDraft(token, { activeReportId: null, formData: fresh });
      } catch (err) {
        console.error('Failed to sync new draft:', err);
      }
    })();
  };

  const handleLoadSavedReport = (
    report: SavedReport,
    options?: { openPhotosDay?: number }
  ) => {
    if (!user) return;
    const restored = normalizeSavedFormData(report.data);
    const now = new Date().toISOString();
    setFormData(restored);
    setActiveReportId(report.id);
    setActiveTab('home');
    setPreviewMode('single');

    if (options?.openPhotosDay) {
      const targetDay = Math.max(1, Math.min(12, options.openPhotosDay));
      const targetPageIndex = 3 + Math.floor((targetDay - 1) / 3);
      setActiveStep('photos');
      setPhotoFocusDay(targetDay);
      setActivePageIdx(targetPageIndex);
      setStatusMessage(
        `Opened report at Day-${targetDay}. All previous days' photos are preserved.`
      );
    } else {
      setActiveStep('cover');
      setPhotoFocusDay(null);
      setActivePageIdx(0);
      setStatusMessage(
        'Loaded saved report with all photos, documents, and attendance data intact.'
      );
    }

    void saveUserCachedDraft(user.uid, {
      activeReportId: report.id,
      formData: restored,
      updatedAt: now,
    });
  };

  const handleDeleteSavedReport = (id: string) => {
    if (!user) return;
    const ownerUid = user.uid;
    const wasActive = activeReportId === id;
    setSavedReports((prev) => prev.filter((item) => item.id !== id));
    void deleteUserCachedReport(ownerUid, id);
    if (wasActive) {
      setActiveReportId(null);
      void saveUserCachedDraft(ownerUid, {
        activeReportId: null,
        formData: latestFormRef.current,
        updatedAt: new Date().toISOString(),
      });
    }
    void (async () => {
      const token = await getIdToken();
      try {
        await deleteCloudReport(token, id);
        if (wasActive) {
          await saveCloudActiveDraft(token, {
            activeReportId: null,
            formData: latestFormRef.current,
          });
        }
        setSyncError(null);
      } catch (err) {
        console.error('Failed to delete report from account:', err);
        setSyncError('Removed locally, but could not delete from your account right now.');
      }
    })();
  };

  const handleSignOut = async () => {
    const prevUid = user?.uid;
    hydratedUidRef.current = null;
    setSavedReports([]);
    setSavedAttendanceSheets([]);
    setActive12DaySheetId(null);
    setActiveCyberSheetId(null);
    setActiveCyberReportId(null);
    setFormData(createInitialFormData());
    setActiveReportId(null);
    setPhotoFocusDay(null);
    setStatusMessage(null);
    setDownloadFeedback(null);
    setSyncError(null);
    setActiveTab('home');
    setActiveStep('cover');
    setPreviewMode('single');
    setActivePageIdx(0);
    setIsMobileMenuOpen(false);
    setAuthScreenMode('login');

    if (prevUid) {
      await clearUserCachedData(prevUid);
    }
    await signOutUser();
  };

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const handleDownloadFullPdf = async () => {
    if (pdfProgress || isDownloadingPng) return;

    const nodes = exportPageRefs.current
      .slice(0, reportPages.length)
      .filter((el): el is HTMLDivElement => el !== null);

    if (nodes.length === 0) return;

    setDownloadFeedback(null);
    setPdfProgress({ current: 1, total: nodes.length });

    try {
      await exportReportPagesToPdf(
        nodes,
        computedPreview.downloadPdfFileName,
        (current, total) => setPdfProgress({ current, total })
      );
      setDownloadFeedback(
        `Complete ${nodes.length}-page A4 PDF downloaded successfully.`
      );
      window.setTimeout(() => setDownloadFeedback(null), 5000);
    } catch (err) {
      console.error('PDF export failed:', err);
      setDownloadFeedback('Unable to export PDF. Please try again.');
    } finally {
      setPdfProgress(null);
    }
  };

  const handleDownloadCoverPng = async () => {
    const coverNode = exportPageRefs.current[0] || coverCaptureRef.current;
    if (!coverNode || isDownloadingPng || pdfProgress) return;

    setIsDownloadingPng(true);
    setDownloadFeedback(null);

    try {
      await exportCoverPageToPng(coverNode, computedPreview.downloadFileName);
      setDownloadFeedback('High-resolution Cover Page PNG downloaded successfully.');
      window.setTimeout(() => setDownloadFeedback(null), 4000);
    } catch (err) {
      console.error('Cover PNG export failed:', err);
      setDownloadFeedback('Unable to export cover image. Please try again.');
    } finally {
      setIsDownloadingPng(false);
    }
  };

  const currentPage = reportPages[activePageIdx] || reportPages[0];
  const isExporting = Boolean(pdfProgress) || isDownloadingPng;

  // 1. Animated 2-Second Magic Bus Splash Screen on Launch
  if (showSplash) {
    return <SplashScreen durationMs={2000} onComplete={handleSplashComplete} />;
  }

  // 2. Auth Session Check Loading State
  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-[#F4F6FA] flex flex-col items-center justify-center gap-4 px-6">
        <MagicBusLogo size={88} variant="light" />
        <div className="flex items-center gap-2 text-[#0A254E] text-[14px] font-semibold">
          <Loader2 className="w-4 h-4 animate-spin text-[#0B3C82]" />
          <span>Verifying your session...</span>
        </div>
      </div>
    );
  }

  // 3. Strict Authentication Gate — Only Signed-In Users Can Access Any App Page or Reports
  if (!user) {
    return (
      <AuthScreen
        key={authScreenMode}
        initialMode={authScreenMode}
        signingIn={signingIn}
        authError={authError}
        onClearError={clearAuthError}
        onSignUpWithEmail={signUpWithEmail}
        onSignInWithEmail={signInWithEmail}
        onSignInWithGoogle={signInWithGoogle}
      />
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden flex flex-col bg-[#F4F6FA] text-[#0A254E]">
      {/* Top Institutional Header */}
      <header className="relative bg-white border-b border-[#DCE4F0] overflow-hidden">
        {/* Top Brand & User Account Row */}
        <div className="relative">
          {/* Top-Right Sweeping Yellow & Navy Corner Curve (tucked cleanly at far right edge on desktop) */}
          <svg
            width="210"
            height="84"
            viewBox="0 0 210 84"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="hidden lg:block absolute top-0 right-0 h-full w-auto pointer-events-none select-none"
            aria-hidden="true"
          >
            <path d="M210 0 L210 84 L0 84 C92 82 161 54 187 0 Z" fill="#F1F5F9" />
            <path d="M210 0 L210 84 L42 84 C122 80 178 52 198 0 Z" fill="#FFD000" />
            <path d="M210 21 L210 84 L92 84 C150 77 189 56 210 21 Z" fill="#FFFFFF" />
            <path d="M210 30 L210 84 L110 84 C159 77 192 60 210 30 Z" fill="#072756" />
          </svg>

          <div className="max-w-[1220px] mx-auto px-3 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3 sm:gap-6 relative z-10 lg:pr-36 xl:pr-28">
            {/* Brand Lockup */}
            <button
              type="button"
              onClick={() => handleSelectTab('home')}
              className="flex items-center gap-2.5 sm:gap-3.5 text-left cursor-pointer min-w-0 focus:outline-none"
            >
              <div className="shrink-0 sm:hidden">
                <MagicBusLogo size={46} variant="light" />
              </div>
              <div className="shrink-0 hidden sm:block">
                <MagicBusLogo size={64} variant="light" />
              </div>
              <div
                className="hidden sm:block h-9 w-[1.5px] bg-[#CBD5E1] shrink-0"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <span className="block text-[15px] sm:text-[19px] lg:text-[21px] font-extrabold tracking-tight text-[#0A254E] leading-tight truncate">
                  Magic Bus India Foundation
                </span>
                <span className="hidden sm:block text-[11.5px] font-semibold text-[#64748B] tracking-wide">
                  Training Program Report Portal
                </span>
              </div>
            </button>

            {/* Tablet & Desktop User Account Controls */}
            <div className="hidden md:flex items-center gap-2.5 shrink-0">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Account avatar'}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full border border-[#CBD5E1] object-cover shrink-0"
                />
              ) : (
                <span
                  title={user.displayName || user.email}
                  className="w-8 h-8 rounded-full bg-[#082B59] text-white text-[12.5px] font-bold flex items-center justify-center shrink-0"
                >
                  {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </span>
              )}
              <span className="text-[13px] font-semibold text-[#334155] max-w-[160px] lg:max-w-[200px] truncate">
                {user.displayName || user.email}
              </span>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                title={`Sign out (${user.email || 'Account'})`}
                className="py-1.5 px-3 min-h-[36px] rounded-md border border-[#CBD4E1] bg-white text-[#334155] hover:text-[#0A254E] hover:bg-[#F1F5FA] text-[12.5px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>

            {/* Mobile Menu Bar Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-primary-nav"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="md:hidden min-w-[42px] min-h-[42px] rounded-lg border border-[#CBD4E1] bg-[#F8FAFD] text-[#0A254E] hover:bg-[#EDF2F9] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" strokeWidth={2.3} />
              ) : (
                <Menu className="w-5 h-5" strokeWidth={2.3} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation Drawer (replaces horizontal scroll bar on phones) */}
        {isMobileMenuOpen && (
          <div
            id="mobile-primary-nav"
            className="md:hidden bg-white border-t border-[#E2E8F0] shadow-[0_8px_24px_rgba(7,35,75,0.1)]"
          >
            <nav aria-label="Mobile navigation" className="px-3 py-2 space-y-1">
              {(
                [
                  { id: 'home', label: 'Home', icon: Home },
                  { id: 'attendance', label: '12-Days Attendance', icon: Table2 },
                  { id: 'cyber', label: 'Cyber Security', icon: ShieldCheck },
                  { id: 'reports', label: 'My Reports', icon: FileText },
                  { id: 'about', label: 'About Us', icon: Info },
                ] as const
              ).map(({ id, label, icon: Icon }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSelectTab(id)}
                    className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-lg flex items-center gap-3 text-[14.5px] transition-colors cursor-pointer text-left ${
                      isActive
                        ? 'bg-[#EDF4FD] text-[#0A254E] font-bold border-l-[3px] border-[#0B3C82]'
                        : 'text-[#334155] font-semibold hover:bg-[#F8FAFD] hover:text-[#0A254E]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Mobile Signed-In User & Sign Out Footer */}
            <div className="px-4 py-3 bg-[#F8FAFD] border-t border-[#E6ECF5] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Account avatar'}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full border border-[#CBD5E1] object-cover shrink-0"
                  />
                ) : (
                  <span className="w-8 h-8 rounded-full bg-[#082B59] text-white text-[12.5px] font-bold flex items-center justify-center shrink-0">
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-[#0A254E] truncate">
                    {user.displayName || 'Trainer Account'}
                  </div>
                  <div className="text-[11.5px] text-[#64748B] truncate">{user.email}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="py-1.5 px-3 min-h-[36px] rounded-md border border-[#CBD4E1] bg-white text-[#334155] hover:text-[#0A254E] hover:bg-[#F1F5FA] text-[12.5px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}

        {/* Tablet & Desktop Clean Primary Navigation Bar */}
        <div className="hidden md:block bg-[#F8FAFD] border-t border-[#E6ECF5]">
          <nav
            aria-label="Primary navigation"
            className="max-w-[1220px] mx-auto px-6 lg:px-8 flex items-center gap-2 lg:gap-4"
          >
            <button
              type="button"
              onClick={() => handleSelectTab('home')}
              className={`relative py-2.5 px-3 min-h-[42px] flex items-center gap-1.5 text-[14px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'home'
                  ? 'text-[#0A254E] font-bold'
                  : 'text-[#475569] hover:text-[#0A254E]'
              }`}
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>Home</span>
              {activeTab === 'home' && (
                <span className="absolute bottom-0 left-1 right-1 h-[3px] bg-[#0B3C82] rounded-t-full" />
              )}
            </button>

            <span className="h-4 w-[1px] bg-[#D6DFEC] shrink-0" aria-hidden="true" />

            <button
              type="button"
              onClick={() => handleSelectTab('attendance')}
              className={`relative py-2.5 px-3 min-h-[42px] flex items-center gap-1.5 text-[14px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'attendance'
                  ? 'text-[#0A254E] font-bold'
                  : 'text-[#475569] hover:text-[#0A254E]'
              }`}
            >
              <Table2 className="w-4 h-4 shrink-0" />
              <span>12-Days Attendance</span>
              {activeTab === 'attendance' && (
                <span className="absolute bottom-0 left-1 right-1 h-[3px] bg-[#0B3C82] rounded-t-full" />
              )}
            </button>

            <span className="h-4 w-[1px] bg-[#D6DFEC] shrink-0" aria-hidden="true" />

            <button
              type="button"
              onClick={() => handleSelectTab('cyber')}
              className={`relative py-2.5 px-3 min-h-[42px] flex items-center gap-1.5 text-[14px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'cyber'
                  ? 'text-[#0A254E] font-bold'
                  : 'text-[#475569] hover:text-[#0A254E]'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Cyber Security</span>
              {activeTab === 'cyber' && (
                <span className="absolute bottom-0 left-1 right-1 h-[3px] bg-[#0B3C82] rounded-t-full" />
              )}
            </button>

            <span className="h-4 w-[1px] bg-[#D6DFEC] shrink-0" aria-hidden="true" />

            <button
              type="button"
              onClick={() => handleSelectTab('reports')}
              className={`relative py-2.5 px-3 min-h-[42px] flex items-center gap-1.5 text-[14px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'reports'
                  ? 'text-[#0A254E] font-bold'
                  : 'text-[#475569] hover:text-[#0A254E]'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>My Reports</span>
              {activeTab === 'reports' && (
                <span className="absolute bottom-0 left-1 right-1 h-[3px] bg-[#0B3C82] rounded-t-full" />
              )}
            </button>

            <span className="h-4 w-[1px] bg-[#D6DFEC] shrink-0" aria-hidden="true" />

            <button
              type="button"
              onClick={() => handleSelectTab('about')}
              className={`relative py-2.5 px-3 min-h-[42px] flex items-center gap-1.5 text-[14px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'about'
                  ? 'text-[#0A254E] font-bold'
                  : 'text-[#475569] hover:text-[#0A254E]'
              }`}
            >
              <Info className="w-4 h-4 shrink-0" />
              <span>About Us</span>
              {activeTab === 'about' && (
                <span className="absolute bottom-0 left-1 right-1 h-[3px] bg-[#0B3C82] rounded-t-full" />
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Banner Section */}
      <section
        className="relative w-full overflow-hidden"
        style={{
          background: 'linear-gradient(90deg, #042049 0%, #072A5E 55%, #062552 100%)',
        }}
      >
        <div className="absolute inset-y-0 right-0 w-full md:w-[52%] lg:w-[46%] pointer-events-none select-none">
          <img
            src="/assets/extracted/hero_students.png"
            alt="Smiling students from Magic Bus India Foundation"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center opacity-25 sm:opacity-45 md:opacity-95"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, #042049 0%, rgba(4,32,73,0.92) 14%, rgba(6,37,82,0.45) 38%, rgba(6,37,82,0.05) 68%, rgba(6,37,82,0) 100%)',
            }}
          />
        </div>

        <div className="max-w-[1220px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 lg:py-9 relative z-10">
          <div className="max-w-[700px]">
            <div className="flex items-stretch gap-3 sm:gap-4">
              <div
                className="w-[4.5px] sm:w-[5.5px] rounded-full shrink-0 my-1"
                style={{ backgroundColor: '#FCD116' }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <h1 className="text-white text-[21px] sm:text-[32px] lg:text-[39px] font-extrabold leading-[1.18] tracking-tight">
                  Magic Bus India Foundation
                </h1>
                <p
                  className="text-[21px] sm:text-[32px] lg:text-[39px] font-extrabold leading-[1.18] tracking-tight mt-0.5"
                  style={{ color: '#FCD116' }}
                >
                  Training Program Report Generator
                </p>
              </div>
            </div>
            <p className="text-[#E2ECF8] text-[13px] sm:text-[15px] lg:text-[16px] font-medium mt-3 pl-4 sm:pl-6 leading-snug">
              Generate and download complete multi-page training program PDF reports in seconds.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Workspace */}
      <main className="flex-1 w-full max-w-[1220px] mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 lg:py-9">
        {isUserDataLoading ? (
          <div className="bg-white rounded-xl border border-[#E1E6EF] shadow-[0_3px_16px_rgba(8,37,82,0.06)] py-20 px-6 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-[#0B3C82]" />
            <p className="text-[14.5px] font-semibold text-[#0A254E]">
              Loading your saved reports and workspace...
            </p>
          </div>
        ) : (
          <>
        {activeTab === 'home' && (
          <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] gap-5 sm:gap-7 items-start">
            {/* Left Column: Multi-Step Report Details Form */}
            <ReportForm
              activeStep={activeStep}
              onStepChange={setActiveStep}
              formData={formData}
              photoFocusDay={photoFocusDay}
              isEditingSavedReport={Boolean(activeReportId)}
              onChange={handleFieldChange}
              onUpdateDayPhoto={handleUpdateDayPhoto}
              onClearAllPhotos={handleClearAllPhotos}
              onUpdateConclusion={handleUpdateConclusion}
              onUpdateDocument={handleUpdateDocument}
              onAddExtraPage={handleAddExtraPage}
              onUpdateExtraPage={handleUpdateExtraPage}
              onRemoveExtraPage={handleRemoveExtraPage}
              onSelectPreviewPage={(pageIdx) => {
                setPreviewMode('single');
                setActivePageIdx(pageIdx);
              }}
              onGenerate={handleGenerateReport}
              onSaveAsNewReport={handleSaveAsNewReport}
              onStartNewReport={handleStartNewReport}
              statusMessage={statusMessage}
              digitalAttendanceActive={digitalAttendanceActive}
              digitalAttendanceCount={filledAttendanceStudents}
              attendancePageCount={attendancePageCount}
              onOpenAttendanceTab={() => setActiveTab('attendance')}
            />

            {/* Right Column: Live Multi-Page A4 Report Preview & PDF/PNG Export */}
            <div className="bg-white rounded-xl shadow-[0_3px_16px_rgba(8,37,82,0.08)] border border-[#E1E6EF] overflow-hidden flex flex-col min-w-0">
              {/* Dark Navy Card Header */}
              <div
                className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-2"
                style={{ background: 'linear-gradient(90deg, #072754 0%, #0C366F 100%)' }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Eye className="w-[19px] h-[19px] text-white shrink-0" strokeWidth={2.2} />
                  <h2 className="text-white text-[16px] sm:text-[17px] font-bold tracking-tight truncate">
                    Report Preview
                  </h2>
                </div>
                <span className="text-[12px] font-semibold text-[#D6E6FF] tabular-nums whitespace-nowrap shrink-0">
                  {reportPages.length} Pages (A4)
                </span>
              </div>

              {/* Page Navigator & Single/All View Controls */}
              <div className="px-3 sm:px-4 py-2.5 bg-[#F1F5FA] border-b border-[#DCE4F0] flex flex-wrap items-center justify-between gap-2">
                {previewMode === 'single' ? (
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => setActivePageIdx((idx) => Math.max(0, idx - 1))}
                      disabled={activePageIdx === 0}
                      aria-label="Previous page"
                      className="p-1.5 rounded-md border border-[#CBD4E1] bg-white text-[#0A254E] disabled:opacity-40 hover:bg-[#EDF2F9] cursor-pointer shrink-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <select
                      aria-label="Select report page to preview"
                      value={activePageIdx}
                      onChange={(e) => setActivePageIdx(Number(e.target.value))}
                      className="flex-1 min-w-0 px-2.5 py-1.5 rounded-md border border-[#CBD4E1] bg-white text-[12.5px] sm:text-[13px] font-bold text-[#0A254E] focus:outline-none focus:border-[#0B336B] cursor-pointer truncate"
                    >
                      {reportPages.map((page, idx) => (
                        <option key={page.id} value={idx}>
                          {page.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() =>
                        setActivePageIdx((idx) =>
                          Math.min(reportPages.length - 1, idx + 1)
                        )
                      }
                      disabled={activePageIdx >= reportPages.length - 1}
                      aria-label="Next page"
                      className="p-1.5 rounded-md border border-[#CBD4E1] bg-white text-[#0A254E] disabled:opacity-40 hover:bg-[#EDF2F9] cursor-pointer shrink-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-[13px] font-bold text-[#0A254E]">
                    Showing All {reportPages.length} Pages
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setPreviewMode((mode) => (mode === 'single' ? 'all' : 'single'))
                  }
                  className="px-2.5 py-1.5 rounded-md border border-[#CBD4E1] bg-white text-[12px] font-bold text-[#082B59] flex items-center gap-1.5 hover:bg-[#E8F1FD] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{previewMode === 'single' ? 'View All Pages' : 'Single Page'}</span>
                </button>
              </div>

              {/* Preview Stage */}
              <div
                ref={previewStageRef}
                className="p-2.5 sm:p-5 bg-[#F8FAFD] flex flex-col items-center w-full overflow-hidden"
              >
                {previewMode === 'single' ? (
                  <div
                    className="max-w-full overflow-hidden"
                    style={{
                      width: `${A4_PAGE_WIDTH * previewScale}px`,
                      height: `${A4_PAGE_HEIGHT * previewScale}px`,
                      position: 'relative',
                    }}
                  >
                    <div
                      className="shadow-[0_6px_24px_rgba(7,35,75,0.14)] border border-[#E2E8F0]"
                      style={{
                        width: `${A4_PAGE_WIDTH}px`,
                        height: `${A4_PAGE_HEIGHT}px`,
                        transform: `scale(${previewScale})`,
                        transformOrigin: 'top left',
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      {currentPage.render()}
                    </div>
                  </div>
                ) : (
                  <div className="w-full max-h-[780px] overflow-y-auto flex flex-col items-center gap-5 py-1 pr-1">
                    {reportPages.map((page) => (
                      <div key={page.id} className="flex flex-col items-center gap-1.5">
                        <span className="text-[12px] font-bold text-[#475569]">
                          {page.label}
                        </span>
                        <div
                          className="max-w-full overflow-hidden"
                          style={{
                            width: `${A4_PAGE_WIDTH * previewScale}px`,
                            height: `${A4_PAGE_HEIGHT * previewScale}px`,
                            position: 'relative',
                          }}
                        >
                          <div
                            className="shadow-[0_4px_18px_rgba(7,35,75,0.12)] border border-[#E2E8F0]"
                            style={{
                              width: `${A4_PAGE_WIDTH}px`,
                              height: `${A4_PAGE_HEIGHT}px`,
                              transform: `scale(${previewScale})`,
                              transformOrigin: 'top left',
                              backgroundColor: '#FFFFFF',
                            }}
                          >
                            {page.render()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Download Actions: Full Multi-Page PDF + Cover Page PNG */}
                <div className="mt-5 mb-1 w-full flex flex-col items-center gap-2.5 px-1">
                  <button
                    type="button"
                    onClick={handleDownloadFullPdf}
                    disabled={isExporting}
                    className="w-full max-w-[360px] min-h-[46px] py-3 px-5 sm:px-7 rounded-lg text-white text-[14px] sm:text-[15px] font-bold flex items-center justify-center gap-2.5 shadow-[0_3px_10px_rgba(7,35,75,0.24)] hover:brightness-110 active:scale-[0.99] disabled:opacity-75 transition-all cursor-pointer whitespace-nowrap"
                    style={{ background: 'linear-gradient(180deg, #0D366E 0%, #07234B 100%)' }}
                  >
                    {pdfProgress ? (
                      <>
                        <Loader2 className="w-[18px] h-[18px] animate-spin shrink-0" />
                        <span>
                          Generating PDF ({pdfProgress.current}/{pdfProgress.total})...
                        </span>
                      </>
                    ) : (
                      <>
                        <FileDown className="w-[18px] h-[18px] text-white shrink-0" strokeWidth={2.4} />
                        <span>Download Complete Report (PDF)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadCoverPng}
                    disabled={isExporting}
                    className="w-full max-w-[360px] min-h-[40px] py-2 px-5 rounded-lg border border-[#CBD4E1] bg-white text-[#0A254E] text-[13px] font-bold flex items-center justify-center gap-2 hover:bg-[#F1F5FA] disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {isDownloadingPng ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span>Preparing Cover PNG...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 shrink-0" strokeWidth={2.3} />
                        <span>Download Page 1 Cover Only (PNG)</span>
                      </>
                    )}
                  </button>

                  {downloadFeedback && (
                    <p
                      role="status"
                      className="mt-1 text-[13px] font-medium text-[#0B336B] flex items-center justify-center text-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                      <span>{downloadFeedback}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <AttendanceSheetView
            attendance={formData.attendance}
            defaultCollegeBatchHeader={defaultAttendanceCollegeBatch}
            savedSheets={savedAttendanceSheets.filter((s) => s.sheetType === '12days')}
            activeSheetId={active12DaySheetId}
            isSavingSheet={isSaving12DaySheet}
            onChangeAttendance={handleUpdateAttendance}
            onSaveSheet={handleSave12DaySheet}
            onLoadSheet={handleLoadAttendanceSheet}
            onDeleteSheet={handleDeleteAttendanceSheet}
            onNewBlankSheet={handleNewBlank12DaySheet}
            onOpenReportPreview={() => {
              setActiveTab('home');
              setPreviewMode('single');
              setActivePageIdx(10);
            }}
          />
        )}

        {activeTab === 'cyber' && (
          <div className="space-y-5">
            {/* Cyber Security Sub-Navigation Switcher */}
            <div className="bg-white rounded-xl border border-[#DCE4F0] shadow-[0_2px_10px_rgba(8,37,82,0.05)] px-3.5 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[#082B59] text-[#FFD100] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[15px] sm:text-[16px] font-extrabold text-[#08234D] leading-tight truncate">
                    Cyber Security Program Workspace
                  </h2>
                  <p className="text-[12px] text-[#64748B] truncate">
                    Create full Cyber Security PDF reports or manage the student attendance register.
                  </p>
                </div>
              </div>

              <div
                role="tablist"
                aria-label="Cyber Security workspace sections"
                className="grid grid-cols-2 w-full sm:w-auto sm:inline-flex items-center p-1 gap-1 rounded-lg bg-[#F1F5FA] border border-[#DCE4F0] shrink-0"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={cyberSubTab === 'report'}
                  onClick={() => setCyberSubTab('report')}
                  className={`min-w-0 justify-center px-2 sm:px-3.5 py-2 rounded-md text-[11.5px] sm:text-[13px] font-bold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    cyberSubTab === 'report'
                      ? 'bg-[#082B59] text-white shadow-sm'
                      : 'text-[#334155] hover:text-[#08234D]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">
                    <span className="sm:hidden">Cyber Report</span>
                    <span className="hidden sm:inline">Cyber Security Report</span>
                  </span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={cyberSubTab === 'attendance'}
                  onClick={() => setCyberSubTab('attendance')}
                  className={`min-w-0 justify-center px-2 sm:px-3.5 py-2 rounded-md text-[11.5px] sm:text-[13px] font-bold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    cyberSubTab === 'attendance'
                      ? 'bg-[#082B59] text-white shadow-sm'
                      : 'text-[#334155] hover:text-[#08234D]'
                  }`}
                >
                  <Table2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">Attendance Sheet</span>
                </button>
              </div>
            </div>

            {cyberSubTab === 'report' ? (
              <CyberSecurityReportView
                report={formData.cyberReport}
                cyberAttendance={formData.cyberAttendance}
                defaultAttendanceTitle={defaultCyberSheetTitle}
                defaultStartDate={defaultCyberStartDate}
                defaultEndDate={defaultCyberEndDate}
                savedReports={savedAttendanceSheets.filter(
                  (s) => s.sheetType === 'cyber_report'
                )}
                activeReportId={activeCyberReportId}
                isSaving={isSavingCyberReport}
                onChange={handleUpdateCyberReport}
                onSaveReport={handleSaveCyberReport}
                onLoadReport={handleLoadAttendanceSheet}
                onDeleteReport={handleDeleteAttendanceSheet}
                onNewBlankReport={handleNewBlankCyberReport}
                onOpenAttendanceSheetSubTab={() => setCyberSubTab('attendance')}
              />
            ) : (
              <CyberSecurityAttendanceView
                data={formData.cyberAttendance}
                defaultSheetTitle={defaultCyberSheetTitle}
                defaultStartDate={defaultCyberStartDate}
                defaultEndDate={defaultCyberEndDate}
                savedSheets={savedAttendanceSheets.filter((s) => s.sheetType === 'cyber')}
                activeSheetId={activeCyberSheetId}
                isSavingSheet={isSavingCyberSheet}
                onChange={handleUpdateCyberAttendance}
                onSaveSheet={handleSaveCyberSheet}
                onLoadSheet={handleLoadAttendanceSheet}
                onDeleteSheet={handleDeleteAttendanceSheet}
                onNewBlankSheet={handleNewBlankCyberSheet}
              />
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <MyReportsView
            reports={savedReports}
            savedCyberReports={savedAttendanceSheets.filter(
              (s) => s.sheetType === 'cyber_report'
            )}
            activeReportId={activeReportId}
            syncError={syncError}
            onLoadReport={handleLoadSavedReport}
            onOpenCyberReport={(sheet) => {
              handleLoadAttendanceSheet(sheet);
              setActiveTab('cyber');
              setCyberSubTab('report');
            }}
            onDeleteReport={handleDeleteSavedReport}
            onDeleteCyberReport={handleDeleteAttendanceSheet}
            onCreateNew={handleStartNewReport}
          />
        )}

        {activeTab === 'about' && <AboutView onGoHome={() => setActiveTab('home')} />}
          </>
        )}
      </main>

      {/* Off-Screen Unscaled 1:1 A4 Print Staging Container for Exact Multi-Page PDF Capture */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: '-12000px',
          top: 0,
          width: `${A4_PAGE_WIDTH}px`,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        {reportPages.map((page, idx) => (
          <div
            key={`export-${page.id}`}
            ref={(el) => {
              exportPageRefs.current[idx] = el;
            }}
            style={{
              width: `${A4_PAGE_WIDTH}px`,
              height: `${A4_PAGE_HEIGHT}px`,
              backgroundColor: '#FFFFFF',
              overflow: 'hidden',
            }}
          >
            {page.render()}
          </div>
        ))}
      </div>

      {/* Deep Navy Institutional Footer */}
      <footer
        className="w-full mt-auto text-white"
        style={{ background: 'linear-gradient(90deg, #041D42 0%, #072654 50%, #041D42 100%)' }}
      >
        <div className="max-w-[1220px] mx-auto px-5 sm:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <MagicBusLogo size={64} variant="dark" className="shrink-0" />
            <div>
              <div className="text-[16px] font-bold text-white leading-tight">
                Magic Bus India Foundation
              </div>
              <div className="text-[13px] italic text-[#CBD5E1] mt-0.5">
                Childhood to Livelihood
              </div>
            </div>
            <div className="hidden md:block h-10 w-[1.5px] bg-white/35 ml-4" aria-hidden="true" />
          </div>

          <p className="text-[14px] sm:text-[15px] italic text-[#E2ECF8] text-center">
            Empowering Youth For Building a Better Tomorrow.
          </p>

          <div className="flex items-center gap-3">
            <a
              href="https://www.magicbus.org/"
              target="_blank"
              rel="noopener noreferrer"
              title="Magic Bus India Foundation Official Website"
              aria-label="Magic Bus India Foundation Official Website"
              className="w-8 h-8 rounded-full bg-white text-[#052048] flex items-center justify-center hover:bg-[#FFD100] transition-colors"
            >
              <Globe className="w-4 h-4" strokeWidth={2.2} />
            </a>
            <a
              href="https://www.linkedin.com/company/magic-bus/"
              target="_blank"
              rel="noopener noreferrer"
              title="Magic Bus on LinkedIn"
              aria-label="Magic Bus on LinkedIn"
              className="w-8 h-8 rounded-full bg-white text-[#052048] flex items-center justify-center hover:bg-[#FFD100] transition-colors"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M6.94 8.5H3.56V19.5H6.94V8.5ZM5.25 3.5C4.14 3.5 3.25 4.39 3.25 5.5C3.25 6.6 4.14 7.5 5.25 7.5C6.35 7.5 7.25 6.6 7.25 5.5C7.25 4.39 6.35 3.5 5.25 3.5ZM20.44 13.02C20.44 9.88 18.76 8.22 16.16 8.22C14.37 8.22 13.48 9.21 13.02 9.93V8.5H9.65C9.7 9.48 9.65 19.5 9.65 19.5H13.02V13.36C13.02 13.02 13.05 12.69 13.15 12.45C13.42 11.78 14.03 11.09 15.07 11.09C16.41 11.09 17.06 12.11 17.06 13.6V19.5H20.44V13.02Z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
