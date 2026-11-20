import React, { useState } from 'react';
import {
  FileText,
  Loader2,
  Plus,
  RotateCcw,
  RotateCw,
  Table2,
  Trash2,
  Upload,
} from 'lucide-react';
import { DocumentAttachments, ExtraDocumentPage } from '../types/report';
import {
  DOCUMENT_ACCEPT_TYPES,
  processDocumentUpload,
  rotateImageDataUrl,
} from '../utils/documentUpload';

interface DocumentsStepProps {
  documents: DocumentAttachments;
  extraPages: ExtraDocumentPage[];
  onUpdateDocument: (field: keyof DocumentAttachments, dataUrl: string) => void;
  onAddExtraPage: () => void;
  onUpdateExtraPage: (
    id: string,
    patch: Partial<Pick<ExtraDocumentPage, 'title' | 'image'>>
  ) => void;
  onRemoveExtraPage: (id: string) => void;
  onSelectPreviewPage: (pageIndex: number) => void;
  digitalAttendanceActive: boolean;
  digitalAttendanceCount: number;
  attendancePageCount: number;
  onOpenAttendanceTab: () => void;
}

const CORE_DOCUMENTS: Array<{
  field: keyof DocumentAttachments;
  label: string;
  pageNumber: number;
  pageIndex: number;
}> = [
  {
    field: 'appreciationLetter',
    label: 'Appreciation Letter',
    pageNumber: 9,
    pageIndex: 8,
  },
  {
    field: 'feedbackForm',
    label: 'Feedback Form',
    pageNumber: 10,
    pageIndex: 9,
  },
  {
    field: 'attendanceSheet',
    label: 'Attendance Sheet',
    pageNumber: 11,
    pageIndex: 10,
  },
  {
    field: 'mouPage',
    label: 'MOE Letter',
    pageNumber: 12,
    pageIndex: 11,
  },
];

export const DocumentsStep: React.FC<DocumentsStepProps> = ({
  documents,
  extraPages,
  onUpdateDocument,
  onAddExtraPage,
  onUpdateExtraPage,
  onRemoveExtraPage,
  onSelectPreviewPage,
  digitalAttendanceActive,
  digitalAttendanceCount,
  attendancePageCount,
  onOpenAttendanceTab,
}) => {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const extraAttendanceOffset = Math.max(0, attendancePageCount - 1);

  const handleCoreUpload = async (
    field: keyof DocumentAttachments,
    pageIndex: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadError(null);
    setBusyKey(field);
    try {
      const rendered = await processDocumentUpload(file, 1800);
      onUpdateDocument(field, rendered);
      onSelectPreviewPage(pageIndex);
    } catch (err) {
      console.error('Document upload failed:', err);
      setUploadError(
        err instanceof Error
          ? err.message
          : 'Unable to process this file. Please try PNG, JPG, JPEG, PDF, or Word (.docx).'
      );
    } finally {
      setBusyKey(null);
    }
  };

  const handleCoreRotate = async (
    field: keyof DocumentAttachments,
    pageIndex: number,
    deltaDegrees: 90 | -90
  ) => {
    const current = documents[field];
    if (!current || busyKey) return;

    setUploadError(null);
    setBusyKey(field);
    try {
      const rotated = await rotateImageDataUrl(current, deltaDegrees);
      onUpdateDocument(field, rotated);
      onSelectPreviewPage(pageIndex);
    } catch (err) {
      console.error('Document rotation failed:', err);
      setUploadError('Unable to rotate this document. Please try again.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleExtraUpload = async (
    id: string,
    pageIndex: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadError(null);
    setBusyKey(id);
    try {
      const rendered = await processDocumentUpload(file, 1800);
      onUpdateExtraPage(id, { image: rendered });
      onSelectPreviewPage(pageIndex);
    } catch (err) {
      console.error('Extra document upload failed:', err);
      setUploadError(
        err instanceof Error
          ? err.message
          : 'Unable to process this file. Please try PNG, JPG, JPEG, PDF, or Word (.docx).'
      );
    } finally {
      setBusyKey(null);
    }
  };

  const handleExtraRotate = async (
    extra: ExtraDocumentPage,
    pageIndex: number,
    deltaDegrees: 90 | -90
  ) => {
    if (!extra.image || busyKey) return;

    setUploadError(null);
    setBusyKey(extra.id);
    try {
      const rotated = await rotateImageDataUrl(extra.image, deltaDegrees);
      onUpdateExtraPage(extra.id, { image: rotated });
      onSelectPreviewPage(pageIndex);
    } catch (err) {
      console.error('Extra document rotation failed:', err);
      setUploadError('Unable to rotate this page. Please try again.');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-[#475569] leading-relaxed">
        Upload scans or documents in <strong>PNG, JPG, JPEG, PDF, or Word (.doc/.docx)</strong>{' '}
        format. Each page is centered to <strong>80% of the A4 page</strong> and can be rotated
        left or right after upload.
      </p>

      {uploadError && (
        <div
          role="alert"
          className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-[12.5px] font-medium text-[#991B1B]"
        >
          {uploadError}
        </div>
      )}

      {/* Core 4 Document Pages (Pages 9–12+) */}
      <div className="flex flex-col gap-3">
        {CORE_DOCUMENTS.map((doc) => {
          const image = documents[doc.field];
          const isLoading = busyKey === doc.field;
          const isAttendance = doc.field === 'attendanceSheet';
          const resolvedPageNumber =
            doc.field === 'mouPage' ? doc.pageNumber + extraAttendanceOffset : doc.pageNumber;
          const resolvedPageIndex =
            doc.field === 'mouPage' ? doc.pageIndex + extraAttendanceOffset : doc.pageIndex;

          return (
            <div
              key={doc.field}
              className="rounded-lg border border-[#D8E1EE] bg-[#FAFBFD] p-3.5"
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <button
                  type="button"
                  onClick={() => onSelectPreviewPage(resolvedPageIndex)}
                  className="text-left text-[13.5px] font-bold text-[#0A254E] hover:underline cursor-pointer"
                >
                  Page {resolvedPageNumber}: {doc.label}
                </button>
                {image && (
                  <button
                    type="button"
                    onClick={() => onUpdateDocument(doc.field, '')}
                    className="text-[12px] font-semibold text-[#DC2626] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              {isAttendance && (
                <div className="mb-2.5 rounded-md border border-[#C6DCFA] bg-[#EFF6FF] p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-[12px] text-[#0A254E] leading-snug">
                    {digitalAttendanceActive && !image ? (
                      <>
                        <strong>Digital Attendance Sheet active</strong> ({digitalAttendanceCount}{' '}
                        student{digitalAttendanceCount === 1 ? '' : 's'} synced to report)
                      </>
                    ) : (
                      <>
                        Use the Excel-style <strong>Attendance Sheet</strong> tab or upload a file
                        below.
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onOpenAttendanceTab}
                    className="px-2.5 py-1.5 rounded bg-[#082B59] text-white text-[12px] font-bold flex items-center justify-center gap-1.5 hover:brightness-110 transition-all cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Table2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Open Attendance Tab</span>
                  </button>
                </div>
              )}

              {image ? (
                <div className="flex items-start gap-3 bg-white border border-[#CBD4E1] rounded-md p-2.5">
                  <img
                    src={image}
                    alt={doc.label}
                    className="w-16 h-20 object-contain border border-[#E2E8F0] rounded bg-[#F8FAFC] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[#0F172A] truncate">
                      {isLoading ? 'Processing...' : `${doc.label} uploaded`}
                    </div>

                    {/* Rotation & File Actions */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        disabled={Boolean(busyKey)}
                        onClick={() => void handleCoreRotate(doc.field, resolvedPageIndex, -90)}
                        title="Rotate 90° Left"
                        className="px-2 py-1 rounded border border-[#CBD4E1] bg-[#F8FAFD] text-[#0A254E] text-[12px] font-semibold inline-flex items-center gap-1 hover:bg-[#E8F1FD] hover:border-[#94B6E8] disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                        <span>Rotate Left</span>
                      </button>

                      <button
                        type="button"
                        disabled={Boolean(busyKey)}
                        onClick={() => void handleCoreRotate(doc.field, resolvedPageIndex, 90)}
                        title="Rotate 90° Right"
                        className="px-2 py-1 rounded border border-[#CBD4E1] bg-[#F8FAFD] text-[#0A254E] text-[12px] font-semibold inline-flex items-center gap-1 hover:bg-[#E8F1FD] hover:border-[#94B6E8] disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <RotateCw className="w-3.5 h-3.5 shrink-0" />
                        <span>Rotate Right</span>
                      </button>

                      <label className="px-2.5 py-1 rounded bg-[#082B59] text-white text-[12px] font-semibold cursor-pointer hover:brightness-110">
                        Replace File
                        <input
                          type="file"
                          accept={DOCUMENT_ACCEPT_TYPES}
                          onChange={(e) => handleCoreUpload(doc.field, resolvedPageIndex, e)}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => onSelectPreviewPage(resolvedPageIndex)}
                        className="px-2.5 py-1 rounded border border-[#CBD4E1] bg-white text-[#0A254E] text-[12px] font-semibold hover:bg-[#F1F5F9] cursor-pointer"
                      >
                        View Page {resolvedPageNumber}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-1 py-3.5 px-3 rounded-md border border-dashed border-[#94A3B8] bg-white hover:bg-[#F1F6FD] hover:border-[#0B336B] transition-colors cursor-pointer text-center">
                  <div className="flex items-center justify-center gap-2">
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 text-[#0B336B] animate-spin shrink-0" />
                    ) : (
                      <Upload className="w-4 h-4 text-[#0B336B] shrink-0" />
                    )}
                    <span className="text-[13px] font-semibold text-[#334155]">
                      {isLoading
                        ? 'Converting & optimizing file...'
                        : isAttendance && digitalAttendanceActive
                          ? 'Or Upload Attendance File (Overrides Sheet)'
                          : `Upload ${doc.label}`}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-[#64748B]">
                    PNG, JPG, JPEG, Image, PDF, or Word (.doc, .docx)
                  </span>
                  <input
                    type="file"
                    accept={DOCUMENT_ACCEPT_TYPES}
                    onChange={(e) => handleCoreUpload(doc.field, resolvedPageIndex, e)}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>

      {/* Optional Extra Pages (Page 13+) */}
      {extraPages.length > 0 && (
        <div className="flex flex-col gap-3 pt-1">
          <div className="text-[13px] font-extrabold text-[#0A254E]">
            Optional Extra Pages
          </div>
          {extraPages.map((extra, idx) => {
            const pageNumber = 13 + extraAttendanceOffset + idx;
            const pageIndex = 12 + extraAttendanceOffset + idx;
            const isLoading = busyKey === extra.id;

            return (
              <div
                key={extra.id}
                className="rounded-lg border border-[#C7D7EE] bg-[#F5F9FF] p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-bold text-[#0A254E]">
                    Page {pageNumber} (Optional)
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveExtraPage(extra.id)}
                    className="text-[12px] font-semibold text-[#DC2626] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Page</span>
                  </button>
                </div>

                <div>
                  <label
                    htmlFor={`extra-title-${extra.id}`}
                    className="block text-[12px] font-bold text-[#0A254E] mb-1"
                  >
                    Page Heading
                  </label>
                  <input
                    id={`extra-title-${extra.id}`}
                    type="text"
                    value={extra.title}
                    onChange={(e) => onUpdateExtraPage(extra.id, { title: e.target.value })}
                    placeholder="e.g. FEEDBACK FORM / ATTENDANCE SHEET"
                    className="w-full min-w-0 px-3 py-2 rounded-md border border-[#CBD4E1] bg-white text-[16px] sm:text-[13.5px] text-[#0F172A] focus:outline-none focus:border-[#0B336B]"
                  />
                </div>

                {extra.image ? (
                  <div className="flex items-start gap-3 bg-white border border-[#CBD4E1] rounded-md p-2.5">
                    <img
                      src={extra.image}
                      alt={extra.title}
                      className="w-16 h-20 object-contain border border-[#E2E8F0] rounded bg-[#F8FAFC] shrink-0"
                    />
                    <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        disabled={Boolean(busyKey)}
                        onClick={() => void handleExtraRotate(extra, pageIndex, -90)}
                        title="Rotate 90° Left"
                        className="px-2 py-1 rounded border border-[#CBD4E1] bg-[#F8FAFD] text-[#0A254E] text-[12px] font-semibold inline-flex items-center gap-1 hover:bg-[#E8F1FD] hover:border-[#94B6E8] disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                        <span>Rotate Left</span>
                      </button>

                      <button
                        type="button"
                        disabled={Boolean(busyKey)}
                        onClick={() => void handleExtraRotate(extra, pageIndex, 90)}
                        title="Rotate 90° Right"
                        className="px-2 py-1 rounded border border-[#CBD4E1] bg-[#F8FAFD] text-[#0A254E] text-[12px] font-semibold inline-flex items-center gap-1 hover:bg-[#E8F1FD] hover:border-[#94B6E8] disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <RotateCw className="w-3.5 h-3.5 shrink-0" />
                        <span>Rotate Right</span>
                      </button>

                      <label className="px-2.5 py-1 rounded bg-[#082B59] text-white text-[12px] font-semibold cursor-pointer hover:brightness-110">
                        Replace File
                        <input
                          type="file"
                          accept={DOCUMENT_ACCEPT_TYPES}
                          onChange={(e) => handleExtraUpload(extra.id, pageIndex, e)}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => onSelectPreviewPage(pageIndex)}
                        className="px-2.5 py-1 rounded border border-[#CBD4E1] bg-white text-[#0A254E] text-[12px] font-semibold hover:bg-[#F1F5F9] cursor-pointer"
                      >
                        View Page {pageNumber}
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-1 py-3 px-3 rounded-md border border-dashed border-[#94A3B8] bg-white hover:bg-[#F1F6FD] hover:border-[#0B336B] transition-colors cursor-pointer text-center">
                    <div className="flex items-center justify-center gap-2">
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 text-[#0B336B] animate-spin shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-[#0B336B] shrink-0" />
                      )}
                      <span className="text-[13px] font-semibold text-[#334155]">
                        {isLoading ? 'Converting & optimizing file...' : 'Upload Document / Scan'}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-[#64748B]">
                      PNG, JPG, JPEG, Image, PDF, or Word (.doc, .docx)
                    </span>
                    <input
                      type="file"
                      accept={DOCUMENT_ACCEPT_TYPES}
                      onChange={(e) => handleExtraUpload(extra.id, pageIndex, e)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Optional "+ Add One More Page" Button */}
      <button
        type="button"
        onClick={onAddExtraPage}
        className="w-full py-2.5 px-4 rounded-lg border-2 border-dashed border-[#0B336B]/45 bg-[#F4F8FF] text-[#0B336B] text-[13.5px] font-bold flex items-center justify-center gap-2 hover:bg-[#E7F0FF] hover:border-[#0B336B] transition-colors cursor-pointer"
      >
        <Plus className="w-4 h-4 shrink-0" strokeWidth={2.5} />
        <span>Add One More Page (Optional)</span>
      </button>
    </div>
  );
};
