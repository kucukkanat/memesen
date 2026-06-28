import { describe, expect, it } from 'bun:test';
import { orderByRecency, type SwitcherWindow } from './useWindowSwitcher';

const win = (id: string, z: number): SwitcherWindow => ({
  id,
  kind: id === '__buddy__' ? 'buddy' : 'chat',
  label: id,
  status: 'online',
  avatar: '',
  snippet: '',
  unread: false,
  z,
});

describe('orderByRecency', () => {
  it('puts the focused (highest-z) window first so a single tap lands on the previous one', () => {
    const ordered = orderByRecency([win('a', 31), win('b', 35), win('__buddy__', 8)]);
    expect(ordered.map((w) => w.id)).toEqual(['b', 'a', '__buddy__']);
  });

  it('does not mutate its input', () => {
    const input = [win('a', 1), win('b', 2)];
    const snapshot = input.map((w) => w.id);
    orderByRecency(input);
    expect(input.map((w) => w.id)).toEqual(snapshot);
  });
});
