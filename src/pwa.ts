// Progressive-web-app wiring: link the manifest + home-screen icons into the
// document and register the service worker. All paths are relative so they
// resolve against the page's base URL — correct at the domain root and under a
// project subpath (GitHub Pages) alike. Everything is best-effort: a browser
// without service workers (or a dev server without the copied files) still runs
// the app, it just isn't installable there.

const link = (rel: string, href: string, extra: Record<string, string> = {}): void => {
  const el = document.createElement('link');
  el.rel = rel;
  el.href = href;
  for (const [k, v] of Object.entries(extra)) el.setAttribute(k, v);
  document.head.appendChild(el);
};

export const installPwa = (): void => {
  link('manifest', './manifest.webmanifest');
  link('icon', './icon-192.png', { sizes: '192x192', type: 'image/png' });
  link('icon', './icon-512.png', { sizes: '512x512', type: 'image/png' });
  link('apple-touch-icon', './apple-touch-icon.png');

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Relative to the page, so the SW scope covers the app under any subpath.
      navigator.serviceWorker.register('./sw.js').catch(() => {
        /* offline support is a bonus; ignore registration failures */
      });
    });
  }
};
