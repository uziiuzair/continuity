"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { isTauriContext } from "@/lib/db";
import { getSetting, setSetting } from "@/lib/db/settings";
import { useDatabase } from "./database-provider";

export type OnboardingStep = "welcome" | "api-key" | "mcp-status" | "complete";

interface OnboardingContextType {
  isOnboardingComplete: boolean;
  currentStep: OnboardingStep;
  isLoading: boolean;
  goToStep: (step: OnboardingStep) => void;
  completeOnboarding: () => Promise<void>;
  memoryCount: number;
}

const OnboardingContext = createContext<OnboardingContextType>({
  isOnboardingComplete: false,
  currentStep: "welcome",
  isLoading: true,
  goToStep: () => {},
  completeOnboarding: async () => {},
  memoryCount: 0,
});

const ONBOARDING_KEY = "onboarding_completed";

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { isReady } = useDatabase();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [isLoading, setIsLoading] = useState(true);
  const [memoryCount, setMemoryCount] = useState(0);

  // Check onboarding status once DB is ready
  useEffect(() => {
    async function checkOnboarding() {
      if (!isReady) return;

      if (!isTauriContext()) {
        setIsOnboardingComplete(true);
        setIsLoading(false);
        return;
      }

      try {
        const completed = await getSetting(ONBOARDING_KEY);
        if (completed === "true") {
          setIsOnboardingComplete(true);
        }
      } catch (err) {
        console.error("Failed to check onboarding status:", err);
      } finally {
        setIsLoading(false);
      }
    }

    checkOnboarding();
  }, [isReady]);

  // Check for existing memories (from MCP server used by other tools)
  useEffect(() => {
    async function checkMemories() {
      if (!isTauriContext() || isOnboardingComplete) return;

      try {
        const Database = (await import("@tauri-apps/plugin-sql")).default;
        const memDb = await Database.load("sqlite:memory.db");
        const result = await memDb.select<{ count: number }[]>(
          "SELECT COUNT(*) as count FROM memories WHERE archived_at IS NULL"
        );
        if (result.length > 0) {
          setMemoryCount(result[0].count);
        }
      } catch {
        // Memory DB might not exist yet — that's fine
        setMemoryCount(0);
      }
    }

    checkMemories();
  }, [isOnboardingComplete]);

  const goToStep = useCallback((step: OnboardingStep) => {
    setCurrentStep(step);
  }, []);

  const completeOnboarding = useCallback(async () => {
    if (!isTauriContext()) return;

    try {
      await setSetting(ONBOARDING_KEY, "true");
      setIsOnboardingComplete(true);
    } catch (err) {
      console.error("Failed to save onboarding status:", err);
    }
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        isOnboardingComplete,
        currentStep,
        isLoading,
        goToStep,
        completeOnboarding,
        memoryCount,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  return useContext(OnboardingContext);
}
