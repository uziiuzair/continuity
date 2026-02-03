"use client";

import { JournalProvider } from "@/providers/journal-provider";
import JournalPage from "@/components/journal/JournalPage";

export default function JournalRoute() {
  return (
    <JournalProvider>
      <JournalPage />
    </JournalProvider>
  );
}
