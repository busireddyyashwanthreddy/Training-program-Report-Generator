import React from 'react';
import { Briefcase, ChevronDown, Mail, Phone, Star, User } from 'lucide-react';
import { ConclusionData, ROLE_OPTIONS } from '../types/report';

interface ConclusionStepProps {
  conclusion: ConclusionData;
  onChange: (field: keyof ConclusionData, value: string) => void;
  primaryTrainerFallback: string;
  coTrainerFallback: string;
  managerNameFallback: string;
  managerRoleFallback: string;
}

export const ConclusionStep: React.FC<ConclusionStepProps> = ({
  conclusion,
  onChange,
  primaryTrainerFallback,
  coTrainerFallback,
  managerNameFallback,
  managerRoleFallback,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-[#475569] leading-relaxed">
        Enter the College Head / Training Coordinator, Manager, and individual contact details for Page 8 (<strong>Conclusion &amp; Acknowledgment</strong>). The acknowledgment paragraph format remains fixed.
      </p>

      {/* College Head / Training Coordinator */}
      <div className="rounded-lg border border-[#D8E1EE] bg-[#FAFBFD] p-3.5 space-y-3">
        <div className="text-[13px] font-extrabold text-[#0A254E]">
          College Head / Training Coordinator
        </div>

        <div>
          <label
            htmlFor="field-college-head-name"
            className="block text-[13px] font-bold text-[#0A254E] mb-1"
          >
            Name
          </label>
          <div className="flex items-stretch rounded-md border border-[#CBD4E1] bg-white overflow-hidden focus-within:border-[#0B336B] focus-within:ring-2 focus-within:ring-[#0B336B]/15">
            <div className="w-10 bg-[#F7F9FC] border-r border-[#DCE3ED] flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-[#334155] fill-[#334155]" />
            </div>
            <input
              id="field-college-head-name"
              type="text"
              value={conclusion.collegeHeadName}
              onChange={(e) => onChange('collegeHeadName', e.target.value)}
              placeholder="e.g. Mrs. S. Rama Devi"
              className="w-full min-w-0 px-3 py-2 text-[16px] sm:text-[14px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none bg-white"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="field-college-head-desig"
            className="block text-[13px] font-bold text-[#0A254E] mb-1"
          >
            Designation
          </label>
          <div className="flex items-stretch rounded-md border border-[#CBD4E1] bg-white overflow-hidden focus-within:border-[#0B336B] focus-within:ring-2 focus-within:ring-[#0B336B]/15">
            <div className="w-10 bg-[#F7F9FC] border-r border-[#DCE3ED] flex items-center justify-center shrink-0">
              <Briefcase className="w-4 h-4 text-[#334155] fill-[#334155]" />
            </div>
            <input
              id="field-college-head-desig"
              type="text"
              value={conclusion.collegeHeadDesignation}
              onChange={(e) => onChange('collegeHeadDesignation', e.target.value)}
              placeholder="e.g. Principal / Training Coordinator"
              className="w-full min-w-0 px-3 py-2 text-[16px] sm:text-[14px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none bg-white"
            />
          </div>
        </div>
      </div>

      {/* Magic Bus Manager */}
      <div className="rounded-lg border border-[#D8E1EE] bg-[#FAFBFD] p-3.5 space-y-3">
        <div className="text-[13px] font-extrabold text-[#0A254E]">
          Manager Details
        </div>

        <div>
          <label
            htmlFor="field-manager-name"
            className="block text-[13px] font-bold text-[#0A254E] mb-1"
          >
            Manager Name
          </label>
          <div className="flex items-stretch rounded-md border border-[#CBD4E1] bg-white overflow-hidden focus-within:border-[#0B336B] focus-within:ring-2 focus-within:ring-[#0B336B]/15">
            <div className="w-10 bg-[#F7F9FC] border-r border-[#DCE3ED] flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-[#334155] fill-[#334155]" />
            </div>
            <input
              id="field-manager-name"
              type="text"
              value={conclusion.managerName}
              onChange={(e) => onChange('managerName', e.target.value)}
              placeholder={
                managerNameFallback ? `Synced: ${managerNameFallback}` : 'e.g. CH Mohan Sir'
              }
              className="w-full min-w-0 px-3 py-2 text-[16px] sm:text-[14px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none bg-white"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="field-manager-desig"
            className="block text-[13px] font-bold text-[#0A254E] mb-1"
          >
            Manager Designation
          </label>
          <div className="relative flex items-stretch rounded-md border border-[#CBD4E1] bg-white overflow-hidden focus-within:border-[#0B336B] focus-within:ring-2 focus-within:ring-[#0B336B]/15">
            <div className="w-10 bg-[#F7F9FC] border-r border-[#DCE3ED] flex items-center justify-center shrink-0">
              <Star className="w-4 h-4 text-[#334155] fill-[#334155]" />
            </div>
            <select
              id="field-manager-desig"
              value={conclusion.managerDesignation || managerRoleFallback || 'Program Manager'}
              onChange={(e) => onChange('managerDesignation', e.target.value)}
              className="mb-select w-full min-w-0 px-3 pr-9 py-2 text-[16px] sm:text-[14px] font-semibold text-[#0F172A] focus:outline-none bg-white cursor-pointer"
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
      </div>

      {/* Primary Trainer Contact Details */}
      <div className="rounded-lg border border-[#D8E1EE] bg-[#FAFBFD] p-3.5 space-y-3">
        <div className="text-[13px] font-extrabold text-[#0A254E]">
          Primary Trainer Contact Details
        </div>

        <div>
          <label
            htmlFor="field-t1-name"
            className="block text-[13px] font-bold text-[#0A254E] mb-1"
          >
            Trainer Name
          </label>
          <div className="flex items-stretch rounded-md border border-[#CBD4E1] bg-white overflow-hidden focus-within:border-[#0B336B] focus-within:ring-2 focus-within:ring-[#0B336B]/15">
            <div className="w-10 bg-[#F7F9FC] border-r border-[#DCE3ED] flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-[#334155] fill-[#334155]" />
            </div>
            <input
              id="field-t1-name"
              type="text"
              value={conclusion.trainer1Name}
              onChange={(e) => onChange('trainer1Name', e.target.value)}
              placeholder={
                primaryTrainerFallback
                  ? `Synced: ${primaryTrainerFallback}`
                  : 'e.g. Busi Reddy Yashwanth Reddy'
              }
              className="w-full min-w-0 px-3 py-2 text-[16px] sm:text-[14px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="field-t1-email"
              className="block text-[13px] font-bold text-[#0A254E] mb-1"
            >
              Email ID
            </label>
            <div className="flex items-stretch rounded-md border border-[#CBD4E1] bg-white overflow-hidden focus-within:border-[#0B336B] focus-within:ring-2 focus-within:ring-[#0B336B]/15">
              <div className="w-9 bg-[#F7F9FC] border-r border-[#DCE3ED] flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-[#334155]" />
              </div>
              <input
                id="field-t1-email"
                type="email"
                value={conclusion.trainer1Email}
                onChange={(e) => onChange('trainer1Email', e.target.value)}
                placeholder="e.g. trainer@magicbusindia.org"
                className="w-full min-w-0 px-2.5 py-2 text-[16px] sm:text-[13.5px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none bg-white"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="field-t1-mobile"
              className="block text-[13px] font-bold text-[#0A254E] mb-1"
            >
              Mobile Number
            </label>
            <div className="flex items-stretch rounded-md border border-[#CBD4E1] bg-white overflow-hidden focus-within:border-[#0B336B] focus-within:ring-2 focus-within:ring-[#0B336B]/15">
              <div className="w-9 bg-[#F7F9FC] border-r border-[#DCE3ED] flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-[#334155]" />
              </div>
              <input
                id="field-t1-mobile"
                type="tel"
                value={conclusion.trainer1Mobile}
                onChange={(e) => onChange('trainer1Mobile', e.target.value)}
                placeholder="e.g. +91 9392643879"
                className="w-full min-w-0 px-2.5 py-2 text-[16px] sm:text-[13.5px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Co-Trainer Contact Details */}
      <div className="rounded-lg border border-[#D8E1EE] bg-[#FAFBFD] p-3.5 space-y-3">
        <div className="text-[13px] font-extrabold text-[#0A254E]">
          Co-Trainer / Soft Skill Trainer Contact Details{' '}
          <span className="text-[11.5px] font-medium text-[#64748B]">(Optional)</span>
        </div>

        <div>
          <label
            htmlFor="field-t2-name"
            className="block text-[13px] font-bold text-[#0A254E] mb-1"
          >
            Co-Trainer Name
          </label>
          <div className="flex items-stretch rounded-md border border-[#CBD4E1] bg-white overflow-hidden focus-within:border-[#0B336B] focus-within:ring-2 focus-within:ring-[#0B336B]/15">
            <div className="w-10 bg-[#F7F9FC] border-r border-[#DCE3ED] flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-[#334155] fill-[#334155]" />
            </div>
            <input
              id="field-t2-name"
              type="text"
              value={conclusion.trainer2Name}
              onChange={(e) => onChange('trainer2Name', e.target.value)}
              placeholder={
                coTrainerFallback
                  ? `Synced: ${coTrainerFallback}`
                  : 'e.g. Pagadala Praveen Kumar'
              }
              className="w-full min-w-0 px-3 py-2 text-[16px] sm:text-[14px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="field-t2-email"
              className="block text-[13px] font-bold text-[#0A254E] mb-1"
            >
              Email ID
            </label>
            <div className="flex items-stretch rounded-md border border-[#CBD4E1] bg-white overflow-hidden focus-within:border-[#0B336B] focus-within:ring-2 focus-within:ring-[#0B336B]/15">
              <div className="w-9 bg-[#F7F9FC] border-r border-[#DCE3ED] flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-[#334155]" />
              </div>
              <input
                id="field-t2-email"
                type="email"
                value={conclusion.trainer2Email}
                onChange={(e) => onChange('trainer2Email', e.target.value)}
                placeholder="e.g. cotrainer@magicbusindia.org"
                className="w-full min-w-0 px-2.5 py-2 text-[16px] sm:text-[13.5px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none bg-white"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="field-t2-mobile"
              className="block text-[13px] font-bold text-[#0A254E] mb-1"
            >
              Mobile Number
            </label>
            <div className="flex items-stretch rounded-md border border-[#CBD4E1] bg-white overflow-hidden focus-within:border-[#0B336B] focus-within:ring-2 focus-within:ring-[#0B336B]/15">
              <div className="w-9 bg-[#F7F9FC] border-r border-[#DCE3ED] flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-[#334155]" />
              </div>
              <input
                id="field-t2-mobile"
                type="tel"
                value={conclusion.trainer2Mobile}
                onChange={(e) => onChange('trainer2Mobile', e.target.value)}
                placeholder="e.g. +91 9876543210"
                className="w-full min-w-0 px-2.5 py-2 text-[16px] sm:text-[13.5px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none bg-white"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
