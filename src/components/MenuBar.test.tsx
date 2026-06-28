import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { MenuBar } from './MenuBar';
import type { MenuDef } from './MenuBar';

// ---------------------------------------------------------------------------
// Testing approach & limitations
// ---------------------------------------------------------------------------
// The existing component test (Toasts.test.ts) and every other suite in this
// repo are pure-logic tests — there is no DOM environment wired up. Bun's test
// runner has no `document`/`window` (verified: `typeof document === 'undefined'`)
// and the project ships no happy-dom / jsdom / @testing-library/react. Per the
// repo's "minimise dependencies" rule we do NOT add one here.
//
// That means the only rendering tool available is `renderToStaticMarkup` from
// `react-dom/server` (react-dom is already a dependency). It renders the
// component in its INITIAL state and cannot dispatch DOM events.
//
// `MenuBar` keeps its open/closed state in an internal `useState` and only ever
// opens in response to a real `mousedown`/`mouseenter`. There is no
// controlled-open prop. Consequently the dropdown — and therefore item clicks,
// disabled handling, separators and submenu rows — only exist AFTER an
// interaction we cannot simulate without a live DOM.
//
// What IS verified here (static, server render):
//   * top-level labels render with the access character underlined (<u>)        (req 1)
//   * dropdown item labels are absent in the DOM while the bar is closed         (req 2, closed half)
//   * the trailing slot and multiple menus render
//
// What CANNOT be exercised in this environment (requires interactive DOM):
//   * clicking a label to open the menu and reveal items                         (req 2, open half)
//   * clicking an item invokes its onClick and closes the menu                   (req 3)
//   * a disabled item not invoking onClick                                       (req 4)
//   * separators / submenu rows rendering (they live inside the open dropdown)   (req 5)
// These are documented limitations, not gaps in the component. They would be
// straightforward to cover once a DOM env (happy-dom) is added to the toolchain.
// ---------------------------------------------------------------------------

const noop = (): void => {};

const menus: readonly MenuDef[] = [
  {
    label: 'File',
    access: 'F',
    items: [
      { kind: 'item', label: 'New', onClick: noop, hint: 'Ctrl+N' },
      { kind: 'separator' },
      { kind: 'item', label: 'Sign Out', onClick: noop, disabled: true },
      { kind: 'submenu', label: 'Recent', items: [{ kind: 'item', label: 'foo.txt', onClick: noop }] },
    ],
  },
  {
    label: 'Edit',
    access: 'E',
    items: [{ kind: 'item', label: 'Copy', onClick: noop }],
  },
];

const render = (def: readonly MenuDef[], extra?: Parameters<typeof MenuBar>[0]): string =>
  renderToStaticMarkup(<MenuBar menus={def} {...extra} />);

describe('MenuBar (static server render)', () => {
  it('renders every top-level label with its access character underlined', () => {
    const html = render(menus);
    // Win32-style: the access char is wrapped in <u>, the rest is plain text.
    expect(html).toContain('<u>F</u>ile');
    expect(html).toContain('<u>E</u>dit');
  });

  it('underlines an access character that is not the first letter', () => {
    // Exercises the slice-around branch of the Label helper (i > 0).
    const html = render([{ label: 'Save', access: 'v', items: [] }]);
    expect(html).toContain('Sa<u>v</u>e');
  });

  it('renders the label verbatim when there is no access char or no match', () => {
    const noAccess = render([{ label: 'Help', items: [] }]);
    expect(noAccess).toContain('Help');
    expect(noAccess).not.toContain('<u>');

    const noMatch = render([{ label: 'Help', access: 'z', items: [] }]);
    expect(noMatch).toContain('Help');
    expect(noMatch).not.toContain('<u>');
  });

  it('does NOT render dropdown items while the bar is closed (its initial state)', () => {
    const html = render(menus);
    // Item, separator-neighbour, disabled, submenu and nested labels are all
    // inside the (unopened) dropdown, so none of them are in the DOM yet.
    expect(html).not.toContain('New');
    expect(html).toContain('msn-link'); // labels are present...
    expect(html).not.toContain('msn-menuitem'); // ...but no dropdown rows exist.
    expect(html).not.toContain('Sign Out');
    expect(html).not.toContain('Recent');
    expect(html).not.toContain('foo.txt');
    expect(html).not.toContain('Copy');
  });

  it('renders the trailing slot flush after the menus', () => {
    const html = renderToStaticMarkup(
      <MenuBar menus={[{ label: 'File', access: 'F', items: [] }]} trailing={<b>msn</b>} />,
    );
    expect(html).toContain('<b>msn</b>');
    expect(html.indexOf('<u>F</u>ile')).toBeLessThan(html.indexOf('<b>msn</b>'));
  });

  it('renders one top-level entry per menu', () => {
    const html = render(menus);
    const labels = html.match(/msn-link/g) ?? [];
    expect(labels.length).toBe(menus.length);
  });
});
