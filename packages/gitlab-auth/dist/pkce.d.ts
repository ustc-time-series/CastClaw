/**
 * Generate a cryptographically secure random string for PKCE
 * @param length Length of the random string (default: 43)
 * @returns Base64 URL-encoded random string
 */
export declare function generateSecret(length?: number): string;
/**
 * Generate a code challenge from a code verifier using SHA-256
 * @param verifier The code verifier string
 * @returns Base64 URL-encoded SHA-256 hash of the verifier
 */
export declare function generateCodeChallengeFromVerifier(verifier: string): string;
//# sourceMappingURL=pkce.d.ts.map