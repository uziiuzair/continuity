"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { messageVariants } from "@/lib/animations";
import type { Message } from "@/types";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: Message;
}

// Threshold for showing "Read more" button
const CHAR_THRESHOLD = 400;
const LINE_THRESHOLD = 6;

function isLongMessage(content: string): boolean {
  const lineCount = content.split("\n").length;
  return content.length > CHAR_THRESHOLD || lineCount > LINE_THRESHOLD;
}

function truncateContent(content: string): string {
  const lines = content.split("\n");

  // If too many lines, truncate by lines
  if (lines.length > LINE_THRESHOLD) {
    return lines.slice(0, LINE_THRESHOLD).join("\n") + "...";
  }

  // If too many characters, truncate by characters
  if (content.length > CHAR_THRESHOLD) {
    // Find a good break point (end of word or sentence)
    let breakPoint = CHAR_THRESHOLD;
    const nextSpace = content.indexOf(" ", CHAR_THRESHOLD);
    if (nextSpace !== -1 && nextSpace < CHAR_THRESHOLD + 50) {
      breakPoint = nextSpace;
    }
    return content.slice(0, breakPoint) + "...";
  }

  return content;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [isExpanded, setIsExpanded] = useState(false);

  const isLong = isUser && isLongMessage(message.content);
  const displayContent =
    isLong && !isExpanded ? truncateContent(message.content) : message.content;

  return isUser ? (
    <motion.div
      className="flex justify-end"
      variants={messageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
    >
      <div
        className={cn(
          "max-w-[80%] px-4 py-3 rounded-2xl rounded-br-md bg-[#f0eee6] select-text",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={isExpanded ? "expanded" : "collapsed"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="text-base leading-relaxed whitespace-pre-wrap"
          >
            {displayContent}
          </motion.p>
        </AnimatePresence>

        {isLong && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 text-sm text-stone-500 hover:text-stone-700 transition-colors"
          >
            {isExpanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>
    </motion.div>
  ) : (
    <div className="w-full px-4 py-3 rounded-2xl rounded-bl-md select-text">
      <div
        className={cn(
          "prose prose-sm max-w-none text-xl text-black",
          "prose-hr:my-10",
        )}
        style={{
          fontFamily: `var(--font-serif)`,
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => (
              <p className="leading-relaxed mb-2 last:mb-0">{children}</p>
            ),
            code: ({ className, children, ...props }) => {
              const isInline = !className;
              if (isInline) {
                return (
                  <code
                    className="px-1.5 py-0.5 rounded text-sm text-black"
                    {...props}
                  >
                    {children}
                  </code>
                );
              }
              return (
                <code
                  className={cn(
                    "block p-3 rounded-lg text-sm overflow-x-auto text-black",
                    className,
                  )}
                  {...props}
                >
                  {children}
                </code>
              );
            },
            pre: ({ children }) => (
              <pre className="bg-black/10! dark:bg-white/10 p-3 rounded-lg overflow-x-auto my-2 text-black">
                {children}
              </pre>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-inside my-2 pl-0 space-y-1 text-black">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside text-xl pl-0 my-2 space-y-1 text-black">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="text-xl text-black [&>p]:mt-0! [&>p]:mb-0! [&>p]:inline!">
                {children}
              </li>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                {children}
              </a>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-2 my-2 italic">
                {children}
              </blockquote>
            ),
            h1: ({ children }) => (
              <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-xl font-bold mt-2 mb-1">{children}</h3>
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
