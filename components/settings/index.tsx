"use client";

import { useState } from "react";
import SettingsModal from "./SettingsModal";

export function useSettings() {
  const [isOpen, setIsOpen] = useState(false);

  const openSettings = () => setIsOpen(true);
  const closeSettings = () => setIsOpen(false);

  return {
    isOpen,
    openSettings,
    closeSettings,
  };
}

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Settings({ isOpen, onClose }: SettingsProps) {
  return <SettingsModal isOpen={isOpen} onClose={onClose} />;
}
