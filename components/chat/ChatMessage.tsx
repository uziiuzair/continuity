"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { messageVariants } from "@/lib/animations";
import type { Message } from "@/types";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

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
        <p className="text-base leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
      </div>
    </motion.div>
  ) : (
    <div className="w-full px-4 py-3 rounded-2xl rounded-bl-md select-text">
      <div
        className="prose prose-sm max-w-none text-xl text-black"
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
                    className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-sm text-black"
                    {...props}
                  >
                    {children}
                  </code>
                );
              }
              return (
                <code
                  className={cn(
                    "block bg-black/10 dark:bg-white/10 p-3 rounded-lg text-sm overflow-x-auto text-black",
                    className,
                  )}
                  {...props}
                >
                  {children}
                </code>
              );
            },
            pre: ({ children }) => (
              <pre className="bg-black/10 dark:bg-white/10 p-3 rounded-lg overflow-x-auto my-2 text-black">
                {children}
              </pre>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-inside my-2 space-y-1 text-black">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside text-xl my-2 space-y-1 text-black">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="text-xl text-black">{children}</li>
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
              <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-2 italic">
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
              <h3 className="text-base font-bold mt-2 mb-1">{children}</h3>
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
