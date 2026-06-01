const STORAGE_PREFIX = 'billflow_';

export function getItem<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage error:', e);
  }
}

export function removeItem(key: string): void {
  localStorage.removeItem(STORAGE_PREFIX + key);
}
