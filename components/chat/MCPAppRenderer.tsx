"use client";

import { useCallback, useMemo, useState } from "react";
import { AppRenderer } from "@mcp-ui/client";
import type { AppRendererProps } from "@mcp-ui/client";
import { MCPManager } from "@/lib/mcp/manager";

/**
 * Inline sandbox proxy for @mcp-ui/client v6+ AppFrame.
 *
 * Served as a blob: URL to avoid network requests and Tauri WebView
 * static-file issues. Speaks the v6 JSON-RPC protocol:
 * - Signals readiness via { method: "ui/notifications/sandbox-proxy-ready" }
 * - Receives HTML via "ui/notifications/sandbox-resource-ready" notification
 * - Creates inner iframe with srcdoc, relays JSON-RPC messages bidirectionally
 */
const PROXY_HTML = `<!DOCTYPE html>
<html><head><style>
html,body{margin:0;height:100vh;width:100vw}
body{display:flex;flex-direction:column}
iframe{background:transparent;border:none;padding:0;overflow:hidden;flex-grow:1}
</style></head><body><script>
var inner=null,ready=false,buf=[];
function flush(){if(!inner||!inner.contentWindow)return;while(buf.length)inner.contentWindow.postMessage(buf.shift(),"*")}
window.addEventListener("message",function(e){
  if(e.source===window.parent){
    var d=e.data;
    if(d&&d.method==="ui/notifications/sandbox-resource-ready"){
      var html=(d.params||{}).html;
      if(typeof html==="string"){
        inner=document.createElement("iframe");
        inner.style="width:100%;height:100%;border:none";
        inner.setAttribute("sandbox","allow-scripts");
        inner.srcdoc=html;
        inner.onload=function(){ready=true;flush()};
        document.body.appendChild(inner);
      }
      return;
    }
    if(inner&&ready)inner.contentWindow.postMessage(d,"*");
    else buf.push(d);
  }else if(inner&&e.source===inner.contentWindow){
    window.parent.postMessage(e.data,"*");
  }
});
window.parent.postMessage({method:"ui/notifications/sandbox-proxy-ready"},"*");
<\/script></body></html>`;

let _blobUrl: URL | null = null;
function getSandboxUrl(): URL {
  if (!_blobUrl) {
    const blob = new Blob([PROXY_HTML], { type: "text/html" });
    _blobUrl = new URL(URL.createObjectURL(blob));
  }
  return _blobUrl;
}

interface MCPAppRendererProps {
  /** Pre-fetched HTML content for the MCP App */
  html: string;
  /** Short tool name (without serverId prefix) */
  toolName: string;
  /** Server ID for proxying tool/resource calls back */
  serverId: string;
  /** Tool input arguments (passed to the app) */
  toolInput?: Record<string, unknown>;
  /** Tool execution result text */
  toolResultText?: string;
}

export default function MCPAppRenderer({
  html,
  toolName,
  serverId,
  toolInput,
  toolResultText,
}: MCPAppRendererProps) {
  const [error, setError] = useState<string | null>(null);
  const sandboxUrl = useMemo(() => getSandboxUrl(), []);

  const handleCallTool: AppRendererProps["onCallTool"] = useCallback(
    async (params) => {
      const qualifiedName = `${serverId}__${params.name}`;
      const result = await MCPManager.getInstance().callTool(
        qualifiedName,
        (params.arguments ?? {}) as Record<string, unknown>,
      );
      return result as Awaited<
        ReturnType<NonNullable<AppRendererProps["onCallTool"]>>
      >;
    },
    [serverId],
  );

  const handleReadResource: AppRendererProps["onReadResource"] = useCallback(
    async (params) => {
      const result = await MCPManager.getInstance().readResource(
        serverId,
        params.uri,
      );
      return result as Awaited<
        ReturnType<NonNullable<AppRendererProps["onReadResource"]>>
      >;
    },
    [serverId],
  );

  const handleOpenLink: AppRendererProps["onOpenLink"] = useCallback(
    async (params) => {
      const url = params.url;
      try {
        const parsed = new URL(url);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      } catch {
        console.warn("[MCPAppRenderer] Invalid URL from app:", url);
      }
      return {};
    },
    [],
  );

  const handleError = useCallback((err: Error) => {
    console.error("[MCPAppRenderer] Error:", err.message);
    setError(err.message);
  }, []);

  if (error) {
    return (
      <div className="mt-2 rounded-lg border border-red-200/50 bg-red-50/30 px-3 py-2 text-xs text-red-400">
        MCP App error: {error}
      </div>
    );
  }

  const toolResult = toolResultText
    ? { content: [{ type: "text" as const, text: toolResultText }] }
    : undefined;

  return (
    <div className="mt-2 rounded-lg border border-stone-200/60 overflow-hidden min-h-[120px] [&>iframe]:block! [&>iframe]:w-full! [&>iframe]:h-full!">
      <AppRenderer
        sandbox={{ url: sandboxUrl }}
        toolName={toolName}
        html={html}
        toolInput={toolInput}
        toolResult={toolResult}
        onCallTool={handleCallTool}
        onReadResource={handleReadResource}
        onOpenLink={handleOpenLink}
        onError={handleError}
      />
    </div>
  );
}
