// Page data fetched at build time by scripts/prerender.mjs, so each public
// page's pre-rendered HTML contains its real content (for crawlers, AI bots
// and link previews), and the browser's first render shows that same content
// instead of flashing a loading skeleton over it.
//
// On the server, the prerender script sets the store before rendering each
// route. In the browser, it's read from window.__PRERENDER_DATA__, which the
// script embeds in each page — and only for the page it was rendered for, so
// client-side navigation to any other page fetches as normal.

type Store = Record<string, unknown>;

declare global {
  interface Window {
    __PRERENDER_DATA__?: { path: string; data: Store };
  }
}

let serverStore: Store | null = null;

export const setPrerenderStore = (store: Store | null) => {
  serverStore = store;
};

export const getPrerendered = <T>(key: string): T | undefined => {
  if (import.meta.env.SSR) return serverStore?.[key] as T | undefined;
  const embedded = window.__PRERENDER_DATA__;
  if (!embedded || embedded.path !== window.location.pathname) return undefined;
  return embedded.data[key] as T | undefined;
};
