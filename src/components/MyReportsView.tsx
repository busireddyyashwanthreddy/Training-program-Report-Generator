import React, { useState } from 'react';
import { ArrowUpRight, Camera, FileText, Plus, Trash2 } from 'lucide-react';
import {
  computeReportPreview,
  getDayPhotosSummary,
  SavedAttendanceSheet,
  SavedReport,
} from '../types/report';
import { BatchHistorySection } from './BatchHistorySection';

interface MyReportsViewProps {
  reports: SavedReport[];
  savedCyberReports?: SavedAttendanceSheet[];
  activeReportId: string | null;
  syncError?: string | null;
  onLoadReport: (report: SavedReport, options?: { openPhotosDay?: number }) => void;
  onOpenCyberReport?: (sheet: SavedAttendanceSheet) => void;
  onDeleteReport: (id: string) => void;
  onDeleteCyberReport?: (id: string) => void | Promise<unknown>;
  onCreateNew: () => void;
}

function countAttachedDocs(report: SavedReport): number {
  const docs = report.data.documents;
  if (!docs) return 0;
  return (
    (docs.appreciationLetter ? 1 : 0) +
    (docs.feedbackForm ? 1 : 0) +
    (docs.attendanceSheet ? 1 : 0) +
    (docs.mouPage ? 1 : 0)
  );
}

export const MyReportsView: React.FC<MyReportsViewProps> = ({
  reports,
  savedCyberReports = [],
  activeReportId,
  syncError,
  onLoadReport,
  onOpenCyberReport,
  onDeleteReport,
  onDeleteCyberReport,
  onCreateNew,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
    <div className="bg-white rounded-xl shadow-[0_3px_16px_rgba(8,37,82,0.08)] border border-[#E1E6EF] overflow-hidden">
      <div
        className="px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3"
        style={{ background: 'linear-gradient(90deg, #072754 0%, #0C366F 100%)' }}
      >
        <div className="flex items-center gap-2.5">
          <FileText className="w-5 h-5 text-white shrink-0" />
          <h2 className="text-white text-[16px] sm:text-[18px] font-bold">
            My Saved Reports
          </h2>
        </div>
        <button
          type="button"
          onClick={onCreateNew}
          className="px-4 py-2 rounded-md bg-[#FFD100] text-[#07234B] text-[13px] font-bold inline-flex items-center gap-1.5 hover:brightness-95 transition-all cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 shrink-0" strokeWidth={2.5} />
          <span>New Blank Report</span>
        </button>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {syncError && (
          <div
            role="alert"
            className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] font-medium text-[#991B1B]"
          >
            {syncError}
          </div>
        )}

        {reports.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 rounded-full bg-[#EDF4FD] text-[#0B336B] flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-[17px] font-bold text-[#0A254E]">
              No saved reports yet
            </h3>
            <p className="text-[14px] text-[#475569] mt-1 max-w-md mx-auto">
              Fill in your training program details and daily photos on the Home screen,
              then click &ldquo;Save to My Reports&rdquo;. Every photo and entry stays saved
              permanently until you delete it manually.
            </p>
            <button
              type="button"
              onClick={onCreateNew}
              className="mt-5 px-5 py-2.5 rounded-lg text-white text-[14px] font-bold cursor-pointer hover:brightness-110 transition-all"
              style={{
                background: 'linear-gradient(180deg, #0D366E 0%, #07234B 100%)',
              }}
            >
              Create First Report
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {reports.map((report) => {
              const preview = computeReportPreview(report.data);
              const photoSummary = getDayPhotosSummary(report.data.dayPhotos);
              const docCount = countAttachedDocs(report);
              const isCurrent = activeReportId === report.id;
              const lastSavedTime = report.updatedAt || report.createdAt;
              const isConfirmingDelete = confirmDeleteId === report.id;

              return (
                <div
                  key={report.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                      <h3 className="text-[15.5px] font-bold text-[#0A254E] truncate">
                        {preview.collegeDisplay}
                      </h3>
                      {isCurrent && (
                        <span className="text-[12px] font-bold text-[#0B5D3B] whitespace-nowrap">
                          &middot; Currently Open
                        </span>
                      )}
                    </div>

                    <p className="text-[13px] text-[#334155] truncate">
                      {preview.trainerNameLines.join(' ')} &middot;{' '}
                      {preview.submittedToTeamDisplay}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#475569] tabular-nums">
                      <span className="font-semibold text-[#0B336B]">
                        {preview.batchPrimaryLine}
                      </span>
                      <span aria-hidden="true">&middot;</span>
                      <span className="font-semibold text-[#0E5066]">
                        {photoSummary.totalPhotos}/24 Photos
                        {photoSummary.highestDayWithPhoto > 0
                          ? ` (Up to Day ${photoSummary.highestDayWithPhoto})`
                          : ' (No photos yet)'}
                      </span>
                      <span aria-hidden="true">&middot;</span>
                      <span>{docCount}/4 Docs</span>
                      <span aria-hidden="true">&middot;</span>
                      <span className="text-[#64748B]">
                        Updated {new Date(lastSavedTime).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {photoSummary.totalPhotos < 24 && (
                      <button
                        type="button"
                        onClick={() =>
                          onLoadReport(report, {
                            openPhotosDay: photoSummary.nextPendingDay,
                          })
                        }
                        className="px-3.5 py-2 min-h-[38px] rounded-md text-white text-[13px] font-bold flex items-center gap-1.5 hover:brightness-110 transition-all cursor-pointer whitespace-nowrap"
                        style={{
                          background:
                            'linear-gradient(180deg, #0D366E 0%, #07234B 100%)',
                        }}
                      >
                        <Camera className="w-3.5 h-3.5 shrink-0" />
                        <span>Add Day-{photoSummary.nextPendingDay} Photos</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onLoadReport(report)}
                      className={`px-3.5 py-2 min-h-[38px] rounded-md text-[13px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                        photoSummary.totalPhotos >= 24
                          ? 'text-white hover:brightness-110'
                          : 'border border-[#CBD4E1] bg-white text-[#0A254E] hover:bg-[#F1F5FA]'
                      }`}
                      style={
                        photoSummary.totalPhotos >= 24
                          ? {
                              background:
                                'linear-gradient(180deg, #0D366E 0%, #07234B 100%)',
                            }
                          : undefined
                      }
                    >
                      <span>Open Report</span>
                      <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                    </button>

                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteReport(report.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-3 py-2 min-h-[38px] rounded-md bg-[#DC2626] text-white text-[12.5px] font-bold hover:bg-[#B91C1C] transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Confirm Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-2 min-h-[38px] rounded-md border border-[#CBD4E1] bg-white text-[#475569] text-[12.5px] font-semibold hover:bg-[#F8FAFC] transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(report.id)}
                        aria-label="Delete saved report"
                        title="Delete saved report manually"
                        className="p-2 min-h-[38px] min-w-[38px] rounded-md border border-[#E2E8F0] text-[#64748B] hover:text-[#DC2626] hover:border-[#FCA5A5] hover:bg-[#FEF2F2] transition-colors cursor-pointer flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>

    <BatchHistorySection
      saved12DayReports={reports}
      savedCyberReports={savedCyberReports}
      activeReportId={activeReportId}
      context="reports"
      onOpen12DayReport={(report) => onLoadReport(report)}
      onOpenCyberReport={onOpenCyberReport}
      onDelete12DayReport={onDeleteReport}
      onDeleteCyberReport={onDeleteCyberReport}
    />
    </div>
  );
};

