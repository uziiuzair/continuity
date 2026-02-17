"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BriefingData } from "@/types/briefing";
import {
  getBriefingData,
  hasThisWeekTasks,
} from "@/lib/services/briefing-service";
import OnboardingView from "./OnboardingView";
import RightNowSection from "./RightNowSection";
import ThisWeekSection from "./ThisWeekSection";
import { isTauriContext } from "@/lib/db";
import { DashboardCard } from "@/components/atoms/dashboard-card";

interface HomeBriefingViewProps {
  onThreadClick: (threadId: string) => void;
  onStartChat: (message: string) => void;
}

/**
 * Loading skeleton for the briefing view
 */
function BriefingSkeleton() {
  return (
    <div className="w-full max-w-xl mx-auto px-4 animate-pulse">
      {/* Right Now skeleton */}
      <div className="mb-8">
        <div className="h-3 w-20 bg-(--border-color)/30 rounded mb-3" />
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="p-4 rounded-lg border border-(--border-color)/30 bg-white/30"
            >
              <div className="h-4 w-3/4 bg-(--border-color)/30 rounded mb-2" />
              <div className="h-3 w-1/2 bg-(--border-color)/20 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* This Week skeleton */}
      <div>
        <div className="h-3 w-20 bg-(--border-color)/30 rounded mb-3" />
        <div className="p-4 rounded-lg border border-(--border-color)/30 bg-white/30">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-(--border-color)/30" />
                <div className="h-3 flex-1 bg-(--border-color)/20 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Empty state when user has threads but no active work
 */
function EmptyBriefing({
  onStartChat,
}: {
  onStartChat: (message: string) => void;
}) {
  return (
    <motion.div
      className="w-full max-w-xl mx-auto px-4 text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <p className="text-(--text-secondary) text-sm mb-4">
        No active threads. Start a conversation to get going.
      </p>
      <button
        onClick={() => onStartChat("What are you working on today?")}
        className="px-6 py-2 rounded-full text-sm border transition-all duration-200
                   hover:bg-[#f5f4ed] border-(--border-color)/50 text-(--text-secondary)
                   focus:outline-none focus:ring-2 focus:ring-(--accent)"
      >
        Start a conversation
      </button>
    </motion.div>
  );
}

export default function HomeBriefingView({
  onThreadClick,
  onStartChat,
}: HomeBriefingViewProps) {
  const [data, setData] = useState<BriefingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadBriefing() {
      if (!isTauriContext()) {
        setIsLoading(false);
        return;
      }

      try {
        const briefingData = await getBriefingData();
        setData(briefingData);
      } catch (error) {
        console.error("Failed to load briefing data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadBriefing();
  }, []);

  // Loading state
  if (isLoading) {
    return <BriefingSkeleton />;
  }

  // New user - show onboarding
  if (!data?.hasData) {
    return <OnboardingView onStartChat={onStartChat} />;
  }

  // User has data but nothing to show in briefing
  const hasRightNow = data.rightNow.length > 0;
  const hasWeekTasks = hasThisWeekTasks(data.thisWeek);

  if (!hasRightNow && !hasWeekTasks) {
    return <EmptyBriefing onStartChat={onStartChat} />;
  }

  // Returning user - show briefing
  return (
    <motion.div
      className="w-full mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence mode="sync">
        <div className="space-y-8 w-full">
          <div className="grid grid-cols-1 px-4 max-w-3xl 2xl:max-w-7xl mx-auto 2xl:grid-cols-2 gap-6">
            <DashboardCard>
              <RightNowSection
                threads={data.rightNow}
                onThreadClick={onThreadClick}
              />
            </DashboardCard>

            <DashboardCard>
              <ThisWeekSection
                tasks={data.thisWeek}
                onTaskClick={onThreadClick}
              />
            </DashboardCard>
          </div>
        </div>
      </AnimatePresence>
    </motion.div>
  );
}
