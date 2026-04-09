/**
 * Shared types for the Continuity Plugin SDK.
 */
export interface RPCRequest {
    jsonrpc: "2.0";
    id: number | string;
    method: string;
    params?: Record<string, unknown>;
}
export interface RPCResponse {
    jsonrpc: "2.0";
    id: number | string;
    result?: unknown;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
}
export interface RPCNotification {
    jsonrpc: "2.0";
    method: string;
    params?: Record<string, unknown>;
}
export type RPCMessage = RPCRequest | RPCResponse | RPCNotification;
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: "object";
        properties: Record<string, unknown>;
        required?: string[];
    };
    handler: (args: Record<string, unknown>) => Promise<ToolResult>;
}
export interface ToolResult {
    content: string;
    isError?: boolean;
}
export interface PanelOptions {
    slot: "sidebar" | "settings" | "statusbar";
    label: string;
    icon: string;
    url: string;
}
export interface PromptOptions {
    id: string;
    content: string;
    position: "system" | "context";
}
export interface NotificationOptions {
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "error";
}
export interface PluginOptions {
    hostUrl?: string;
    authToken?: string;
    pluginId?: string;
}
//# sourceMappingURL=types.d.ts.map