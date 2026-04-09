"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useOnboarding } from "@/providers/onboarding-provider";
import WelcomeStep from "./WelcomeStep";
import ApiKeyStep from "./ApiKeyStep";
import McpStatusStep from "./McpStatusStep";

export default function OnboardingFlow() {
  const { currentStep, isLoading } = useOnboarding();

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--background-color)">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-(--text-secondary) text-sm"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--background-color) overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.015]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        {currentStep === "welcome" && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 w-full"
          >
            <WelcomeStep />
          </motion.div>
        )}

        {currentStep === "api-key" && (
          <motion.div
            key="api-key"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 w-full"
          >
            <ApiKeyStep />
          </motion.div>
        )}

        {currentStep === "mcp-status" && (
          <motion.div
            key="mcp-status"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 w-full"
          >
            <McpStatusStep />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
