import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ImagePlus, Trash2, Upload } from 'lucide-react';
import { DayPhotosMap, getDayPhotosSummary } from '../types/report';
import { readAndOptimizeImage } from '../utils/exportPdf';

interface DayPhotosStepProps {
  dayPhotos: DayPhotosMap;
  focusDay?: number | null;
  onUpdatePhoto: (day: number, slot: 0 | 1, dataUrl: string) => void;
  onClearAllPhotos: () => void;
  onSelectPreviewPage: (pageIndex: number) => void;
}

const PHOTO_PAGE_GROUPS: Array<{
  label: string;
  pageNumber: number;
  pageIndex: number;
  days: [number, number, number];
}> = [
  { label: 'Day 1–3', pageNumber: 4, pageIndex: 3, days: [1, 2, 3] },
  { label: 'Day 4–6', pageNumber: 5, pageIndex: 4, days: [4, 5, 6] },
  { label: 'Day 7–9', pageNumber: 6, pageIndex: 5, days: [7, 8, 9] },
  { label: 'Day 10–12', pageNumber: 7, pageIndex: 6, days: [10, 11, 12] },
];

function getGroupIndexForDay(day: number): number {
  const safeDay = Math.max(1, Math.min(12, Math.floor(day) || 1));
  return Math.floor((safeDay - 1) / 3);
}

export const DayPhotosStep: React.FC<DayPhotosStepProps> = ({
  dayPhotos,
  focusDay,
  onUpdatePhoto,
  onClearAllPhotos,
  onSelectPreviewPage,
}) => {
  const [activeGroupIdx, setActiveGroupIdx] = useState(() =>
    focusDay ? getGroupIndexForDay(focusDay) : 0
  );
  const [highlightedDay, setHighlightedDay] = useState<number | null>(
    focusDay ?? null
  );
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const selectPreviewPageRef = useRef(onSelectPreviewPage);
  selectPreviewPageRef.current = onSelectPreviewPage;

  useEffect(() => {
    if (focusDay && focusDay >= 1 && focusDay <= 12) {
      const idx = getGroupIndexForDay(focusDay);
      setActiveGroupIdx(idx);
      setHighlightedDay(focusDay);
      selectPreviewPageRef.current(PHOTO_PAGE_GROUPS[idx].pageIndex);
    }
  }, [focusDay]);

  const activeGroup = PHOTO_PAGE_GROUPS[activeGroupIdx];
  const summary = getDayPhotosSummary(dayPhotos);

  const handleGroupSwitch = (idx: number, highlightDayNum?: number) => {
    setActiveGroupIdx(idx);
    setHighlightedDay(highlightDayNum ?? null);
    onSelectPreviewPage(PHOTO_PAGE_GROUPS[idx].pageIndex);
  };

  const handleJumpToDay = (dayNum: number) => {
    const idx = getGroupIndexForDay(dayNum);
    handleGroupSwitch(idx, dayNum);
  };

  const handleFilePick = async (
    day: number,
    slot: 0 | 1,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const key = `${day}-${slot}`;
    setUploadingKey(key);
    try {
      const optimized = await readAndOptimizeImage(file, 1400);
      onUpdatePhoto(day, slot, optimized);
      setHighlightedDay(day);
      onSelectPreviewPage(activeGroup.pageIndex);
    } catch (err) {
      console.error('Failed to process image:', err);
    } finally {
      setUploadingKey(null);
    }
  };

  const handleBatchDayPick = async (
    day: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []).slice(0, 2);
    e.target.value = '';
    if (files.length === 0) return;

    setUploadingKey(`${day}-both`);
    try {
      for (let i = 0; i < files.length; i += 1) {
        const optimized = await readAndOptimizeImage(files[i], 1400);
        onUpdatePhoto(day, i as 0 | 1, optimized);
      }
      setHighlightedDay(day);
      onSelectPreviewPage(activeGroup.pageIndex);
    } catch (err) {
      console.error('Failed to process day images:', err);
    } finally {
      setUploadingKey(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-[#334155]">
        <span>
          Add daily photos up to date &mdash; previous days stay saved automatically.
        </span>
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-bold text-[#0A254E] tabular-nums whitespace-nowrap">
            {summary.totalPhotos} / 24 added ({summary.completedDays}/12 days complete)
          </span>
          {summary.totalPhotos > 0 &&
            (confirmClearAll ? (
              <div className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onClearAllPhotos();
                    setConfirmClearAll(false);
                  }}
                  className="px-2.5 py-1 rounded-md bg-[#DC2626] text-white text-[12px] font-bold hover:bg-[#B91C1C] transition-colors cursor-pointer whitespace-nowrap"
                >
                  Confirm Clear ({summary.totalPhotos})
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(false)}
                  className="px-2 py-1 rounded-md border border-[#CBD4E1] bg-white text-[#475569] text-[12px] font-semibold hover:bg-[#F8FAFC] transition-colors cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClearAll(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] text-[12px] font-bold hover:bg-[#FEE2E2] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Clear All Photos</span>
              </button>
            ))}
        </div>
      </div>

      {/* Interactive 12-Day Quick Tracker */}
      <div className="rounded-lg border border-[#DCE5F2] bg-[#F8FAFD] p-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[12px] font-bold text-[#0A254E]">
            Day-by-Day Progress
          </span>
          {summary.totalPhotos < 24 && (
            <button
              type="button"
              onClick={() => handleJumpToDay(summary.nextPendingDay)}
              className="text-[12px] font-bold text-[#0B336B] hover:text-[#07234B] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <span>Jump to Day-{summary.nextPendingDay}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((dayNum) => {
            const pair = dayPhotos[dayNum] || ['', ''];
            const count = (pair[0] ? 1 : 0) + (pair[1] ? 1 : 0);
            const isSelectedGroup = activeGroup.days.includes(dayNum);
            const isHighlighted = highlightedDay === dayNum;

            let toneClass =
              'bg-white border-[#CBD5E1] text-[#475569] hover:border-[#0B336B]';
            if (count === 2) {
              toneClass =
                'bg-[#0A2F63] border-[#0A2F63] text-white hover:brightness-110';
            } else if (count === 1) {
              toneClass =
                'bg-[#FEF9C3] border-[#EAB308] text-[#713F12] hover:bg-[#FEF08A]';
            }

            return (
              <button
                key={dayNum}
                type="button"
                onClick={() => handleJumpToDay(dayNum)}
                title={`Day ${dayNum}: ${count}/2 photos saved`}
                className={`py-1.5 px-1 rounded-md border text-[11px] font-bold tabular-nums flex flex-col items-center justify-center transition-all cursor-pointer ${toneClass} ${
                  isHighlighted
                    ? 'ring-2 ring-[#FCD116] ring-offset-1'
                    : isSelectedGroup
                    ? 'ring-1 ring-[#0B336B]/40'
                    : ''
                }`}
              >
                <span>D{dayNum}</span>
                <span className="text-[9.5px] font-semibold opacity-90 leading-none mt-0.5">
                  {count === 2 ? (
                    <Check className="w-2.5 h-2.5 inline" strokeWidth={3} />
                  ) : (
                    `${count}/2`
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Page 4–7 Sub-Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-[#EDF2F9] rounded-lg">
        {PHOTO_PAGE_GROUPS.map((group, idx) => {
          const isActive = idx === activeGroupIdx;
          const groupCount = group.days.reduce(
            (sum, d) =>
              sum + (dayPhotos[d]?.[0] ? 1 : 0) + (dayPhotos[d]?.[1] ? 1 : 0),
            0
          );
          return (
            <button
              key={group.label}
              type="button"
              onClick={() => handleGroupSwitch(idx)}
              className={`py-2 px-2 rounded-md text-[12px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[#082B59] text-white shadow-sm'
                  : 'text-[#334155] hover:bg-white/80 hover:text-[#0A254E]'
              }`}
            >
              {group.label} ({groupCount}/6)
            </button>
          );
        })}
      </div>

      {/* Active 3 Days (6 Images) */}
      <div className="flex flex-col gap-4">
        {activeGroup.days.map((dayNum) => {
          const pair = dayPhotos[dayNum] || ['', ''];
          const count = (pair[0] ? 1 : 0) + (pair[1] ? 1 : 0);
          const isFocused = highlightedDay === dayNum;
          return (
            <div
              key={dayNum}
              className={`rounded-lg border p-3.5 transition-colors ${
                isFocused
                  ? 'border-[#0B336B] bg-[#F4F8FF]'
                  : 'border-[#D8E1EE] bg-[#FAFBFD]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-extrabold text-[#0E5066] tracking-wide">
                    DAY-{dayNum}
                  </span>
                  <span className="text-[11.5px] font-semibold text-[#64748B] tabular-nums">
                    &middot; {count}/2 saved
                  </span>
                </div>
                <label className="text-[12px] font-semibold text-[#0B336B] hover:underline flex items-center gap-1 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Select 2 Photos</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleBatchDayPick(dayNum, e)}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {([0, 1] as const).map((slot) => {
                  const imgSrc = pair[slot];
                  const isLoading =
                    uploadingKey === `${dayNum}-${slot}` ||
                    uploadingKey === `${dayNum}-both`;

                  return (
                    <div
                      key={slot}
                      className="relative rounded-md border border-[#C7D4E5] bg-white overflow-hidden"
                    >
                      {imgSrc ? (
                        <div className="relative h-28 sm:h-32 bg-[#F8FAFC] flex items-center justify-center">
                          <img
                            src={imgSrc}
                            alt={`Day ${dayNum} Photo ${slot + 1}`}
                            className="w-full h-full object-contain"
                          />
                          <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                            <label
                              title="Replace photo"
                              className="px-2 py-1 rounded bg-[#082B59]/90 text-white text-[11px] font-semibold cursor-pointer hover:bg-[#0B3A78]"
                            >
                              Replace
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFilePick(dayNum, slot, e)}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => onUpdatePhoto(dayNum, slot, '')}
                              aria-label={`Remove Day ${dayNum} Photo ${slot + 1}`}
                              title="Delete photo manually"
                              className="p-1 rounded bg-[#DC2626]/90 text-white hover:bg-[#B91C1C] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="h-28 sm:h-32 flex flex-col items-center justify-center gap-1.5 p-2 text-center cursor-pointer hover:bg-[#F1F6FD] transition-colors">
                          <ImagePlus className="w-5 h-5 text-[#0B336B]" />
                          <span className="text-[12px] font-semibold text-[#334155]">
                            {isLoading ? 'Saving...' : `Add Photo ${slot + 1}`}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFilePick(dayNum, slot, e)}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

