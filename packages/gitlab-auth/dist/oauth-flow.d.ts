export interface OAuthFlowOptions {
    /**
     * GitLab instance URL (e.g., https://gitlab.com)
     */
    instanceUrl: string;
    /**
     * OAuth client ID
     */
    clientId: string;
    /**
     * OAuth scopes to request
     */
    scopes: string[];
    /**
     * OAuth method: 'auto' (callback server) or 'code' (manual paste)
     */
    method: 'auto' | 'code';
    /**
     * Timeout in milliseconds (default: 60000)
     */
    timeout?: number;
}
export interface OAuthTokens {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    scope: string;
    created_at: number;
}
export interface AuthorizationResult {
    code: string;
    state: string;
    codeVerifier: string;
}
/**
 * GitLab OAuth flow implementation
 * Combines patterns from gitlab-vscode-extension and gitlab-lsp
 */
export declare class GitLabOAuthFlow {
    private options;
    constructor(options: OAuthFlowOptions);
    /**
     * Start the OAuth authorization flow
     * @returns Authorization result with code, state, and code verifier
     */
    authorize(): Promise<AuthorizationResult>;
    /**
     * Authorize using local callback server
     */
    private authorizeWithCallback;
    /**
     * Authorize with manual code entry
     */
    private authorizeWithManualCode;
    /**
     * Build the OAuth authorization URL
     */
    private buildAuthorizationUrl;
    /**
     * Exchange authorization code for tokens
     */
    exchangeAuthorizationCode(code: string, codeVerifier: string, redirectUri: string): Promise<OAuthTokens>;
    /**
     * Exchange refresh token for new access token
     */
    exchangeRefreshToken(refreshToken: string): Promise<OAuthTokens>;
}
//# sourceMappingURL=oauth-flow.d.ts.map