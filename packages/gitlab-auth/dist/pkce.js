import crypto from 'crypto';
/**
 * Generate a cryptographically secure random string for PKCE
 * @param length Length of the random string (default: 43)
 * @returns Base64 URL-encoded random string
 */
export function generateSecret(length = 43) {
    const bytes = crypto.randomBytes(length);
    return base64UrlEncode(bytes);
}
/**
 * Generate a code challenge from a code verifier using SHA-256
 * @param verifier The code verifier string
 * @returns Base64 URL-encoded SHA-256 hash of the verifier
 */
export function generateCodeChallengeFromVerifier(verifier) {
    const hash = crypto.createHash('sha256').update(verifier).digest();
    return base64UrlEncode(hash);
}
/**
 * Base64 URL-encode a buffer (RFC 4648 Section 5)
 * @param buffer Buffer to encode
 * @returns Base64 URL-encoded string
 */
function base64UrlEncode(buffer) {
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
//# sourceMappingURL=pkce.js.map