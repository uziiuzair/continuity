"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import { Canvas } from "@/components/canvas";
import { useView } from "@/providers/view-provider";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { sidebarExpanded, setSidebarExpanded } = useView();

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          isExpanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        />
        <main className="flex-1 overflow-hidden">{children}</main>
        <Canvas />
      </div>
    </>
  );
}
