"use client";

import { motion } from "framer-motion";
import { useOnboarding } from "@/providers/onboarding-provider";

const pillars = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.5 4.5-3 6s-2.5 3.5-4 5c-1.5-1.5-2.5-3.5-4-5s-3-3.5-3-6a7 7 0 0 1 7-7z" />
        <circle cx="12" cy="9" r="2.5" />
        <path d="M8 21h8" />
      </svg>
    ),
    title: "Universal Memory",
    description: "Every conversation, every tool, one brain",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        <circle cx="12" cy="16" r="1" />
      </svg>
    ),
    title: "Fully Local",
    description: "Your data never leaves your machine",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3 6h.01" />
        <path d="M3 12h.01" />
        <path d="M3 18h.01" />
        <path d="M2 6a1 1 0 1 0 2 0 1 1 0 1 0-2 0" />
        <path d="M2 12a1 1 0 1 0 2 0 1 1 0 1 0-2 0" />
        <path d="M2 18a1 1 0 1 0 2 0 1 1 0 1 0-2 0" />
      </svg>
    ),
    title: "Always In-Sync",
    description: "Claude Code, Cursor, and more — all connected",
  },
];

export default function WelcomeStep() {
  const { goToStep } = useOnboarding();

  return (
    <div className="max-w-lg mx-auto px-6 text-center">
      {/* Logo / Brand Mark */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="mb-8"
      >
        <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-(--accent) to-[#c45a3a] flex items-center justify-center shadow-lg shadow-(--accent)/20">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v4" />
            <path d="M12 19v4" />
            <path d="M1 12h4" />
            <path d="M19 12h4" />
            <path d="M4.22 4.22l2.83 2.83" />
            <path d="M16.95 16.95l2.83 2.83" />
            <path d="M4.22 19.78l2.83-2.83" />
            <path d="M16.95 7.05l2.83-2.83" />
          </svg>
        </div>
      </motion.div>

      {/* Hero Text */}
      <motion.h1
        className="text-4xl font-normal mb-3 text-(--text-primary)"
        style={{ fontFamily: "var(--font-serif)" }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Your knowledge base<span className="text-(--accent)">.</span>
      </motion.h1>

      <motion.p
        className="text-(--text-secondary) text-base mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Everything in-sync. On your computer. Your privacy.
      </motion.p>

      <motion.p
        className="text-(--text-secondary)/50 text-sm mb-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
      >
        Continuity builds a universal knowledge base from every conversation,
        across every tool you use.
      </motion.p>

      {/* Three Pillars */}
      <motion.div
        className="grid grid-cols-3 gap-4 mb-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {pillars.map((pillar, index) => (
          <motion.div
            key={pillar.title}
            className="p-4 rounded-xl border border-(--border-color)/40 bg-white/40"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 + index * 0.08 }}
          >
            <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-(--accent)/10 flex items-center justify-center text-(--accent)">
              {pillar.icon}
            </div>
            <h3 className="text-sm font-medium text-(--text-primary) mb-1">
              {pillar.title}
            </h3>
            <p className="text-xs text-(--text-secondary)/70 leading-relaxed">
              {pillar.description}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* CTA */}
      <motion.button
        onClick={() => goToStep("api-key")}
        className="px-8 py-3 rounded-full text-sm font-medium text-white bg-(--accent) hover:opacity-90 transition-opacity shadow-md shadow-(--accent)/20"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        Set up your workspace
      </motion.button>
    </div>
  );
}
