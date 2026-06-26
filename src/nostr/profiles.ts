// Parsing for NIP-01 kind-0 metadata. A profile maps onto MSN's identity bits:
//   name/display_name -> screen name, about -> personal message, picture -> DP.

import type { Profile } from '../state/types';

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined);

/** Parse a kind-0 `content` JSON blob into a Profile, tolerating any garbage. */
export const parseProfile = (content: string): Profile => {
  let raw: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(content);
    if (parsed && typeof parsed === 'object') raw = parsed as Record<string, unknown>;
  } catch {
    // A malformed kind-0 just yields an empty profile rather than throwing.
  }
  const profile: { -readonly [K in keyof Profile]: Profile[K] } = {};
  const name = str(raw.name);
  const displayName = str(raw.display_name) ?? str(raw.displayName);
  const about = str(raw.about);
  const picture = str(raw.picture);
  const nip05 = str(raw.nip05);
  if (name !== undefined) profile.name = name;
  if (displayName !== undefined) profile.displayName = displayName;
  if (about !== undefined) profile.about = about;
  if (picture !== undefined) profile.picture = picture;
  if (nip05 !== undefined) profile.nip05 = nip05;
  return profile;
};

/** Serialise our own profile back to a kind-0 `content` string. */
export const serialiseProfile = (profile: Profile): string => {
  const out: Record<string, string> = {};
  if (profile.name !== undefined) out.name = profile.name;
  if (profile.displayName !== undefined) out.display_name = profile.displayName;
  if (profile.about !== undefined) out.about = profile.about;
  if (profile.picture !== undefined) out.picture = profile.picture;
  if (profile.nip05 !== undefined) out.nip05 = profile.nip05;
  return JSON.stringify(out);
};
