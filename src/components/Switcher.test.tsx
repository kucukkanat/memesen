import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Switcher } from './Switcher';
import type { SwitcherWindow } from '../hooks/useWindowSwitcher';

// Static initial-render checks only — the repo has no DOM environment (see the
// note in MenuBar.test.tsx), so hover/click/keyboard paths live in the hook and
// reducer tests instead.

const noop = (): void => {};
const wins: readonly SwitcherWindow[] = [
  { id: '__buddy__', kind: 'buddy', label: 'me - Messenger', status: 'online', avatar: 'a', snippet: '', unread: false, z: 9 },
  { id: 'p1', kind: 'chat', label: 'Alice', status: 'away', avatar: 'b', snippet: 'see you soon', unread: true, z: 11 },
];

const render = (index: number, isMac: boolean): string =>
  renderToStaticMarkup(<Switcher items={wins} index={index} isMac={isMac} onHover={noop} onPick={noop} />);

describe('Switcher', () => {
  it('renders a card per window and names the selected one', () => {
    const html = render(1, true);
    expect(html).toContain('me - Messenger');
    expect(html).toContain('Alice');
    expect(html).toContain('see you soon'); // the selected chat's preview line
  });

  it('shows the macOS combo hint on Mac', () => {
    expect(render(0, true)).toContain('Option');
  });

  it('shows the Alt+backtick combo hint off Mac', () => {
    const html = render(0, false);
    expect(html).toContain('Alt + `');
    expect(html).not.toContain('Option');
  });
});
