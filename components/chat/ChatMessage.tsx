"use client";

import { useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { messageVariants } from "@/lib/animations";
import type { Message } from "@/types";
import { cn } from "@/lib/utils";
import ToolCallsBlock from "./ToolCallsBlock";

const MCPAppRenderer = lazy(() => import("./MCPAppRenderer"));

/** Extract short tool name from qualified "serverId__toolName" format */
function extractToolName(qualifiedName: string): string {
  const separatorIndex = qualifiedName.indexOf("__");
  if (separatorIndex === -1) return qualifiedName;
  return qualifiedName.slice(separatorIndex + 2);
}

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

/**
 * Parse :::thinking blocks from message content.
 * Returns { thinking, body } where thinking is the collapsible part.
 */
function parseThinkingBlock(content: string): {
  thinking: string | null;
  body: string;
} {
  const match = content.match(/^:::thinking\n([\s\S]*?)\n:::\s*/);
  if (match) {
    return {
      thinking: match[1].trim(),
      body: content.slice(match[0].length).trim(),
    };
  }
  return { thinking: null, body: content };
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [isExpanded, setIsExpanded] = useState(false);
  const [thinkingOpen, setThinkingOpen] = useState(false);

  const { thinking, body: messageBody } = isUser
    ? { thinking: null, body: message.content }
    : parseThinkingBlock(message.content);

  const isLong = isUser && isLongMessage(message.content);
  const displayContent =
    isLong && !isExpanded ? truncateContent(message.content) : messageBody;

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
      {/* Collapsible thinking block */}
      {thinking && (
        <div className="mb-3">
          <button
            onClick={() => setThinkingOpen(!thinkingOpen)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-500 transition-colors cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className={cn("size-3 transition-transform", thinkingOpen && "rotate-90")}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
            Thinking
          </button>
          <AnimatePresence>
            {thinkingOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400 pl-[18px] whitespace-pre-wrap">
                  {thinking}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Tool calls block */}
      {message.metadata?.toolCalls && message.metadata.toolCalls.length > 0 && (
        <ToolCallsBlock toolCalls={message.metadata.toolCalls} />
      )}

      {/* MCP App interactive widgets — rendered prominently at message level */}
      {message.metadata?.toolCalls
        ?.filter((tc) => tc.mcpAppHtml && tc.mcpAppServerId)
        .map((tc) => (
          <div key={`mcp-app-${tc.id}`} className="mb-3">
            <Suspense
              fallback={
                <div className="rounded-lg border border-stone-200/60 bg-stone-50/50 px-3 py-4 text-xs text-slate-400">
                  Loading interactive UI...
                </div>
              }
            >
              <MCPAppRenderer
                html={tc.mcpAppHtml!}
                toolName={extractToolName(tc.name)}
                serverId={tc.mcpAppServerId!}
                toolInput={tc.arguments}
                toolResultText={tc.result}
              />
            </Suspense>
          </div>
        ))}

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
          {displayContent}
        </ReactMarkdown>
      </div>
    </div>
  );
}
