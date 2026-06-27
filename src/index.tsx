import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import { installPwa } from './pwa';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Manifest, home-screen icons and the service worker. Kept out of the static
// HTML so the bundler doesn't try to resolve/hash these runtime-served files;
// the relative URLs resolve against the page, so they're correct under the
// GitHub Pages project subpath too.
installPwa();
