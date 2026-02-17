"use client";

import { DocumentInfo } from "@/lib/db/threads";

interface DocumentCardProps {
  document: DocumentInfo;
  onClick: () => void;
}

export default function DocumentCard({ document, onClick }: DocumentCardProps) {
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <button
      onClick={onClick}
      className="document-card flex flex-col justify-between gap-4 w-full text-left group"
    >
      <div className="flex flex-col gap-1.5">
        <h3 className="text-sm font-medium text-(--text-primary) truncate group-hover:text-(--accent) transition-colors">
          {document.title}
        </h3>
        {document.preview && (
          <p className="text-xs text-(--text-secondary) line-clamp-2 leading-relaxed">
            {document.preview}
          </p>
        )}
      </div>

      <span className="text-[11px] text-(--text-secondary)/60">
        {formatRelativeTime(document.updatedAt)}
      </span>
    </button>
  );
}
