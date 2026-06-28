import { describe, expect, it } from 'bun:test';
import { alertVisual, type ToastSeverity } from './Toasts';

describe('alertVisual', () => {
  const severities: readonly ToastSeverity[] = ['info', 'warning', 'error'];

  it('returns a distinct icon and colours for every severity', () => {
    const icons = severities.map((s) => alertVisual(s).icon);
    expect(new Set(icons).size).toBe(severities.length);
    for (const s of severities) {
      const v = alertVisual(s);
      expect(v.icon).not.toBe('');
      expect(v.bg).toContain('gradient');
      expect(v.accent).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('uses a cautionary glyph for warnings (the connection banner)', () => {
    expect(alertVisual('warning').icon).toBe('⚠️');
  });
});
