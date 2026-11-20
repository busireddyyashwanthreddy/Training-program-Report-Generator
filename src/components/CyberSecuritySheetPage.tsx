import React from 'react';
import { CyberSecurityStudentRow } from '../types/report';
import { A4_LANDSCAPE_HEIGHT, A4_LANDSCAPE_WIDTH } from '../utils/exportPdf';

const DOCUMENT_FONT_FAMILY = "'Source Sans 3', 'Segoe UI', Arial, sans-serif";

export const CYBER_MIN_ROWS_PER_PAGE = 18;
export const CYBER_MAX_ROWS_PER_PAGE = 19;

// Exact 9-column fixed pixel widths totaling 936px (inside 960px A4 landscape with 12px side padding)
const COL_WIDTHS = {
  uniqueId: 78,
  fullName: 168,
  program: 64,
  qualification: 86,
  emailId: 202,
  mobileNo: 106,
  preTest: 64,
  postTest: 64,
  signature: 104,
} as const;

// Exact merged Row 2 widths aligned subpixel-for-subpixel with Row 3 column borders (total = 936px)
const ROW2_FUNDER_WIDTH =
  COL_WIDTHS.uniqueId + COL_WIDTHS.fullName + COL_WIDTHS.program; // 310px
const ROW2_QUAL_WIDTH = COL_WIDTHS.qualification; // 86px
const ROW2_START_WIDTH = COL_WIDTHS.emailId; // 202px
const ROW2_END_WIDTH =
  COL_WIDTHS.mobileNo + COL_WIDTHS.preTest + COL_WIDTHS.postTest; // 234px
const ROW2_SIG_WIDTH = COL_WIDTHS.signature; // 104px

/**
 * Wraps text cleanly so values up to maxCharsPerLine stay on 1 line,
 * and longer values wrap cleanly onto line 2 inside the same cell.
 */
function formatCellLines(raw: string, maxCharsPerLine: number): string[] {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [''];
  if (cleaned.length <= maxCharsPerLine) return [cleaned];

  const words = cleaned.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      if (word.length <= maxCharsPerLine) {
        current = word;
      } else {
        let rem = word;
        while (rem.length > maxCharsPerLine) {
          lines.push(rem.slice(0, maxCharsPerLine));
          rem = rem.slice(maxCharsPerLine);
        }
        current = rem;
      }
    } else if (current.length + 1 + word.length <= maxCharsPerLine) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      if (word.length <= maxCharsPerLine) {
        current = word;
      } else {
        let rem = word;
        while (rem.length > maxCharsPerLine) {
          lines.push(rem.slice(0, maxCharsPerLine));
          rem = rem.slice(maxCharsPerLine);
        }
        current = rem;
      }
    }
  }

  if (current) {
    lines.push(current);
  }
  return lines;
}

/**
 * Sequential 18–19 rows per A4 page pagination matching the 12-Days Attendance Sheet rules
 * (e.g., 45 students -> Page 1: 18, Page 2: 18, Page 3: 9 + signatures; 37 students -> 18, 19).
 */
export function chunkCyberSecurityRows(
  rows: CyberSecurityStudentRow[],
  perPage = CYBER_MIN_ROWS_PER_PAGE
): CyberSecurityStudentRow[][] {
  if (rows.length === 0) return [[]];
  const baseSize = Math.max(
    CYBER_MIN_ROWS_PER_PAGE,
    Math.min(CYBER_MAX_ROWS_PER_PAGE, Math.floor(perPage) || CYBER_MIN_ROWS_PER_PAGE)
  );
  if (rows.length <= CYBER_MAX_ROWS_PER_PAGE) return [rows];

  const chunks: CyberSecurityStudentRow[][] = [];
  for (let i = 0; i < rows.length; i += baseSize) {
    chunks.push(rows.slice(i, i + baseSize));
  }

  // Merge a 1-row orphan tail into the preceding page (up to 19 rows) for cleaner print layout
  if (
    chunks.length >= 2 &&
    chunks[chunks.length - 1].length === 1 &&
    chunks[chunks.length - 2].length < CYBER_MAX_ROWS_PER_PAGE
  ) {
    const orphan = chunks.pop()!;
    chunks[chunks.length - 1] = [...chunks[chunks.length - 1], ...orphan];
  }

  return chunks;
}

interface CyberSecurityLandscapeSheetProps {
  sheetTitle: string;
  funder: string;
  batchStartDate: string;
  batchEndDate: string;
  rows: CyberSecurityStudentRow[];
  pageIndex?: number;
  totalPages?: number;
}

/**
 * A4 Landscape (960px x 679px) printable Cyber Security Attendance Sheet.
 * Pure HEX/RGBA inline styles for razor-sharp html2canvas + jsPDF multi-page export.
 * Sheet Title + Funder + Batch Dates appear on Page 1 only; signatures appear after the final student record.
 */
export const CyberSecurityLandscapeSheet: React.FC<CyberSecurityLandscapeSheetProps> = ({
  sheetTitle,
  funder,
  batchStartDate,
  batchEndDate,
  rows,
  pageIndex = 0,
  totalPages = 1,
}) => {
  const isFirstPage = pageIndex === 0;
  const isLastPage = pageIndex >= totalPages - 1;
  const isDense = rows.length >= 18;

  return (
    <div
      style={{
        position: 'relative',
        width: `${A4_LANDSCAPE_WIDTH}px`,
        height: `${A4_LANDSCAPE_HEIGHT}px`,
        minHeight: `${A4_LANDSCAPE_HEIGHT}px`,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: DOCUMENT_FONT_FAMILY,
        color: '#000000',
        padding: '12px 12px 14px 12px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Page 1 Institutional Header Block (Row 1 Title + Row 2 Funder / Start Date / End Date) */}
      {isFirstPage && (
        <div
          style={{
            width: '100%',
            borderTop: '1.4px solid #000000',
            borderLeft: '1.4px solid #000000',
            borderRight: '1.4px solid #000000',
            backgroundColor: '#FFFFFF',
            boxSizing: 'border-box',
          }}
        >
          {/* Row 1: Cyber Security Attendance Sheet (BT-XXXX) */}
          <div
            style={{
              borderBottom: '1px solid #000000',
              padding: '5px 10px',
              textAlign: 'center',
              fontSize: '14.5px',
              fontWeight: 700,
              color: '#000000',
              lineHeight: 1.18,
            }}
          >
            {sheetTitle}
          </div>

          {/* Row 2: Merged Cells Matching Exact Reference Column Alignment */}
          <div
            style={{
              display: 'flex',
              width: '100%',
              boxSizing: 'border-box',
              fontSize: '11.5px',
              fontWeight: 700,
              color: '#000000',
              lineHeight: 1.18,
            }}
          >
            <div
              style={{
                width: `${ROW2_FUNDER_WIDTH}px`,
                flexShrink: 0,
                borderRight: '1px solid #000000',
                padding: '4px 8px',
                textAlign: 'center',
                boxSizing: 'border-box',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              Funder : {funder || 'INFOSYS FOUNDATION'}
            </div>
            <div
              style={{
                width: `${ROW2_QUAL_WIDTH}px`,
                flexShrink: 0,
                borderRight: '1px solid #000000',
                padding: '4px 4px',
                boxSizing: 'border-box',
              }}
            >
              &nbsp;
            </div>
            <div
              style={{
                width: `${ROW2_START_WIDTH}px`,
                flexShrink: 0,
                borderRight: '1px solid #000000',
                padding: '4px 6px',
                textAlign: 'center',
                boxSizing: 'border-box',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              Batch start Date:{batchStartDate}
            </div>
            <div
              style={{
                width: `${ROW2_END_WIDTH}px`,
                flexShrink: 0,
                borderRight: '1px solid #000000',
                padding: '4px 6px',
                textAlign: 'center',
                boxSizing: 'border-box',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              Batch End Date:{batchEndDate}
            </div>
            <div
              style={{
                width: `${ROW2_SIG_WIDTH}px`,
                flex: 1,
                padding: '4px 4px',
                boxSizing: 'border-box',
              }}
            >
              &nbsp;
            </div>
          </div>
        </div>
      )}

      {/* 9-Column Fixed-Width Attendance Table */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          border: '1.4px solid #000000',
          backgroundColor: '#FFFFFF',
        }}
      >
        <colgroup>
          <col style={{ width: `${COL_WIDTHS.uniqueId}px` }} />
          <col style={{ width: `${COL_WIDTHS.fullName}px` }} />
          <col style={{ width: `${COL_WIDTHS.program}px` }} />
          <col style={{ width: `${COL_WIDTHS.qualification}px` }} />
          <col style={{ width: `${COL_WIDTHS.emailId}px` }} />
          <col style={{ width: `${COL_WIDTHS.mobileNo}px` }} />
          <col style={{ width: `${COL_WIDTHS.preTest}px` }} />
          <col style={{ width: `${COL_WIDTHS.postTest}px` }} />
          <col style={{ width: `${COL_WIDTHS.signature}px` }} />
        </colgroup>
        <thead>
          <tr>
            {[
              { label: 'Unique ID', width: COL_WIDTHS.uniqueId },
              { label: 'Full Name', width: COL_WIDTHS.fullName },
              { label: 'Program', width: COL_WIDTHS.program },
              { label: 'Qualification', width: COL_WIDTHS.qualification },
              { label: 'Email id', width: COL_WIDTHS.emailId },
              { label: 'Mobile No', width: COL_WIDTHS.mobileNo },
              { label: 'Pre Test', width: COL_WIDTHS.preTest },
              { label: 'Post Test', width: COL_WIDTHS.postTest },
              { label: 'Signature', width: COL_WIDTHS.signature },
            ].map((col) => (
              <th
                key={col.label}
                style={{
                  width: `${col.width}px`,
                  border: '1px solid #000000',
                  padding: '4.5px 4px',
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#000000',
                  backgroundColor: '#F8FAFC',
                  lineHeight: 1.18,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const nameLines = formatCellLines(row.fullName, 20);
            const emailTrimmed = row.emailId.trim();
            const isMultiLine = nameLines.length > 1 || emailTrimmed.length > 31;
            const verticalPad = isDense
              ? isMultiLine
                ? '2.5px'
                : '4.5px'
              : isMultiLine
                ? '4px'
                : '6.2px';

            const nameFontSize =
              nameLines.length > 2
                ? '8px'
                : nameLines.length > 1
                  ? isDense
                    ? '8.6px'
                    : '9.2px'
                  : '10px';

            const emailFontSize =
              emailTrimmed.length > 31
                ? '8.2px'
                : emailTrimmed.length > 25
                  ? '9px'
                  : '9.8px';

            return (
              <tr key={idx}>
                {/* Unique ID */}
                <td
                  style={{
                    width: `${COL_WIDTHS.uniqueId}px`,
                    border: '1px solid #000000',
                    padding: `${verticalPad} 4px`,
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    fontSize: '9.8px',
                    fontWeight: 700,
                    color: '#000000',
                    lineHeight: '11.5px',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                  }}
                >
                  {row.uniqueId || '\u00A0'}
                </td>

                {/* Full Name (wraps cleanly after 20 chars inside cell, never bleeds) */}
                <td
                  style={{
                    width: `${COL_WIDTHS.fullName}px`,
                    maxWidth: `${COL_WIDTHS.fullName}px`,
                    border: '1px solid #000000',
                    padding: `${verticalPad} 8px`,
                    textAlign: 'left',
                    verticalAlign: 'middle',
                    fontSize: nameFontSize,
                    fontWeight: 700,
                    color: '#000000',
                    lineHeight: nameLines.length > 1 ? '10.2px' : '12px',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    whiteSpace: 'normal',
                    boxSizing: 'border-box',
                  }}
                >
                  {nameLines.map((line, lIdx) => (
                    <div
                      key={lIdx}
                      style={{
                        display: 'block',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere',
                        whiteSpace: 'normal',
                      }}
                    >
                      {line || '\u00A0'}
                    </div>
                  ))}
                </td>

                {/* Program */}
                <td
                  style={{
                    width: `${COL_WIDTHS.program}px`,
                    border: '1px solid #000000',
                    padding: `${verticalPad} 3px`,
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    fontSize: '9.5px',
                    fontWeight: 700,
                    color: '#000000',
                    lineHeight: '11.5px',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                  }}
                >
                  {row.program || '\u00A0'}
                </td>

                {/* Qualification */}
                <td
                  style={{
                    width: `${COL_WIDTHS.qualification}px`,
                    border: '1px solid #000000',
                    padding: `${verticalPad} 3px`,
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    fontSize: '9.5px',
                    fontWeight: 700,
                    color: '#000000',
                    lineHeight: '11.5px',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                  }}
                >
                  {row.qualification || '\u00A0'}
                </td>

                {/* Email id */}
                <td
                  style={{
                    width: `${COL_WIDTHS.emailId}px`,
                    maxWidth: `${COL_WIDTHS.emailId}px`,
                    border: '1px solid #000000',
                    padding: `${verticalPad} 8px`,
                    textAlign: 'left',
                    verticalAlign: 'middle',
                    fontSize: emailFontSize,
                    fontWeight: 700,
                    color: '#000000',
                    lineHeight: '10.6px',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    whiteSpace: 'normal',
                    boxSizing: 'border-box',
                  }}
                >
                  {emailTrimmed || '\u00A0'}
                </td>

                {/* Mobile No */}
                <td
                  style={{
                    width: `${COL_WIDTHS.mobileNo}px`,
                    border: '1px solid #000000',
                    padding: `${verticalPad} 4px`,
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    fontSize: '9.6px',
                    fontWeight: 700,
                    color: '#000000',
                    lineHeight: '11.5px',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.mobileNo || '\u00A0'}
                </td>

                {/* Pre Test */}
                <td
                  style={{
                    width: `${COL_WIDTHS.preTest}px`,
                    border: '1px solid #000000',
                    padding: `${verticalPad} 3px`,
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    fontSize: '9.8px',
                    fontWeight: 700,
                    color: '#000000',
                    lineHeight: '11.5px',
                    overflow: 'hidden',
                  }}
                >
                  {row.preTest || '\u00A0'}
                </td>

                {/* Post Test */}
                <td
                  style={{
                    width: `${COL_WIDTHS.postTest}px`,
                    border: '1px solid #000000',
                    padding: `${verticalPad} 3px`,
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    fontSize: '9.8px',
                    fontWeight: 700,
                    color: '#000000',
                    lineHeight: '11.5px',
                    overflow: 'hidden',
                  }}
                >
                  {row.postTest || '\u00A0'}
                </td>

                {/* Signature */}
                <td
                  style={{
                    width: `${COL_WIDTHS.signature}px`,
                    border: '1px solid #000000',
                    padding: `${verticalPad} 4px`,
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    fontSize: '9.5px',
                    fontWeight: 700,
                    color: '#000000',
                    lineHeight: '11.5px',
                    overflow: 'hidden',
                  }}
                >
                  {row.signature || '\u00A0'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {isLastPage && (
        <div
          style={{
            width: '100%',
            marginTop: rows.length <= 15 ? '48px' : '26px',
            padding: '0 28px',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '48px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: '210px',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '22px',
                borderBottom: '1.4px solid #000000',
                marginBottom: '6px',
              }}
            />
            <div
              style={{
                fontSize: '12.5px',
                fontWeight: 800,
                color: '#000000',
                letterSpacing: '0.2px',
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
              minWidth: '210px',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '22px',
                borderBottom: '1.4px solid #000000',
                marginBottom: '6px',
              }}
            />
            <div
              style={{
                fontSize: '12.5px',
                fontWeight: 800,
                color: '#000000',
                letterSpacing: '0.2px',
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
