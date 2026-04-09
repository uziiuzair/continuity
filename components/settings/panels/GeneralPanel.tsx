"use client";

import { useState, useEffect } from "react";
import { isTauriContext } from "@/lib/db";
import { getSetting, setSetting } from "@/lib/db/settings";

const SETTING_KEYS = {
  nickname: "user_nickname",
  occupation: "user_occupation",
  about: "user_about",
  customInstructions: "user_custom_instructions",
};

export default function GeneralPanel() {
  const [nickname, setNickname] = useState("");
  const [occupation, setOccupation] = useState("");
  const [about, setAbout] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );

  useEffect(() => {
    const loadSettings = async () => {
      if (!isTauriContext()) {
        setIsLoading(false);
        return;
      }

      try {
        const [nick, occ, abt, inst] = await Promise.all([
          getSetting(SETTING_KEYS.nickname),
          getSetting(SETTING_KEYS.occupation),
          getSetting(SETTING_KEYS.about),
          getSetting(SETTING_KEYS.customInstructions),
        ]);

        if (nick) setNickname(nick);
        if (occ) setOccupation(occ);
        if (abt) setAbout(abt);
        if (inst) setCustomInstructions(inst);
      } catch (error) {
        console.error("Failed to load general settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!isTauriContext()) return;

    setIsSaving(true);
    setSaveStatus("idle");

    try {
      await Promise.all([
        setSetting(SETTING_KEYS.nickname, nickname.trim()),
        setSetting(SETTING_KEYS.occupation, occupation.trim()),
        setSetting(SETTING_KEYS.about, about.trim()),
        setSetting(SETTING_KEYS.customInstructions, customInstructions.trim()),
      ]);

      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Failed to save general settings:", error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isTauriContext()) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-medium text-(--text-primary) mb-2">
            General
          </h3>
          <p className="text-sm text-(--text-secondary)">
            General settings require the desktop app.
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
            General
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
          Personal Profile
        </h3>
        <p className="text-sm text-(--text-secondary)">
          Help Continuity understand who you are for more personalized
          responses.
        </p>
      </div>

      <div className="space-y-4">
        {/* Nickname */}
        <div>
          <label
            htmlFor="nickname"
            className="block text-sm font-medium text-(--text-primary) mb-1.5"
          >
            Your Nickname
          </label>
          <input
            id="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="What should Continuity call you?"
            className="w-full px-3 py-2 text-sm border border-(--border-color) rounded-md bg-(--background-color) text-(--text-primary) placeholder:text-(--text-secondary)/50 focus:outline-none focus:ring-2 focus:ring-(--accent-color) focus:border-transparent"
          />
        </div>

        {/* Occupation */}
        <div>
          <label
            htmlFor="occupation"
            className="block text-sm font-medium text-(--text-primary) mb-1.5"
          >
            Your Occupation
          </label>
          <input
            id="occupation"
            type="text"
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            placeholder="e.g. Software Engineer, Designer, Student"
            className="w-full px-3 py-2 text-sm border border-(--border-color) rounded-md bg-(--background-color) text-(--text-primary) placeholder:text-(--text-secondary)/50 focus:outline-none focus:ring-2 focus:ring-(--accent-color) focus:border-transparent"
          />
        </div>

        {/* More about you */}
        <div>
          <label
            htmlFor="about"
            className="block text-sm font-medium text-(--text-primary) mb-1.5"
          >
            More About You
          </label>
          <textarea
            id="about"
            rows={3}
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder="Share anything that helps Continuity assist you better..."
            className="w-full px-3 py-2 text-sm border border-(--border-color) rounded-md bg-(--background-color) text-(--text-primary) placeholder:text-(--text-secondary)/50 focus:outline-none focus:ring-2 focus:ring-(--accent-color) focus:border-transparent resize-none"
          />
        </div>

        {/* Divider */}
        <div className="border-t border-(--border-color) my-6" />

        {/* Custom Instructions */}
        <div>
          <label
            htmlFor="customInstructions"
            className="block text-sm font-medium text-(--text-primary) mb-1.5"
          >
            Custom Instructions
          </label>
          <textarea
            id="customInstructions"
            rows={5}
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="e.g. Always respond concisely. Prefer TypeScript examples. Explain like I'm a senior dev."
            className="w-full px-3 py-2 text-sm border border-(--border-color) rounded-md bg-(--background-color) text-(--text-primary) placeholder:text-(--text-secondary)/50 focus:outline-none focus:ring-2 focus:ring-(--accent-color) focus:border-transparent resize-none"
          />
          <p className="mt-1.5 text-xs text-(--text-secondary)">
            These instructions will be included in every conversation.
          </p>
        </div>

        {/* Status messages */}
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
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-(--accent) rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
