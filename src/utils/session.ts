const SESSION_KEY = 'mine_page_auth_token';

/**
 * Generate a cryptographically random session token
 */
export function generateSessionToken(): string {
  return crypto.randomUUID();
}

/**
 * Save authentication token to session storage
 */
export function saveSession(token: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(SESSION_KEY, token);
  }
}

/**
 * Retrieve authentication token from session storage
 */
export function getSession(): string | null {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem(SESSION_KEY);
  }
  return null;
}

/**
 * Clear authentication token from session storage
 */
export function clearSession(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

/**
 * Check if a valid session exists
 */
export function hasValidSession(): boolean {
  return getSession() !== null;
}
