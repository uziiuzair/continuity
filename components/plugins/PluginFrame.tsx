"use client";

/**
 * PluginFrame — Sandboxed iframe renderer for plugin UI panels.
 *
 * Renders a plugin's UI in a sandboxed iframe with restricted CSP.
 * Communication between the plugin UI and the host app happens
 * via postMessage (future: structured bridge API).
 */

import { useRef, useEffect, useState } from "react";

interface PluginFrameProps {
  url: string;
  pluginId: string;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function PluginFrame({
  url,
  pluginId,
  title,
  className,
  style,
}: PluginFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => setIsLoading(false);
    const handleError = () => {
      setIsLoading(false);
      setError("Failed to load plugin UI");
    };

    iframe.addEventListener("load", handleLoad);
    iframe.addEventListener("error", handleError);

    return () => {
      iframe.removeEventListener("load", handleLoad);
      iframe.removeEventListener("error", handleError);
    };
  }, [url]);

  // Handle postMessage from the plugin iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from our iframe
      if (iframeRef.current?.contentWindow !== event.source) return;

      // TODO: Implement structured bridge API
      // For now, just log plugin messages
      console.log(`[Plugin:${pluginId}] postMessage:`, event.data);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [pluginId]);

  if (error) {
    return (
      <div
        className={className}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--mantine-color-dimmed)",
          padding: 20,
          ...style,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 14, marginBottom: 4 }}>Plugin UI unavailable</p>
          <p style={{ fontSize: 12, opacity: 0.7 }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ position: "relative", ...style }}>
      {isLoading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--mantine-color-dimmed)",
            fontSize: 13,
          }}
        >
          Loading plugin...
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={url}
        title={title || `Plugin: ${pluginId}`}
        sandbox="allow-scripts allow-same-origin"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          opacity: isLoading ? 0 : 1,
          transition: "opacity 0.2s",
        }}
      />
    </div>
  );
}
