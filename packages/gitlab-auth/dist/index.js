import { GitLabOAuthFlow } from './oauth-flow.js';
import { CallbackServer } from './callback-server.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
/**
 * GitLab OAuth constants
 */
// IMPORTANT: The bundled client ID below is from gitlab-vscode-extension and is registered
// with redirect URI: vscode://gitlab.gitlab-workflow/authentication
// This will NOT work with CastClaw's local HTTP callback server.
// To fix: Set GITLAB_OAUTH_CLIENT_ID environment variable with your own client ID.
// See OAUTH_SETUP.md for instructions on registering a new OAuth application.
const BUNDLED_CLIENT_ID = process.env.GITLAB_OAUTH_CLIENT_ID ||
    '1d89f9fdb23ee96d4e603201f6861dab6e143c5c3c00469a018a2d94bdc03d4e';
const GITLAB_COM_URL = 'https://gitlab.com';
const OAUTH_SCOPES = ['api'];
/**
 * Debug logging to file (doesn't break UI)
 */
function debugLog(message, data) {
    try {
        const homeDir = os.homedir();
        const logDir = path.join(homeDir, '.local', 'share', 'castclaw', 'log');
        // Ensure log directory exists
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        const logPath = path.join(logDir, 'gitlab-auth.log');
        const timestamp = new Date().toISOString();
        const logLine = data
            ? `[${timestamp}] ${message}: ${JSON.stringify(data)}\n`
            : `[${timestamp}] ${message}\n`;
        fs.appendFileSync(logPath, logLine);
    }
    catch {
        // Ignore logging errors
    }
}
/**
 * Get CastClaw auth file path
 */
function getAuthPath() {
    const homeDir = os.homedir();
    const xdgDataHome = process.env.XDG_DATA_HOME;
    if (xdgDataHome) {
        return path.join(xdgDataHome, 'castclaw', 'auth.json');
    }
    if (process.platform !== 'win32') {
        return path.join(homeDir, '.local', 'share', 'castclaw', 'auth.json');
    }
    return path.join(homeDir, '.castclaw', 'auth.json');
}
/**
 * Save OAuth auth data to CastClaw's auth.json
 * Workaround for CastClaw not saving the enterpriseUrl field
 */
async function saveOAuthData(access, refresh, expires, enterpriseUrl) {
    const authPath = getAuthPath();
    const authDir = path.dirname(authPath);
    // Ensure directory exists
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
    }
    // Read existing auth data
    let authData = {};
    if (fs.existsSync(authPath)) {
        const content = fs.readFileSync(authPath, 'utf-8');
        authData = JSON.parse(content);
    }
    // Update GitLab auth
    authData.gitlab = {
        type: 'oauth',
        access,
        refresh,
        expires,
        enterpriseUrl,
    };
    // Write back
    fs.writeFileSync(authPath, JSON.stringify(authData, null, 2));
    fs.chmodSync(authPath, 0o600);
}
/**
 * Save PAT auth data to CastClaw's auth.json
 * Workaround for CastClaw not saving the enterpriseUrl field for API keys
 */
async function savePATData(key, enterpriseUrl) {
    const authPath = getAuthPath();
    const authDir = path.dirname(authPath);
    // Ensure directory exists
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
    }
    // Read existing auth data
    let authData = {};
    if (fs.existsSync(authPath)) {
        const content = fs.readFileSync(authPath, 'utf-8');
        authData = JSON.parse(content);
    }
    // Update GitLab auth with PAT and enterpriseUrl
    authData.gitlab = {
        type: 'api',
        key,
        enterpriseUrl,
    };
    // Write back
    fs.writeFileSync(authPath, JSON.stringify(authData, null, 2));
    fs.chmodSync(authPath, 0o600);
}
/**
 * Mutex to prevent concurrent token refresh attempts
 */
let refreshInProgress = null;
/**
 * Refresh OAuth token if expired or expiring soon
 */
async function refreshTokenIfNeeded(authData, auth) {
    const now = Date.now();
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes buffer
    const isExpired = authData.expires <= now + expiryBuffer;
    if (!isExpired) {
        debugLog('Token is still valid', {
            expiresAt: new Date(authData.expires).toISOString(),
            expiresIn: Math.round((authData.expires - now) / 1000 / 60) + ' minutes',
        });
        return {
            apiKey: authData.access,
            instanceUrl: authData.enterpriseUrl || 'https://gitlab.com',
        };
    }
    // If refresh is already in progress, wait for it
    if (refreshInProgress) {
        debugLog('Token refresh already in progress, waiting...');
        await refreshInProgress;
        // Re-fetch auth data after refresh completes
        const refreshedAuthData = await auth();
        if (refreshedAuthData && refreshedAuthData.type === 'oauth') {
            return {
                apiKey: refreshedAuthData.access,
                instanceUrl: refreshedAuthData.enterpriseUrl || 'https://gitlab.com',
            };
        }
        throw new Error('Failed to get refreshed auth data');
    }
    // Start refresh process
    debugLog('Token expired or expiring soon, refreshing...', {
        expiresAt: new Date(authData.expires).toISOString(),
        expired: authData.expires <= now,
    });
    refreshInProgress = (async () => {
        try {
            const instanceUrl = authData.enterpriseUrl || 'https://gitlab.com';
            const flow = new GitLabOAuthFlow({
                instanceUrl,
                clientId: BUNDLED_CLIENT_ID,
                scopes: OAUTH_SCOPES,
                method: 'auto',
            });
            debugLog('Calling exchangeRefreshToken...');
            const newTokens = await flow.exchangeRefreshToken(authData.refresh);
            const newExpiry = Date.now() + newTokens.expires_in * 1000;
            debugLog('Token refresh successful', {
                newExpiresAt: new Date(newExpiry).toISOString(),
                expiresIn: Math.round(newTokens.expires_in / 60) + ' minutes',
            });
            // Save the new tokens
            await saveOAuthData(newTokens.access_token, newTokens.refresh_token, newExpiry, instanceUrl);
            debugLog('New tokens saved successfully');
        }
        catch (error) {
            debugLog('Token refresh failed', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });
            // If refresh fails with 401/403, the refresh token is likely revoked
            if (error instanceof Error && error.message.includes('401')) {
                debugLog('Refresh token appears to be revoked (401), clearing auth data');
                // Clear the auth data to force re-authentication
                const authPath = getAuthPath();
                if (fs.existsSync(authPath)) {
                    const content = fs.readFileSync(authPath, 'utf-8');
                    const authDataFile = JSON.parse(content);
                    delete authDataFile.gitlab;
                    fs.writeFileSync(authPath, JSON.stringify(authDataFile, null, 2));
                }
            }
            throw error;
        }
    })();
    try {
        await refreshInProgress;
    }
    finally {
        refreshInProgress = null;
    }
    // Re-fetch auth data after refresh
    const refreshedAuthData = await auth();
    if (refreshedAuthData && refreshedAuthData.type === 'oauth') {
        return {
            apiKey: refreshedAuthData.access,
            instanceUrl: refreshedAuthData.enterpriseUrl || 'https://gitlab.com',
        };
    }
    throw new Error('Failed to get refreshed auth data after token refresh');
}
/**
 * CastClaw GitLab Auth Plugin
 */
export const gitlabAuthPlugin = async () => {
    const authHook = {
        provider: 'gitlab',
        /**
         * Loader function to provide auth credentials to the GitLab AI SDK provider
         * Automatically refreshes OAuth tokens if expired or expiring soon
         */
        async loader(auth) {
            const authData = await auth();
            if (!authData) {
                return {};
            }
            // For OAuth, check token expiry and refresh if needed
            if (authData.type === 'oauth') {
                try {
                    const result = await refreshTokenIfNeeded(authData, auth);
                    // Include clientId so the provider can use it for any subsequent token refresh
                    return {
                        ...result,
                        clientId: BUNDLED_CLIENT_ID,
                    };
                }
                catch (error) {
                    debugLog('Failed to refresh token in loader', {
                        error: error instanceof Error ? error.message : String(error),
                    });
                    // Fall back to returning the existing (possibly expired) token
                    // The API call will fail, but at least we tried
                    return {
                        apiKey: authData.access,
                        instanceUrl: authData.enterpriseUrl || 'https://gitlab.com',
                        clientId: BUNDLED_CLIENT_ID,
                    };
                }
            }
            // For API key, return the key and instance URL
            if (authData.type === 'api') {
                // Get instance URL from auth data (if saved), env var, or default to gitlab.com
                // Note: enterpriseUrl is saved by this plugin when PAT auth is used with self-hosted instances
                const instanceUrl = authData.enterpriseUrl ||
                    process.env.GITLAB_INSTANCE_URL ||
                    'https://gitlab.com';
                debugLog('PAT auth - enterpriseUrl from auth:', authData.enterpriseUrl);
                debugLog('PAT auth - GITLAB_INSTANCE_URL env:', process.env.GITLAB_INSTANCE_URL);
                debugLog('PAT auth - resolved instanceUrl:', instanceUrl);
                return {
                    apiKey: authData.key,
                    instanceUrl,
                };
            }
            return {};
        },
        methods: [
            {
                type: 'oauth',
                label: 'GitLab OAuth',
                prompts: [
                    {
                        type: 'text',
                        key: 'instanceUrl',
                        message: 'GitLab instance URL',
                        placeholder: 'https://gitlab.com',
                        validate: (value) => {
                            if (!value) {
                                return 'Instance URL is required';
                            }
                            try {
                                new URL(value);
                                return undefined;
                            }
                            catch {
                                return 'Invalid URL format';
                            }
                        },
                    },
                ],
                async authorize(inputs) {
                    const instanceUrl = inputs?.instanceUrl || process.env.GITLAB_INSTANCE_URL || GITLAB_COM_URL;
                    // Normalize instance URL
                    let normalizedUrl;
                    try {
                        const url = new URL(instanceUrl);
                        normalizedUrl = `${url.protocol}//${url.host}`;
                    }
                    catch (error) {
                        throw new Error(`Invalid GitLab instance URL: ${instanceUrl}`);
                    }
                    // Generate PKCE parameters
                    const { generateSecret, generateCodeChallengeFromVerifier } = await import('./pkce.js');
                    const codeVerifier = generateSecret(43);
                    const codeChallenge = generateCodeChallengeFromVerifier(codeVerifier);
                    const state = generateSecret(32);
                    // Create callback server for automatic OAuth flow
                    const callbackServer = new CallbackServer({
                        port: 8080, // Fixed port matching OAuth app registration
                        host: '127.0.0.1',
                        timeout: 120000, // 2 minutes
                    });
                    // Start server and get callback URL
                    await callbackServer.start();
                    const redirectUri = callbackServer.getCallbackUrl();
                    const callbackPromise = callbackServer.waitForCallback();
                    // Build authorization URL
                    const params = new URLSearchParams({
                        client_id: BUNDLED_CLIENT_ID,
                        redirect_uri: redirectUri,
                        response_type: 'code',
                        state,
                        scope: OAUTH_SCOPES.join(' '),
                        code_challenge: codeChallenge,
                        code_challenge_method: 'S256',
                    });
                    const authUrl = `${normalizedUrl}/oauth/authorize?${params.toString()}`;
                    // Open browser automatically
                    const { exec } = await import('child_process');
                    const platform = process.platform;
                    const openCommand = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
                    exec(`${openCommand} "${authUrl}"`);
                    return {
                        method: 'auto',
                        url: authUrl,
                        instructions: 'Your browser will open for authentication. The callback will be handled automatically.',
                        async callback() {
                            debugLog('callback() called');
                            try {
                                // Wait for the OAuth callback from our local server
                                debugLog('Waiting for callback...');
                                const result = await callbackPromise;
                                debugLog('Received callback', { hasCode: !!result.code, hasState: !!result.state });
                                // Verify state matches
                                if (result.state !== state) {
                                    debugLog('State mismatch', { expected: state, received: result.state });
                                    await callbackServer.close();
                                    return { type: 'failed' };
                                }
                                debugLog('State verified');
                                // Exchange code for tokens
                                debugLog('Exchanging code for tokens...');
                                const flow = new GitLabOAuthFlow({
                                    instanceUrl: normalizedUrl,
                                    clientId: BUNDLED_CLIENT_ID,
                                    scopes: OAUTH_SCOPES,
                                    method: 'auto',
                                });
                                const tokens = await flow.exchangeAuthorizationCode(result.code, codeVerifier, redirectUri);
                                debugLog('Token exchange successful');
                                // Close the callback server
                                await callbackServer.close();
                                // Calculate expiry
                                const expiresAt = Date.now() + tokens.expires_in * 1000;
                                debugLog('Tokens received', { expiresAt: new Date(expiresAt).toISOString() });
                                // Save auth data (workaround for CastClaw not saving enterpriseUrl)
                                debugLog('Saving auth data...');
                                await saveOAuthData(tokens.access_token, tokens.refresh_token, expiresAt, normalizedUrl);
                                debugLog('Auth data saved successfully');
                                return {
                                    type: 'success',
                                    provider: normalizedUrl,
                                    access: tokens.access_token,
                                    refresh: tokens.refresh_token,
                                    expires: expiresAt,
                                };
                            }
                            catch (error) {
                                debugLog('Error in callback', {
                                    error: error instanceof Error ? error.message : String(error),
                                    stack: error instanceof Error ? error.stack : undefined,
                                });
                                // Close the callback server
                                try {
                                    await callbackServer.close();
                                }
                                catch (closeError) {
                                    // Ignore close errors
                                }
                                return { type: 'failed' };
                            }
                        },
                    };
                },
            },
            {
                type: 'api',
                label: 'GitLab Personal Access Token',
                prompts: [
                    {
                        type: 'text',
                        key: 'instanceUrl',
                        message: 'GitLab instance URL',
                        placeholder: 'https://gitlab.com',
                        validate: (value) => {
                            if (!value) {
                                return 'Instance URL is required';
                            }
                            try {
                                new URL(value);
                                return undefined;
                            }
                            catch {
                                return 'Invalid URL format';
                            }
                        },
                    },
                    {
                        type: 'text',
                        key: 'token',
                        message: 'Personal Access Token',
                        placeholder: 'glpat-xxxxxxxxxxxxxxxxxxxx',
                        validate: (value) => {
                            if (!value) {
                                return 'Token is required';
                            }
                            if (!value.startsWith('glpat-')) {
                                return 'Token should start with glpat-';
                            }
                            return undefined;
                        },
                    },
                ],
                async authorize(inputs) {
                    const instanceUrl = inputs?.instanceUrl || GITLAB_COM_URL;
                    const token = inputs?.token;
                    if (!token) {
                        return { type: 'failed' };
                    }
                    // Normalize instance URL
                    let normalizedUrl;
                    try {
                        const url = new URL(instanceUrl);
                        normalizedUrl = `${url.protocol}//${url.host}`;
                    }
                    catch {
                        return { type: 'failed' };
                    }
                    // Validate token by making a test request
                    try {
                        const response = await fetch(`${normalizedUrl}/api/v4/user`, {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        });
                        if (!response.ok) {
                            return { type: 'failed' };
                        }
                        // Save PAT auth data with enterpriseUrl (workaround for CastClaw not saving it)
                        debugLog('Saving PAT auth data...');
                        await savePATData(token, normalizedUrl);
                        debugLog('PAT auth data saved successfully');
                        return {
                            type: 'success',
                            key: token,
                            provider: normalizedUrl,
                        };
                    }
                    catch {
                        return { type: 'failed' };
                    }
                },
            },
        ],
    };
    return {
        auth: authHook,
    };
};
export default gitlabAuthPlugin;
//# sourceMappingURL=index.js.map
