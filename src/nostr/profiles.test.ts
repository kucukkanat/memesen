import { describe, expect, it } from 'bun:test';
import { parseProfile, serialiseProfile } from './profiles';

describe('profiles — parsing', () => {
  it('maps the standard kind-0 fields', () => {
    const p = parseProfile(JSON.stringify({ name: 'al', display_name: 'Ally', about: 'hi', picture: 'x', nip05: 'a@b.co' }));
    expect(p).toEqual({ name: 'al', displayName: 'Ally', about: 'hi', picture: 'x', nip05: 'a@b.co' });
  });

  it('ignores blank strings and unknown keys', () => {
    expect(parseProfile(JSON.stringify({ name: '   ', foo: 'bar' }))).toEqual({});
  });

  it('returns an empty profile for malformed JSON instead of throwing', () => {
    expect(parseProfile('}{ not json')).toEqual({});
  });

  it('serialises back to kind-0 shape', () => {
    expect(JSON.parse(serialiseProfile({ displayName: 'Ally', about: 'hi' }))).toEqual({ display_name: 'Ally', about: 'hi' });
  });
});
