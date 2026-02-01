"use client";

import { createContext, useContext, useState, useEffect } from "react";

interface DeveloperModeContextType {
  isDeveloperMode: boolean;
  toggleDeveloperMode: () => void;
}

const DeveloperModeContext = createContext<
  DeveloperModeContextType | undefined
>(undefined);

const STORAGE_KEY = "ooozzy-developer-mode";

export const DeveloperModeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isDeveloperMode, setIsDeveloperMode] = useState<boolean>(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setIsDeveloperMode(stored === "true");
    }
  }, []);

  const toggleDeveloperMode = () => {
    setIsDeveloperMode((prev) => {
      const newValue = !prev;
      localStorage.setItem(STORAGE_KEY, String(newValue));
      return newValue;
    });
  };

  return (
    <DeveloperModeContext.Provider
      value={{ isDeveloperMode, toggleDeveloperMode }}
    >
      {children}
    </DeveloperModeContext.Provider>
  );
};

export const useDeveloperMode = (): DeveloperModeContextType => {
  const context = useContext(DeveloperModeContext);
  if (!context) {
    throw new Error(
      "useDeveloperMode must be used within a DeveloperModeProvider",
    );
  }
  return context;
};
