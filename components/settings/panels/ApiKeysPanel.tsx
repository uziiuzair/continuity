"use client";

import { useState, useEffect } from "react";
import { isTauriContext } from "@/lib/db";
import { getAIConfig, setAIConfig, getSetting, setSetting } from "@/lib/db/settings";
import { OPENAI_MODELS } from "@/lib/ai/openai";
import { ANTHROPIC_MODELS } from "@/lib/ai/anthropic";
import { AIProvider } from "@/types";
import { Select } from "@/components/atoms";

const PROVIDERS = [
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic" },
];

export default function ApiKeysPanel() {
  const [provider, setProvider] = useState<AIProvider>("openai");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [tavilyApiKey, setTavilyApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );

  // Load existing config on mount
  useEffect(() => {
    const loadConfig = async () => {
      if (!isTauriContext()) {
        setIsLoading(false);
        return;
      }

      try {
        const config = await getAIConfig();
        if (config) {
          setProvider(config.provider);
          setModel(config.model);
          setApiKey(config.apiKey);
        } else {
          // Set default model for initial provider
          setModel(OPENAI_MODELS[0].id);
        }

        // Load Tavily API key
        const tavily = await getSetting("tavily_api_key");
        if (tavily) {
          setTavilyApiKey(tavily);
        }
      } catch (error) {
        console.error("Failed to load AI config:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  // Update model when provider changes
  useEffect(() => {
    const models = provider === "openai" ? OPENAI_MODELS : ANTHROPIC_MODELS;
    // Only reset model if current model doesn't belong to new provider
    const currentProviderModels = models.map((m) => m.id);
    if (!currentProviderModels.includes(model)) {
      setModel(models[0].id);
    }
  }, [provider, model]);

  const handleSave = async () => {
    if (!isTauriContext()) return;

    setIsSaving(true);
    setSaveStatus("idle");

    try {
      await setAIConfig({
        provider,
        model,
        apiKey,
      });

      // Save Tavily API key if provided
      if (tavilyApiKey.trim()) {
        await setSetting("tavily_api_key", tavilyApiKey.trim());
      }

      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Failed to save AI config:", error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  const models = provider === "openai" ? OPENAI_MODELS : ANTHROPIC_MODELS;

  if (!isTauriContext()) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-medium text-(--text-primary) mb-2">
            API Keys
          </h3>
          <p className="text-sm text-(--text-secondary)">
            API key configuration requires the desktop app.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-medium text-(--text-primary) mb-2">
            API Keys
          </h3>
          <p className="text-sm text-(--text-secondary)">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium text-(--text-primary) mb-2">
          API Keys
        </h3>
        <p className="text-sm text-(--text-secondary)">
          Configure your AI provider to enable chat responses.
        </p>
      </div>

      <div className="space-y-4">
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
        {/* API Key input */}
        <div>
          <label
            htmlFor="apiKey"
            className="block text-sm font-medium text-(--text-primary) mb-1.5"
          >
            API Key
          </label>
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={`Enter your ${provider === "openai" ? "OpenAI" : "Anthropic"} API key`}
            className="w-full px-3 py-2 text-sm border border-(--border-color) rounded-md bg-(--background-color) text-(--text-primary) placeholder:text-(--text-secondary)/50 focus:outline-none focus:ring-2 focus:ring-(--accent-color) focus:border-transparent"
          />
          <p className="mt-1.5 text-xs text-(--text-secondary)">
            {provider === "openai" ? (
              <>
                Get your API key from{" "}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-(--accent-color) hover:underline"
                >
                  platform.openai.com
                </a>
              </>
            ) : (
              <>
                Get your API key from{" "}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-(--accent-color) hover:underline"
                >
                  console.anthropic.com
                </a>
              </>
            )}
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-(--border-color) my-6" />

        {/* Web Search Section */}
        <div>
          <h4 className="text-sm font-medium text-(--text-primary) mb-3">
            Web Search (Optional)
          </h4>
          <p className="text-xs text-(--text-secondary) mb-3">
            Enable web search capabilities for real-time information access.
          </p>
        </div>

        {/* Tavily API Key input */}
        <div>
          <label
            htmlFor="tavilyApiKey"
            className="block text-sm font-medium text-(--text-primary) mb-1.5"
          >
            Tavily API Key
          </label>
          <input
            id="tavilyApiKey"
            type="password"
            value={tavilyApiKey}
            onChange={(e) => setTavilyApiKey(e.target.value)}
            placeholder="Enter your Tavily API key (optional)"
            className="w-full px-3 py-2 text-sm border border-(--border-color) rounded-md bg-(--background-color) text-(--text-primary) placeholder:text-(--text-secondary)/50 focus:outline-none focus:ring-2 focus:ring-(--accent-color) focus:border-transparent"
          />
          <p className="mt-1.5 text-xs text-(--text-secondary)">
            Get your free API key from{" "}
            <a
              href="https://tavily.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-(--accent-color) hover:underline"
            >
              tavily.com
            </a>
            {" "}(1000 searches/month free)
          </p>
        </div>

        {/* Status message */}
        {saveStatus === "success" && (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="size-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m4.5 12.75 6 6 9-13.5"
              />
            </svg>
            Settings saved successfully
          </div>
        )}
        {saveStatus === "error" && (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="size-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
            Failed to save. Please try again.
          </div>
        )}

        {/* Save button */}
        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={isSaving || !apiKey.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-(--accent) rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
