const TOKEN_KEY = "digitalshop.auth.token.v1";
const AUTH_TOKEN_CHANGE_EVENT = "digitalshop:auth-token-change";

function notifyAuthTokenChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_TOKEN_CHANGE_EVENT));
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function subscribeAuthToken(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", listener);
  window.addEventListener(AUTH_TOKEN_CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(AUTH_TOKEN_CHANGE_EVENT, listener);
  };
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
    notifyAuthTokenChange();
  } catch {}
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    notifyAuthTokenChange();
  } catch {}
}

