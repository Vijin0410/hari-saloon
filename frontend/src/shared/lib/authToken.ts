const ACCESS_TOKEN_KEY = 'hair-salon-access-token';

let memoryToken = readStoredToken();

function readStoredToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getAccessToken(): string | null {
  if (memoryToken) {
    return memoryToken;
  }
  memoryToken = readStoredToken();
  return memoryToken;
}

export function setAccessToken(token: string): void {
  memoryToken = token;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }
}

export function clearAccessToken(): void {
  memoryToken = null;
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}
