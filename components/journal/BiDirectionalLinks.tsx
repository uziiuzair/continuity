"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { isTauriContext } from "@/lib/db";
import { getLinksForEntry } from "@/lib/db/journal-links";
import { JournalLink } from "@/types/journal";

interface BiDirectionalLinksProps {
  journalDate: string;
  className?: string;
}

export default function BiDirectionalLinks({
  journalDate,
  className,
}: BiDirectionalLinksProps) {
  const [links, setLinks] = useState<JournalLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Load links when date changes
  useEffect(() => {
    const loadLinks = async () => {
      if (!isTauriContext()) return;

      setIsLoading(true);
      try {
        const fetchedLinks = await getLinksForEntry(journalDate);
        setLinks(fetchedLinks);
      } catch (error) {
        console.error("Failed to load journal links:", error);
        setLinks([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadLinks();
  }, [journalDate]);

  // Don't render if no links
  // if (links.length === 0 && !isLoading) {
  //   return null;
  // }

  return (
    <div className={cn("bi-directional-links max-w-5xl mx-auto", className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-(--text-secondary) hover:text-(--text-primary) transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className={cn(
            "size-4 transition-transform",
            isExpanded && "rotate-90",
          )}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m8.25 4.5 7.5 7.5-7.5 7.5"
          />
        </svg>
        <span>
          {links.length} linked item{links.length !== 1 ? "s" : ""}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-2 pl-6 space-y-1">
          {isLoading ? (
            <div className="text-xs text-(--text-secondary)">Loading...</div>
          ) : (
            links.map((link) => <LinkItem key={link.id} link={link} />)
          )}
        </div>
      )}
    </div>
  );
}

function LinkItem({ link }: { link: JournalLink }) {
  // Get icon based on link type
  const icon = {
    thread: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="size-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
        />
      </svg>
    ),
    artifact: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="size-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
        />
      </svg>
    ),
    space: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="size-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
        />
      </svg>
    ),
  };

  return (
    <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-black/5 cursor-pointer transition-colors">
      <span className="text-(--text-secondary)">
        {icon[link.linkedType] || icon.artifact}
      </span>
      <span className="text-sm text-(--text-primary) truncate">
        {link.linkedType}: {link.linkedId}
      </span>
      {link.linkType === "manual" && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
          manual
        </span>
      )}
    </div>
  );
}
