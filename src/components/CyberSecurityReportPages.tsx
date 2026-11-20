import React from 'react';
import {
  CyberSecurityReportData,
  CyberSecurityStudentRow,
  DEFAULT_CYBER_REPORT_VALUES,
} from '../types/report';
import { A4_PAGE_HEIGHT, A4_PAGE_WIDTH } from '../utils/exportPdf';
import { FedExLogo } from './FedExLogo';
import { MagicBusLogo } from './MagicBusLogo';

const DOCUMENT_FONT_FAMILY = "'Source Sans 3', 'Segoe UI', Arial, sans-serif";

const TOP_LEFT_WAVE_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg width="225" height="168" viewBox="0 0 225 168" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="topGoldGrad" x1="0" y1="130" x2="175" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#F5BA00"/>
        <stop offset="60%" stop-color="#FFD000"/>
        <stop offset="100%" stop-color="#F8C600"/>
      </linearGradient>
      <linearGradient id="topNavyGrad" x1="0" y1="0" x2="135" y2="85" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#06214A"/>
        <stop offset="100%" stop-color="#0B336B"/>
      </linearGradient>
    </defs>
    <path d="M0 0 L215 0 C138 14 54 66 0 160 Z" fill="#EBF2FA" opacity="0.65"/>
    <path d="M0 0 L192 0 C118 14 48 64 0 144 Z" fill="url(#topGoldGrad)"/>
    <path d="M0 0 L166 0 C102 15 44 52 0 108 Z" fill="#FFFFFF"/>
    <path d="M0 0 L146 0 C88 14 38 46 0 92 Z" fill="url(#topNavyGrad)"/>
  </svg>`
)}`;

const BOTTOM_LEFT_BUS_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg width="370" height="165" viewBox="0 0 370 165" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 116 C92 106 196 122 330 165 L258 165 C154 134 74 126 0 135 Z" fill="#E5EEF9" opacity="0.72"/>
    <path d="M0 138 C76 130 148 142 222 165 L186 165 C124 147 64 142 0 149 Z" fill="#EDF3FB" opacity="0.78"/>
    <g transform="translate(8, 28) rotate(-2)" opacity="0.62">
      <path d="M12 20 C12 12 18 7 26 7 L110 7 C118 7 124 11 127 18 L138 42 C140 46 141 51 141 56 L141 79 C141 85 136 90 130 90 L22 90 C15 90 10 85 10 78 L10 26 C10 23 11 21 12 20 Z" fill="#DCE7F5"/>
      <path d="M18 22 L32 20 L32 45 L18 46 Z" fill="#FFFFFF"/>
      <path d="M37 19 L53 17 L53 44 L37 45 Z" fill="#FFFFFF"/>
      <path d="M58 16 L76 14 L76 43 L58 44 Z" fill="#FFFFFF"/>
      <path d="M84 15 L118 15 C122 15 125 18 126 22 L132 45 L84 44 Z" fill="#FFFFFF"/>
      <rect x="92" y="59" width="32" height="5" rx="2.5" fill="#FFFFFF"/>
      <rect x="95" y="68" width="26" height="4" rx="2" fill="#FFFFFF"/>
      <circle cx="88" cy="64" r="5" fill="#FFFFFF"/>
      <circle cx="131" cy="64" r="5" fill="#FFFFFF"/>
      <circle cx="42" cy="90" r="13" fill="#CBDCEE"/>
      <circle cx="42" cy="90" r="6" fill="#FFFFFF"/>
      <circle cx="114" cy="90" r="13" fill="#CBDCEE"/>
      <circle cx="114" cy="90" r="6" fill="#FFFFFF"/>
    </g>
  </svg>`
)}`;

const BOTTOM_RIGHT_WAVE_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg width="370" height="150" viewBox="0 0 370 150" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="botGoldGrad" x1="80" y1="150" x2="370" y2="35" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#F4B700"/>
        <stop offset="55%" stop-color="#FFCE00"/>
        <stop offset="100%" stop-color="#F9C700"/>
      </linearGradient>
      <linearGradient id="botNavyGrad" x1="160" y1="150" x2="370" y2="55" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#072757"/>
        <stop offset="100%" stop-color="#041C40"/>
      </linearGradient>
    </defs>
    <path d="M370 150 L42 150 C172 138 290 96 370 16 Z" fill="#E7EFFA" opacity="0.82"/>
    <path d="M370 150 L74 150 C196 138 302 98 370 36 Z" fill="url(#botGoldGrad)"/>
    <path d="M370 150 L146 150 C240 136 318 104 370 54 Z" fill="#FFFFFF"/>
    <path d="M370 150 L172 150 C258 136 326 108 370 64 Z" fill="url(#botNavyGrad)"/>
  </svg>`
)}`;

export interface CyberSecurityCoverPageProps {
  report: CyberSecurityReportData;
  captureRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * Page 1: Cyber Security Cover Sheet — matches the exact institutional layout,
 * alignment, corner ribbons, watermark bus, and gradient banners of the Home Cover Report,
 * with the Magic Bus + FedEx dual-logo lockup and Cyber Security student metrics.
 */
export const CyberSecurityCoverPage: React.FC<CyberSecurityCoverPageProps> = ({
  report,
  captureRef,
}) => {
  const projectDisplay =
    report.projectName.trim() || DEFAULT_CYBER_REPORT_VALUES.projectName;
  const programDisplay =
    report.programTitle.trim() || DEFAULT_CYBER_REPORT_VALUES.programTitle;
  const collegeDisplay =
    report.collegeName.trim() || DEFAULT_CYBER_REPORT_VALUES.collegeName;
  const teamDisplay = report.teamName.trim() || DEFAULT_CYBER_REPORT_VALUES.teamName;

  const primaryName = report.trainerName.trim();
  const primaryRole =
    report.trainerDesignation.trim() || DEFAULT_CYBER_REPORT_VALUES.trainerDesignation;
  const coName = report.coTrainerName.trim();
  const coRole = report.coTrainerDesignation.trim();

  const withRole = (name: string, role: string) => (role ? `${name} (${role})` : name);

  let trainerLines: string[];
  if (!primaryName && !coName) {
    trainerLines = [
      `${withRole(DEFAULT_CYBER_REPORT_VALUES.trainerName, primaryRole)} &`,
      withRole(
        DEFAULT_CYBER_REPORT_VALUES.coTrainerName,
        coRole || DEFAULT_CYBER_REPORT_VALUES.coTrainerDesignation
      ),
    ];
  } else if (primaryName && coName) {
    trainerLines = [`${withRole(primaryName, primaryRole)} &`, withRole(coName, coRole)];
  } else if (!primaryName && coName) {
    trainerLines = [
      `${withRole(DEFAULT_CYBER_REPORT_VALUES.trainerName, primaryRole)} &`,
      withRole(coName, coRole),
    ];
  } else {
    trainerLines = [withRole(primaryName, primaryRole)];
  }

  const totalStudents =
    report.totalStudents.trim() || DEFAULT_CYBER_REPORT_VALUES.totalStudents;
  const boysCount = report.boysCount.trim() || DEFAULT_CYBER_REPORT_VALUES.boysCount;
  const girlsCount = report.girlsCount.trim() || DEFAULT_CYBER_REPORT_VALUES.girlsCount;
  const completedCount =
    report.completedCount.trim() || DEFAULT_CYBER_REPORT_VALUES.completedCount;

  const batchMetaParts: string[] = [];
  if (report.batchCode.trim()) batchMetaParts.push(`Batch ID: ${report.batchCode.trim()}`);
  if (report.sessionDate.trim()) batchMetaParts.push(`Date: ${report.sessionDate.trim()}`);
  const batchMetaLine = batchMetaParts.join('  |  ');

  const managerName =
    report.managerName.trim() || DEFAULT_CYBER_REPORT_VALUES.managerName;
  const managerDesignation =
    report.managerDesignation.trim() || DEFAULT_CYBER_REPORT_VALUES.managerDesignation;

  return (
    <div
      ref={captureRef}
      id="cyber-report-cover-card"
      style={{
        position: 'relative',
        width: `${A4_PAGE_WIDTH}px`,
        height: `${A4_PAGE_HEIGHT}px`,
        minHeight: `${A4_PAGE_HEIGHT}px`,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        fontFamily: DOCUMENT_FONT_FAMILY,
        color: '#0A254E',
        boxSizing: 'border-box',
        padding: '26px 28px 50px 28px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Top-Left Layered Navy & Golden Yellow Corner Ribbon */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '225px',
          height: '168px',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <img
          src={TOP_LEFT_WAVE_URI}
          alt=""
          width={225}
          height={168}
          style={{ display: 'block', width: '225px', height: '168px' }}
        />
      </div>

      {/* Bottom-Left Subtle Watermark Bus & Sweeping Road */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '370px',
          height: '165px',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <img
          src={BOTTOM_LEFT_BUS_URI}
          alt=""
          width={370}
          height={165}
          style={{ display: 'block', width: '370px', height: '165px' }}
        />
      </div>

      {/* Bottom-Right Layered Golden Yellow & Deep Navy Corner Wave */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '370px',
          height: '150px',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <img
          src={BOTTOM_RIGHT_WAVE_URI}
          alt=""
          width={370}
          height={150}
          style={{ display: 'block', width: '370px', height: '150px' }}
        />
      </div>

      {/* Main Centered Report Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Top Dual Institutional Logo Lockup: Magic Bus Logo + FedEx Logo */}
        <div
          style={{
            marginTop: '6px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '22px',
            width: '100%',
          }}
        >
          <div style={{ flexShrink: 0 }}>
            <MagicBusLogo size={118} variant="light" />
          </div>
          <div
            style={{
              width: '1.5px',
              height: '66px',
              backgroundColor: '#B8C7DC',
              flexShrink: 0,
            }}
          />
          <div style={{ flexShrink: 0 }}>
            <FedExLogo width={148} customLogo={report.customFedexLogo || undefined} />
          </div>
        </div>

        {/* Dark Navy Project Name Gradient Banner */}
        <div
          style={{
            width: '100%',
            background: 'linear-gradient(180deg, #0E3770 0%, #07234B 100%)',
            borderRadius: '10px',
            padding: '11px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          <span
            style={{
              color: '#FFFFFF',
              fontSize: projectDisplay.length > 46 ? '17px' : '19px',
              fontWeight: 700,
              letterSpacing: '0.1px',
              lineHeight: 1.25,
              display: 'block',
              wordBreak: 'break-word',
            }}
          >
            {projectDisplay}
          </span>
        </div>

        {/* Program Name Heading */}
        <div
          style={{
            marginTop: '11px',
            textAlign: 'center',
            color: '#0A2B5A',
            fontSize: '16.5px',
            fontWeight: 800,
            letterSpacing: '0.15px',
            lineHeight: 1.3,
          }}
        >
          {programDisplay}
        </div>

        {/* Subtitle with Side Lines: Cyber Security Report */}
        <div
          style={{
            width: '94%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginTop: '7px',
          }}
        >
          <div style={{ flex: 1, height: '1.2px', backgroundColor: '#7D95B5' }} />
          <span
            style={{
              color: '#0A2B5A',
              fontSize: '14.5px',
              fontWeight: 700,
              lineHeight: 1.25,
              whiteSpace: 'nowrap',
            }}
          >
            Cyber Security Training Report
          </span>
          <div style={{ flex: 1, height: '1.2px', backgroundColor: '#7D95B5' }} />
        </div>

        {/* Light-Blue College Name Gradient Banner */}
        <div
          style={{
            width: '100%',
            maxWidth: '100%',
            marginTop: '13px',
            background: 'linear-gradient(180deg, #D3E4FB 0%, #C0D8FA 100%)',
            borderRadius: '8px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          <span
            style={{
              color: '#082652',
              fontSize: collegeDisplay.length > 48 ? '15px' : '16.5px',
              fontWeight: 800,
              lineHeight: 1.3,
              display: 'block',
              width: '100%',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
            }}
          >
            {collegeDisplay}
          </span>
        </div>

        {/* Section 1: Submitted by */}
        <div
          style={{
            width: '92%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginTop: '20px',
          }}
        >
          <div style={{ flex: 1, height: '1.2px', backgroundColor: '#6E88AC' }} />
          <div
            style={{
              background: 'linear-gradient(180deg, #0D356B 0%, #07234B 100%)',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              padding: '6px 22px',
              borderRadius: '9999px',
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Submitted by
          </div>
          <div style={{ flex: 1, height: '1.2px', backgroundColor: '#6E88AC' }} />
        </div>

        {/* Trainer Name(s) & Designation in Crimson Red */}
        <div
          style={{
            width: '100%',
            padding: '0 8px',
            marginTop: '9px',
            textAlign: 'center',
            color: '#C90D16',
            fontWeight: 800,
            lineHeight: 1.32,
            boxSizing: 'border-box',
          }}
        >
          {trainerLines.map((line, idx) => (
            <div
              key={idx}
              style={{
                fontSize: line.length > 48 ? '14px' : line.length > 34 ? '15.5px' : '16.5px',
                wordBreak: 'break-word',
              }}
            >
              {line}
            </div>
          ))}
          <div
            style={{
              fontSize: '15.5px',
              marginTop: '2px',
              wordBreak: 'break-word',
            }}
          >
            {teamDisplay}
          </div>
        </div>

        {/* Section 2: Student Details */}
        <div
          style={{
            width: '92%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginTop: '19px',
          }}
        >
          <div style={{ flex: 1, height: '1.2px', backgroundColor: '#6E88AC' }} />
          <div
            style={{
              background: 'linear-gradient(180deg, #0D356B 0%, #07234B 100%)',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              padding: '6px 24px',
              borderRadius: '9999px',
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Student Details:
          </div>
          <div style={{ flex: 1, height: '1.2px', backgroundColor: '#6E88AC' }} />
        </div>

        {/* Student Counts & Completion Summary in Deep Navy */}
        <div
          style={{
            width: '100%',
            padding: '0 8px',
            marginTop: '9px',
            textAlign: 'center',
            color: '#082552',
            fontWeight: 800,
            lineHeight: 1.48,
            boxSizing: 'border-box',
          }}
        >
          {batchMetaLine && (
            <div style={{ fontSize: '13px', letterSpacing: '0.1px' }}>{batchMetaLine}</div>
          )}
          <div style={{ fontSize: '14px', marginTop: batchMetaLine ? '2px' : 0 }}>
            Total Students: {totalStudents} (Boys: {boysCount} &nbsp;|&nbsp; Girls: {girlsCount})
          </div>
          <div
            style={{
              fontSize: '14px',
              marginTop: '2px',
              color: '#0B336B',
            }}
          >
            Completed Students: {completedCount} out of {totalStudents}
          </div>
        </div>

        {/* Section 3: Submitted to */}
        <div
          style={{
            width: '92%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginTop: '19px',
          }}
        >
          <div style={{ flex: 1, height: '1.2px', backgroundColor: '#6E88AC' }} />
          <div
            style={{
              background: 'linear-gradient(180deg, #0D356B 0%, #07234B 100%)',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              padding: '6px 22px',
              borderRadius: '9999px',
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Submitted to
          </div>
          <div style={{ flex: 1, height: '1.2px', backgroundColor: '#6E88AC' }} />
        </div>

        {/* Manager Name, Designation & Team Name in Royal Blue */}
        <div
          style={{
            width: '100%',
            padding: '0 8px',
            marginTop: '9px',
            textAlign: 'center',
            color: '#0621C6',
            fontWeight: 800,
            fontSize: '16.5px',
            lineHeight: 1.42,
            boxSizing: 'border-box',
          }}
        >
          {[managerName, managerDesignation, teamDisplay].map((val, idx) => (
            <div
              key={idx}
              style={{
                fontSize: val.length > 38 ? '15px' : '16.5px',
                wordBreak: 'break-word',
              }}
            >
              {val}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export interface CyberSecurityPhotosPageProps {
  sessionImages: [string, string];
  preTestImage: string;
  postTestImage: string;
}

/**
 * Page 2: Cyber Security Session & Assessment Photos —
 * 2 Session Images (Row 1) + Pre-Test & Post-Test Images (Row 2) = 4 images cleanly on ONE A4 page.
 */
export const CyberSecurityPhotosPage: React.FC<CyberSecurityPhotosPageProps> = ({
  sessionImages,
  preTestImage,
  postTestImage,
}) => {
  const frameHeight = 278;

  const renderFrame = (src: string, placeholder: string, altText: string) => (
    <div
      style={{
        width: '100%',
        height: `${frameHeight}px`,
        border: '1.5px solid #769E4A',
        backgroundColor: src ? '#FFFFFF' : '#F8FAFC',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}
    >
      {src ? (
        <img
          src={src}
          alt={altText}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            backgroundColor: '#FFFFFF',
          }}
        />
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: '12px',
            color: '#94A3B8',
            fontSize: '11.5px',
            fontWeight: 600,
          }}
        >
          {placeholder}
        </div>
      )}
    </div>
  );

  return (
    <div
      style={{
        position: 'relative',
        width: `${A4_PAGE_WIDTH}px`,
        height: `${A4_PAGE_HEIGHT}px`,
        minHeight: `${A4_PAGE_HEIGHT}px`,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: DOCUMENT_FONT_FAMILY,
        color: '#111827',
        padding: '28px 28px 28px 28px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Centered Bold Red Heading */}
      <div
        style={{
          textAlign: 'center',
          color: '#CC0000',
          fontSize: '15.5px',
          fontWeight: 800,
          marginBottom: '18px',
          lineHeight: 1.25,
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
        }}
      >
        Cyber Security Session &amp; Assessment Photos
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '18px',
        }}
      >
        {/* Top Half: 2 Session Photos */}
        <div style={{ width: '100%' }}>
          <div
            style={{
              color: '#0E5066',
              fontSize: '13px',
              fontWeight: 800,
              marginBottom: '7px',
              paddingLeft: '4px',
              letterSpacing: '0.25px',
              lineHeight: 1.2,
            }}
          >
            SESSION PHOTOS
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '14px',
              width: '100%',
            }}
          >
            {renderFrame(sessionImages[0], 'Session Photo 1', 'Cyber Security Session Photo 1')}
            {renderFrame(sessionImages[1], 'Session Photo 2', 'Cyber Security Session Photo 2')}
          </div>
        </div>

        {/* Bottom Half: Pre-Test & Post-Test Photos */}
        <div style={{ width: '100%' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '14px',
              width: '100%',
            }}
          >
            <div>
              <div
                style={{
                  color: '#0E5066',
                  fontSize: '13px',
                  fontWeight: 800,
                  marginBottom: '7px',
                  paddingLeft: '4px',
                  letterSpacing: '0.25px',
                  lineHeight: 1.2,
                }}
              >
                PRE-TEST PHOTO
              </div>
              {renderFrame(preTestImage, 'Pre-Test Photo', 'Cyber Security Pre-Test Photo')}
            </div>

            <div>
              <div
                style={{
                  color: '#0E5066',
                  fontSize: '13px',
                  fontWeight: 800,
                  marginBottom: '7px',
                  paddingLeft: '4px',
                  letterSpacing: '0.25px',
                  lineHeight: 1.2,
                }}
              >
                POST-TEST PHOTO
              </div>
              {renderFrame(postTestImage, 'Post-Test Photo', 'Cyber Security Post-Test Photo')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CYBER_PORTRAIT_ROWS_PER_PAGE = 18;
export const CYBER_PORTRAIT_MAX_ROWS_PER_PAGE = 19;

export function chunkCyberPortraitRows(
  rows: CyberSecurityStudentRow[],
  perPage = CYBER_PORTRAIT_ROWS_PER_PAGE
): CyberSecurityStudentRow[][] {
  if (rows.length === 0) return [[]];
  const baseSize = Math.max(
    CYBER_PORTRAIT_ROWS_PER_PAGE,
    Math.min(CYBER_PORTRAIT_MAX_ROWS_PER_PAGE, Math.floor(perPage) || CYBER_PORTRAIT_ROWS_PER_PAGE)
  );
  if (rows.length <= CYBER_PORTRAIT_MAX_ROWS_PER_PAGE) return [rows];

  const chunks: CyberSecurityStudentRow[][] = [];
  for (let i = 0; i < rows.length; i += baseSize) {
    chunks.push(rows.slice(i, i + baseSize));
  }

  if (
    chunks.length >= 2 &&
    chunks[chunks.length - 1].length === 1 &&
    chunks[chunks.length - 2].length < CYBER_PORTRAIT_MAX_ROWS_PER_PAGE
  ) {
    const orphan = chunks.pop()!;
    chunks[chunks.length - 1] = [...chunks[chunks.length - 1], ...orphan];
  }

  return chunks;
}

export interface CyberSecurityPortraitAttendancePageProps {
  sheetTitle: string;
  funder: string;
  batchStartDate: string;
  batchEndDate: string;
  rows: CyberSecurityStudentRow[];
  startIndex: number;
  pageIndex: number;
  totalPages: number;
}

/**
 * Page 3+: Digital Cyber Security Attendance Sheet rendered cleanly in A4 Portrait (540x764)
 * when synced directly from the Cyber Security Attendance Sheet tab.
 */
export const CyberSecurityPortraitAttendancePage: React.FC<
  CyberSecurityPortraitAttendancePageProps
> = ({
  sheetTitle,
  funder,
  batchStartDate,
  batchEndDate,
  rows,
  startIndex,
  pageIndex,
  totalPages,
}) => {
  return (
    <div
      style={{
        position: 'relative',
        width: `${A4_PAGE_WIDTH}px`,
        height: `${A4_PAGE_HEIGHT}px`,
        minHeight: `${A4_PAGE_HEIGHT}px`,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: DOCUMENT_FONT_FAMILY,
        color: '#000000',
        padding: '22px 18px 20px 18px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          color: '#D1121A',
          fontSize: '14.5px',
          fontWeight: 700,
          letterSpacing: '0.35px',
          textTransform: 'uppercase',
          marginBottom: '8px',
          lineHeight: 1.2,
        }}
      >
        CYBER SECURITY ATTENDANCE SHEET
        {totalPages > 1 ? ` (PART ${pageIndex + 1} OF ${totalPages})` : ''}
      </div>

      {/* Header Box */}
      <div
        style={{
          borderTop: '1.2px solid #000000',
          borderLeft: '1.2px solid #000000',
          borderRight: '1.2px solid #000000',
          backgroundColor: '#F8FAFC',
          padding: '5px 8px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#000000' }}>
          {sheetTitle}
        </div>
        <div
          style={{
            fontSize: '9.2px',
            fontWeight: 600,
            color: '#1E293B',
            marginTop: '2px',
          }}
        >
          Funder: {funder} &nbsp;|&nbsp; Start: {batchStartDate} &nbsp;|&nbsp; End:{' '}
          {batchEndDate}
        </div>
      </div>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          border: '1.2px solid #000000',
          fontSize: '8.4px',
        }}
      >
        <thead>
          <tr style={{ backgroundColor: '#EEF4FC' }}>
            <th
              style={{
                width: '26px',
                border: '1px solid #000000',
                padding: '4px 2px',
                textAlign: 'center',
                fontWeight: 700,
              }}
            >
              S.No
            </th>
            <th
              style={{
                width: '58px',
                border: '1px solid #000000',
                padding: '4px 3px',
                textAlign: 'center',
                fontWeight: 700,
              }}
            >
              Unique ID
            </th>
            <th
              style={{
                width: '124px',
                border: '1px solid #000000',
                padding: '4px 4px',
                textAlign: 'left',
                fontWeight: 700,
              }}
            >
              Full Name
            </th>
            <th
              style={{
                width: '118px',
                border: '1px solid #000000',
                padding: '4px 4px',
                textAlign: 'left',
                fontWeight: 700,
              }}
            >
              Email ID
            </th>
            <th
              style={{
                width: '78px',
                border: '1px solid #000000',
                padding: '4px 3px',
                textAlign: 'center',
                fontWeight: 700,
              }}
            >
              Mobile No
            </th>
            <th
              style={{
                width: '40px',
                border: '1px solid #000000',
                padding: '4px 2px',
                textAlign: 'center',
                fontWeight: 700,
              }}
            >
              Pre
            </th>
            <th
              style={{
                width: '40px',
                border: '1px solid #000000',
                padding: '4px 2px',
                textAlign: 'center',
                fontWeight: 700,
              }}
            >
              Post
            </th>
            <th
              style={{
                width: '46px',
                border: '1px solid #000000',
                padding: '4px 2px',
                textAlign: 'center',
                fontWeight: 700,
              }}
            >
              Sign
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={startIndex + idx}>
              <td
                style={{
                  border: '1px solid #000000',
                  padding: '3.5px 2px',
                  textAlign: 'center',
                  fontWeight: 700,
                }}
              >
                {startIndex + idx + 1}
              </td>
              <td
                style={{
                  border: '1px solid #000000',
                  padding: '3.5px 2px',
                  textAlign: 'center',
                  fontWeight: 600,
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                }}
              >
                {row.uniqueId || '\u00A0'}
              </td>
              <td
                style={{
                  border: '1px solid #000000',
                  padding: '3.5px 4px',
                  textAlign: 'left',
                  fontWeight: 700,
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                }}
              >
                {row.fullName || '\u00A0'}
              </td>
              <td
                style={{
                  border: '1px solid #000000',
                  padding: '3.5px 4px',
                  textAlign: 'left',
                  fontSize: '7.6px',
                  overflow: 'hidden',
                  wordBreak: 'break-all',
                }}
              >
                {row.emailId || '\u00A0'}
              </td>
              <td
                style={{
                  border: '1px solid #000000',
                  padding: '3.5px 2px',
                  textAlign: 'center',
                  fontSize: '7.8px',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.mobileNo || '\u00A0'}
              </td>
              <td
                style={{
                  border: '1px solid #000000',
                  padding: '3.5px 2px',
                  textAlign: 'center',
                  fontWeight: 600,
                }}
              >
                {row.preTest || '\u00A0'}
              </td>
              <td
                style={{
                  border: '1px solid #000000',
                  padding: '3.5px 2px',
                  textAlign: 'center',
                  fontWeight: 600,
                }}
              >
                {row.postTest || '\u00A0'}
              </td>
              <td
                style={{
                  border: '1px solid #000000',
                  padding: '3.5px 2px',
                  textAlign: 'center',
                }}
              >
                {row.signature || '\u00A0'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {pageIndex >= totalPages - 1 && (
        <div
          style={{
            width: '100%',
            marginTop: rows.length <= 15 ? '42px' : '24px',
            padding: '0 14px',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: '150px',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '20px',
                borderBottom: '1.2px solid #000000',
                marginBottom: '5px',
              }}
            />
            <div
              style={{
                fontSize: '10.5px',
                fontWeight: 800,
                color: '#000000',
                letterSpacing: '0.15px',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
              }}
            >
              Trainer Signature
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: '150px',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '20px',
                borderBottom: '1.2px solid #000000',
                marginBottom: '5px',
              }}
            />
            <div
              style={{
                fontSize: '10.5px',
                fontWeight: 800,
                color: '#000000',
                letterSpacing: '0.15px',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
              }}
            >
              College SPOC Signature
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
