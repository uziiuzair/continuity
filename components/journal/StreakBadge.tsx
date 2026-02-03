"use client";

import { cn } from "@/lib/utils";

interface StreakBadgeProps {
  streak: number;
  className?: string;
}

export default function StreakBadge({ streak, className }: StreakBadgeProps) {
  if (streak === 0) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
        "bg-(--accent)/10 text-(--accent)",
        className,
      )}
    >
      <span className="text-sm">🔥</span>
      <span className="text-sm font-medium">
        {streak} day{streak !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
