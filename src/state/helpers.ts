// Pure, side-effect-free helpers. Time and randomness are passed in as values
// or injected functions so every helper is deterministic under test.

const clock12 = (d: Date): { h: number; m: string; ap: string } => {
  const ap = d.getHours() >= 12 ? 'PM' : 'AM';
  const h = d.getHours() % 12 || 12;
  return { h, m: String(d.getMinutes()).padStart(2, '0'), ap };
};

/** Taskbar clock, e.g. `9:07 PM`. */
export const formatClock = (now: number): string => {
  const { h, m, ap } = clock12(new Date(now));
  return `${h}:${m} ${ap}`;
};

/** Per-message timestamp, e.g. `(9:07 PM)`. */
export const formatTime = (now: number): string => {
  const { h, m, ap } = clock12(new Date(now));
  return `(${h}:${m} ${ap})`;
};

/** Derive a screen name from an e-mail address; falls back to `Me`. */
export const nameFromEmail = (email: string): string => (email.split('@')[0] ?? '').trim() || 'Me';

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max));

/** Pick a random element. Throws on an empty list rather than returning undefined. */
export const pick = <T>(list: readonly T[], rng: () => number = Math.random): T => {
  const item = list[Math.floor(rng() * list.length)];
  if (item === undefined) throw new Error('pick: cannot choose from an empty list');
  return item;
};
