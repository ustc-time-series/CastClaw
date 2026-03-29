import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
/**
 * Create a local HTTP server to handle OAuth callback
 * Based on gitlab-lsp callback server implementation
 */
export class CallbackServer {
    options;
    server;
    resolveCallback;
    rejectCallback;
    timeoutHandle;
    constructor(options = {}) {
        this.options = options;
        this.server = Fastify({
            logger: false,
        });
        // Register rate limiting (30 requests per 60 seconds)
        this.server.register(rateLimit, {
            max: 30,
            timeWindow: 60000,
        });
        // Setup callback route
        this.server.get('/callback', async (request, reply) => {
            const { code, state, error, error_description } = request.query;
            if (error) {
                const errorMsg = error_description || error;
                this.rejectCallback?.(new Error(`OAuth error: ${errorMsg}`));
                await reply.type('text/html').send(`
          <!DOCTYPE html>
          <html>
            <head><title>Authentication Failed</title></head>
            <body>
              <h1>Authentication Failed</h1>
              <p>${errorMsg}</p>
              <p>You can close this window.</p>
            </body>
          </html>
        `);
                this.cleanup();
                return;
            }
            if (!code || !state) {
                this.rejectCallback?.(new Error('Missing code or state parameter'));
                await reply.type('text/html').send(`
          <!DOCTYPE html>
          <html>
            <head><title>Authentication Failed</title></head>
            <body>
              <h1>Authentication Failed</h1>
              <p>Missing required parameters.</p>
              <p>You can close this window.</p>
            </body>
          </html>
        `);
                this.cleanup();
                return;
            }
            // Success - resolve with code and state
            this.resolveCallback?.({ code, state });
            await reply.type('text/html').send(`
        <!DOCTYPE html>
        <html>
          <head><title>Authentication Successful</title></head>
          <body>
            <h1>Authentication Successful</h1>
            <p>You can close this window and return to your terminal.</p>
          </body>
        </html>
      `);
            this.cleanup();
        });
    }
    /**
     * Start the server
     */
    async start() {
        const host = this.options.host || '127.0.0.1';
        const port = this.options.port || 0;
        await this.server.listen({ host, port });
    }
    /**
     * Start the server and wait for callback
     * @returns Promise that resolves with the callback result
     */
    async waitForCallback() {
        const timeout = this.options.timeout || 60000;
        // Setup timeout
        this.timeoutHandle = setTimeout(() => {
            this.rejectCallback?.(new Error('OAuth callback timeout'));
            this.cleanup();
        }, timeout);
        // Return promise that resolves when callback is received
        return new Promise((resolve, reject) => {
            this.resolveCallback = resolve;
            this.rejectCallback = reject;
        });
    }
    /**
     * Get the actual port the server is listening on
     */
    getPort() {
        const address = this.server.server.address();
        if (!address || typeof address === 'string') {
            throw new Error('Server not started or using Unix socket');
        }
        return address.port;
    }
    /**
     * Get the callback URL
     */
    getCallbackUrl() {
        const host = this.options.host || '127.0.0.1';
        const port = this.getPort();
        return `http://${host}:${port}/callback`;
    }
    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.timeoutHandle) {
            clearTimeout(this.timeoutHandle);
            this.timeoutHandle = undefined;
        }
        // Close server after a short delay to allow response to be sent
        setTimeout(() => {
            this.server.close();
        }, 100);
    }
    /**
     * Force close the server
     */
    async close() {
        if (this.timeoutHandle) {
            clearTimeout(this.timeoutHandle);
            this.timeoutHandle = undefined;
        }
        await this.server.close();
    }
}
//# sourceMappingURL=callback-server.js.map