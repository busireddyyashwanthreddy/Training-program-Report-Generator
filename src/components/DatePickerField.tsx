import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerFieldProps {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  placeholder: string;
  align?: 'left' | 'right';
  minDateValue?: string;
  onChange: (formattedDate: string) => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function parseDisplayDate(raw: string): Date | null {
  const clean = (raw || '').trim();
  if (!clean) return null;

  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmy = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      const candidate = new Date(year, month - 1, day);
      if (
        candidate.getFullYear() === year &&
        candidate.getMonth() === month - 1 &&
        candidate.getDate() === day
      ) {
        return candidate;
      }
    }
  }

  // Match YYYY-MM-DD or YYYY/MM/DD
  const ymd = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]);
    const day = Number(ymd[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      const candidate = new Date(year, month - 1, day);
      if (
        candidate.getFullYear() === year &&
        candidate.getMonth() === month - 1 &&
        candidate.getDate() === day
      ) {
        return candidate;
      }
    }
  }

  return null;
}

function formatDateDMY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export const DatePickerField: React.FC<DatePickerFieldProps> = ({
  id,
  label,
  required = false,
  value,
  placeholder,
  align = 'left',
  minDateValue,
  onChange,
}) => {
  const parsedValue = useMemo(() => parseDisplayDate(value), [value]);
  const parsedMinDate = useMemo(
    () => (minDateValue ? parseDisplayDate(minDateValue) : null),
    [minDateValue]
  );

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => (parsedValue || today).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => (parsedValue || today).getMonth());

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync displayed calendar month/year whenever popover opens
  const openCalendar = () => {
    const anchor = parsedValue || parsedMinDate || today;
    setViewYear(anchor.getFullYear());
    setViewMonth(anchor.getMonth());
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: Array<Date | null> = [];

    for (let i = 0; i < firstDayOfWeek; i += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(viewYear, viewMonth, day));
    }
    return cells;
  }, [viewYear, viewMonth]);

  const yearOptions = useMemo(() => {
    const currentYear = today.getFullYear();
    const startYear = Math.min(currentYear - 3, viewYear - 2, 2022);
    const endYear = Math.max(currentYear + 5, viewYear + 2, 2032);
    const years: number[] = [];
    for (let y = startYear; y <= endYear; y += 1) {
      years.push(y);
    }
    return years;
  }, [today, viewYear]);

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDate = (date: Date) => {
    onChange(formatDateDMY(date));
    setIsOpen(false);
  };

  const isSameDay = (a: Date | null, b: Date | null) =>
    Boolean(
      a &&
        b &&
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor={id}
        className="block text-[14px] font-bold text-[#0A254E] mb-1.5"
      >
        {label} {required && <span className="text-[#DC2626]">*</span>}
      </label>

      <div
        className={`flex items-stretch rounded-md border bg-white overflow-hidden transition-all ${
          isOpen
            ? 'border-[#0B336B] ring-2 ring-[#0B336B]/15'
            : 'border-[#CBD4E1] focus-within:border-[#0B336B] focus-within:ring-2 focus-within:ring-[#0B336B]/15'
        }`}
      >
        <button
          type="button"
          onClick={() => (isOpen ? setIsOpen(false) : openCalendar())}
          aria-label={`Open calendar for ${label}`}
          title={`Pick ${label}`}
          className="w-10 bg-[#F7F9FC] hover:bg-[#EAF1FB] border-r border-[#DCE3ED] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
        >
          <Calendar className="w-[17px] h-[17px] text-[#0B336B]" strokeWidth={2.2} />
        </button>

        <input
          id={id}
          type="text"
          value={value}
          onFocus={openCalendar}
          onClick={openCalendar}
          onChange={(e) => {
            const nextVal = e.target.value;
            onChange(nextVal);
            const parsed = parseDisplayDate(nextVal);
            if (parsed) {
              setViewYear(parsed.getFullYear());
              setViewMonth(parsed.getMonth());
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full min-w-0 px-3 sm:px-3.5 py-2.5 text-[16px] sm:text-[14px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none bg-white cursor-pointer"
        />

        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            aria-label={`Clear ${label}`}
            className="px-2.5 text-[#64748B] hover:text-[#DC2626] flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Interactive Calendar Popover */}
      {isOpen && (
        <div
          role="dialog"
          aria-label={`${label} calendar`}
          className={`absolute top-full mt-1.5 z-40 w-[280px] sm:w-[292px] rounded-xl border border-[#CBD4E1] bg-white shadow-[0_12px_32px_rgba(7,35,75,0.18)] overflow-hidden ${
            align === 'right' ? 'left-0 sm:left-auto sm:right-0' : 'left-0'
          }`}
        >
          {/* Calendar Header: Prev / Month & Year / Next */}
          <div
            className="px-2.5 py-2.5 flex items-center justify-between gap-1.5"
            style={{ background: 'linear-gradient(90deg, #072754 0%, #0C366F 100%)' }}
          >
            <button
              type="button"
              onClick={goPrevMonth}
              aria-label="Previous month"
              className="w-7 h-7 rounded-md text-white/90 hover:bg-white/15 flex items-center justify-center cursor-pointer shrink-0 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 min-w-0">
              <select
                aria-label="Select month"
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="bg-white/15 text-white text-[13px] font-bold rounded px-1.5 py-1 focus:outline-none focus:bg-[#082B59] cursor-pointer"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx} className="text-[#0A254E] bg-white">
                    {name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Select year"
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="bg-white/15 text-white text-[13px] font-bold rounded px-1.5 py-1 focus:outline-none focus:bg-[#082B59] cursor-pointer tabular-nums"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year} className="text-[#0A254E] bg-white">
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={goNextMonth}
              aria-label="Next month"
              className="w-7 h-7 rounded-md text-white/90 hover:bg-white/15 flex items-center justify-center cursor-pointer shrink-0 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-0.5 px-2.5 pt-2.5 pb-1 text-center">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-0.5 px-2.5 pb-2.5">
            {calendarCells.map((cellDate, idx) => {
              if (!cellDate) {
                return <div key={`empty-${idx}`} className="h-8" />;
              }

              const selected = isSameDay(cellDate, parsedValue);
              const isToday = isSameDay(cellDate, today);

              return (
                <button
                  key={cellDate.toISOString()}
                  type="button"
                  onClick={() => handleSelectDate(cellDate)}
                  className={`h-8 rounded-md text-[13px] font-semibold tabular-nums flex items-center justify-center transition-colors cursor-pointer ${
                    selected
                      ? 'bg-[#0B3C82] text-white font-bold shadow-sm'
                      : isToday
                        ? 'bg-[#FEF3C7] text-[#0A254E] font-bold ring-1 ring-[#F59E0B]/50 hover:bg-[#FDE68A]'
                        : 'text-[#1E293B] hover:bg-[#E8F1FD] hover:text-[#082B59]'
                  }`}
                >
                  {cellDate.getDate()}
                </button>
              );
            })}
          </div>

          {/* Footer Quick Actions */}
          <div className="px-3 py-2 bg-[#F8FAFD] border-t border-[#E6ECF5] flex items-center justify-between text-[12px]">
            <button
              type="button"
              onClick={() => handleSelectDate(today)}
              className="font-bold text-[#0B336B] hover:underline cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="font-semibold text-[#64748B] hover:text-[#0A254E] cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
