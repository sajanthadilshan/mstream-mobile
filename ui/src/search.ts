// pages/search.ts

//window functions
// declare global {
//   interface Window {
//     searchMoviesAndTv: (message: string) => Promise<{ results: any[]; }>;
//     BASE_IMG_URL: String;
//   }
// }

// ============================================================
// DESIGN TOKENS (shared with the other pages)
// base #060509 | surface #0e0b16 | primary #8b5cf6 | primary-dk #6d28d9
// accent #a78bfa | lavender #c4b5fd
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

// Minimal HTML-escaping for the one piece of genuinely user-controlled
// text on this page (the search query), since it gets reflected back
// into an <input value="..."> and a heading. TMDB-sourced fields
// (titles, overviews, etc.) are interpolated raw throughout this
// project already, so this is intentionally scoped to just the query.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function renderSearchPage(params: URLSearchParams): Promise<string> {

  const query = params.get('q') || "";
  const trimmedQuery = query.trim();

  let page = Number(params.get('page')) || 1;
  if (page < 1) page = 1;

  // 'all' | 'movie' | 'tv' — filters the already-fetched page of
  // results client-side. Note this does NOT change TMDB's pagination
  // math (total_pages/total_results reflect the combined, unfiltered
  // set), so a filtered page can legitimately come up short or empty
  // even when other pages have matches.
  const typeFilter = (params.get('type') || 'all').toLowerCase();

  let data: any = { results: [], page: 1, total_pages: 0, total_results: 0 };

  if (trimmedQuery) {
    // Cast locally to the real implementation's signature: the shared
    // Window.searchMoviesAndTv type is `(message: string) => ...`, but
    // the actual tmdbFetch-backed function also takes page/region. This
    // mirrors the `as any` widening movie.ts does for movieData, rather
    // than touching the shared declare global.
    const searchFn = window.searchMoviesAndTv as unknown as
      (query: string, page?: number, region?: string) => Promise<any>;
    data = await searchFn(trimmedQuery, page);
  }

  const allResults: any[] = Array.isArray(data?.results) ? data.results : [];
  const results = typeFilter === 'all'
    ? allResults
    : allResults.filter((item) => item.media_type === typeFilter);

  const totalPages = Math.min(Number(data?.total_pages) || 1, 500); // TMDB caps at 500
  const totalResults = Number(data?.total_results) || 0;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  // Builds a #search hash preserving query/type, only page changes.
  const pageHref = (p: number) =>
    `#search?q=${encodeURIComponent(trimmedQuery)}&type=${typeFilter}&page=${p}`;

  const filterHref = (type: string) =>
    `#search?q=${encodeURIComponent(trimmedQuery)}&type=${type}&page=1`;

  const filterTabs: Array<{ key: string; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'movie', label: 'Movies' },
    { key: 'tv', label: 'TV Shows' },
  ];

  const renderCard = (item: any): string => {
    const isMovie = item.media_type === 'movie';
    const name = isMovie ? (item.title || item.original_title) : (item.name || item.original_name);
    const dateStr = isMovie ? item.release_date : item.first_air_date;
    const year = (dateStr || "").slice(0, 4);
    const rating = typeof item.vote_average === "number" && item.vote_average > 0
      ? item.vote_average.toFixed(1)
      : null;
    const posterSrc = item.poster_path
      ? `${window.BASE_IMG_URL}${item.poster_path}`
      : `${window.NOT_FOUND_IMG}`;
    const href = isMovie
      ? `#movie?id=${item.id}`
      : `#tv?id=${item.id}&season=1`;

    return `
    <a href="${href}">
      <div class="group/card relative w-full cursor-pointer overflow-hidden rounded-xl bg-[#0e0b16] ring-1 ring-white/[0.06] shadow-xl shadow-black/60 transition-all duration-300 active:scale-[0.97] md:hover:scale-105 md:hover:ring-2 md:hover:ring-[#8b5cf6]/70">
        <div class="relative aspect-[2/3] w-full overflow-hidden bg-zinc-900">
          <img src="${posterSrc}" alt="${name || "Untitled"} poster" loading="lazy" class="h-full w-full object-cover md:group-hover/card:scale-105 transition">
          <div class="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0e0b16]/80 to-transparent"></div>
          <span class="absolute top-2 left-2 rounded-md ${
            isMovie ? "bg-[#818cf8]/20 text-[#c7d2fe] ring-[#818cf8]/40" : "bg-[#8b5cf6]/25 text-[#ddd6fe] ring-[#8b5cf6]/50"
          } px-2 py-0.5 text-[10px] font-bold tracking-wide ring-1 ring-inset backdrop-blur-sm">
            ${isMovie ? "MOVIE" : "TV"}
          </span>
          ${rating ? `
          <span class="absolute top-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold text-[#c4b5fd] backdrop-blur-sm">
            ★ ${rating}
          </span>
          ` : ""}
        </div>
        <div class="p-2.5 sm:p-3">
          <h3 class="font-bold text-white text-[13px] sm:text-sm truncate group-hover/card:text-[#c4b5fd] transition">${name || "Untitled"}</h3>
          <p class="mt-0.5 text-[11px] sm:text-xs text-zinc-500 font-medium">${year || "—"}</p>
        </div>
      </div>
    </a>`;
  };

  const pageBtn = "flex-1 sm:flex-none text-center rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-zinc-300 active:scale-95 hover:border-[#8b5cf6]/50 hover:bg-[#8b5cf6]/10 hover:text-white transition";
  const pageBtnOff = "flex-1 sm:flex-none text-center rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2.5 text-xs font-bold text-zinc-700 cursor-not-allowed";

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
      <a href="#home" class="group flex items-center gap-2 rounded-full bg-white/[0.04] py-2 pl-3 pr-4 ring-1 ring-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95 transition sm:bg-transparent sm:p-0 sm:ring-0">
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

    <!-- SEARCH BAR -->
    <section class="mt-2 sm:mt-4">
      <form data-search-form class="relative sm:max-w-xl">
        <input
          data-search-input
          type="search"
          inputmode="search"
          enterkeyhint="search"
          value="${escapeHtml(query)}"
          placeholder="Search movies and TV shows..."
          autocomplete="off"
          class="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 pr-12 text-base sm:text-sm font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-[#a78bfa] focus:bg-white/[0.08] focus:ring-1 focus:ring-[#a78bfa] transition"
        />
        <button
          type="submit"
          aria-label="Search"
          class="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-zinc-400 hover:text-[#c4b5fd] active:scale-90 transition"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35m0 0a7.5 7.5 0 10-10.6 0 7.5 7.5 0 0010.6 0z"/>
          </svg>
        </button>
      </form>
    </section>

    ${!trimmedQuery ? `
    <!-- EMPTY STATE: NO QUERY YET -->
    <section class="mt-20 sm:mt-24 flex flex-col items-center justify-center text-center">
      <span class="text-4xl">🔍</span>
      <h2 class="mt-4 text-lg font-bold text-white">Search for something to watch</h2>
      <p class="mt-1 text-sm text-zinc-500">Try a movie title, a show, or an actor's name.</p>
    </section>
    ` : `

    <!-- RESULTS HEADER + TYPE FILTER TABS -->
    <section class="mt-6 sm:mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
      <div class="min-w-0">
        <h1 class="flex items-center gap-2.5 text-xl font-black tracking-wide text-white sm:text-2xl">
          <span class="h-6 w-1 flex-shrink-0 rounded-full bg-gradient-to-b from-[#a78bfa] to-[#6d28d9]"></span>
          <span class="truncate">Results for "${escapeHtml(trimmedQuery)}"</span>
        </h1>
        <p class="mt-1 text-xs text-zinc-500 font-medium">${totalResults.toLocaleString()} total results</p>
      </div>

      <div class="flex items-center gap-2">
        ${filterTabs.map((tab) => {
          const active = typeFilter === tab.key;
          return `
          <a
            href="${filterHref(tab.key)}"
            data-filter-btn
            class="flex-1 sm:flex-none text-center rounded-lg border px-3.5 py-2 text-xs font-bold tracking-wide transition-all duration-200 active:scale-95 ${
              active
                ? "border-[#a78bfa]/50 bg-[#8b5cf6]/15 text-[#c4b5fd] shadow-[0_0_16px_-4px_rgba(139,92,246,0.6)]"
                : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-[#8b5cf6]/50 hover:bg-[#8b5cf6]/10 hover:text-white"
            }"
          >
            ${tab.label}
          </a>`;
        }).join("")}
      </div>
    </section>

    <!-- RESULTS GRID -->
    <section class="mt-6 sm:mt-8">
      ${
        results.length
          ? `<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
              ${results.map(renderCard).join("")}
            </div>`
          : `
          <div class="mt-12 flex flex-col items-center justify-center text-center">
            <span class="text-4xl">🗂️</span>
            <h2 class="mt-4 text-lg font-bold text-white">No ${typeFilter === 'all' ? '' : typeFilter + ' '}results on this page</h2>
            <p class="mt-1 text-sm text-zinc-500">Try a different search term${typeFilter !== 'all' ? ", or switch tabs" : ""}.</p>
          </div>`
      }
    </section>

    <!-- PAGINATION (buttons stretch full-width on phones for easy tapping) -->
    ${results.length || totalPages > 1 ? `
    <section class="mt-10 sm:mt-12 flex items-center justify-center gap-3">
      ${hasPrev ? `
      <a href="${pageHref(page - 1)}" class="${pageBtn}">← Prev</a>
      ` : `
      <span aria-disabled="true" class="${pageBtnOff}">← Prev</span>
      `}

      <span class="whitespace-nowrap text-xs font-semibold text-zinc-400 tracking-wide">Page ${page} of ${totalPages}</span>

      ${hasNext ? `
      <a href="${pageHref(page + 1)}" class="${pageBtn}">Next →</a>
      ` : `
      <span aria-disabled="true" class="${pageBtnOff}">Next →</span>
      `}
    </section>
    ` : ""}
    `}

  </main>
</div>
  `;
}

// Tears down every document/window-level listener registered by this page
// in one shot (see destroySearchPage() at the bottom). Created fresh each
// time initSearchPage() runs.
let controller: AbortController | undefined;

// Wires the search form's submit — this is the one interaction on the
// page that can't just be a plain <a href="#search?..."> link, since the
// query text is free-form user input rather than a fixed value.
function initSearchForm(): void {
  const form = document.querySelector<HTMLFormElement>("[data-search-form]");
  const input = document.querySelector<HTMLInputElement>("[data-search-input]");
  if (!form || !input) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    window.location.hash = `#search?q=${encodeURIComponent(q)}&type=all&page=1`;
    // Dismiss the on-screen keyboard on mobile after submitting.
    input.blur();
  }, { signal: controller?.signal });
}

export function initSearchPage(): void {
  controller = new AbortController();
  initSearchForm();
}

// Call this before unmounting the page (e.g. navigating to another route).
// Removes every document/window listener registered above, so nothing
// keeps this page's DOM alive or fires after it's gone.
export function destroySearchPage(): void {
  controller?.abort();
  controller = undefined;
}