import React from 'react';
import { AttendanceStudentRow } from '../types/report';
import {
  A4_LANDSCAPE_HEIGHT,
  A4_LANDSCAPE_WIDTH,
  A4_PAGE_HEIGHT,
  A4_PAGE_WIDTH,
} from '../utils/exportPdf';

const DOCUMENT_FONT_FAMILY = "'Source Sans 3', 'Segoe UI', Arial, sans-serif";
const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export const MIN_ROWS_PER_PAGE = 18;
export const MAX_ROWS_PER_PAGE = 19;
export const PORTRAIT_ROWS_PER_PAGE = MIN_ROWS_PER_PAGE;
export const LANDSCAPE_ROWS_PER_PAGE = MIN_ROWS_PER_PAGE;

/**
 * Wraps a student name cleanly so names up to 20 characters stay on a single line,
 * and names exceeding 20 characters break cleanly onto the next line inside the same cell
 * (preferring word boundaries, or splitting at 20 characters for continuous names without spaces).
 */
function formatStudentNameLines(rawName: string, maxCharsPerLine = 20): string[] {
  const cleaned = rawName.replace(/\s+/g, ' ').trim();
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
        let remaining = word;
        while (remaining.length > maxCharsPerLine) {
          lines.push(remaining.slice(0, maxCharsPerLine));
          remaining = remaining.slice(maxCharsPerLine);
        }
        current = remaining;
      }
    } else if (current.length + 1 + word.length <= maxCharsPerLine) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      if (word.length <= maxCharsPerLine) {
        current = word;
      } else {
        let remaining = word;
        while (remaining.length > maxCharsPerLine) {
          lines.push(remaining.slice(0, maxCharsPerLine));
          remaining = remaining.slice(maxCharsPerLine);
        }
        current = remaining;
      }
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

/**
 * Splits student attendance rows sequentially into A4 pages of 18 to 19 records per full page
 * (e.g., 45 students -> Page 1: 18, Page 2: 18, Page 3: 9 + signatures; 37 students -> 18, 19).
 */
export function chunkAttendanceRows(
  rows: AttendanceStudentRow[],
  perPage = MIN_ROWS_PER_PAGE
): AttendanceStudentRow[][] {
  if (rows.length === 0) return [[]];
  const baseSize = Math.max(
    MIN_ROWS_PER_PAGE,
    Math.min(MAX_ROWS_PER_PAGE, Math.floor(perPage) || MIN_ROWS_PER_PAGE)
  );
  if (rows.length <= MAX_ROWS_PER_PAGE) return [rows];

  const chunks: AttendanceStudentRow[][] = [];
  for (let i = 0; i < rows.length; i += baseSize) {
    chunks.push(rows.slice(i, i + baseSize));
  }

  // Merge a 1-row orphan tail into the preceding page (up to 19 rows) for cleaner print layout
  if (
    chunks.length >= 2 &&
    chunks[chunks.length - 1].length === 1 &&
    chunks[chunks.length - 2].length < MAX_ROWS_PER_PAGE
  ) {
    const orphan = chunks.pop()!;
    chunks[chunks.length - 1] = [...chunks[chunks.length - 1], ...orphan];
  }

  return chunks;
}

function formatCompactPortraitDate(raw?: string): string {
  const clean = (raw || '').trim();
  if (!clean) return '';
  const match = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!match) return clean.slice(0, 8);
  const dd = match[1].padStart(2, '0');
  const mm = match[2].padStart(2, '0');
  const yy = match[3].length === 4 ? match[3].slice(2) : match[3].padStart(2, '0');
  return `${dd}/${mm}/${yy}`;
}

interface AttendancePortraitReportPageProps {
  organizationTitle: string;
  collegeBatchHeader: string;
  dayDates?: string[];
  rows: AttendanceStudentRow[];
  pageIndex?: number;
  totalPages?: number;
}

/**
 * A4 Portrait (540px x 764px) Attendance Sheet page embedded directly in the Complete Training Report.
 * Uses a flush header block above the 14-column <colgroup> table so fixed column widths are
 * guaranteed in html2canvas and Student Names strictly stay inside the Student Name column.
 */
export const AttendancePortraitReportPage: React.FC<AttendancePortraitReportPageProps> = ({
  organizationTitle,
  collegeBatchHeader,
  dayDates = [],
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
        width: `${A4_PAGE_WIDTH}px`,
        height: `${A4_PAGE_HEIGHT}px`,
        minHeight: `${A4_PAGE_HEIGHT}px`,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: DOCUMENT_FONT_FAMILY,
        color: '#000000',
        padding: '16px 10px 14px 10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {isFirstPage && (
        <div
          style={{
            textAlign: 'center',
            color: '#D1121A',
            fontSize: '15.5px',
            fontWeight: 700,
            letterSpacing: '0.4px',
            textTransform: 'uppercase',
            marginBottom: '8px',
            lineHeight: 1.2,
          }}
        >
          ATTENDANCE SHEET
        </div>
      )}

      {/* Crisp Olive-Green Outer Border Frame Matching Report Document Pages */}
      <div
        style={{
          width: '100%',
          flex: 1,
          border: '1.5px solid #769E4A',
          backgroundColor: '#FFFFFF',
          padding: '4px',
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* First-Page-Only Institutional Header Block (flush above table so table Row 1 sets exact column widths) */}
        {isFirstPage && (
          <div
            style={{
              width: '100%',
              borderTop: '1.2px solid #000000',
              borderLeft: '1.2px solid #000000',
              borderRight: '1.2px solid #000000',
              backgroundColor: '#FFFFFF',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                borderBottom: '1px solid #000000',
                padding: '4px 8px',
                textAlign: 'center',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#000000',
                lineHeight: 1.2,
              }}
            >
              {organizationTitle || 'Magic Bus India Foundation'}
            </div>
            <div
              style={{
                padding: '3.5px 8px',
                textAlign: 'center',
                fontSize: '9.8px',
                fontWeight: 700,
                color: '#000000',
                lineHeight: 1.2,
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
              }}
            >
              {collegeBatchHeader}
            </div>
          </div>
        )}

        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            border: '1.2px solid #000000',
            backgroundColor: '#FFFFFF',
          }}
        >
          <colgroup>
            <col style={{ width: '25px' }} />
            <col style={{ width: '124px' }} />
            {DAY_NUMBERS.map((day) => (
              <col key={day} style={{ width: '30px' }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th
                style={{
                  width: '25px',
                  border: '1px solid #000000',
                  padding: '4px 1px',
                  textAlign: 'center',
                  fontSize: '7.5px',
                  fontWeight: 700,
                  color: '#000000',
                  backgroundColor: '#F8FAFC',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                }}
              >
                S.NO
              </th>
              <th
                style={{
                  width: '124px',
                  border: '1px solid #000000',
                  padding: '4px 6px',
                  textAlign: 'center',
                  fontSize: '8.3px',
                  fontWeight: 700,
                  color: '#000000',
                  backgroundColor: '#F8FAFC',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                }}
              >
                Student Name
              </th>
              {DAY_NUMBERS.map((day, dIdx) => {
                const compactDate = formatCompactPortraitDate(dayDates[dIdx]);
                return (
                  <th
                    key={day}
                    style={{
                      width: '30px',
                      border: '1px solid #000000',
                      padding: compactDate ? '3px 0.5px' : '4px 1px',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      fontSize: '7.6px',
                      fontWeight: 700,
                      color: '#000000',
                      backgroundColor: '#F8FAFC',
                      lineHeight: 1.15,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <div>Day {day}</div>
                    {compactDate && (
                      <div
                        style={{
                          fontSize: '5.6px',
                          fontWeight: 700,
                          color: '#0B336B',
                          marginTop: '1.5px',
                          lineHeight: 1.1,
                          letterSpacing: '-0.15px',
                        }}
                      >
                        {compactDate}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const nameLines = formatStudentNameLines(row.name, 20);
              const isMultiLine = nameLines.length > 1;
              const nameFontSize =
                nameLines.length > 2 ? '6.8px' : isMultiLine ? '7.4px' : '8px';
              const verticalPad = isDense
                ? isMultiLine
                  ? '2.5px'
                  : '4.5px'
                : isMultiLine
                  ? '3.5px'
                  : '6px';

              return (
                <tr key={row.sNo}>
                  <td
                    style={{
                      width: '25px',
                      border: '1px solid #000000',
                      padding: `${verticalPad} 1px`,
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      fontSize: '8.2px',
                      fontWeight: 700,
                      color: '#000000',
                      lineHeight: '11px',
                      overflow: 'hidden',
                    }}
                  >
                    {row.sNo}
                  </td>
                  <td
                    style={{
                      width: '124px',
                      maxWidth: '124px',
                      border: '1px solid #000000',
                      padding: `${verticalPad} 6px`,
                      textAlign: 'left',
                      verticalAlign: 'middle',
                      fontSize: nameFontSize,
                      fontWeight: 700,
                      color: '#000000',
                      lineHeight: isMultiLine ? '9.8px' : '11.2px',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere',
                      whiteSpace: 'normal',
                      boxSizing: 'border-box',
                    }}
                  >
                    {nameLines.map((line, lineIdx) => (
                      <div
                        key={lineIdx}
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
                  {DAY_NUMBERS.map((day, dIdx) => {
                    const mark = row.days[dIdx] || '';
                    return (
                      <td
                        key={day}
                        style={{
                          width: '30px',
                          border: '1px solid #000000',
                          padding: `${verticalPad} 1px`,
                          textAlign: 'center',
                          verticalAlign: 'middle',
                          fontSize: '8.4px',
                          fontWeight: 700,
                          color: mark === 'A' ? '#B91C1C' : '#000000',
                          lineHeight: '11px',
                          overflow: 'hidden',
                        }}
                      >
                        {mark}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {isLastPage && (
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
    </div>
  );
};

interface AttendanceLandscapeSheetProps {
  organizationTitle: string;
  collegeBatchHeader: string;
  dayDates?: string[];
  rows: AttendanceStudentRow[];
  pageIndex?: number;
  totalPages?: number;
}

/**
 * A4 Landscape (960px x 679px) standalone multi-page print-ready Excel Attendance Sheet.
 * Uses a flush header block on Page 1 above the exact 14-column <colgroup> table (48 + 276 + 12*50 = 924px)
 * so Student Name width is locked strictly inside its cell and never bleeds into the Day 1 column.
 */
export const AttendanceLandscapeSheet: React.FC<AttendanceLandscapeSheetProps> = ({
  organizationTitle,
  collegeBatchHeader,
  dayDates = [],
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
      {/* Page 1 Institutional Header Block (flush above table so table Row 1 enforces exact column widths) */}
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
          <div
            style={{
              borderBottom: '1px solid #000000',
              padding: '4.5px 10px',
              textAlign: 'center',
              fontSize: '15px',
              fontWeight: 700,
              color: '#000000',
              lineHeight: 1.18,
            }}
          >
            {organizationTitle || 'Magic Bus India Foundation'}
          </div>
          <div
            style={{
              padding: '4px 10px',
              textAlign: 'center',
              fontSize: '12.5px',
              fontWeight: 700,
              color: '#000000',
              lineHeight: 1.18,
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
            }}
          >
            {collegeBatchHeader}
          </div>
        </div>
      )}

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
          <col style={{ width: '42px' }} />
          <col style={{ width: '186px' }} />
          {DAY_NUMBERS.map((day) => (
            <col key={day} style={{ width: '59px' }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th
              style={{
                width: '42px',
                border: '1px solid #000000',
                padding: '4px 3px',
                textAlign: 'center',
                fontSize: '10.8px',
                fontWeight: 700,
                color: '#000000',
                backgroundColor: '#F8FAFC',
                lineHeight: 1.18,
                overflow: 'hidden',
              }}
            >
              S.NO
            </th>
            <th
              style={{
                width: '186px',
                border: '1px solid #000000',
                padding: '4px 10px',
                textAlign: 'center',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#000000',
                backgroundColor: '#F8FAFC',
                lineHeight: 1.18,
                overflow: 'hidden',
              }}
            >
              Student Name
            </th>
            {DAY_NUMBERS.map((day, dIdx) => {
              const dateVal = (dayDates[dIdx] || '').trim();
              return (
                <th
                  key={day}
                  style={{
                    width: '59px',
                    border: '1px solid #000000',
                    padding: dateVal ? '3px 1px' : '4px 2px',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    fontSize: '10.8px',
                    fontWeight: 700,
                    color: '#000000',
                    backgroundColor: '#F8FAFC',
                    lineHeight: 1.15,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <div>Day {day}</div>
                  {dateVal && (
                    <div
                      style={{
                        fontSize: '7.8px',
                        fontWeight: 700,
                        color: '#0B336B',
                        marginTop: '1.5px',
                        lineHeight: 1.1,
                      }}
                    >
                      {dateVal}
                    </div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const nameLines = formatStudentNameLines(row.name, 20);
            const isMultiLine = nameLines.length > 1;
            const nameFontSize =
              nameLines.length > 2
                ? '8px'
                : isMultiLine
                  ? isDense
                    ? '8.8px'
                    : '9.2px'
                  : '10px';
            const verticalPad = isDense
              ? isMultiLine
                ? '2.5px'
                : '4.5px'
              : isMultiLine
                ? '4px'
                : '6.2px';

            return (
              <tr key={row.sNo}>
                <td
                  style={{
                    width: '42px',
                    border: '1px solid #000000',
                    padding: `${verticalPad} 3px`,
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    color: '#000000',
                    lineHeight: '12px',
                    overflow: 'hidden',
                  }}
                >
                  {row.sNo}
                </td>
                <td
                  style={{
                    width: '186px',
                    maxWidth: '186px',
                    border: '1px solid #000000',
                    padding: `${verticalPad} 9px`,
                    textAlign: 'left',
                    verticalAlign: 'middle',
                    fontSize: nameFontSize,
                    fontWeight: 700,
                    color: '#000000',
                    lineHeight: isMultiLine ? '10.2px' : '12px',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    whiteSpace: 'normal',
                    boxSizing: 'border-box',
                  }}
                >
                  {nameLines.map((line, lineIdx) => (
                    <div
                      key={lineIdx}
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
                {DAY_NUMBERS.map((day, dIdx) => {
                  const mark = row.days[dIdx] || '';
                  return (
                    <td
                      key={day}
                      style={{
                        width: '59px',
                        border: '1px solid #000000',
                        padding: `${verticalPad} 2px`,
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        fontSize: '10.8px',
                        fontWeight: 700,
                        color: mark === 'A' ? '#B91C1C' : '#000000',
                        lineHeight: '12px',
                        overflow: 'hidden',
                      }}
                    >
                      {mark}
                    </td>
                  );
                })}
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
