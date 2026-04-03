"use client";

import { Dialog, DialogPanel } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import SettingsSidebar from "./SettingsSidebar";
import GeneralPanel from "./panels/GeneralPanel";
import ApiKeysPanel from "./panels/ApiKeysPanel";
import ConnectorsPanel from "./panels/ConnectorsPanel";
import DeveloperPanel from "./panels/DeveloperPanel";
import VaultPanel from "./panels/VaultPanel";

export type SettingsPanel = "general" | "api-keys" | "connectors" | "vault" | "developer";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activePanel, setActivePanel] = useState<SettingsPanel>("general");
  // Key to force panel remount when modal opens
  const [mountKey, setMountKey] = useState(0);

  // Increment key when modal opens to force fresh data load
  useEffect(() => {
    if (isOpen) {
      setMountKey((k) => k + 1);
    }
  }, [isOpen]);

  const renderPanel = () => {
    switch (activePanel) {
      case "general":
        return <GeneralPanel key={mountKey} />;
      case "api-keys":
        return <ApiKeysPanel key={mountKey} />;
      case "connectors":
        return <ConnectorsPanel key={mountKey} />;
      case "vault":
        return <VaultPanel key={mountKey} />;
      case "developer":
        return <DeveloperPanel key={mountKey} />;
      default:
        return <GeneralPanel key={mountKey} />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog
          static
          open={isOpen}
          onClose={onClose}
          className="relative z-50"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Modal container */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <DialogPanel className="w-4xl h-150 bg-(--background-color) rounded-lg shadow-xl border border-(--border-color) flex overflow-hidden">
                {/* Sidebar */}
                <SettingsSidebar
                  activePanel={activePanel}
                  onPanelChange={setActivePanel}
                />

                {/* Content Area */}
                <div className="flex-1 flex flex-col">
                  {/* Header */}
                  <div className="h-14 flex items-center justify-between px-6 border-b border-(--border-color)">
                    <h2 className="text-lg font-medium text-(--text-primary)">
                      Settings
                    </h2>
                    <button
                      onClick={onClose}
                      className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-black/5 transition-colors"
                      aria-label="Close settings"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 6L6 18" />
                        <path d="M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Panel Content */}
                  <div className="flex-1 overflow-y-auto p-6">
                    {renderPanel()}
                  </div>
                </div>
              </DialogPanel>
            </motion.div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
