import React from 'react';
import {
  Briefcase,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Hash,
  Image as ImageIcon,
  Landmark,
  Paperclip,
  Pencil,
  Star,
  User,
  Users,
} from 'lucide-react';
import {
  ConclusionData,
  DocumentAttachments,
  ExtraDocumentPage,
  ReportFormData,
  ROLE_OPTIONS,
} from '../types/report';
import { ConclusionStep } from './ConclusionStep';
import { DatePickerField } from './DatePickerField';
import { DayPhotosStep } from './DayPhotosStep';
import { DocumentsStep } from './DocumentsStep';

export type FormStep = 'cover' | 'photos' | 'conclusion' | 'documents';

interface ReportFormProps {
  activeStep: FormStep;
  onStepChange: (step: FormStep) => void;
  formData: ReportFormData;
  photoFocusDay?: number | null;
  isEditingSavedReport: boolean;
  onChange: (field: keyof ReportFormData, value: string) => void;
  onUpdateDayPhoto: (day: number, slot: 0 | 1, dataUrl: string) => void;
  onClearAllPhotos: () => void;
  onUpdateConclusion: (field: keyof ConclusionData, value: string) => void;
  onUpdateDocument: (field: keyof DocumentAttachments, dataUrl: string) => void;
  onAddExtraPage: () => void;
  onUpdateExtraPage: (
    id: string,
    patch: Partial<Pick<ExtraDocumentPage, 'title' | 'image'>>
  ) => void;
  onRemoveExtraPage: (id: string) => void;
  onSelectPreviewPage: (pageIndex: number) => void;
  onGenerate: (e: React.FormEvent) => void;
  onSaveAsNewReport: () => void;
  onStartNewReport: () => void;
  statusMessage?: string | null;
  digitalAttendanceActive: boolean;
  digitalAttendanceCount: number;
  attendancePageCount: number;
  onOpenAttendanceTab: () => void;
}

const STEPS: Array<{
  id: FormStep;
  label: string;
  shortLabel: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'cover', label: '1. Cover', shortLabel: 'Cover', icon: FileText },
  { id: 'photos', label: '2. Photos', shortLabel: 'Photos', icon: ImageIcon },
  { id: 'conclusion', label: '3. Conclusion', shortLabel: 'Conclusion', icon: Pencil },
  { id: 'documents', label: '4. Docs', shortLabel: 'Docs', icon: Paperclip },
];

export const ReportForm: React.FC<ReportFormProps> = ({
  activeStep,
  onStepChange,
  formData,
  photoFocusDay,
  isEditingSavedReport,
  onChange,
  onUpdateDayPhoto,
  onClearAllPhotos,
  onUpdateConclusion,
  onUpdateDocument,
  onAddExtraPage,
  onUpdateExtraPage,
  onRemoveExtraPage,
  onSelectPreviewPage,
  onGenerate,
  onSaveAsNewReport,
  onStartNewReport,
  statusMessage,
  digitalAttendanceActive,
  digitalAttendanceCount,
  attendancePageCount,
  onOpenAttendanceTab,
}) => {
  const currentStepIdx = STEPS.findIndex((s) => s.id === activeStep);

  const handleStepClick = (step: FormStep) => {
    onStepChange(step);
    if (step === 'cover') onSelectPreviewPage(0);
    else if (step === 'photos') onSelectPreviewPage(3);
    else if (step === 'conclusion') onSelectPreviewPage(7);
    else if (step === 'documents') onSelectPreviewPage(8);
  };

  return (
    <div className="bg-white rounded-xl shadow-[0_3px_16px_rgba(8,37,82,0.08)] border border-[#E1E6EF] flex flex-col min-w-0">
      {/* Dark Navy Card Header */}
      <div
        className="px-4 sm:px-5 py-3.5 rounded-t-xl flex items-center justify-between gap-2"
        style={{ background: 'linear-gradient(90deg, #072754 0%, #0C366F 100%)' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Pencil className="w-[18px] h-[18px] text-white shrink-0" strokeWidth={2.2} />
          <h2 className="text-white text-[16px] sm:text-[17px] font-bold tracking-tight truncate">
            Enter Your Details
          </h2>
        </div>
        <span className="text-[11.5px] font-semibold text-[#D6E6FF] whitespace-nowrap shrink-0">
          Step {currentStepIdx + 1} of {STEPS.length}
        </span>
      </div>

      {/* 4-Step Section Switcher */}
      <div className="px-3 sm:px-4 pt-3 pb-2 bg-[#F8FAFD] border-b border-[#E2E8F0]">
        <div className="grid grid-cols-4 gap-1 p-1 bg-[#E8EEF7] rounded-lg">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = step.id === activeStep;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => handleStepClick(step.id)}
                className={`py-2 px-1.5 rounded-md text-[12px] sm:text-[12.5px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap min-w-0 ${
                  isActive
                    ? 'bg-white text-[#082B59] shadow-sm'
                    : 'text-[#475569] hover:text-[#0A254E]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0 hidden sm:block" />
                <span className="truncate">{step.shortLabel}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[11.5px] text-[#64748B] mt-2 text-center">
          Pages 2 &amp; 3 (Curriculum &amp; Employability Skills) are fixed automatically in the PDF.
        </p>
      </div>

      {/* Form Body */}
      <form onSubmit={onGenerate} className="p-4 sm:p-6 flex flex-col gap-3.5 sm:gap-4">
        {activeStep === 'cover' && (
          <>
            {/* 1. Your Name */}
            <div>
              <label
                htmlFor="field-your-name"
                className="block text-[14px] font-bold text-[#0A254E] mb-1.5"
              >
                Your Name <span className="text-[#DC2626]">*</span>
              </label>
              <div className="flex items-stretch rounded-md border border-[#CBD4E1] bg-white overflow-hidden focus-within:border-[#0B336B] focus-within:ring-2 focus-within:ring-[#0B336B]/15 transition-all">
                <div className="w-10 bg-[#F7F9FC] border-r border-[#DCE3ED] flex items-center justify-center shrink-0">
                  <User className="w-[17px] h-[17px] text-[#334155] fill-[#334155]" />
                </div>
                <input
                  id="field-your-name"
                  type="text"
                  value={formData.yourName}
                  onChange={(e) => onChange('yourName', e.target.value)}
                  placeholder="e.g. Busi Reddy Yashwanth Reddy"
                  className="w-full min-w-0 px-3 sm:px-3.5 py-2.5 text-[16px] sm:text-[14px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none bg-white"
                />
              </div>
            </div>

            {/* 2. Role / Designation */}
            <div>
              <label
                htmlFor="field-role-designation"
                className="block text-[14px] font-bold text-[#0A254E] mb-1.5"
              >
                Role / Designation <span className="text-[#DC2626]">*</span>
              </label>
              <div className="flex items-stretch rounded-md border border-[#CBD4E1] bg-white overflow-hidden focus-within:border-[#0B336B] focus-within:ring-2 focus-within:ring-[#0B336B]/15 transition-all">
                <div className="w-10 bg-[#F7F9FC] border-r border-[#DCE3ED] flex items-center justify-center shrink-0">
                  <Briefcase className="w-[17px] h-[17px] text-[#334155] fill-[#334155]" />
                </div>
                <input
                  id="field-role-designation"
                  type="text"
                  value={formData.roleDesignation}
                  onChange={(e) => onChange('roleDesignation', e.target.value)}
                  placeholder="e.g. AI Technical Trainer"
                  className="w-full min-w-0 px-3 sm:px-3.5 py-2.5 text-[16px] sm:text-[14px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none bg-white"
                />
              </div>
            </div>

            {/* 2b. Soft Skill / Co-Trainer Name (Optional) */}
            <div>
              <label
                htmlFor="field-co-trainer-name"
                className="block text-[14px] font-bold text-[#0A254E] mb-1.5"
              >
                Soft Skill / Co-Trainer Name{' '}
                <span className="text-[12px] font-medium text-[#64748B]">(Optional)</span>
              </label>
              <div className="flex items-stretch rounded-md border border-[#CBD4E1] bg-white overflow-hidden focus-within:border-[#0B336B] focus-within:ring-2 focus-within:ring-[#0B336B]/15 transition-all">
                <div className="w-10 bg-[#F7F9FC] border-r border-[#DCE3ED] flex items-center justify-center shrink-0">
                  <User className="w-[17px] h-[17px] text-[#334155] fill-[#334155]" />
                </div>
                <input
                  id="field-co-trainer-name"
                  type="text"
                  value={formData.coTrainerName}
                  onChange={(e) => onChange('coTrainerName', e.target.value)}
                  placeholder="e.g. Pagadala Praveen Kumar"
                  className="w-full min-w-0 px-3 sm:px-3.5 py-2.5 text-[16px] sm:text-[14px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none bg-white"
                />
              </div>
            </div>

            {/* 2c. Co-Trainer Role / Designation (Optional) */}
            <div>
              <label
                htmlFor="field-co-trainer-role"
                className="block text-[14px] font-bold text-[#0A254E] mb-1.5"
              >
                Co-Trainer Role / Designation{' '}
                <span className="text-[12px] font-medium text-[#64748B]">(Optional)</span>
              </label>
              <div className="flex items-stretch rounded-md border border-[#CBD4E1] bg-white overflow-hidden focus-within:border-[#0B336B] focus-within:ring-2 focus-within:ring-[#0B336B]/15 transition-all">
                <div className="w-10 bg-[#F7F9FC] border-r border-[#DCE3ED] flex items-center justify-center shrink-0">
                  <Briefcase className="w-[17px] h-[17px] text-[#334155] fill-[#334155]" />
                </div>
                <input
                  id="field-co-trainer-role"
                  type="text"
                  value={formData.coTrainerRole}
                  onChange={(e) => onChange('coTrainerRole', e.target.value)}
                  placeholder="e.g. Soft Skill Trainer"
                  className="w-full min-w-0 px-3 sm:px-3.5 py-2.5 text-[16px] sm:text-[14px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none bg-white"
                />
              </div>
            </div>

            {/* 3. College / Organization */}
            <div>
              <label
                htmlFor="field-college-org"
                className="block text-[14px] font-bold text-[#0A254E] mb-1.5"
              >
                College / Organization <span className="text-[#DC2626]">*</span>
              </label>
              <div className="flex items-stretch rounded-md border border-[#CBD4E1] bg-white overflow-hidden focus-within:border-[#0B336B] focus-within:ring-2 focus-within:ring-[#0B336B]/15 transition-all">
                <div className="w-10 bg-[#F7F9FC] border-r border-[#DCE3ED] flex items-center justify-center shrink-0">
                  <Landmark className="w-[17px] h-[17px] text-[#334155]" strokeWidth={2.2} />
                </div>
                <input
                  id="field-college-org"
                  type="text"
                  value={formData.collegeOrganization}
                  onChange={(e) => onChange('collegeOrganization', e.target.value)}
                  placeholder="e.g. Shri Gnanambica Degree College"
                  className="w-full min-w-0 px-3 sm:px-3.5 py-2.5 text-[16px] sm:text-[14px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none bg-white"
                />
              </div>
            </div>

            {/* 4. Batch ID */}
            <div>
              <label
                htmlFor="field-batch-id"
                className="block text-[14px] font-bold text-[#0A254E] mb-1.5"
              >
                Batch ID <span className="text-[#DC2626]">*</span>
              </label>
              <div className="flex items-stretch rounded-md border border-[#CBD4E1] bg-white overflow-hidden focus-within:border-[#0B336B] focus-within:ring-2 focus-within:ring-[#0B336B]/15 transition-all">
                <div className="w-10 bg-[#F7F9FC] border-r border-[#DCE3ED] flex items-center justify-center shrink-0">
                  <Hash className="w-[17px] h-[17px] text-[#334155]" strokeWidth={2.5} />
                </div>
                <input
                  id="field-batch-id"
                  type="text"
                  value={formData.batchId}
                  onChange={(e) => onChange('batchId', e.target.value)}
                  placeholder="e.g. BT-CHITTOOR INFOSYS FOUNDATION CWW-AI – BT-4006 (30)"
                  className="w-full min-w-0 px-3 sm:px-3.5 py-2.5 text-[16px] sm:text-[14px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none bg-white"
                />
              </div>
            </div>

            {/* 4b. Total Batch Size */}
            <div>
              <label
                htmlFor="field-batch-size"
                className="block text-[14px] font-bold text-[#0A254E] mb-1.5"
              >
                Total Batch Size <span className="text-[#DC2626]">*</span>
              </label>
              <div className="flex items-stretch rounded-md border border-[#CBD4E1] bg-white overflow-hidden focus-within:border-[#0B336B] focus-within:ring-2 focus-within:ring-[#0B336B]/15 transition-all">
                <div className="w-10 bg-[#F7F9FC] border-r border-[#DCE3ED] flex items-center justify-center shrink-0">
                  <Users className="w-[17px] h-[17px] text-[#334155] fill-[#334155]" />
                </div>
                <input
                  id="field-batch-size"
                  type="text"
                  inputMode="numeric"
                  value={formData.totalBatchSize}
                  onChange={(e) => onChange('totalBatchSize', e.target.value)}
                  placeholder="e.g. 30"
                  className="w-full min-w-0 px-3 sm:px-3.5 py-2.5 text-[16px] sm:text-[14px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none bg-white"
                />
              </div>
            </div>

            {/* 5. From Date & To Date with Interactive Calendar Picker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <DatePickerField
                id="field-from-date"
                label="From Date"
                required
                value={formData.fromDate}
                placeholder="e.g. 04/11/2026"
                align="left"
                onChange={(val) => onChange('fromDate', val)}
              />

              <DatePickerField
                id="field-to-date"
                label="To Date"
                required
                value={formData.toDate}
                placeholder="e.g. 17/11/2026"
                align="right"
                minDateValue={formData.fromDate}
                onChange={(val) => onChange('toDate', val)}
              />
            </div>

            {/* 6. Submitted To (Name) */}
            <div>
              <label
                htmlFor="field-submitted-to"
                className="block text-[14px] font-bold text-[#0A254E] mb-1.5"
              >
                Submitted To (Name) <span className="text-[#DC2626]">*</span>
              </label>
              <div className="flex items-stretch rounded-md border border-[#CBD4E1] bg-white overflow-hidden focus-within:border-[#0B336B] focus-within:ring-2 focus-within:ring-[#0B336B]/15 transition-all">
                <div className="w-10 bg-[#F7F9FC] border-r border-[#DCE3ED] flex items-center justify-center shrink-0">
                  <User className="w-[17px] h-[17px] text-[#334155] fill-[#334155]" />
                </div>
                <input
                  id="field-submitted-to"
                  type="text"
                  value={formData.submittedToName}
                  onChange={(e) => onChange('submittedToName', e.target.value)}
                  placeholder="e.g. Ch. Mohan Sir"
                  className="w-full min-w-0 px-3 sm:px-3.5 py-2.5 text-[16px] sm:text-[14px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none bg-white"
                />
              </div>
            </div>

            {/* 7. Your Role */}
            <div>
              <label
                htmlFor="field-your-role"
                className="block text-[14px] font-bold text-[#0A254E] mb-1.5"
              >
                Your Role <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative flex items-stretch rounded-md border border-[#CBD4E1] bg-white overflow-hidden focus-within:border-[#0B336B] focus-within:ring-2 focus-within:ring-[#0B336B]/15 transition-all">
                <div className="w-10 bg-[#F7F9FC] border-r border-[#DCE3ED] flex items-center justify-center shrink-0">
                  <Star className="w-[17px] h-[17px] text-[#334155] fill-[#334155]" />
                </div>
                <select
                  id="field-your-role"
                  value={formData.yourRole}
                  onChange={(e) => onChange('yourRole', e.target.value)}
                  className="mb-select w-full min-w-0 px-3 sm:px-3.5 pr-9 py-2.5 text-[16px] sm:text-[14px] font-semibold text-[#0F172A] focus:outline-none bg-white cursor-pointer"
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="w-4 h-4 text-[#1E293B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  strokeWidth={2.5}
                />
              </div>
            </div>

            {/* 8. Team Name */}
            <div>
              <label
                htmlFor="field-team-name"
                className="block text-[14px] font-bold text-[#0A254E] mb-1.5"
              >
                Team Name <span className="text-[#DC2626]">*</span>
              </label>
              <div className="flex items-stretch rounded-md border border-[#CBD4E1] bg-white overflow-hidden focus-within:border-[#0B336B] focus-within:ring-2 focus-within:ring-[#0B336B]/15 transition-all">
                <div className="w-10 bg-[#F7F9FC] border-r border-[#DCE3ED] flex items-center justify-center shrink-0">
                  <Users className="w-[17px] h-[17px] text-[#334155] fill-[#334155]" />
                </div>
                <input
                  id="field-team-name"
                  type="text"
                  value={formData.teamName}
                  onChange={(e) => onChange('teamName', e.target.value)}
                  placeholder="e.g. Chittoor Team"
                  className="w-full min-w-0 px-3 sm:px-3.5 py-2.5 text-[16px] sm:text-[14px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none bg-white"
                />
              </div>
            </div>
          </>
        )}

        {activeStep === 'photos' && (
          <DayPhotosStep
            dayPhotos={formData.dayPhotos}
            focusDay={photoFocusDay}
            onUpdatePhoto={onUpdateDayPhoto}
            onClearAllPhotos={onClearAllPhotos}
            onSelectPreviewPage={onSelectPreviewPage}
          />
        )}

        {activeStep === 'conclusion' && (
          <ConclusionStep
            conclusion={formData.conclusion}
            onChange={onUpdateConclusion}
            primaryTrainerFallback={formData.yourName}
            coTrainerFallback={formData.coTrainerName}
            managerNameFallback={formData.submittedToName}
            managerRoleFallback={formData.yourRole}
          />
        )}

        {activeStep === 'documents' && (
          <DocumentsStep
            documents={formData.documents}
            extraPages={formData.extraPages}
            onUpdateDocument={onUpdateDocument}
            onAddExtraPage={onAddExtraPage}
            onUpdateExtraPage={onUpdateExtraPage}
            onRemoveExtraPage={onRemoveExtraPage}
            onSelectPreviewPage={onSelectPreviewPage}
            digitalAttendanceActive={digitalAttendanceActive}
            digitalAttendanceCount={digitalAttendanceCount}
            attendancePageCount={attendancePageCount}
            onOpenAttendanceTab={onOpenAttendanceTab}
          />
        )}

        {/* Step Navigation & Save Controls */}
        <div className="pt-2 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2.5">
            {currentStepIdx > 0 ? (
              <button
                type="button"
                onClick={() => handleStepClick(STEPS[currentStepIdx - 1].id)}
                className="flex-1 py-2.5 px-3 rounded-lg border border-[#CBD4E1] bg-white text-[#0A254E] text-[13.5px] font-bold flex items-center justify-center gap-1.5 hover:bg-[#F1F5F9] transition-colors cursor-pointer whitespace-nowrap"
              >
                <ChevronLeft className="w-4 h-4 shrink-0" />
                <span>Previous</span>
              </button>
            ) : (
              <div className="flex-1" />
            )}

            {currentStepIdx < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => handleStepClick(STEPS[currentStepIdx + 1].id)}
                className="flex-1 py-2.5 px-3 rounded-lg bg-[#E8F1FD] border border-[#BFD6F7] text-[#082B59] text-[13.5px] font-bold flex items-center justify-center gap-1.5 hover:bg-[#DCEAFE] transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Next: {STEPS[currentStepIdx + 1].shortLabel}</span>
                <ChevronRight className="w-4 h-4 shrink-0" />
              </button>
            ) : (
              <div className="flex-1" />
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 px-5 rounded-lg text-white text-[15px] font-bold flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(7,35,75,0.22)] hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer whitespace-nowrap"
            style={{ background: 'linear-gradient(180deg, #0D366E 0%, #07234B 100%)' }}
          >
            <FileText className="w-[18px] h-[18px] text-white shrink-0" strokeWidth={2.2} />
            <span>
              {isEditingSavedReport ? 'Save & Update Report' : 'Save to My Reports'}
            </span>
            <ChevronRight className="w-4 h-4 text-white shrink-0" strokeWidth={2.6} />
          </button>

          {isEditingSavedReport && (
            <div className="flex items-center justify-between gap-3 pt-1 text-[12.5px]">
              <button
                type="button"
                onClick={onSaveAsNewReport}
                className="font-semibold text-[#0B336B] hover:underline cursor-pointer whitespace-nowrap"
              >
                Save as New Copy
              </button>
              <button
                type="button"
                onClick={onStartNewReport}
                className="font-semibold text-[#475569] hover:text-[#0A254E] hover:underline cursor-pointer whitespace-nowrap"
              >
                Start Fresh Report
              </button>
            </div>
          )}
        </div>

        {statusMessage && (
          <p
            role="status"
            className="text-[13px] font-medium text-[#0B336B] text-center bg-[#EDF4FD] border border-[#C6DCFA] rounded-md py-2 px-3"
          >
            {statusMessage}
          </p>
        )}
      </form>
    </div>
  );
};
