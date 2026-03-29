export interface CallbackServerOptions {
    /**
     * Port to listen on (0 for random port)
     */
    port?: number;
    /**
     * Host to bind to (default: 127.0.0.1)
     */
    host?: string;
    /**
     * Timeout in milliseconds (default: 60000)
     */
    timeout?: number;
}
export interface CallbackResult {
    code: string;
    state: string;
}
/**
 * Create a local HTTP server to handle OAuth callback
 * Based on gitlab-lsp callback server implementation
 */
export declare class CallbackServer {
    private options;
    private server;
    private resolveCallback?;
    private rejectCallback?;
    private timeoutHandle?;
    constructor(options?: CallbackServerOptions);
    /**
     * Start the server
     */
    start(): Promise<void>;
    /**
     * Start the server and wait for callback
     * @returns Promise that resolves with the callback result
     */
    waitForCallback(): Promise<CallbackResult>;
    /**
     * Get the actual port the server is listening on
     */
    getPort(): number;
    /**
     * Get the callback URL
     */
    getCallbackUrl(): string;
    /**
     * Cleanup resources
     */
    private cleanup;
    /**
     * Force close the server
     */
    close(): Promise<void>;
}
//# sourceMappingURL=callback-server.d.ts.map