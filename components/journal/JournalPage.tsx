"use client";

import { useMemo } from "react";
import { useJournal } from "@/providers/journal-provider";
import WeeklyCalendar from "./WeeklyCalendar";
import StreakBadge from "./StreakBadge";
import JournalEditor from "./JournalEditor";
import BiDirectionalLinks from "./BiDirectionalLinks";
import { parseDateKey } from "@/types/journal";

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

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function JournalPage() {
  const {
    selectedDate,
    setSelectedDate,
    daysWithEntries,
    streak,
    navigateWeek,
    goToToday,
    isLoading,
  } = useJournal();

  // Format selected date for display
  const formattedDate = useMemo(() => {
    const date = parseDateKey(selectedDate);
    const dayName = DAY_NAMES[date.getDay()];
    const monthName = MONTH_NAMES[date.getMonth()];
    const day = date.getDate();

    // Check if today
    const today = new Date();
    const isToday =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();

    if (isToday) {
      return "Today";
    }

    // Check if yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate();

    if (isYesterday) {
      return "Yesterday";
    }

    return `${dayName}, ${monthName} ${day}`;
  }, [selectedDate]);

  return (
    <div className="journal-page flex flex-col h-full container mx-auto">
      {/* Weekly Calendar Strip */}
      <WeeklyCalendar
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        daysWithEntries={daysWithEntries}
        onNavigateWeek={navigateWeek}
        onGoToToday={goToToday}
      />

      {/* Date Title with Streak */}
      <div className="flex items-center justify-center gap-3 px-6 py-2.5 border-b border-(--border-color)/50">
        <h1
          className="text-lg font-medium text-(--text-primary)"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {formattedDate}
        </h1>
        <StreakBadge streak={streak} />
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-y-auto py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-(--text-secondary)">Loading...</div>
          </div>
        ) : (
          <>
            <JournalEditor />

            {/* Bi-directional Links Section */}
            {/* <div className="mt-8 pt-4 border-t border-(--border-color)">
              <BiDirectionalLinks journalDate={selectedDate} />
            </div> */}
          </>
        )}
      </div>
    </div>
  );
}
