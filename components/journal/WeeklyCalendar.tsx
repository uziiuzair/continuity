"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  getWeekDates,
  formatDateKey,
  parseDateKey,
  isToday,
} from "@/types/journal";

interface WeeklyCalendarProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  daysWithEntries: string[];
  onNavigateWeek: (direction: "prev" | "next") => void;
  onGoToToday: () => void;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function WeeklyCalendar({
  selectedDate,
  onDateChange,
  daysWithEntries,
  onNavigateWeek,
  onGoToToday,
}: WeeklyCalendarProps) {
  const selectedDateObj = useMemo(
    () => parseDateKey(selectedDate),
    [selectedDate],
  );

  const weekDates = useMemo(
    () => getWeekDates(selectedDateObj),
    [selectedDateObj],
  );

  const entriesSet = useMemo(() => new Set(daysWithEntries), [daysWithEntries]);

  // Get month/year for header
  const headerText = useMemo(() => {
    const month = MONTH_NAMES[selectedDateObj.getMonth()];
    const year = selectedDateObj.getFullYear();
    return `${month} ${year}`;
  }, [selectedDateObj]);

  // Check if today is in the current week view
  const todayInView = useMemo(() => {
    const today = formatDateKey(new Date());
    return weekDates.some((d) => formatDateKey(d) === today);
  }, [weekDates]);

  return (
    <div className="weekly-calendar border-b border-(--border-color)/50">
      {/* Header row */}
      <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
        <h2
          className="text-lg font-medium text-(--text-primary)"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {headerText}
        </h2>

        <div className="flex items-center gap-2">
          {/* Today button - only show if not in current week */}
          {!todayInView && (
            <button
              onClick={onGoToToday}
              className="px-3 py-1 text-sm text-(--text-secondary) hover:text-(--text-primary) hover:bg-black/5 rounded-md transition-colors"
            >
              Today
            </button>
          )}

          {/* Week navigation */}
          <button
            onClick={() => onNavigateWeek("prev")}
            className="p-1.5 hover:bg-black/5 rounded-md transition-colors"
            aria-label="Previous week"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-4 text-(--text-secondary)"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
          </button>
          <button
            onClick={() => onNavigateWeek("next")}
            className="p-1.5 hover:bg-black/5 rounded-md transition-colors"
            aria-label="Next week"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-4 text-(--text-secondary)"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m8.25 4.5 7.5 7.5-7.5 7.5"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center">
        {/* Days row */}
        <div className="flex px-4 pb-3 gap-1 max-w-4xl w-full">
          {weekDates.map((date, index) => {
            const dateKey = formatDateKey(date);
            const isSelected = dateKey === selectedDate;
            const hasEntry = entriesSet.has(dateKey);
            const isTodayDate = isToday(date);

            return (
              <button
                key={dateKey}
                onClick={() => onDateChange(dateKey)}
                className={cn(
                  "flex-1 flex flex-col items-center py-2 rounded-lg transition-all",
                  isSelected
                    ? "bg-(--accent)/10 text-stone-900"
                    : "hover:bg-(--accent)/5 text-(--text-primary)",
                )}
              >
                <div className="flex items-center justify-center">
                  <span
                    className={cn(
                      "text-xs font-medium mb-1 relative",
                      isSelected
                        ? "text-stone-900/80"
                        : isTodayDate
                          ? "text-(--accent)"
                          : "text-(--text-secondary)",
                    )}
                  >
                    {DAY_NAMES[index]}

                    <div>
                      {hasEntry && (
                        <div
                          className={cn(
                            "absolute bottom-1/2 -left-3.5 transform translate-y-0.5",
                            "w-1.5 h-1.5 rounded-full",
                            "bg-(--accent)",
                          )}
                        />
                      )}
                    </div>
                  </span>
                </div>
                <span
                  className={cn(
                    "text-lg font-medium",
                    isTodayDate && !isSelected && "text-(--accent)",
                  )}
                >
                  {date.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
