"use client";

import { DocumentsProvider } from "@/providers/documents-provider";
import DocumentsPage from "@/components/documents/DocumentsPage";

export default function DocumentsRoute() {
  return (
    <DocumentsProvider>
      <DocumentsPage />
    </DocumentsProvider>
  );
}
