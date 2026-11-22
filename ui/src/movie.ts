// pages/movie.ts

import { guardIframe } from './frameguard'; // adjust path to where iframeGuard.ts lives

//window functions
// declare global {
//   interface Window {
//     getMovieById: (message: string) => Promise<{ [key: string]: any[] }>;
//     movieRecomend: (id: number|string, page: number|string) => Promise<{ [key: string]: any[] }>;
//     BASE_IMG_URL: String;
//   }
// }

// ============================================================
// DESIGN TOKENS (shared with home.ts)
// base        #060509  near-black with a faint violet undertone
// surface     #0e0b16  cards, panels
// primary     #8b5cf6  violet
// primary-dk  #6d28d9  gradient end
// accent      #a78bfa  soft violet (links, active states)
// lavender    #c4b5fd  highlights / hover text
// ============================================================

// ============================================================
// TEMPLATE
//
// Note: no inline onclick="" handlers here anymore. Everything
// interactive is marked with data-* attributes instead, and
// wired up via addEventListener in the controller functions
// below. That's what makes this safe to use as an ES module —
// inline handlers need globals on `window`, which `export`ed
// module functions never get.
// ============================================================

export async function renderMoviePlayer(params: URLSearchParams): Promise<string> {

    let TMDBId = String(params.get('id')) || "";
    let servers = Number(params.get('svr')) || false;
    // Cast locally to `any`: the shared Window.getMovieById type is
    // `{ [key: string]: any[] }`, which is also declared in home.ts and
    // must match there exactly. A single movie object actually has mixed
    // field types (numbers, strings, arrays), so we widen it here rather
    // than changing the shared global type.
    const movieData = await window.getMovieById(TMDBId, true, servers) as any;
    const movieRecomends = await window.movieRecomend(TMDBId, 1);

    // Normalize recommendations into a plain array up front, avoids
    // TS misinferring an inline ?? chain further down.
    const recs: any[] = Array.isArray(movieRecomends?.results)? movieRecomends.results: Array.isArray(movieRecomends)
      ? movieRecomends: [];

    servers = Number(movieData.default_server);
    if(servers > (movieData.servers.length)){servers = 1}
    console.log(movieData)

    // ----------------------------------------------------------
    // Derive display fields from the raw /movie/{id} payload.
    // Everything here is defensive (movies can legitimately be
    // missing runtime, tagline, ratings, etc. on TMDB).
    // ----------------------------------------------------------
    const releaseYear = (movieData.release_date || "").slice(0, 4) || null;

    const runtimeLabel = movieData.runtime
      ? `${Math.floor(movieData.runtime / 60)}h ${movieData.runtime % 60}m`
      : null;

    const ratingLabel = typeof movieData.vote_average === "number" && movieData.vote_average > 0
      ? movieData.vote_average.toFixed(1)
      : null;

    const voteCountLabel = movieData.vote_count
      ? `${movieData.vote_count.toLocaleString()} votes`
      : null;

    const countryLabel = Array.isArray(movieData.production_countries) && movieData.production_countries.length
      ? movieData.production_countries[0].name
      : null;

    const languageLabel = movieData.original_language
      ? movieData.original_language.toUpperCase()
      : null;

    // Secondary metadata pills shown after the rating (release year,
    // runtime, status, country / language, vote count).
    const metaPills = [
      releaseYear,
      runtimeLabel,
      movieData.status || null,
      [countryLabel, languageLabel].filter(Boolean).join(" / ") || null,
      voteCountLabel,
    ].filter(Boolean);

    const genres: string[] = Array.isArray(movieData.genres)?
    movieData.genres.map((g: any) => g.name).filter(Boolean): [];

    // The side module is a portrait [2/3] box, so it should use the
    // portrait poster_path, not the landscape backdrop_path. Fall back
    // to backdrop only if no poster is available.
    const sidePosterPath = movieData.poster_path || movieData.backdrop_path;


  return `
<div class="relative min-h-screen overflow-x-hidden bg-[#060509] text-zinc-100 font-sans antialiased selection:bg-[#8b5cf6] selection:text-white">

  <!-- FLUID GLOW ARCHITECTURE (kept dim so the page reads as near-black) -->
  <div class="fixed inset-0 z-0 pointer-events-none">
    <div class="absolute top-1/3 right-0 h-[300px] w-[300px] sm:right-1/4 sm:h-[400px] sm:w-[400px] rounded-full bg-[#8b5cf6]/[0.08] blur-[130px]"></div>
    <div class="absolute bottom-10 left-0 h-[280px] w-[280px] sm:left-10 sm:h-[350px] sm:w-[350px] rounded-full bg-[#6d28d9]/[0.07] blur-[120px]"></div>
  </div>

  <!-- NAVIGATION HEADER -->
  <header class="relative z-50 w-full bg-gradient-to-b from-[#060509] to-transparent" style="padding-top: env(safe-area-inset-top);">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <a href="#home" data-back-link data-replace class="group flex items-center gap-2 rounded-full bg-white/[0.04] py-2 pl-3 pr-4 ring-1 ring-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95 transition sm:bg-transparent sm:p-0 sm:ring-0">
        <svg class="w-5 h-5 text-[#a78bfa] transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
        </svg>
        <span class="text-sm font-medium tracking-wide"><span class="sm:hidden">Back</span><span class="hidden sm:inline">Return to Discovery</span></span>
      </a>
      <span class="text-lg sm:text-xl font-black tracking-wider text-white"><span class="text-[#a78bfa]">M</span>STREAM</span>
    </div>
  </header>

  <!-- CONTENT PLATFORM -->
  <main class="relative z-10 mx-auto max-w-7xl px-4 pb-20 sm:px-6 sm:pb-24 lg:px-8" style="padding-bottom: max(5rem, env(safe-area-inset-bottom));">

    <!-- SERVER SELECTOR (scrolls sideways on small screens instead of wrapping) -->
    <section class="mt-2 flex items-center gap-2.5 sm:mt-4">
      <span class="mr-1 flex-shrink-0 text-xs font-semibold uppercase tracking-wider text-zinc-500">Servers</span>
      <div data-scroll-servers class="no-scrollbar -mr-4 flex flex-1 items-center gap-2.5 overflow-x-auto pr-4 sm:mr-0 sm:flex-wrap sm:overflow-visible sm:pr-0">
      ${movieData.servers.map((_: unknown, i: number) => {
        const num = i + 1;
        const active = servers === num;
        return `
        <a
          href="#movie?id=${TMDBId}&svr=${num}"
          data-server-btn
          class="group/server flex flex-shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-bold tracking-wide transition-all duration-200 active:scale-95 ${
            active
              ? 'border-[#a78bfa]/50 bg-[#8b5cf6]/15 text-[#c4b5fd] shadow-[0_0_16px_-4px_rgba(139,92,246,0.6)]" data-active-server'
              : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:border-[#8b5cf6]/50 hover:bg-[#8b5cf6]/10 hover:text-white"'
          }
        >
          <span class="h-1.5 w-1.5 rounded-full transition-colors ${
            active ? "bg-[#a78bfa]" : "bg-zinc-600 group-hover/server:bg-[#8b5cf6]"
          }"></span>
          Server ${num}
        </a>`;
      }).join("")}
      </div>
    </section>

    <!-- EMBEDDED PLAYER WINDOW -->
    <section
      class="relative mt-4 aspect-video w-full overflow-hidden rounded-xl border border-white/[0.08]
            bg-[#0e0b16] shadow-2xl shadow-[#8b5cf6]/10 ring-1 ring-black sm:aspect-[16/8] sm:rounded-2xl">
      <iframe
        id="iframe"
        class="absolute inset-0 h-full w-full"
        src="${movieData.servers[servers-1]}"
        title="Movie Player Frame"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen>
      </iframe>
      <div id="error" class="absolute inset-0 hidden flex-col items-center justify-center gap-3 bg-[#0e0b16] px-4 text-center text-sm text-zinc-300"></div>
    </section>

    <!-- PORTRAIT DETAILS & METADATA GRID -->
    <section class="mt-8 grid grid-cols-1 items-start gap-8 sm:mt-12 lg:grid-cols-3">

      <!-- Side Poster Module -->
      <div class="hidden lg:block relative aspect-[2/3] w-full max-w-xs justify-self-center overflow-hidden rounded-2xl border border-white/10 bg-[#0e0b16] shadow-lg shadow-black/60">
        <img src="${window.BASE_IMG_URL}${sidePosterPath}" alt="${movieData.title} poster" class="h-full w-full object-cover">
      </div>

      <!-- Interactive Show Metadata Core Block -->
      <div class="lg:col-span-2">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span class="rounded-md bg-[#8b5cf6]/15 px-2.5 py-1 text-xs font-bold text-[#c4b5fd] ring-1 ring-inset ring-[#8b5cf6]/40">MOVIE</span>
          ${ratingLabel ? `
          <span class="text-[#a78bfa] text-sm font-bold tracking-wide">★ ${ratingLabel} / 10</span>
          ` : ""}
          ${metaPills.map((pill) => `
          <span class="text-zinc-700">•</span>
          <span class="text-zinc-400 text-sm font-medium">${pill}</span>
          `).join("")}
        </div>

        <h1 class="mt-4 text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl">${movieData.title}</h1>
        ${movieData.original_title && movieData.original_title !== movieData.title ? `
        <p class="mt-1 text-sm text-zinc-500">Original title: ${movieData.original_title}</p>
        ` : ""}
        ${movieData.tagline ? `
        <p class="mt-3 text-sm italic text-[#c4b5fd]/70">${movieData.tagline}</p>
        ` : ""}
        <p class="mt-5 sm:mt-6 max-w-3xl text-[15px] sm:text-base leading-relaxed text-zinc-300">
          ${movieData.overview}
        </p>

        <div class="mt-6 flex flex-wrap gap-2">
          ${
            genres.length
              ? genres.map((name) => `
                <a href="#categories?cat=${name}" class="rounded-full border border-[#8b5cf6]/25 bg-[#8b5cf6]/[0.08] px-3.5 py-1 text-xs text-[#ddd6fe]">${name}</a>
              `).join("")
              : ""
          }
        </div>

        <!-- WISH LIST BUTTON (state is driven by initWishlistButton) -->
        <div class="mt-6">
          <button
            type="button"
            data-wishlist-btn
            data-id="${TMDBId}"
            data-type="movie"
            data-state="checking"
            disabled
            class="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-bold text-zinc-400 transition-all duration-200">
            <span data-wishlist-icon class="flex h-4 w-4 items-center justify-center"></span>
            <span data-wishlist-label>Checking…</span>
          </button>
        </div>

      </div>
    </section>

    <!-- RECOMMENDATIONS / SUGGESTED SHOWS CARDS ROW -->
    <section class="mt-14 border-t border-white/[0.07] pt-10 sm:mt-20 sm:pt-12">
      <div class="mb-5 flex items-center justify-between sm:mb-6">
        <h2 class="flex items-center gap-2.5 text-lg font-black tracking-wide text-white sm:text-2xl">
          <span class="h-5 w-1 rounded-full bg-gradient-to-b from-[#a78bfa] to-[#6d28d9]"></span>More Movies Like This
        </h2>
        <span class="hidden text-xs font-semibold text-[#a78bfa] tracking-wider uppercase">More Like This</span>
      </div>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        ${
          recs.length
            ? recs.slice(0, 8).map((rec: any) => {
                const posterPath = rec.poster_path || rec.backdrop_path;
                const posterSrc = posterPath
                  ? `${window.BASE_IMG_URL}${posterPath}`
                  : `${window.NOT_FOUND_IMG}`;
                const name = rec.title || rec.name || "Untitled";
                const match = rec.vote_average ? Math.round(rec.vote_average * 10) : null;
                const year = (rec.release_date || rec.first_air_date || "").slice(0, 4);

                return `
                <a href="#movie?id=${rec.id}">
                  <div class="group/card relative w-full cursor-pointer overflow-hidden rounded-xl bg-[#0e0b16] ring-1 ring-white/[0.06] shadow-xl shadow-black/60 transition-all duration-300 active:scale-[0.97] md:hover:scale-105 md:hover:ring-2 md:hover:ring-[#8b5cf6]/70">
                    <img src="${posterSrc}" alt="${name} poster" loading="lazy" class="aspect-[16/10] w-full object-cover">
                    <div class="p-2.5 sm:p-3">
                      <h3 class="font-bold text-white text-[13px] sm:text-sm truncate group-hover/card:text-[#c4b5fd] transition">${name}</h3>
                      <p class="mt-0.5 text-[11px] sm:text-xs text-zinc-500 font-medium">
                        <span class="text-[#a78bfa]">${match !== null ? `${match}% Match` : ""}</span>${match !== null && year ? " • " : ""}${year || ""}
                      </p>
                    </div>
                  </div>
                </a>`;
              }).join("")
            : `<p class="col-span-full text-sm text-zinc-500">No recommendations available for this title.</p>`
        }
      </div>
    </section>

  </main>
</div>
  `;
}

// Tears down every document/window-level listener registered by this page
// in one shot (see destroyMoviePlayer() at the bottom). Created fresh each
// time initMoviePlayer() runs.
let controller: AbortController | undefined;

// Hides the player iframe and shows a Retry message when the server can't
// be reached, both while loading and midway through playback. See
// iframeGuard.ts for how detection works. Timers/listeners are stopped
// automatically when `controller` is aborted.
// ------------------------------------------------------------
// Paste this block into movie.ts and tv.ts, replacing the old
// disableIframeError(). It relies on the same `controller` and
// `guardIframe` those files already have.
// ------------------------------------------------------------


const PSEUDO_FS_CLASSES = [
  "!fixed", "!inset-0", "!z-[9999]", "!h-full", "!w-full",
  "!max-w-none", "!rounded-none", "!border-0", "!aspect-auto",
];

function isPlayerFullscreen(el: HTMLElement): boolean {
  const doc = document as any;
  return (
    document.fullscreenElement === el ||
    doc.webkitFullscreenElement === el ||
    el.dataset.pseudoFs === "1"
  );
}

async function togglePlayerFullscreen(el: HTMLElement): Promise<void> {
  const doc = document as any;
  const anyEl = el as any;

  if (isPlayerFullscreen(el)) {
    if (el.dataset.pseudoFs === "1") {
      el.classList.remove(...PSEUDO_FS_CLASSES);
      delete el.dataset.pseudoFs;
      document.body.style.overflow = "";
    } else {
      try { await (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.()); } catch { /* ignore */ }
    }
    try { (screen.orientation as any)?.unlock?.(); } catch {}
    return;
  }

  const request = anyEl.requestFullscreen ?? anyEl.webkitRequestFullscreen;
  if (request) {
    try {
      await request.call(el);
      try { await (screen.orientation as any)?.lock?.("landscape"); } catch {}
      return;
    } catch { }
  }

  el.classList.add(...PSEUDO_FS_CLASSES);
  el.dataset.pseudoFs = "1";
  document.body.style.overflow = "hidden";
}

// Hides the player iframe and shows a Retry message when the server can't
// be reached. Also adds double-click / double-tap fullscreen to the player.
function disableIframeError(): void {
  window.scrollTo({ top: 0, behavior: "smooth" });
  const iframe = document.getElementById("iframe") as HTMLIFrameElement | null;
  const error = document.getElementById("error") as HTMLElement | null;
  if (!iframe || !error) return;
  guardIframe(iframe, error, controller?.signal);

  // ---- double tap / double click -> fullscreen ----
  // The iframe's parent is the player <section>, so no template change needed.
  const player = iframe.parentElement as HTMLElement | null;
  if (!player) return;
  const signal = controller?.signal;

  // 1) Desktop double-click.
  player.addEventListener("dblclick", () => void togglePlayerFullscreen(player), { signal });

  // 2) Touch double-tap (more reliable than dblclick on mobile browsers).
  let lastTap = 0;
  player.addEventListener(
    "touchend",
    (e) => {
      const now = Date.now();
      if (now - lastTap < 300) {
        e.preventDefault(); // stop the browser's double-tap zoom
        void togglePlayerFullscreen(player);
        lastTap = 0;
      } else {
        lastTap = now;
      }
    },
    { signal }
  );

  // 3) A small button that always works, even over the iframe.
  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("aria-label", "Toggle fullscreen");
  btn.className =
    "absolute right-2 top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full " +
    "bg-black/50 text-white/80 ring-1 ring-white/15 backdrop-blur-sm transition " +
    "active:scale-90 hover:bg-[#8b5cf6] hover:text-white";
  btn.innerHTML =
    '<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
    '<path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"/></svg>';
  btn.addEventListener("click", () => void togglePlayerFullscreen(player), { signal });
  player.appendChild(btn);

  // Escape also leaves the CSS-fallback fullscreen (the native one handles itself).
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape" && player.dataset.pseudoFs === "1") void togglePlayerFullscreen(player);
    },
    { signal }
  );

  // Don't leave the body scroll-locked if the page is torn down mid-fullscreen.
  signal?.addEventListener("abort", () => {
    document.body.style.overflow = "";
    try { (screen.orientation as any)?.unlock?.(); } catch { /* ignore */ }
  });
}

// Goes back to whatever page the user came from. Falls back to the plain
// href (#home) when there is no history to go back to.
function initBackLink(): void {
  const link = document.querySelector<HTMLAnchorElement>("[data-back-link]");
  if (!link) return;
  link.addEventListener(
    "click",
    (e) => {
      if (history.length > 1) {
        e.preventDefault();
        history.back();
      }
    },
    { signal: controller?.signal }
  );
  document.addEventListener(
    "click",
    (e) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[data-replace]");
      if (!a) return;
      e.preventDefault();
      location.replace(a.href); // still fires hashchange, so your router re-renders
    },
    { signal: controller?.signal }
  );
}

//auto scroll to server
function initServerAutoScroll(): void {
  const track = document.querySelector<HTMLElement>("[data-scroll-servers]");
  const active = track?.querySelector<HTMLElement>("[data-active-server]");
  if (!track || !active) return;
  const center = () => {
    const t = track.getBoundingClientRect();
    const a = active.getBoundingClientRect();
    const left = track.scrollLeft + (a.left - t.left) - (t.width - a.width) / 2;
    // "instant" overrides the track's scroll-smooth class so it doesn't animate on load
    track.scrollTo({ left: Math.max(0, left), behavior: "instant" });
  };
  // Tailwind's Play CDN applies styles after the HTML is inserted, so measure
  // once the track has real overflow instead of guessing a delay.
  const observer = new ResizeObserver(() => {
    if (track.scrollWidth > track.clientWidth) {
      center();
      observer.disconnect();
    }
  });
  observer.observe(track);
  controller?.signal.addEventListener("abort", () => observer.disconnect());
}


// ------------------------------------------------------------
// WISH LIST BUTTON
// states: checking -> idle | done,  idle -> loading -> done | error
// "checking", "loading" and "done" are all non-clickable.
// ------------------------------------------------------------
type WishlistState = "checking" | "idle" | "loading" | "done" | "error";

const WL_BASE =
  "inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-bold transition-all duration-200 ";

const WL_STYLES: Record<WishlistState, string> = {
  checking: "border-white/10 bg-white/[0.04] text-zinc-500 cursor-wait",
  idle:     "border-[#8b5cf6]/40 bg-[#8b5cf6]/15 text-[#c4b5fd] hover:bg-[#8b5cf6] hover:text-white active:scale-95 cursor-pointer",
  loading:  "border-[#8b5cf6]/40 bg-[#8b5cf6]/15 text-[#c4b5fd] cursor-wait",
  done:     "border-emerald-400/40 bg-emerald-500/15 text-emerald-300 cursor-default",
  error:    "border-red-400/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 active:scale-95 cursor-pointer",
};

const WL_LABELS: Record<WishlistState, string> = {
  checking: "Checking…",
  idle: "Add to Wish List",
  loading: "Adding…",
  done: "In Wish List",
  error: "Failed, tap to retry",
};

const WL_ICONS: Record<WishlistState, string> = {
  checking: '<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity=".25" stroke-width="3"/><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  loading: "", // filled below (same spinner)
  idle: '<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14"/></svg>',
  done: '<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>',
  error: '<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6L6 18"/></svg>',
};
WL_ICONS.loading = WL_ICONS.checking;

function setWishlistState(btn: HTMLButtonElement, state: WishlistState): void {
  btn.dataset.state = state;
  btn.className = WL_BASE + WL_STYLES[state];
  // Only idle / error are clickable; checking, loading and done stay disabled.
  btn.disabled = !(state === "idle" || state === "error");
  const icon = btn.querySelector("[data-wishlist-icon]");
  const label = btn.querySelector("[data-wishlist-label]");
  if (icon) icon.innerHTML = WL_ICONS[state];
  if (label) label.textContent = WL_LABELS[state];
}

async function initWishlistButton(): Promise<void> {
  const btn = document.querySelector<HTMLButtonElement>("[data-wishlist-btn]");
  if (!btn) return;

  const id = btn.dataset.id as string;
  const type = btn.dataset.type || "movie";
  const signal = controller?.signal;
  const w = window as any;

  setWishlistState(btn, "checking");

  // Page load: is it already in the list?
  try {
    const exists = await w.existInWishList(id);
    if (signal?.aborted) return;
    setWishlistState(btn, exists ? "done" : "idle");
  } catch {
    if (signal?.aborted) return;
    setWishlistState(btn, "idle"); // check failed, let the user try
  }

  btn.addEventListener("click", async () => {
      const s = btn.dataset.state;
      if (s !== "idle" && s !== "error") return;
      setWishlistState(btn, "loading");

      try {
        await w.updatateWishList(id, type, 1, 1);
      } catch (err) {
        // Log the real reason so we can see what call() is rejecting with.
        console.error("updatateWishList failed:", err);

        // The write may have succeeded even though the reply failed.
        // Ask the DB directly before telling the user it failed.
        try {
          if (await w.existInWishList(id, type)) {
            if (!signal?.aborted) setWishlistState(btn, "done");
            return;
          }
        } catch (err2) {
          console.error("existInWishList re-check failed:", err2);
        }
        if (!signal?.aborted) setWishlistState(btn, "error");
        return;
      }

      if (signal?.aborted) return;
      setWishlistState(btn, "done");
    },
    { signal }
  );
}



export function initMoviePlayer(): void {
  controller = new AbortController();
  disableIframeError();
  initBackLink();
  initServerAutoScroll();
  void initWishlistButton();
}

// Call this before unmounting the page (e.g. navigating to another route).
// Aborts the controller, which stops the iframe guard's timers and removes
// every document/window listener registered above, so nothing keeps this
// page's DOM alive or fires after it's gone.
export function destroyMoviePlayer(): void {
  controller?.abort();
  controller = undefined;
}