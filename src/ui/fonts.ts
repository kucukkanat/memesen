// The font + colour palette the message-style picker offers, shared by the
// reducer (for defaults) and the FontPicker dialog. Picking one re-renders the
// contact list, chat history and the message input via the `--msn-font` /
// `--msn-color` CSS custom properties set on the app root.

export interface FontOption {
  /** Menu label, also rendered in its own typeface as the preview. */
  readonly name: string;
  /** The CSS `font-family` stack applied when chosen. */
  readonly stack: string;
}

// The six fonts MSN Messenger shipped with, in the original picker's order.
export const FONT_OPTIONS: readonly FontOption[] = [
  { name: 'Comic Sans MS', stack: "'Comic Sans MS', 'Comic Sans', cursive" },
  { name: 'Arial', stack: 'Arial, Helvetica, sans-serif' },
  { name: 'Verdana', stack: 'Verdana, Geneva, sans-serif' },
  { name: 'MS Sans Serif', stack: "'MS Sans Serif', 'Microsoft Sans Serif', Tahoma, sans-serif" },
  { name: 'Times New Roman', stack: "'Times New Roman', Times, serif" },
  { name: 'Courier New', stack: "'Courier New', Courier, monospace" },
];

// Ten text colours, with a Y2K-staple purple in the mix (index 8).
export const FONT_COLORS: readonly string[] = [
  '#1f1f1f', // near-black
  '#5a6472', // slate
  '#c01a1a', // red
  '#e07a1a', // orange
  '#caa61a', // gold
  '#1f9d2f', // green
  '#1aa0a0', // teal
  '#1a5fd0', // blue
  '#7a2fb5', // purple
  '#c0258f', // magenta
];

// Defaults preserve the app's existing Tahoma look until the user picks a style.
export const DEFAULT_FONT = 'Tahoma, Geneva, sans-serif';
export const DEFAULT_COLOR = '#222222';
