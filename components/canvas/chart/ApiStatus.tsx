"use client";

import { cn } from "@/lib/utils";

interface ApiStatusProps {
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export default function ApiStatus({
  isLoading,
  error,
  lastUpdated,
}: ApiStatusProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className={cn("api-status", error && "api-status-error")}>
      {isLoading && (
        <span className="api-status-dot api-status-dot-loading" />
      )}
      {!isLoading && !error && (
        <span className="api-status-dot api-status-dot-ok" />
      )}
      {error && <span className="api-status-dot api-status-dot-err" />}

      <span className="api-status-text">
        {isLoading
          ? "Updating..."
          : error
            ? error
            : lastUpdated
              ? `Updated ${formatTime(lastUpdated)}`
              : "Not connected"}
      </span>
    </div>
  );
}
