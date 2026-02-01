"use client";

import { cn } from "@/lib/utils";
import { SettingsPanel } from "./SettingsModal";

interface SettingsSidebarProps {
  activePanel: SettingsPanel;
  onPanelChange: (panel: SettingsPanel) => void;
}

const menuItems: { id: SettingsPanel; label: string }[] = [
  { id: "general", label: "General" },
  { id: "api-keys", label: "API Keys" },
  { id: "connectors", label: "Connectors" },
  { id: "developer", label: "Developer" },
];

export default function SettingsSidebar({
  activePanel,
  onPanelChange,
}: SettingsSidebarProps) {
  return (
    <div className="w-50 border-r border-(--border-color) py-4 shrink-0">
      <nav className="space-y-1 px-3">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onPanelChange(item.id)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
              activePanel === item.id
                ? "bg-black/5 text-(--text-primary) font-medium"
                : "text-(--text-secondary) hover:bg-black/5 hover:text-(--text-primary)",
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
