
// main.ts
import "./css/style.css";
import { renderApiKeyAlert, initApiKeyAlert } from "./tmdb_key";



interface PageModule {
  render: (params: URLSearchParams) => string | Promise<string>;
  init?: (params: URLSearchParams) => void | Promise<void>; // may now be async
  destroy?: () => void;
}

interface RouteDefinition {
  path: string; // Matches against the hash path only (query string stripped)
  showLoader?: boolean;
  load: () => Promise<PageModule>;
}


const routes: RouteDefinition[] = [
  {
    path: "#home",
    load: async () => {
      const mod = await import("./home");
      return { render: mod.renderHome, init: mod.initHome, destroy: mod.destroyHome };
    }
  },
  {
    path: "#tv",
    load: async () => {
      const mod = await import("./tv");
      return { render: mod.renderTvSeriesPlayer, init: mod.initTvSeriesPlayer, destroy: mod.destroyTvSeriesPlayer };
    }
  },
  {
    path: "#movie",
    load: async () => {
      const mod = await import("./movie");
      return { render: mod.renderMoviePlayer, init: mod.initMoviePlayer, destroy: mod.destroyMoviePlayer };
    }
  },
  {
    path: "#search",
    load: async () => {
      const mod = await import("./search");
      return { render: mod.renderSearchPage, init: mod.initSearchPage, destroy: mod.destroySearchPage };
    }
  },
  {
    path: "#popular_movies",
    load: async () => {
      const mod = await import("./popular_movies");
      return { render: mod.renderPopularMvPage, init: mod.initPopularMvPage, destroy: mod.destroyPopularMvPage };
    }
  },
  {
    path: "#popular_tv",
    load: async () => {
      const mod = await import("./popular_tv");
      return { render: mod.renderPopularTvPage, init: mod.initPopularTvPage, destroy: mod.destroyPopularTvPage };
    }
  },
  {
    path: "#categories",
    load: async () => {
      const mod = await import("./categories");
      return { render: mod.renderCategoriesPage, init: mod.initCategoriesPage, destroy: mod.destroyCategoriesPage };
    }
  },
  {
    path: "#watch_history",
    showLoader: true,
    load: async () => {
      const mod = await import("./watch_history");
      return { render: mod.renderWatchHistory, init: mod.initWatchHistory, destroy: mod.destroyWatchHistory };
    }
  },
  {
    path: "#wish_list",
    showLoader: true,
    load: async () => {
      const mod = await import("./wish_list");
      return { render: mod.renderWishList, init: mod.initWishList, destroy: mod.destroyWishList };
    }
  },
];

const NOT_FOUND_HTML = `
<div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#060509] px-6 text-zinc-100 font-sans antialiased selection:bg-[#8b5cf6] selection:text-white">
  <!-- ambient glow -->
  <div class="pointer-events-none absolute inset-0">
    <div class="absolute left-1/2 top-1/3 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8b5cf6]/[0.12] blur-[120px] sm:h-[460px] sm:w-[460px]"></div>
  </div>

  <div class="relative text-center">
    <p class="bg-gradient-to-b from-[#c4b5fd] to-[#6d28d9] bg-clip-text text-7xl font-black tracking-tight text-transparent sm:text-8xl">404</p>
    <h1 class="mt-3 text-xl font-bold text-white sm:text-2xl">Page not found</h1>
    <p class="mx-auto mt-2 max-w-xs text-sm text-zinc-500">The page you're looking for doesn't exist or may have been moved.</p>
    <a href="#home" data-link class="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#8b5cf6]/25 ring-1 ring-inset ring-white/10 transition active:scale-95 md:hover:scale-[1.03]">
      <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      Back to Home
    </a>
  </div>
</div>
`;


// The page loader now lives INSIDE #app instead of as a separate fixed
// overlay on <body>. When the page HTML is written to #app, the loader is
// replaced by the same innerHTML swap that already paints reliably, so
// there is no overlay layer left to remove (the stale-overlay case).
function renderPageLoaderHtml(): string {
  return `
  <div id="page-loader" class="flex min-h-screen items-center justify-center bg-[#060509]">
    <div role="status" aria-label="Loading"
         class="h-10 w-10 animate-spin rounded-full border-4 border-[#8b5cf6]/20 border-t-[#a78bfa]"></div>
  </div>`;
}

function showPageLoader(): void {
  app!.innerHTML = renderPageLoaderHtml();
}

// Normally a no-op: the page HTML has already replaced the loader.
// It only does work if a loader is somehow still in #app.
function hidePageLoader(): void {
  const el = document.getElementById("page-loader");
  if (!el) return;
  el.remove();
  void document.body.offsetHeight; // force a synchronous reflow
  window.scrollBy(0, 1);
  window.scrollBy(0, -1);
}

// SIMULATED TOUCH: every 2 seconds, while on a bridge-backed page
// (watch history / wish list), fire a synthetic touch/click plus a 1px
// scroll nudge to wake a stalled WebView. The body click is harmless:
// the app's click handlers only react to a[data-link] / [data-action]
// targets, and body is neither.
const TOUCH_SIM_MS = 2000;
let touchSimTimer: ReturnType<typeof setInterval> | undefined;

function simulateTouch(): void {
  try {
    const body = document.body;
    for (const type of ["pointerdown", "pointerup"]) {
      body.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: "touch" }));
    }
    body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    window.scrollBy(0, 1);
    window.scrollBy(0, -1);
  } catch (err) {
    console.warn("simulateTouch failed:", err);
  }
}

function startTouchSim(): void {
  stopTouchSim();
  touchSimTimer = setInterval(simulateTouch, TOUCH_SIM_MS);
}

function stopTouchSim(): void {
  if (touchSimTimer) clearInterval(touchSimTimer);
  touchSimTimer = undefined;
}


const app = document.getElementById("app");
if (!app) {
  throw new Error('Root element "#app" not found. Add <div id="app"></div> to index.html.');
}

let activePage: PageModule | null = null;
let renderToken = 0; // guards against out-of-order async route loads

// Splits "#tv_series_player?id=42&s=2" into
// { path: "#tv_series_player", params: URLSearchParams{id:"42", s:"2"} }
function parseHash(hash: string): { path: string; params: URLSearchParams } {
  const [rawPath, rawQuery = ""] = hash.split("?");
  return { path: rawPath, params: new URLSearchParams(rawQuery) };
}

async function renderRoute(hash: string): Promise<void> {
  const { path: rawPath, params } = parseHash(hash);
  const currentPath = (rawPath === "" || rawPath === "#") ? "#home" : rawPath;
  const route = routes.find((r) => r.path === currentPath);

  const token = ++renderToken;

  activePage?.destroy?.();
  activePage = null;
  stopTouchSim(); // only runs on the bridge-backed pages below

  if (!route) {
    app!.innerHTML = NOT_FOUND_HTML;
    return;
  }

  if (route.showLoader) {
    showPageLoader();      // swaps #app to the loader; replaced by the page HTML later
    startTouchSim();       // simulated touch every 5s while on this page
  }

  try {
    const page = await route.load();
    if (token !== renderToken) return;

    const html = await page.render(params);
    if (token !== renderToken) return;

    app!.innerHTML = html;
    activePage = page;

    await page.init?.(params);
    if (token !== renderToken) return;
  } catch (err) {
    if (token !== renderToken) return;
    console.error(`Failed to load route "${currentPath}":`, err);
    app!.innerHTML = NOT_FOUND_HTML;
  } finally {
    // Only the latest navigation is allowed to hide the loader
    if (token === renderToken) hidePageLoader();
  }
}

function navigate(hash: string): void {
  // Simply setting window.location.hash handles updating the browser history naturally
  window.location.hash = hash;
}

// Intercept clicks on links explicitly opted into client-side routing via data-link
document.addEventListener("click", (event) => {
  if (navigationBlocked) return; // connectivity overlay is up — ignore in-app navigation
  const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[data-link]");
  if (!anchor) return;
  const url = new URL(anchor.href, window.location.origin);
  if (url.origin !== window.location.origin) return;
  event.preventDefault();
  navigate(url.hash);
});

// Watch for browser back/forward buttons or direct hash alterations in the address bar
window.addEventListener("hashchange", () => {
  if (navigationBlocked) return; // don't remount a page while blocked — hideConnectivityOverlay() resyncs once cleared, if needed
  void renderRoute(window.location.hash);
});


// ============================================================
// BOOT GATE
// ============================================================

type BootStatus =
  | { kind: "ok" }
  | { kind: "api-key-invalid" }
  | { kind: "local-server-down" }
  | { kind: "internet-down" }
  | { kind: "network-error" };

/**
 * Probes the backend once before the router starts. A thrown message
 * that isn't one we recognise means we couldn't talk to the backend
 * properly at all (service not running, dropped connection, etc).
 *
 * Any leftover version/update signals from the backend
 * (Update_mandatory, Update_optional, Version_not_supported,
 * Version_not_found, downloaded_update_found) are deliberately treated
 * as "ok": the app no longer gates on updates.
 */
async function checkBootStatus(): Promise<BootStatus> {
  try {
    await window.getPopularMovies(1);
    return { kind: "ok" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    switch (message) {
      case "Update_mandatory":
      case "Update_optional":
      case "Version_not_supported":
      case "Version_not_found":
      case "downloaded_update_found": return { kind: "ok" };
      case "TMDB_key_invalid": return { kind: "api-key-invalid" };
      case "LOCAL_SERVER_UNREACHABLE": return { kind: "local-server-down" };
      case "NETWORK_UNREACHABLE": return { kind: "internet-down" };
      default: return { kind: "network-error" };
    }
  }
}

function renderBootLoader(): string {
  return `
  <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-[#060509]">
    <!-- soft violet glow behind the spinner -->
    <div class="pointer-events-none absolute h-[260px] w-[260px] rounded-full bg-[#8b5cf6]/[0.12] blur-[100px]"></div>
    <div role="status" aria-label="Loading" class="relative h-10 w-10 animate-spin rounded-full border-4 border-[#8b5cf6]/20 border-t-[#a78bfa]"></div>
  </div>`;
}

function overlayShell(innerHtml: string): string {
  return `
  <div class="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-[#060509] px-4 py-6 text-zinc-100 font-sans antialiased" style="padding-top: max(1.5rem, env(safe-area-inset-top)); padding-bottom: max(1.5rem, env(safe-area-inset-bottom));">
    <!-- soft violet glow -->
    <div class="pointer-events-none fixed left-1/2 top-1/3 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8b5cf6]/[0.10] blur-[120px] sm:h-[460px] sm:w-[460px]"></div>
    <div class="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0e0b16] p-6 text-center shadow-2xl shadow-black sm:p-8">
${innerHtml}
    </div>
  </div>`;
}

function renderConnectionErrorOverlay(kind: "local-server-down" | "internet-down"): string {
  const heading = kind === "local-server-down" ? "Can't reach MSTREAM" : "You're offline";
  const body = kind === "local-server-down"
    ? "We couldn't connect to the local service. Make sure it's running, then try again."
    : "We couldn't reach the internet. Check your connection, then try again.";

  return overlayShell(`
    <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/30">
      <svg class="h-7 w-7 text-red-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 5.636a9 9 0 010 12.728m0 0L5.636 5.636m12.728 12.728L5.636 18.364m0 0a9 9 0 010-12.728" />
      </svg>
    </div>
    <h2 class="text-xl font-bold text-white">${heading}</h2>
    <p class="mt-2 text-sm text-gray-400">${body}</p>
    <button data-action="retry-connection" class="mt-6 w-full rounded-xl bg-gradient-to-r from-[#a855f7] to-[#9333ea] px-6 py-3 font-bold text-white hover:scale-[1.02] transition">
      Retry
    </button>
  `);
}

let gateHandlersAttached = false;

function ensureGateHandlersAttached(): void {
  if (gateHandlersAttached) return;
  gateHandlersAttached = true;

  app!.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const action = target.closest<HTMLElement>("[data-action]")?.dataset.action;
    if (!action) return;

    if (action === "retry-connection") {
      void runBootGate();
    }
  });
}

// ============================================================
// CONNECTIVITY MONITOR (runtime, post-boot)
//
// Unlike the boot gate (which replaces #app before the router ever
// starts), this needs to block WITHOUT destroying whatever page is
// currently mounted — losing e.g. in-progress video playback state to
// a connectivity blip would be worse than the outage itself. So the
// overlay is a sibling of #app, appended once to document.body, and
// toggled on/off — #app's content is never touched by this.
// ============================================================

type ConnectivityState = "ok" | "local-server-down" | "internet-down" | "checking";

let connectivityState: ConnectivityState = "checking";
let connectivityOverlayEl: HTMLElement | null = null;
let connectivityTimer: ReturnType<typeof setInterval> | undefined;

// True while the blocking overlay is up. Checked by the hash-link click
// handler and the hashchange listener above, so navigation is actually
// inert while blocked — not just visually covered.
let navigationBlocked = false;
let hashAtBlockStart: string | null = null;

function ensureConnectivityOverlay(): HTMLElement {
  if (connectivityOverlayEl) return connectivityOverlayEl;
  const el = document.createElement("div");
  el.id = "connectivity-overlay";
  document.body.appendChild(el);
  connectivityOverlayEl = el;

  // Delegated once on this container — its innerHTML gets replaced on
  // every show, but the listener itself survives that since it's bound
  // to the stable outer element, not the swapped-out inner markup.
  el.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-action="retry-connection"]')) {
      void pollConnectivity();
    }
  });
  return el;
}

function showConnectivityOverlay(kind: "local-server-down" | "internet-down"): void {
  const el = ensureConnectivityOverlay();
  if (!navigationBlocked) {
    navigationBlocked = true;
    hashAtBlockStart = window.location.hash;
  }
  // Reuses the exact same markup/copy as the boot-time connection error,
  // so a mid-session outage looks identical to a boot-time one instead
  // of introducing a second visual language for the same problem.
  el.innerHTML = renderConnectionErrorOverlay(kind);
}

function hideConnectivityOverlay(): void {
  if (!connectivityOverlayEl) return;
  connectivityOverlayEl.innerHTML = "";
  if (navigationBlocked) {
    navigationBlocked = false;
    // If the hash changed while blocked (e.g. browser back/forward, or a
    // manually edited URL), #app's content is now stale relative to it —
    // resync once. If the hash never moved, the current page is still
    // correct and re-rendering would just discard its live state for
    // nothing, so skip it.
    if (window.location.hash !== hashAtBlockStart) {
      void renderRoute(window.location.hash);
    }
    hashAtBlockStart = null;
  }
}

async function pollConnectivity(): Promise<void> {
  try {
    const health = await window.checkHealth();
    connectivityState = health.internet ? "ok" : "internet-down";
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    connectivityState = message === "LOCAL_SERVER_UNREACHABLE" ? "local-server-down" : "internet-down";
  }
  if (connectivityState === "ok") {
    hideConnectivityOverlay();
  } else {
    showConnectivityOverlay(connectivityState);
  }
}

function startConnectivityMonitor(): void {
  if (connectivityTimer) return; // guard against duplicate intervals if this ever runs twice
  void pollConnectivity();
  connectivityTimer = setInterval(() => void pollConnectivity(), 10000);
  // navigator's online/offline events are a much faster signal than
  // waiting out the poll interval, but neither is authoritative alone,
  // so both just trigger an immediate real check instead of being
  // trusted directly.
  window.addEventListener("offline", () => void pollConnectivity());
  window.addEventListener("online", () => void pollConnectivity());
}


function proceedToRouter(): void {
  startConnectivityMonitor();
  if (window.location.hash === "" || window.location.hash === "#") {
    navigate("#home");
  } else {
    void renderRoute(window.location.hash);
  }
}

async function runBootGate(): Promise<void> {
  ensureGateHandlersAttached();
  app!.innerHTML = renderBootLoader();

  const status = await checkBootStatus();

  if (status.kind === "local-server-down" || status.kind === "network-error") {
    app!.innerHTML = renderConnectionErrorOverlay("local-server-down");
    return;
  }
  if (status.kind === "internet-down") {
    app!.innerHTML = renderConnectionErrorOverlay("internet-down");
    return;
  }
  if (status.kind === "api-key-invalid") {
    app!.innerHTML = renderApiKeyAlert();
    initApiKeyAlert(); // no onSuccess passed → defaults to full reload
    return;
  }

  proceedToRouter();
}

// Initial load: run the boot gate first. It either blocks (can't connect /
// invalid API key) or hands off to the router.
void runBootGate();