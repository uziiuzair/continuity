"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useOnboarding } from "@/providers/onboarding-provider";
import { isTauriContext } from "@/lib/db";
import { setAIConfig } from "@/lib/db/settings";
import { OPENAI_MODELS } from "@/lib/ai/openai";
import { ANTHROPIC_MODELS } from "@/lib/ai/anthropic";
import { AIProvider } from "@/types";
import { Select } from "@/components/atoms";

const PROVIDERS = [
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic" },
];

export default function ApiKeyStep() {
  const { goToStep } = useOnboarding();
  const [provider, setProvider] = useState<AIProvider>("anthropic");
  const [model, setModel] = useState(ANTHROPIC_MODELS[0].id);
  const [apiKey, setApiKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update model when provider changes
  useEffect(() => {
    const models = provider === "openai" ? OPENAI_MODELS : ANTHROPIC_MODELS;
    setModel(models[0].id);
  }, [provider]);

  const models = provider === "openai" ? OPENAI_MODELS : ANTHROPIC_MODELS;

  const handleContinue = async () => {
    if (!apiKey.trim() || !isTauriContext()) return;

    setIsSaving(true);
    setError(null);

    try {
      await setAIConfig({ provider, model, apiKey: apiKey.trim() });
      goToStep("mcp-status");
    } catch (err) {
      console.error("Failed to save API config:", err);
      setError("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6">
      {/* Step indicator */}
      <motion.div
        className="flex items-center justify-center gap-2 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="w-2 h-2 rounded-full bg-(--accent)" />
        <div className="w-8 h-px bg-(--border-color)" />
        <div className="w-2 h-2 rounded-full bg-(--border-color)/40" />
      </motion.div>

      {/* Header */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h2
          className="text-2xl font-normal mb-2 text-(--text-primary)"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Connect your AI
        </h2>
        <p className="text-sm text-(--text-secondary)">
          Bring your own key. It stays on your machine. Always.
        </p>
      </motion.div>

      {/* Form */}
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Select
          label="Provider"
          value={provider}
          onChange={(value) => setProvider(value as AIProvider)}
          options={PROVIDERS}
        />

        <Select
          label="Model"
          value={model}
          onChange={setModel}
          options={models}
        />

        <div>
          <label
            htmlFor="onboarding-api-key"
            className="block text-sm font-medium text-(--text-primary) mb-1.5"
          >
            API Key
          </label>
          <input
            id="onboarding-api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && apiKey.trim()) handleContinue();
            }}
            placeholder={`Paste your ${provider === "openai" ? "OpenAI" : "Anthropic"} API key`}
            className="w-full px-3 py-2.5 text-sm border border-(--border-color) rounded-md bg-(--background-color) text-(--text-primary) placeholder:text-(--text-secondary)/50 focus:outline-none focus:ring-2 focus:ring-(--accent) focus:border-transparent"
            autoFocus
          />
          <p className="mt-1.5 text-xs text-(--text-secondary)">
            {provider === "openai" ? (
              <>
                Get your key from{" "}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-(--accent) hover:underline"
                >
                  platform.openai.com
                </a>
              </>
            ) : (
              <>
                Get your key from{" "}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-(--accent) hover:underline"
                >
                  console.anthropic.com
                </a>
              </>
            )}
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="pt-4 flex items-center justify-between">
          <button
            onClick={() => goToStep("welcome")}
            className="text-sm text-(--text-secondary) hover:text-(--text-primary) transition-colors"
          >
            Back
          </button>

          <button
            onClick={handleContinue}
            disabled={!apiKey.trim() || isSaving}
            className="px-6 py-2.5 rounded-full text-sm font-medium text-white bg-(--accent) hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            {isSaving ? "Saving..." : "Continue"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
