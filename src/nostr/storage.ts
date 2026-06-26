// Thin, never-throwing wrappers over localStorage. Persistence is best-effort:
// a blocked or full store degrades to in-memory only rather than crashing.

const available = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

export const readJson = <T>(key: string, fallback: T): T => {
  const store = available();
  if (!store) return fallback;
  const raw = store.getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const writeJson = (key: string, value: unknown): void => {
  const store = available();
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // Quota / private-mode failures are non-fatal.
  }
};
