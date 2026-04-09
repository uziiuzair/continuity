/**
 * WebSocket JSON-RPC Client
 *
 * Handles the connection to the Plugin Host and provides
 * request/response matching with timeouts.
 */
export declare class RPCClient {
    private ws;
    private url;
    private nextId;
    private pending;
    private notificationHandlers;
    private requestHandlers;
    private reconnectTimer;
    private shouldReconnect;
    constructor(url: string);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    /** Send an RPC request and wait for a response */
    request(method: string, params?: Record<string, unknown>): Promise<unknown>;
    /** Register a handler for incoming notifications from the host */
    onNotification(method: string, handler: (params: Record<string, unknown>) => void): void;
    /** Register a handler for incoming requests from the host (e.g., tool:execute) */
    onRequest(method: string, handler: (params: Record<string, unknown>) => Promise<unknown>): void;
    private handleMessage;
    private sendResponse;
    private sendError;
    private cleanup;
    private scheduleReconnect;
}
//# sourceMappingURL=client.d.ts.map