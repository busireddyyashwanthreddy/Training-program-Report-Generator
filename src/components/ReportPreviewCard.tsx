import React from 'react';
import { ComputedReportPreview } from '../types/report';
import { MagicBusLogo } from './MagicBusLogo';

interface ReportPreviewCardProps {
  preview: ComputedReportPreview;
  captureRef: React.RefObject<HTMLDivElement | null>;
}

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

/**
 * ReportPreviewCard renders the exact Magic Bus Training Program Report sheet.
 * All styles use pure HEX/RGBA inline values and pre-encoded SVG data URIs for
 * decorative corner graphics so html2canvas exports match the live preview 1:1.
 */
export const ReportPreviewCard: React.FC<ReportPreviewCardProps> = ({
  preview,
  captureRef,
}) => {
  return (
    <div
      ref={captureRef}
      id="report-capture-card"
      style={{
        position: 'relative',
        width: '540px',
        height: '764px',
        minHeight: '764px',
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        fontFamily: "'Source Sans 3', 'Segoe UI', Arial, sans-serif",
        color: '#0A254E',
        boxSizing: 'border-box',
        padding: '28px 28px 54px 28px',
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

      {/* Main Centered Report Content (above decorative waves) */}
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
        {/* Top Centered Magic Bus Logo */}
        <div style={{ marginTop: '4px', marginBottom: '18px' }}>
          <MagicBusLogo size={150} variant="light" />
        </div>

        {/* Dark Navy Project Title Banner */}
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
              fontSize: '19.5px',
              fontWeight: 700,
              letterSpacing: '0.1px',
              lineHeight: 1.25,
              display: 'block',
            }}
          >
            Magic Bus India Foundation - Infosys Project
          </span>
        </div>

        {/* Program Name Heading */}
        <div
          style={{
            marginTop: '12px',
            textAlign: 'center',
            color: '#0A2B5A',
            fontSize: '16.5px',
            fontWeight: 800,
            letterSpacing: '0.15px',
            lineHeight: 1.3,
          }}
        >
          12-Days AI &amp; LIFE &amp; EMPLOYABILITY SKILLS
        </div>

        {/* Subtitle with Side Lines: Training Program Report */}
        <div
          style={{
            width: '94%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginTop: '8px',
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
            Training Program Report
          </span>
          <div style={{ flex: 1, height: '1.2px', backgroundColor: '#7D95B5' }} />
        </div>

        {/* Light-Blue College / Organization Banner */}
        <div
          className="overflow-hidden"
          style={{
            width: '100%',
            maxWidth: '100%',
            marginTop: '14px',
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
            className={preview.collegeDisplay.length > 95 ? 'truncate' : 'overflow-hidden'}
            style={{
              color: '#082652',
              fontSize: preview.collegeDisplay.length > 48 ? '15px' : '16.5px',
              fontWeight: 800,
              lineHeight: 1.3,
              display: 'block',
              width: '100%',
              maxWidth: '100%',
              overflow: 'hidden',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              ...(preview.collegeDisplay.length > 95
                ? { whiteSpace: 'nowrap', textOverflow: 'ellipsis' }
                : {}),
            }}
          >
            {preview.collegeDisplay}
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
            marginTop: '24px',
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
          className="overflow-hidden"
          style={{
            width: '100%',
            maxWidth: '100%',
            padding: '0 8px',
            marginTop: '10px',
            textAlign: 'center',
            color: '#C90D16',
            fontWeight: 800,
            lineHeight: 1.32,
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          {preview.trainerNameLines.map((line, index) => {
            const shouldTruncate = line.length > 95;
            const fontSize =
              line.length > 48 ? '14px' : line.length > 34 ? '15.5px' : '17px';
            return (
              <div
                key={index}
                className={shouldTruncate ? 'truncate' : 'overflow-hidden'}
                style={{
                  width: '100%',
                  maxWidth: '100%',
                  fontSize,
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  ...(shouldTruncate
                    ? { whiteSpace: 'nowrap', textOverflow: 'ellipsis' }
                    : {}),
                }}
              >
                {line}
              </div>
            );
          })}
          <div
            className={preview.trainerSubtitle.length > 85 ? 'truncate' : 'overflow-hidden'}
            style={{
              width: '100%',
              maxWidth: '100%',
              fontSize: preview.trainerSubtitle.length > 44 ? '14.5px' : '16px',
              marginTop: '2px',
              overflow: 'hidden',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              ...(preview.trainerSubtitle.length > 85
                ? { whiteSpace: 'nowrap', textOverflow: 'ellipsis' }
                : {}),
            }}
          >
            {preview.trainerSubtitle}
          </div>
        </div>

        {/* Section 2: Batch ID's: */}
        <div
          style={{
            width: '92%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginTop: '22px',
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
            Batch ID&apos;s:
          </div>
          <div style={{ flex: 1, height: '1.2px', backgroundColor: '#6E88AC' }} />
        </div>

        {/* Batch Details in Deep Navy */}
        <div
          className="overflow-hidden"
          style={{
            width: '100%',
            maxWidth: '100%',
            padding: '0 8px',
            marginTop: '10px',
            textAlign: 'center',
            color: '#082552',
            fontWeight: 800,
            lineHeight: 1.48,
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          <div
            className={preview.batchPrimaryLine.length > 105 ? 'truncate' : 'overflow-hidden'}
            style={{
              width: '100%',
              maxWidth: '100%',
              fontSize: preview.batchPrimaryLine.length > 56 ? '12.5px' : '13.5px',
              letterSpacing: '0.1px',
              overflow: 'hidden',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              ...(preview.batchPrimaryLine.length > 105
                ? { whiteSpace: 'nowrap', textOverflow: 'ellipsis' }
                : {}),
            }}
          >
            {preview.batchPrimaryLine}
          </div>
          <div
            className={preview.batchSizeLine.length > 105 ? 'truncate' : 'overflow-hidden'}
            style={{
              width: '100%',
              maxWidth: '100%',
              fontSize: '13.5px',
              marginTop: '2px',
              overflow: 'hidden',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              ...(preview.batchSizeLine.length > 105
                ? { whiteSpace: 'nowrap', textOverflow: 'ellipsis' }
                : {}),
            }}
          >
            {preview.batchSizeLine}
          </div>
          <div
            className={preview.batchDateLine.length > 105 ? 'truncate' : 'overflow-hidden'}
            style={{
              width: '100%',
              maxWidth: '100%',
              fontSize: preview.batchDateLine.length > 56 ? '12.5px' : '13.5px',
              marginTop: '2px',
              overflow: 'hidden',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              ...(preview.batchDateLine.length > 105
                ? { whiteSpace: 'nowrap', textOverflow: 'ellipsis' }
                : {}),
            }}
          >
            {preview.batchDateLine}
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
            marginTop: '22px',
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

        {/* Submitted To Details in Royal Blue */}
        <div
          className="overflow-hidden"
          style={{
            width: '100%',
            maxWidth: '100%',
            padding: '0 8px',
            marginTop: '10px',
            textAlign: 'center',
            color: '#0621C6',
            fontWeight: 800,
            fontSize: '16.5px',
            lineHeight: 1.42,
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          {[
            preview.submittedToNameDisplay,
            preview.submittedToRoleDisplay,
            preview.submittedToTeamDisplay,
          ].map((value, idx) => {
            const shouldTruncate = value.length > 75;
            return (
              <div
                key={idx}
                className={shouldTruncate ? 'truncate' : 'overflow-hidden'}
                style={{
                  width: '100%',
                  maxWidth: '100%',
                  fontSize: value.length > 38 ? '15px' : '16.5px',
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  ...(shouldTruncate
                    ? { whiteSpace: 'nowrap', textOverflow: 'ellipsis' }
                    : {}),
                }}
              >
                {value}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
