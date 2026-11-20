import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CopyPlus,
  Download,
  Eye,
  FileCheck2,
  FileDown,
  FilePlus2,
  FileText,
  FolderOpen,
  Layers,
  Loader2,
  RotateCcw,
  RotateCw,
  Save,
  ShieldCheck,
  Table2,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  CyberSecurityAttendanceData,
  CyberSecurityReportData,
  DEFAULT_CYBER_REPORT_VALUES,
  ROLE_OPTIONS,
  SavedAttendanceSheet,
} from '../types/report';
import {
  DOCUMENT_ACCEPT_TYPES,
  processDocumentUpload,
  rotateImageDataUrl,
} from '../utils/documentUpload';
import {
  A4_PAGE_HEIGHT,
  A4_PAGE_WIDTH,
  exportCoverPageToPng,
  exportReportPagesToPdf,
  readAndOptimizeImage,
} from '../utils/exportPdf';
import { DatePickerField } from './DatePickerField';
import { FedExLogo } from './FedExLogo';
import { MagicBusLogo } from './MagicBusLogo';
import { DocumentAttachmentPage } from './ReportPages';
import {
  chunkCyberPortraitRows,
  CYBER_PORTRAIT_ROWS_PER_PAGE,
  CyberSecurityCoverPage,
  CyberSecurityPhotosPage,
  CyberSecurityPortraitAttendancePage,
} from './CyberSecurityReportPages';

type CyberFormStep = 'cover' | 'photos' | 'attendance';
type PreviewMode = 'single' | 'all';

interface ActionResult {
  ok: boolean;
  message: string;
}

interface CyberSecurityReportViewProps {
  report: CyberSecurityReportData;
  cyberAttendance: CyberSecurityAttendanceData;
  defaultAttendanceTitle: string;
  defaultStartDate: string;
  defaultEndDate: string;
  savedReports: SavedAttendanceSheet[];
  activeReportId: string | null;
  isSaving: boolean;
  onChange: (next: CyberSecurityReportData) => void;
  onSaveReport: (options?: { asNew?: boolean }) => Promise<ActionResult>;
  onLoadReport: (sheet: SavedAttendanceSheet) => void;
  onDeleteReport: (id: string) => Promise<ActionResult>;
  onNewBlankReport: () => void;
  onOpenAttendanceSheetSubTab: () => void;
}

interface PageDescriptor {
  id: string;
  label: string;
  render: () => React.ReactNode;
}

type CyberValidationField =
  | 'projectName'
  | 'collegeName'
  | 'trainerName'
  | 'trainerDesignation'
  | 'coTrainerDesignation'
  | 'totalStudents'
  | 'completedCount'
  | 'boysCount'
  | 'girlsCount'
  | 'managerName'
  | 'managerDesignation'
  | 'teamName';

type CyberFieldErrors = Partial<Record<CyberValidationField, string>>;

const VALIDATION_FIELD_META: ReadonlyArray<{
  key: CyberValidationField;
  label: string;
  inputId: string;
}> = [
  { key: 'projectName', label: 'Project Name', inputId: 'cyber-project-name' },
  { key: 'collegeName', label: 'College Name', inputId: 'cyber-college-name' },
  { key: 'trainerName', label: 'Primary Trainer Name', inputId: 'cyber-trainer-name' },
  {
    key: 'trainerDesignation',
    label: 'Primary Trainer Designation',
    inputId: 'cyber-trainer-role',
  },
  {
    key: 'coTrainerDesignation',
    label: 'Co-Trainer Designation',
    inputId: 'cyber-cotrainer-role',
  },
  {
    key: 'totalStudents',
    label: 'Total Students Count',
    inputId: 'cyber-total-students',
  },
  {
    key: 'completedCount',
    label: 'Completed Count',
    inputId: 'cyber-completed-count',
  },
  { key: 'boysCount', label: 'Boys Count', inputId: 'cyber-boys-count' },
  { key: 'girlsCount', label: 'Girls Count', inputId: 'cyber-girls-count' },
  { key: 'managerName', label: 'Manager Name', inputId: 'cyber-manager-name' },
  {
    key: 'managerDesignation',
    label: 'Manager Designation',
    inputId: 'cyber-manager-designation',
  },
  { key: 'teamName', label: 'Team Name', inputId: 'cyber-team-name' },
];

function parseNonNegativeInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

function validateCyberReport(report: CyberSecurityReportData): CyberFieldErrors {
  const errors: CyberFieldErrors = {};

  if (!report.projectName.trim()) {
    errors.projectName = 'Please enter the Project Name.';
  }
  if (!report.collegeName.trim()) {
    errors.collegeName = 'Please enter the College Name.';
  }
  if (!report.trainerName.trim()) {
    errors.trainerName = 'Please enter the Primary Trainer Name.';
  }
  if (!report.trainerDesignation.trim()) {
    errors.trainerDesignation = 'Please enter the Primary Trainer Designation.';
  }
  if (report.coTrainerName.trim() && !report.coTrainerDesignation.trim()) {
    errors.coTrainerDesignation =
      'Please enter the Co-Trainer Designation or clear Co-Trainer Name.';
  }

  const totalNum = parseNonNegativeInt(report.totalStudents);
  if (totalNum === null || totalNum <= 0) {
    errors.totalStudents = 'Enter a valid Total Students count (greater than 0).';
  }

  const boysNum = parseNonNegativeInt(report.boysCount);
  if (boysNum === null) {
    errors.boysCount = 'Enter Boys Count (0 or more).';
  }

  const girlsNum = parseNonNegativeInt(report.girlsCount);
  if (girlsNum === null) {
    errors.girlsCount = 'Enter Girls Count (0 or more).';
  }

  const completedNum = parseNonNegativeInt(report.completedCount);
  if (completedNum === null) {
    errors.completedCount = 'Enter Completed Students count (0 or more).';
  } else if (totalNum !== null && totalNum > 0 && completedNum > totalNum) {
    errors.completedCount = `Completed count (${completedNum}) cannot exceed Total Students (${totalNum}).`;
  }

  if (!report.managerName.trim()) {
    errors.managerName = 'Please enter the Manager Name.';
  }
  if (!report.managerDesignation.trim()) {
    errors.managerDesignation = 'Please select the Manager Designation.';
  }
  if (!report.teamName.trim()) {
    errors.teamName = 'Please enter the Team Name.';
  }

  return errors;
}

function formatSavedTimestamp(iso?: string): string {
  if (!iso) return 'Just now';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Recently saved';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function summarizeCyberReport(sheet: SavedAttendanceSheet): {
  college: string;
  studentsSummary: string;
  photoCount: number;
  hasAttendance: boolean;
} {
  const payload = sheet.data as Partial<CyberSecurityReportData> | undefined;
  const college = (payload?.collegeName || '').trim() || 'College not set';
  const total = (payload?.totalStudents || '').trim();
  const completed = (payload?.completedCount || '').trim();
  const studentsSummary =
    total || completed
      ? `${completed || '0'} / ${total || '0'} Completed`
      : 'Counts not entered';
  const sessionArr = Array.isArray(payload?.sessionImages) ? payload.sessionImages : ['', ''];
  const photoCount =
    (sessionArr[0] ? 1 : 0) +
    (sessionArr[1] ? 1 : 0) +
    (payload?.preTestImage ? 1 : 0) +
    (payload?.postTestImage ? 1 : 0);
  const hasAttendance = Boolean(payload?.attendanceSheetImage || payload?.useDigitalAttendance);
  return { college, studentsSummary, photoCount, hasAttendance };
}

export const CyberSecurityReportView: React.FC<CyberSecurityReportViewProps> = ({
  report,
  cyberAttendance,
  defaultAttendanceTitle,
  defaultStartDate,
  defaultEndDate,
  savedReports,
  activeReportId,
  isSaving,
  onChange,
  onSaveReport,
  onLoadReport,
  onDeleteReport,
  onNewBlankReport,
  onOpenAttendanceSheetSubTab,
}) => {
  const [step, setStep] = useState<CyberFormStep>('cover');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('single');
  const [activePageIdx, setActivePageIdx] = useState(0);
  const [previewScale, setPreviewScale] = useState(1);
  const [showSavedPanel, setShowSavedPanel] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmClearPhotos, setConfirmClearPhotos] = useState(false);
  const [busyUploadKey, setBusyUploadKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; tone: 'success' | 'error' } | null>(
    null
  );
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CyberFieldErrors>({});
  const [isDownloadingPng, setIsDownloadingPng] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(
    null
  );

  const previewStageRef = useRef<HTMLDivElement | null>(null);
  const coverCaptureRef = useRef<HTMLDivElement | null>(null);
  const exportPageRefs = useRef<Array<HTMLDivElement | null>>([]);

  const flashFeedback = (text: string, tone: 'success' | 'error' = 'success') => {
    setFeedback({ text, tone });
    window.setTimeout(() => {
      setFeedback((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const activeSavedReport = useMemo(
    () => (activeReportId ? savedReports.find((r) => r.id === activeReportId) || null : null),
    [activeReportId, savedReports]
  );

  const filledDigitalAttendanceRows = useMemo(
    () =>
      cyberAttendance.rows.filter(
        (r) => r.fullName.trim().length > 0 || r.uniqueId.trim().length > 0
      ),
    [cyberAttendance.rows]
  );

  const digitalAttendanceActive = Boolean(
    report.useDigitalAttendance &&
      filledDigitalAttendanceRows.length > 0 &&
      !report.attendanceSheetImage
  );

  const portraitAttendanceChunks = useMemo(
    () => chunkCyberPortraitRows(cyberAttendance.rows, CYBER_PORTRAIT_ROWS_PER_PAGE),
    [cyberAttendance.rows]
  );

  const uploadedPhotoCount = useMemo(
    () =>
      (report.sessionImages[0] ? 1 : 0) +
      (report.sessionImages[1] ? 1 : 0) +
      (report.preTestImage ? 1 : 0) +
      (report.postTestImage ? 1 : 0),
    [report.sessionImages, report.preTestImage, report.postTestImage]
  );

  const reportPages: PageDescriptor[] = useMemo(() => {
    const pages: PageDescriptor[] = [
      {
        id: 'cyber-page-1-cover',
        label: 'Page 1: Cyber Security Cover Sheet',
        render: () => (
          <CyberSecurityCoverPage report={report} captureRef={coverCaptureRef} />
        ),
      },
      {
        id: 'cyber-page-2-photos',
        label: 'Page 2: Session, Pre-Test & Post-Test Photos (4 Photos)',
        render: () => (
          <CyberSecurityPhotosPage
            sessionImages={report.sessionImages}
            preTestImage={report.preTestImage}
            postTestImage={report.postTestImage}
          />
        ),
      },
    ];

    if (digitalAttendanceActive) {
      const sheetTitle = cyberAttendance.sheetTitle.trim() || defaultAttendanceTitle;
      const funder = cyberAttendance.funder.trim() || 'INFOSYS FOUNDATION';
      const startDate = cyberAttendance.batchStartDate.trim() || defaultStartDate;
      const endDate = cyberAttendance.batchEndDate.trim() || defaultEndDate;

      let runningStartIndex = 0;
      portraitAttendanceChunks.forEach((chunk, idx) => {
        const pageNum = 3 + idx;
        const pageStartIndex = runningStartIndex;
        runningStartIndex += chunk.length;
        const suffix =
          portraitAttendanceChunks.length > 1
            ? ` (Part ${idx + 1}/${portraitAttendanceChunks.length})`
            : '';
        pages.push({
          id: `cyber-page-attendance-digital-${idx}`,
          label: `Page ${pageNum}: Attendance Sheet${suffix}`,
          render: () => (
            <CyberSecurityPortraitAttendancePage
              sheetTitle={sheetTitle}
              funder={funder}
              batchStartDate={startDate}
              batchEndDate={endDate}
              rows={chunk}
              startIndex={pageStartIndex}
              pageIndex={idx}
              totalPages={portraitAttendanceChunks.length}
            />
          ),
        });
      });
    } else {
      pages.push({
        id: 'cyber-page-3-attendance',
        label: 'Page 3: Attendance Sheet',
        render: () => (
          <DocumentAttachmentPage
            heading="CYBER SECURITY ATTENDANCE SHEET"
            image={report.attendanceSheetImage}
          />
        ),
      });
    }

    return pages;
  }, [
    report,
    digitalAttendanceActive,
    cyberAttendance,
    defaultAttendanceTitle,
    defaultStartDate,
    defaultEndDate,
    portraitAttendanceChunks,
  ]);

  useEffect(() => {
    if (activePageIdx >= reportPages.length) {
      setActivePageIdx(Math.max(0, reportPages.length - 1));
    }
  }, [activePageIdx, reportPages.length]);

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
  }, [previewMode]);

  const updateField = <K extends keyof CyberSecurityReportData>(
    field: K,
    value: CyberSecurityReportData[K]
  ) => {
    onChange({ ...report, [field]: value });
    setFieldErrors((prev) => {
      const next = { ...prev };
      let changed = false;
      if (field in next) {
        delete next[field as CyberValidationField];
        changed = true;
      }
      if (field === 'totalStudents' && next.completedCount) {
        delete next.completedCount;
        changed = true;
      }
      if (field === 'coTrainerName' && typeof value === 'string' && !value.trim() && next.coTrainerDesignation) {
        delete next.coTrainerDesignation;
        changed = true;
      }
      return changed ? next : prev;
    });
  };

  const runValidation = (actionLabel: string): boolean => {
    const errors = validateCyberReport(report);
    setFieldErrors(errors);

    const invalidMeta = VALIDATION_FIELD_META.filter((m) => Boolean(errors[m.key]));
    if (invalidMeta.length === 0) {
      return true;
    }

    const previewList = invalidMeta
      .slice(0, 3)
      .map((m) => m.label)
      .join(', ');
    const remaining = invalidMeta.length > 3 ? ` +${invalidMeta.length - 3} more` : '';
    flashFeedback(
      `Please fill required fields before ${actionLabel}: ${previewList}${remaining}.`,
      'error'
    );

    setStep('cover');
    setPreviewMode('single');
    setActivePageIdx(0);

    const firstInputId = invalidMeta[0].inputId;
    window.requestAnimationFrame(() => {
      const el = document.getElementById(firstInputId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if ('focus' in el && typeof (el as HTMLElement).focus === 'function') {
          (el as HTMLElement).focus({ preventScroll: true });
        }
      }
    });

    return false;
  };

  const handleAutoSumTotal = () => {
    const boys = parseInt(report.boysCount.trim(), 10) || 0;
    const girls = parseInt(report.girlsCount.trim(), 10) || 0;
    const sum = boys + girls;
    if (sum > 0) {
      updateField('totalStudents', String(sum));
      flashFeedback(`Total Students updated to ${sum} (${boys} Boys + ${girls} Girls).`);
    }
  };

  const handleUploadCustomLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusyUploadKey('fedex-logo');
    try {
      const optimized = await readAndOptimizeImage(file, 900);
      updateField('customFedexLogo', optimized);
      setPreviewMode('single');
      setActivePageIdx(0);
      flashFeedback('Custom FedEx logo applied to Cover Sheet.');
    } catch {
      flashFeedback('Unable to load logo image. Please use PNG or JPG.', 'error');
    } finally {
      setBusyUploadKey(null);
    }
  };

  const handlePhotoUpload = async (
    target: 'session0' | 'session1' | 'preTest' | 'postTest',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusyUploadKey(target);
    try {
      const optimized = await readAndOptimizeImage(file, 1600);
      if (target === 'session0') {
        updateField('sessionImages', [optimized, report.sessionImages[1]]);
      } else if (target === 'session1') {
        updateField('sessionImages', [report.sessionImages[0], optimized]);
      } else if (target === 'preTest') {
        updateField('preTestImage', optimized);
      } else {
        updateField('postTestImage', optimized);
      }
      setPreviewMode('single');
      setActivePageIdx(1);
    } catch {
      flashFeedback('Unable to read image. Please upload a PNG or JPG photo.', 'error');
    } finally {
      setBusyUploadKey(null);
    }
  };

  const handleRotatePhoto = async (
    target: 'session0' | 'session1' | 'preTest' | 'postTest',
    delta: 90 | -90
  ) => {
    const current =
      target === 'session0'
        ? report.sessionImages[0]
        : target === 'session1'
          ? report.sessionImages[1]
          : target === 'preTest'
            ? report.preTestImage
            : report.postTestImage;
    if (!current || busyUploadKey) return;
    setBusyUploadKey(target);
    try {
      const rotated = await rotateImageDataUrl(current, delta);
      if (target === 'session0') {
        updateField('sessionImages', [rotated, report.sessionImages[1]]);
      } else if (target === 'session1') {
        updateField('sessionImages', [report.sessionImages[0], rotated]);
      } else if (target === 'preTest') {
        updateField('preTestImage', rotated);
      } else {
        updateField('postTestImage', rotated);
      }
      setPreviewMode('single');
      setActivePageIdx(1);
    } catch {
      flashFeedback('Unable to rotate photo. Please try again.', 'error');
    } finally {
      setBusyUploadKey(null);
    }
  };

  const handleClearAllPhotos = () => {
    onChange({
      ...report,
      sessionImages: ['', ''],
      preTestImage: '',
      postTestImage: '',
    });
    setConfirmClearPhotos(false);
    flashFeedback('Cleared all 4 photos from the current Cyber Security Report.');
  };

  const handleAttendanceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusyUploadKey('attendance');
    try {
      const rendered = await processDocumentUpload(file, 1800);
      updateField('attendanceSheetImage', rendered);
      setPreviewMode('single');
      setActivePageIdx(2);
      flashFeedback('Attendance Sheet uploaded and aligned to full A4 page.');
    } catch (err) {
      flashFeedback(
        err instanceof Error
          ? err.message
          : 'Unable to process file. Please upload PNG, JPG, PDF, or Word (.docx).',
        'error'
      );
    } finally {
      setBusyUploadKey(null);
    }
  };

  const handleRotateAttendance = async (delta: 90 | -90) => {
    if (!report.attendanceSheetImage || busyUploadKey) return;
    setBusyUploadKey('attendance');
    try {
      const rotated = await rotateImageDataUrl(report.attendanceSheetImage, delta);
      updateField('attendanceSheetImage', rotated);
      setPreviewMode('single');
      setActivePageIdx(2);
    } catch {
      flashFeedback('Unable to rotate Attendance Sheet. Please try again.', 'error');
    } finally {
      setBusyUploadKey(null);
    }
  };

  const handleSaveClick = async (asNew = false) => {
    if (isSaving) return;
    if (!runValidation('saving the report')) return;
    const result = await onSaveReport({ asNew });
    flashFeedback(result.message, result.ok ? 'success' : 'error');
    if (result.ok) {
      setShowSavedPanel(true);
    }
  };

  const handleConfirmDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      const result = await onDeleteReport(id);
      setConfirmDeleteId(null);
      flashFeedback(result.message, result.ok ? 'success' : 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportPdf = async () => {
    if (pdfProgress || isDownloadingPng) return;
    if (!runValidation('generating the PDF report')) return;
    const nodes = exportPageRefs.current
      .slice(0, reportPages.length)
      .filter((el): el is HTMLDivElement => el !== null);
    if (nodes.length === 0) return;

    setDownloadFeedback(null);
    setPdfProgress({ current: 1, total: nodes.length });
    try {
      const slugBase =
        report.collegeName.trim() ||
        report.projectName.trim() ||
        'Cyber_Security_Report';
      const slug = slugBase
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 42);
      await exportReportPagesToPdf(
        nodes,
        `Magic_Bus_Cyber_Security_Report_${slug || 'Report'}.pdf`,
        (current, total) => setPdfProgress({ current, total })
      );
      setDownloadFeedback(
        `Complete ${nodes.length}-page Cyber Security Report PDF downloaded successfully.`
      );
      window.setTimeout(() => setDownloadFeedback(null), 5000);
    } catch (err) {
      console.error('Cyber Security Report PDF export failed:', err);
      setDownloadFeedback('Unable to export PDF. Please try again.');
    } finally {
      setPdfProgress(null);
    }
  };

  const handleDownloadCoverPng = async () => {
    if (isDownloadingPng || pdfProgress) return;
    if (!runValidation('downloading the Cover PNG')) return;
    const coverNode = exportPageRefs.current[0] || coverCaptureRef.current;
    if (!coverNode) return;
    setIsDownloadingPng(true);
    setDownloadFeedback(null);
    try {
      const slugBase =
        report.collegeName.trim() || report.projectName.trim() || 'Cover';
      const slug = slugBase
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 40);
      await exportCoverPageToPng(
        coverNode,
        `Magic_Bus_Cyber_Security_Cover_${slug || 'Report'}.png`
      );
      setDownloadFeedback('High-resolution Cyber Security Cover PNG downloaded.');
      window.setTimeout(() => setDownloadFeedback(null), 4000);
    } catch (err) {
      console.error('Cyber Security Cover PNG export failed:', err);
      setDownloadFeedback('Unable to export cover image. Please try again.');
    } finally {
      setIsDownloadingPng(false);
    }
  };

  const currentPage = reportPages[activePageIdx] || reportPages[0];
  const isExporting = Boolean(pdfProgress) || isDownloadingPng;

  const isCustomManagerRole =
    Boolean(report.managerDesignation) &&
    !(ROLE_OPTIONS as readonly string[]).includes(report.managerDesignation);

  return (
    <div className="space-y-5">
      {/* Saved Cyber Security Reports Bar & Quick Save Header */}
      <div className="bg-white rounded-xl shadow-[0_3px_16px_rgba(8,37,82,0.08)] border border-[#E1E6EF] overflow-hidden">
        <div
          className="px-4 sm:px-6 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
          style={{ background: 'linear-gradient(90deg, #072754 0%, #0C366F 100%)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldCheck className="w-5 h-5 text-[#FCD116] shrink-0" />
            <div className="min-w-0">
              <h2 className="text-white text-[17px] sm:text-[18px] font-bold tracking-tight leading-snug">
                Cyber Security Program Report Builder
              </h2>
              <p className="text-[#CBDDF5] text-[12px] sm:text-[12.5px]">
                Magic Bus &amp; FedEx Cover Sheet &middot; 4-Photo Session &amp; Assessment Page &middot; Full-Page Attendance Sheet
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleSaveClick(false)}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-[#16A34A] text-white text-[12.5px] sm:text-[13px] font-extrabold flex items-center gap-1.5 hover:brightness-110 disabled:opacity-75 transition-all cursor-pointer whitespace-nowrap shadow-xs"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 shrink-0" />
                  <span>
                    {activeSavedReport ? 'Update Saved Report' : 'Save Cyber Security Report'}
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowSavedPanel((v) => !v)}
              className={`px-3 py-2 rounded-lg text-[12.5px] sm:text-[13px] font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap border ${
                showSavedPanel
                  ? 'bg-white text-[#07234B] border-white'
                  : 'bg-white/12 text-white border-white/25 hover:bg-white/20'
              }`}
            >
              <FolderOpen className="w-4 h-4 shrink-0" />
              <span>Saved Reports ({savedReports.length})</span>
              {showSavedPanel ? (
                <ChevronUp className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
              )}
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExporting}
              className="px-4 py-2 rounded-lg bg-[#FFD100] text-[#07234B] text-[12.5px] sm:text-[13px] font-extrabold flex items-center gap-1.5 hover:brightness-95 disabled:opacity-75 transition-all cursor-pointer whitespace-nowrap shadow-xs"
            >
              {pdfProgress ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>
                    Exporting ({pdfProgress.current}/{pdfProgress.total})...
                  </span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 shrink-0" />
                  <span>Export as PDF ({reportPages.length} Pages)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Saved Cyber Security Reports Drawer */}
        {showSavedPanel && (
          <div className="p-4 sm:p-5 bg-[#F8FAFD] border-t border-[#E2E8F0] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-[13.5px] font-extrabold text-[#0A254E]">
                  Saved Cyber Security Reports ({savedReports.length})
                </h3>
                <p className="text-[11.5px] text-[#64748B]">
                  Saved reports stay preserved under your account until you click Delete.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {activeSavedReport && (
                  <button
                    type="button"
                    onClick={() => void handleSaveClick(true)}
                    disabled={isSaving}
                    className="px-3 py-1.5 rounded-md border border-[#BFD6F7] bg-[#E8F1FD] text-[#082B59] text-[12px] font-bold flex items-center gap-1.5 hover:bg-[#DCEAFE] cursor-pointer"
                  >
                    <CopyPlus className="w-3.5 h-3.5" />
                    <span>Save as New Copy</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onNewBlankReport();
                    setFieldErrors({});
                    flashFeedback(
                      'Started a new blank Cyber Security Report. All saved reports remain safe.'
                    );
                  }}
                  className="px-3 py-1.5 rounded-md border border-[#CBD4E1] bg-white text-[#334155] text-[12px] font-bold flex items-center gap-1.5 hover:bg-[#F1F5FA] cursor-pointer"
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  <span>New Blank Report</span>
                </button>
              </div>
            </div>

            {savedReports.length === 0 ? (
              <div className="rounded-lg bg-white border border-dashed border-[#CBD5E1] px-4 py-5 text-center text-[12.5px] text-[#475569]">
                No Cyber Security Reports saved yet. Fill in the details below and click{' '}
                <strong>Save Cyber Security Report</strong> to save your progress.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {savedReports.map((item) => {
                  const summary = summarizeCyberReport(item);
                  const isActive = item.id === activeReportId;
                  const isConfirming = confirmDeleteId === item.id;
                  const isDeleting = deletingId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`rounded-lg border p-3 flex flex-col justify-between gap-2.5 ${
                        isActive
                          ? 'border-[#0B3C82] bg-[#F2F7FE]'
                          : 'border-[#DCE4F0] bg-white hover:border-[#BFD2EB]'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[13px] font-extrabold text-[#0A254E] leading-snug break-words">
                            {item.title}
                          </p>
                          {isActive && (
                            <span className="text-[10.5px] font-extrabold text-[#0B3C82] bg-white border border-[#BFD6F7] px-2 py-0.5 rounded shrink-0">
                              Open
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] font-semibold text-[#475569] tabular-nums">
                          <span>{summary.studentsSummary}</span>
                          <span>&middot;</span>
                          <span>{summary.photoCount} / 4 Photos</span>
                          <span>&middot;</span>
                          <span className="font-normal text-[#64748B]">
                            Saved {formatSavedTimestamp(item.updatedAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {isConfirming ? (
                          <>
                            <span className="text-[11.5px] font-bold text-[#B91C1C] mr-auto">
                              Delete permanently?
                            </span>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={isDeleting}
                              className="px-2.5 py-1 rounded border border-[#CBD4E1] bg-white text-[#334155] text-[11.5px] font-bold hover:bg-[#F1F5FA] cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleConfirmDelete(item.id)}
                              disabled={isDeleting}
                              className="px-2.5 py-1 rounded bg-[#B91C1C] text-white text-[11.5px] font-bold flex items-center gap-1 hover:brightness-110 disabled:opacity-65 cursor-pointer"
                            >
                              {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}
                              <span>Confirm Delete</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                onLoadReport(item);
                                setFieldErrors({});
                                setConfirmDeleteId(null);
                                flashFeedback(
                                  `Loaded Cyber Security Report "${item.title}".`
                                );
                              }}
                              className="px-3 py-1 rounded bg-[#082B59] text-white text-[11.5px] font-bold hover:brightness-110 cursor-pointer"
                            >
                              {isActive ? 'Reload Saved' : 'Open & Resume'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(item.id)}
                              className="px-2.5 py-1 rounded border border-[#FECACA] bg-white text-[#B91C1C] text-[11.5px] font-bold flex items-center gap-1 hover:bg-[#FEF2F2] cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {feedback && (
          <div className="px-4 sm:px-5 py-2.5 bg-[#F8FAFD] border-t border-[#E2E8F0]">
            <div
              role="status"
              className={`text-[12.5px] font-semibold rounded-md px-3 py-2 flex items-center gap-2 border ${
                feedback.tone === 'error'
                  ? 'text-[#991B1B] bg-[#FEF2F2] border-[#FECACA]'
                  : 'text-[#0B336B] bg-[#EDF4FD] border-[#C6DCFA]'
              }`}
            >
              {feedback.tone === 'error' ? (
                <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main 2-Column Workspace: Left Report Form | Right Live A4 Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] gap-5 sm:gap-7 items-start">
        {/* Left Column: 3-Step Cyber Security Report Form */}
        <div className="bg-white rounded-xl shadow-[0_3px_16px_rgba(8,37,82,0.08)] border border-[#E1E6EF] overflow-hidden flex flex-col min-w-0">
          {/* Dark Navy Card Header */}
          <div
            className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-2"
            style={{ background: 'linear-gradient(90deg, #072754 0%, #0C366F 100%)' }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText className="w-[19px] h-[19px] text-white shrink-0" strokeWidth={2.2} />
              <h3 className="text-white text-[16px] sm:text-[17px] font-bold tracking-tight truncate">
                Cyber Security Report Details
              </h3>
            </div>
            <span className="text-[12px] font-semibold text-[#D6E6FF] tabular-nums whitespace-nowrap shrink-0">
              {uploadedPhotoCount}/4 Photos
            </span>
          </div>

          {/* 3-Step Tab Switcher */}
          <div className="grid grid-cols-3 bg-[#F1F5FA] border-b border-[#DCE4F0] p-1.5 gap-1">
            {(
              [
                { id: 'cover', label: '1. Cover', icon: ShieldCheck, pageIdx: 0 },
                { id: 'photos', label: '2. Photos (4)', icon: Camera, pageIdx: 1 },
                { id: 'attendance', label: '3. Attendance', icon: FileCheck2, pageIdx: 2 },
              ] as const
            ).map(({ id, label, icon: Icon, pageIdx }) => {
              const active = step === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setStep(id);
                    setPreviewMode('single');
                    setActivePageIdx(Math.min(pageIdx, reportPages.length - 1));
                  }}
                  className={`py-2 px-2 rounded-lg text-[12px] sm:text-[12.5px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#082B59] text-white shadow-xs'
                      : 'text-[#334155] hover:bg-white hover:text-[#0A254E]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            {/* Validation Summary Alert */}
            {Object.keys(fieldErrors).length > 0 && (
              <div
                role="alert"
                className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 flex items-start gap-2.5 text-[12px] text-[#991B1B]"
              >
                <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold">
                    Required fields missing ({Object.keys(fieldErrors).length})
                  </p>
                  <p className="font-medium text-[#B91C1C] mt-0.5">
                    Complete all highlighted fields marked with <span className="font-bold">*</span>{' '}
                    before saving or generating your report.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 1: COVER DETAILS */}
            {step === 'cover' && (
              <div className="space-y-4">
                {/* Dual Logo Preview & Optional Custom FedEx Logo Upload */}
                <div className="rounded-lg border border-[#D8E1EE] bg-[#FAFBFD] p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-extrabold text-[#0A254E]">
                      Cover Logos (Magic Bus + FedEx)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <label className="px-2.5 py-1 rounded bg-[#082B59] text-white text-[11.5px] font-bold hover:brightness-110 cursor-pointer flex items-center gap-1">
                        {busyUploadKey === 'fedex-logo' ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Upload className="w-3 h-3" />
                        )}
                        <span>
                          {report.customFedexLogo ? 'Change FedEx Logo' : 'Upload FedEx Logo'}
                        </span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                          onChange={handleUploadCustomLogo}
                          className="hidden"
                        />
                      </label>
                      {report.customFedexLogo && (
                        <button
                          type="button"
                          onClick={() => updateField('customFedexLogo', '')}
                          className="px-2 py-1 rounded border border-[#CBD4E1] bg-white text-[#475569] text-[11.5px] font-semibold hover:bg-[#F1F5F9] cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="bg-white rounded-md border border-[#E2E8F0] py-2.5 px-4 flex items-center justify-center gap-5">
                    <MagicBusLogo size={54} variant="light" />
                    <span className="h-9 w-[1.5px] bg-[#CBD5E1]" aria-hidden="true" />
                    <FedExLogo width={96} customLogo={report.customFedexLogo || undefined} />
                  </div>
                </div>

                {/* Project Name & Program Title */}
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="cyber-project-name"
                      className="block text-[12.5px] font-bold text-[#0A254E] mb-1"
                    >
                      Project Name <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      id="cyber-project-name"
                      type="text"
                      aria-invalid={Boolean(fieldErrors.projectName)}
                      value={report.projectName}
                      onChange={(e) => updateField('projectName', e.target.value)}
                      placeholder={DEFAULT_CYBER_REPORT_VALUES.projectName}
                      className={`w-full px-3 py-2 rounded-md border text-[16px] sm:text-[13.5px] font-semibold text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none ${
                        fieldErrors.projectName
                          ? 'border-[#DC2626] bg-[#FEF2F2]/40 ring-1 ring-[#FCA5A5] focus:border-[#DC2626]'
                          : 'border-[#CBD4E1] bg-white focus:border-[#0B336B]'
                      }`}
                    />
                    {fieldErrors.projectName && (
                      <p className="mt-1 text-[11.5px] font-semibold text-[#DC2626]">
                        {fieldErrors.projectName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="cyber-program-title"
                      className="block text-[12.5px] font-bold text-[#0A254E] mb-1"
                    >
                      Program Heading
                    </label>
                    <input
                      id="cyber-program-title"
                      type="text"
                      value={report.programTitle}
                      onChange={(e) => updateField('programTitle', e.target.value)}
                      placeholder={DEFAULT_CYBER_REPORT_VALUES.programTitle}
                      className="w-full px-3 py-2 rounded-md border border-[#CBD4E1] bg-white text-[16px] sm:text-[13.5px] font-semibold text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0B336B]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="cyber-college-name"
                      className="block text-[12.5px] font-bold text-[#0A254E] mb-1"
                    >
                      College Name <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      id="cyber-college-name"
                      type="text"
                      aria-invalid={Boolean(fieldErrors.collegeName)}
                      value={report.collegeName}
                      onChange={(e) => updateField('collegeName', e.target.value)}
                      placeholder={DEFAULT_CYBER_REPORT_VALUES.collegeName}
                      className={`w-full px-3 py-2 rounded-md border text-[16px] sm:text-[13.5px] font-semibold text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none ${
                        fieldErrors.collegeName
                          ? 'border-[#DC2626] bg-[#FEF2F2]/40 ring-1 ring-[#FCA5A5] focus:border-[#DC2626]'
                          : 'border-[#CBD4E1] bg-white focus:border-[#0B336B]'
                      }`}
                    />
                    {fieldErrors.collegeName && (
                      <p className="mt-1 text-[11.5px] font-semibold text-[#DC2626]">
                        {fieldErrors.collegeName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Trainers Details */}
                <div className="pt-2 border-t border-[#E6ECF5] space-y-3">
                  <div className="text-[13px] font-extrabold text-[#0A254E]">
                    Trainers Details (Submitted by)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="cyber-trainer-name"
                        className="block text-[12px] font-bold text-[#0A254E] mb-1"
                      >
                        Primary Trainer Name <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        id="cyber-trainer-name"
                        type="text"
                        aria-invalid={Boolean(fieldErrors.trainerName)}
                        value={report.trainerName}
                        onChange={(e) => updateField('trainerName', e.target.value)}
                        placeholder={DEFAULT_CYBER_REPORT_VALUES.trainerName}
                        className={`w-full px-3 py-2 rounded-md border text-[16px] sm:text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none ${
                          fieldErrors.trainerName
                            ? 'border-[#DC2626] bg-[#FEF2F2]/40 ring-1 ring-[#FCA5A5] focus:border-[#DC2626]'
                            : 'border-[#CBD4E1] bg-white focus:border-[#0B336B]'
                        }`}
                      />
                      {fieldErrors.trainerName && (
                        <p className="mt-1 text-[11.5px] font-semibold text-[#DC2626]">
                          {fieldErrors.trainerName}
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="cyber-trainer-role"
                        className="block text-[12px] font-bold text-[#0A254E] mb-1"
                      >
                        Primary Trainer Designation <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        id="cyber-trainer-role"
                        type="text"
                        aria-invalid={Boolean(fieldErrors.trainerDesignation)}
                        value={report.trainerDesignation}
                        onChange={(e) => updateField('trainerDesignation', e.target.value)}
                        placeholder={DEFAULT_CYBER_REPORT_VALUES.trainerDesignation}
                        className={`w-full px-3 py-2 rounded-md border text-[16px] sm:text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none ${
                          fieldErrors.trainerDesignation
                            ? 'border-[#DC2626] bg-[#FEF2F2]/40 ring-1 ring-[#FCA5A5] focus:border-[#DC2626]'
                            : 'border-[#CBD4E1] bg-white focus:border-[#0B336B]'
                        }`}
                      />
                      {fieldErrors.trainerDesignation && (
                        <p className="mt-1 text-[11.5px] font-semibold text-[#DC2626]">
                          {fieldErrors.trainerDesignation}
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="cyber-cotrainer-name"
                        className="block text-[12px] font-bold text-[#0A254E] mb-1"
                      >
                        Co-Trainer Name (Optional)
                      </label>
                      <input
                        id="cyber-cotrainer-name"
                        type="text"
                        value={report.coTrainerName}
                        onChange={(e) => updateField('coTrainerName', e.target.value)}
                        placeholder="Leave blank if solo trainer"
                        className="w-full px-3 py-2 rounded-md border border-[#CBD4E1] bg-white text-[16px] sm:text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0B336B]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="cyber-cotrainer-role"
                        className="block text-[12px] font-bold text-[#0A254E] mb-1"
                      >
                        Co-Trainer Designation
                        {report.coTrainerName.trim() && (
                          <span className="text-[#DC2626]"> *</span>
                        )}
                      </label>
                      <input
                        id="cyber-cotrainer-role"
                        type="text"
                        aria-invalid={Boolean(fieldErrors.coTrainerDesignation)}
                        value={report.coTrainerDesignation}
                        onChange={(e) => updateField('coTrainerDesignation', e.target.value)}
                        placeholder={DEFAULT_CYBER_REPORT_VALUES.coTrainerDesignation}
                        className={`w-full px-3 py-2 rounded-md border text-[16px] sm:text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none ${
                          fieldErrors.coTrainerDesignation
                            ? 'border-[#DC2626] bg-[#FEF2F2]/40 ring-1 ring-[#FCA5A5] focus:border-[#DC2626]'
                            : 'border-[#CBD4E1] bg-white focus:border-[#0B336B]'
                        }`}
                      />
                      {fieldErrors.coTrainerDesignation && (
                        <p className="mt-1 text-[11.5px] font-semibold text-[#DC2626]">
                          {fieldErrors.coTrainerDesignation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Student Counts & Completion Metrics */}
                <div className="pt-2 border-t border-[#E6ECF5] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-extrabold text-[#0A254E]">
                      Student Attendance &amp; Completion Counts
                    </span>
                    <button
                      type="button"
                      onClick={handleAutoSumTotal}
                      className="text-[11.5px] font-bold text-[#0B336B] hover:underline cursor-pointer"
                    >
                      Auto-sum Boys + Girls
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="cyber-total-students"
                        className="block text-[12px] font-bold text-[#0A254E] mb-1"
                      >
                        Total Students Count <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        id="cyber-total-students"
                        type="number"
                        min={0}
                        aria-invalid={Boolean(fieldErrors.totalStudents)}
                        value={report.totalStudents}
                        onChange={(e) => updateField('totalStudents', e.target.value)}
                        placeholder={DEFAULT_CYBER_REPORT_VALUES.totalStudents}
                        className={`w-full px-3 py-2 rounded-md border text-[16px] sm:text-[13.5px] font-bold text-[#0F172A] tabular-nums focus:outline-none ${
                          fieldErrors.totalStudents
                            ? 'border-[#DC2626] bg-[#FEF2F2]/40 ring-1 ring-[#FCA5A5] focus:border-[#DC2626]'
                            : 'border-[#CBD4E1] bg-white focus:border-[#0B336B]'
                        }`}
                      />
                      {fieldErrors.totalStudents && (
                        <p className="mt-1 text-[11.5px] font-semibold text-[#DC2626]">
                          {fieldErrors.totalStudents}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="cyber-completed-count"
                        className="block text-[12px] font-bold text-[#0A254E] mb-1"
                      >
                        Completed Count (out of Total) <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        id="cyber-completed-count"
                        type="number"
                        min={0}
                        aria-invalid={Boolean(fieldErrors.completedCount)}
                        value={report.completedCount}
                        onChange={(e) => updateField('completedCount', e.target.value)}
                        placeholder={DEFAULT_CYBER_REPORT_VALUES.completedCount}
                        className={`w-full px-3 py-2 rounded-md border text-[16px] sm:text-[13.5px] font-bold text-[#0F172A] tabular-nums focus:outline-none ${
                          fieldErrors.completedCount
                            ? 'border-[#DC2626] bg-[#FEF2F2]/40 ring-1 ring-[#FCA5A5] focus:border-[#DC2626]'
                            : 'border-[#CBD4E1] bg-white focus:border-[#0B336B]'
                        }`}
                      />
                      {fieldErrors.completedCount && (
                        <p className="mt-1 text-[11.5px] font-semibold text-[#DC2626]">
                          {fieldErrors.completedCount}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="cyber-boys-count"
                        className="block text-[12px] font-bold text-[#0A254E] mb-1"
                      >
                        Boys Count <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        id="cyber-boys-count"
                        type="number"
                        min={0}
                        aria-invalid={Boolean(fieldErrors.boysCount)}
                        value={report.boysCount}
                        onChange={(e) => updateField('boysCount', e.target.value)}
                        placeholder={DEFAULT_CYBER_REPORT_VALUES.boysCount}
                        className={`w-full px-3 py-2 rounded-md border text-[16px] sm:text-[13.5px] font-bold text-[#0F172A] tabular-nums focus:outline-none ${
                          fieldErrors.boysCount
                            ? 'border-[#DC2626] bg-[#FEF2F2]/40 ring-1 ring-[#FCA5A5] focus:border-[#DC2626]'
                            : 'border-[#CBD4E1] bg-white focus:border-[#0B336B]'
                        }`}
                      />
                      {fieldErrors.boysCount && (
                        <p className="mt-1 text-[11.5px] font-semibold text-[#DC2626]">
                          {fieldErrors.boysCount}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="cyber-girls-count"
                        className="block text-[12px] font-bold text-[#0A254E] mb-1"
                      >
                        Girls Count <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        id="cyber-girls-count"
                        type="number"
                        min={0}
                        aria-invalid={Boolean(fieldErrors.girlsCount)}
                        value={report.girlsCount}
                        onChange={(e) => updateField('girlsCount', e.target.value)}
                        placeholder={DEFAULT_CYBER_REPORT_VALUES.girlsCount}
                        className={`w-full px-3 py-2 rounded-md border text-[16px] sm:text-[13.5px] font-bold text-[#0F172A] tabular-nums focus:outline-none ${
                          fieldErrors.girlsCount
                            ? 'border-[#DC2626] bg-[#FEF2F2]/40 ring-1 ring-[#FCA5A5] focus:border-[#DC2626]'
                            : 'border-[#CBD4E1] bg-white focus:border-[#0B336B]'
                        }`}
                      />
                      {fieldErrors.girlsCount && (
                        <p className="mt-1 text-[11.5px] font-semibold text-[#DC2626]">
                          {fieldErrors.girlsCount}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Optional Batch Code & Session Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="cyber-batch-code"
                        className="block text-[12px] font-bold text-[#0A254E] mb-1"
                      >
                        Batch ID (Optional)
                      </label>
                      <input
                        id="cyber-batch-code"
                        type="text"
                        value={report.batchCode}
                        onChange={(e) => updateField('batchCode', e.target.value)}
                        placeholder="e.g. BT-4006"
                        className="w-full px-3 py-2 rounded-md border border-[#CBD4E1] bg-white text-[16px] sm:text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0B336B]"
                      />
                    </div>
                    <DatePickerField
                      id="cyber-session-date"
                      label="Session Date (Optional)"
                      value={report.sessionDate}
                      placeholder="e.g. 17/11/2026"
                      align="right"
                      onChange={(val) => updateField('sessionDate', val)}
                    />
                  </div>
                </div>

                {/* Manager Name, Designation & Team Name */}
                <div className="pt-2 border-t border-[#E6ECF5] space-y-3">
                  <div className="text-[13px] font-extrabold text-[#0A254E]">
                    Submitted To (Manager &amp; Team)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="cyber-manager-name"
                        className="block text-[12px] font-bold text-[#0A254E] mb-1"
                      >
                        Manager Name <span className="text-[#DC2626]">*</span>
                      </label>
                      <input
                        id="cyber-manager-name"
                        type="text"
                        aria-invalid={Boolean(fieldErrors.managerName)}
                        value={report.managerName}
                        onChange={(e) => updateField('managerName', e.target.value)}
                        placeholder={DEFAULT_CYBER_REPORT_VALUES.managerName}
                        className={`w-full px-3 py-2 rounded-md border text-[16px] sm:text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none ${
                          fieldErrors.managerName
                            ? 'border-[#DC2626] bg-[#FEF2F2]/40 ring-1 ring-[#FCA5A5] focus:border-[#DC2626]'
                            : 'border-[#CBD4E1] bg-white focus:border-[#0B336B]'
                        }`}
                      />
                      {fieldErrors.managerName && (
                        <p className="mt-1 text-[11.5px] font-semibold text-[#DC2626]">
                          {fieldErrors.managerName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="cyber-manager-designation"
                        className="block text-[12px] font-bold text-[#0A254E] mb-1"
                      >
                        Manager Designation <span className="text-[#DC2626]">*</span>
                      </label>
                      <select
                        id="cyber-manager-designation"
                        aria-invalid={Boolean(fieldErrors.managerDesignation)}
                        value={isCustomManagerRole ? '__custom__' : report.managerDesignation}
                        onChange={(e) => {
                          if (e.target.value !== '__custom__') {
                            updateField('managerDesignation', e.target.value);
                          }
                        }}
                        className={`w-full px-3 py-2 rounded-md border text-[16px] sm:text-[13px] text-[#0F172A] focus:outline-none ${
                          fieldErrors.managerDesignation
                            ? 'border-[#DC2626] bg-[#FEF2F2]/40 ring-1 ring-[#FCA5A5] focus:border-[#DC2626]'
                            : 'border-[#CBD4E1] bg-white focus:border-[#0B336B]'
                        }`}
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                        {isCustomManagerRole && (
                          <option value="__custom__">{report.managerDesignation}</option>
                        )}
                      </select>
                      {fieldErrors.managerDesignation && (
                        <p className="mt-1 text-[11.5px] font-semibold text-[#DC2626]">
                          {fieldErrors.managerDesignation}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="cyber-team-name"
                      className="block text-[12px] font-bold text-[#0A254E] mb-1"
                    >
                      Team Name <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      id="cyber-team-name"
                      type="text"
                      aria-invalid={Boolean(fieldErrors.teamName)}
                      value={report.teamName}
                      onChange={(e) => updateField('teamName', e.target.value)}
                      placeholder={DEFAULT_CYBER_REPORT_VALUES.teamName}
                      className={`w-full px-3 py-2 rounded-md border text-[16px] sm:text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none ${
                        fieldErrors.teamName
                          ? 'border-[#DC2626] bg-[#FEF2F2]/40 ring-1 ring-[#FCA5A5] focus:border-[#DC2626]'
                          : 'border-[#CBD4E1] bg-white focus:border-[#0B336B]'
                      }`}
                    />
                    {fieldErrors.teamName && (
                      <p className="mt-1 text-[11.5px] font-semibold text-[#DC2626]">
                        {fieldErrors.teamName}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: 4 PHOTOS ON 1 PAGE (2 SESSION + 1 PRE-TEST + 1 POST-TEST) */}
            {step === 'photos' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12.5px] text-[#475569]">
                    Upload <strong>2 Session Images</strong>, <strong>1 Pre-Test Image</strong>, and{' '}
                    <strong>1 Post-Test Image</strong> — all 4 fit cleanly on <strong>Page 2</strong>.
                  </p>
                  {uploadedPhotoCount > 0 && (
                    confirmClearPhotos ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleClearAllPhotos}
                          className="px-2.5 py-1 rounded bg-[#B91C1C] text-white text-[11.5px] font-bold cursor-pointer"
                        >
                          Confirm Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmClearPhotos(false)}
                          className="px-2.5 py-1 rounded border border-[#CBD4E1] bg-white text-[#334155] text-[11.5px] font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmClearPhotos(true)}
                        className="px-2.5 py-1 rounded border border-[#FECACA] bg-white text-[#B91C1C] text-[11.5px] font-bold flex items-center gap-1 hover:bg-[#FEF2F2] cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Clear All Photos</span>
                      </button>
                    )
                  )}
                </div>

                {/* 4 Photo Upload Cards */}
                {(
                  [
                    {
                      key: 'session0',
                      label: 'Session Photo 1',
                      value: report.sessionImages[0],
                      onClear: () =>
                        updateField('sessionImages', ['', report.sessionImages[1]]),
                    },
                    {
                      key: 'session1',
                      label: 'Session Photo 2',
                      value: report.sessionImages[1],
                      onClear: () =>
                        updateField('sessionImages', [report.sessionImages[0], '']),
                    },
                    {
                      key: 'preTest',
                      label: 'Pre-Test Photo',
                      value: report.preTestImage,
                      onClear: () => updateField('preTestImage', ''),
                    },
                    {
                      key: 'postTest',
                      label: 'Post-Test Photo',
                      value: report.postTestImage,
                      onClear: () => updateField('postTestImage', ''),
                    },
                  ] as const
                ).map((slot) => {
                  const isBusy = busyUploadKey === slot.key;
                  return (
                    <div
                      key={slot.key}
                      className="rounded-lg border border-[#D8E1EE] bg-[#FAFBFD] p-3.5"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[13px] font-bold text-[#0A254E]">
                          {slot.label}
                        </span>
                        {slot.value && (
                          <button
                            type="button"
                            onClick={slot.onClear}
                            className="text-[12px] font-semibold text-[#DC2626] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>

                      {slot.value ? (
                        <div className="flex items-start gap-3 bg-white border border-[#CBD4E1] rounded-md p-2.5">
                          <img
                            src={slot.value}
                            alt={slot.label}
                            className="w-20 h-16 object-contain border border-[#E2E8F0] rounded bg-[#F8FAFC] shrink-0"
                          />
                          <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              disabled={Boolean(busyUploadKey)}
                              onClick={() => void handleRotatePhoto(slot.key, -90)}
                              className="px-2 py-1 rounded border border-[#CBD4E1] bg-[#F8FAFD] text-[#0A254E] text-[12px] font-semibold inline-flex items-center gap-1 hover:bg-[#E8F1FD] disabled:opacity-50 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Rotate Left</span>
                            </button>
                            <button
                              type="button"
                              disabled={Boolean(busyUploadKey)}
                              onClick={() => void handleRotatePhoto(slot.key, 90)}
                              className="px-2 py-1 rounded border border-[#CBD4E1] bg-[#F8FAFD] text-[#0A254E] text-[12px] font-semibold inline-flex items-center gap-1 hover:bg-[#E8F1FD] disabled:opacity-50 cursor-pointer"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                              <span>Rotate Right</span>
                            </button>
                            <label className="px-2.5 py-1 rounded bg-[#082B59] text-white text-[12px] font-semibold cursor-pointer hover:brightness-110">
                              Replace
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handlePhotoUpload(slot.key, e)}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center gap-1 py-4 px-3 rounded-md border border-dashed border-[#94A3B8] bg-white hover:bg-[#F1F6FD] hover:border-[#0B336B] transition-colors cursor-pointer text-center">
                          <div className="flex items-center gap-2">
                            {isBusy ? (
                              <Loader2 className="w-4 h-4 animate-spin text-[#0B336B]" />
                            ) : (
                              <Upload className="w-4 h-4 text-[#0B336B]" />
                            )}
                            <span className="text-[13px] font-semibold text-[#334155]">
                              {isBusy ? 'Optimizing photo...' : `Upload ${slot.label}`}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#64748B]">
                            PNG, JPG, or JPEG image
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handlePhotoUpload(slot.key, e)}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* STEP 3: FULL-PAGE ATTENDANCE SHEET */}
            {step === 'attendance' && (
              <div className="space-y-4">
                <p className="text-[12.5px] text-[#475569] leading-relaxed">
                  Attach a full-page <strong>Attendance Sheet</strong> (PNG, JPG, JPEG, PDF, or
                  Word) with Rotate controls, or sync directly from your{' '}
                  <strong>Cyber Security Attendance Sheet</strong> tab.
                </p>

                {/* Sync Digital Attendance Option */}
                <div className="rounded-lg border border-[#C6DCFA] bg-[#EFF6FF] p-3.5 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="inline-flex items-center gap-2 text-[13px] font-bold text-[#0A254E] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={report.useDigitalAttendance}
                        onChange={(e) =>
                          updateField('useDigitalAttendance', e.target.checked)
                        }
                        className="w-4 h-4 accent-[#0B336B]"
                      />
                      <span>Use Digital Cyber Security Attendance Sheet</span>
                    </label>

                    <button
                      type="button"
                      onClick={onOpenAttendanceSheetSubTab}
                      className="px-3 py-1.5 rounded bg-[#082B59] text-white text-[12px] font-bold flex items-center justify-center gap-1.5 hover:brightness-110 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Table2 className="w-3.5 h-3.5" />
                      <span>Open Attendance Sheet</span>
                    </button>
                  </div>
                  <p className="text-[12px] text-[#334155]">
                    {digitalAttendanceActive
                      ? `Digital Attendance Sheet active (${filledDigitalAttendanceRows.length} students synced to Page 3+). Uploading a file below will override the digital sheet.`
                      : report.attendanceSheetImage
                        ? 'Uploaded Attendance Sheet file is currently displayed on Page 3.'
                        : 'Fill students in the Attendance Sheet sub-tab or upload a scanned sheet below.'}
                  </p>
                </div>

                {/* Upload Attendance Sheet File + Rotate */}
                <div className="rounded-lg border border-[#D8E1EE] bg-[#FAFBFD] p-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[13.5px] font-bold text-[#0A254E]">
                      Page 3: Full-Page Attendance Sheet Upload
                    </span>
                    {report.attendanceSheetImage && (
                      <button
                        type="button"
                        onClick={() => updateField('attendanceSheetImage', '')}
                        className="text-[12px] font-semibold text-[#DC2626] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  {report.attendanceSheetImage ? (
                    <div className="flex items-start gap-3 bg-white border border-[#CBD4E1] rounded-md p-2.5">
                      <img
                        src={report.attendanceSheetImage}
                        alt="Cyber Security Attendance Sheet"
                        className="w-16 h-20 object-contain border border-[#E2E8F0] rounded bg-[#F8FAFC] shrink-0"
                      />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="text-[13px] font-semibold text-[#0F172A]">
                          {busyUploadKey === 'attendance'
                            ? 'Processing...'
                            : 'Attendance Sheet uploaded'}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            disabled={Boolean(busyUploadKey)}
                            onClick={() => void handleRotateAttendance(-90)}
                            className="px-2 py-1 rounded border border-[#CBD4E1] bg-[#F8FAFD] text-[#0A254E] text-[12px] font-semibold inline-flex items-center gap-1 hover:bg-[#E8F1FD] disabled:opacity-50 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Rotate Left</span>
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(busyUploadKey)}
                            onClick={() => void handleRotateAttendance(90)}
                            className="px-2 py-1 rounded border border-[#CBD4E1] bg-[#F8FAFD] text-[#0A254E] text-[12px] font-semibold inline-flex items-center gap-1 hover:bg-[#E8F1FD] disabled:opacity-50 cursor-pointer"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>Rotate Right</span>
                          </button>
                          <label className="px-2.5 py-1 rounded bg-[#082B59] text-white text-[12px] font-semibold cursor-pointer hover:brightness-110">
                            Replace File
                            <input
                              type="file"
                              accept={DOCUMENT_ACCEPT_TYPES}
                              onChange={handleAttendanceUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-1 py-4 px-3 rounded-md border border-dashed border-[#94A3B8] bg-white hover:bg-[#F1F6FD] hover:border-[#0B336B] transition-colors cursor-pointer text-center">
                      <div className="flex items-center gap-2">
                        {busyUploadKey === 'attendance' ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#0B336B]" />
                        ) : (
                          <Upload className="w-4 h-4 text-[#0B336B]" />
                        )}
                        <span className="text-[13px] font-semibold text-[#334155]">
                          {busyUploadKey === 'attendance'
                            ? 'Converting & optimizing file...'
                            : 'Upload Attendance Sheet'}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-[#64748B]">
                        PNG, JPG, JPEG, Image, PDF, or Word (.doc, .docx)
                      </span>
                      <input
                        type="file"
                        accept={DOCUMENT_ACCEPT_TYPES}
                        onChange={handleAttendanceUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Step Navigation & Bottom Save Actions */}
            <div className="pt-3 border-t border-[#E6ECF5] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {step !== 'cover' && (
                  <button
                    type="button"
                    onClick={() => {
                      const prev: CyberFormStep = step === 'attendance' ? 'photos' : 'cover';
                      setStep(prev);
                      setPreviewMode('single');
                      setActivePageIdx(prev === 'cover' ? 0 : 1);
                    }}
                    className="px-3 py-2 rounded-lg border border-[#CBD4E1] bg-white text-[#0A254E] text-[12.5px] font-bold hover:bg-[#F1F5FA] cursor-pointer"
                  >
                    &larr; Back
                  </button>
                )}
                {step !== 'attendance' && (
                  <button
                    type="button"
                    onClick={() => {
                      const next: CyberFormStep = step === 'cover' ? 'photos' : 'attendance';
                      setStep(next);
                      setPreviewMode('single');
                      setActivePageIdx(next === 'photos' ? 1 : 2);
                    }}
                    className="px-3.5 py-2 rounded-lg border border-[#BFD6F7] bg-[#E8F1FD] text-[#082B59] text-[12.5px] font-bold hover:bg-[#DCEAFE] cursor-pointer"
                  >
                    Next: {step === 'cover' ? 'Photos' : 'Attendance'} &rarr;
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => void handleSaveClick(false)}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg text-white text-[13px] font-bold flex items-center gap-1.5 shadow-xs hover:brightness-110 disabled:opacity-70 cursor-pointer"
                style={{ background: 'linear-gradient(180deg, #0D366E 0%, #07234B 100%)' }}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>
                  {activeSavedReport ? 'Update Saved Report' : 'Save Report'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Multi-Page A4 Preview & PDF Export */}
        <div className="bg-white rounded-xl shadow-[0_3px_16px_rgba(8,37,82,0.08)] border border-[#E1E6EF] overflow-hidden flex flex-col min-w-0">
          {/* Dark Navy Card Header */}
          <div
            className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-2"
            style={{ background: 'linear-gradient(90deg, #072754 0%, #0C366F 100%)' }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Eye className="w-[19px] h-[19px] text-white shrink-0" strokeWidth={2.2} />
              <h3 className="text-white text-[16px] sm:text-[17px] font-bold tracking-tight truncate">
                Cyber Security Report Preview
              </h3>
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
                  aria-label="Select Cyber Security report page"
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
                    setActivePageIdx((idx) => Math.min(reportPages.length - 1, idx + 1))
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

          {/* Scaled A4 Preview Stage */}
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

            {/* Download Actions */}
            <div className="mt-5 mb-1 w-full flex flex-col items-center gap-2.5 px-1">
              <button
                type="button"
                onClick={handleExportPdf}
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
                    <span>Export Cyber Security Report (PDF)</span>
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
                    <span>Download Cover Page Only (PNG)</span>
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

      {/* Off-Screen Unscaled 1:1 A4 Staging Container for Exact Multi-Page PDF Capture */}
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
            key={`cyber-export-${page.id}`}
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
    </div>
  );
};
