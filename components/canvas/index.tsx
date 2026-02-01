"use client";
import { canvasVariants } from "@/lib/animations";
import { cn } from "@/lib/utils";
import { useChat } from "@/providers/chat-provider";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

export const Editor = dynamic(() => import("./editor"), { ssr: false });

export const Canvas = () => {
  const { canvasIsOpen, setCanvasIsOpen } = useChat();

  return (
    <>
      <button
        onClick={() => setCanvasIsOpen(!canvasIsOpen)}
        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-black/5 transition-colors cursor-pointer fixed top-4 right-4 z-60"
        aria-label={canvasIsOpen ? "Collapse sidebar" : "Expand sidebar"}
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
          style={{
            transform: canvasIsOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.3s ease",
          }}
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <motion.aside
        className={cn(
          "h-screen border-l border-(--border-color)! overflow-y-auto overflow-x-hidden shrink-0 transition-all duration-300",
          canvasIsOpen ? "border-(--border-color)! p-6" : "border-transparent",
        )}
        variants={canvasVariants}
        initial={false}
        animate={canvasIsOpen ? "expanded" : "collapsed"}
      >
        <div className="w-[calc(65vw-48px)]">
          <Editor />
        </div>
      </motion.aside>
    </>
  );
};
