// pages/latesTv.ts

//window functions
// declare global {
//   interface Window {
//     getPopularTvSeries: (page: number|string) => Promise<{
//       results: any[];
//       page?: number;
//       total_pages?: number;
//       total_results?: number;
//     }>;
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

export async function renderPopularTvPage(params: URLSearchParams): Promise<string> {

  let page = Number(params.get('page')) || 1;
  if (page < 1) page = 1;

  // getLatestTVSeries is a plain listing (no query), so — same as
  // latest.ts — there's nothing to gate the fetch on, always load the
  // requested page.
  const data: any = await window.getPopularTvSeries(page);

  const results: any[] = Array.isArray(data?.results) ? data.results : [];

  // /discover/tv (unlike a bare /tv/on_the_air-style endpoint) reliably
  // returns page/total_pages/total_results from TMDB, but kept optional
  // + defensive here for consistency with latest.ts.
  const totalPages = Math.min(Number(data?.total_pages) || 1, 500); // TMDB caps at 500
  const totalResults = Number(data?.total_results) || results.length;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const pageHref = (p: number) => `#popular_tv?page=${p}`;

  const renderCard = (item: any): string => {
    const name = item.name || item.original_name || "Untitled";
    const year = (item.first_air_date || "").slice(0, 4);
    const rating = typeof item.vote_average === "number" && item.vote_average > 0
      ? item.vote_average.toFixed(1)
      : null;
    const posterSrc = item.poster_path
      ? `${window.BASE_IMG_URL}${item.poster_path}`
      : `${window.NOT_FOUND_IMG}`;

    return `
    <a href="#tv?id=${item.id}&season=1">
      <div class="group/card relative w-full cursor-pointer overflow-hidden rounded-xl bg-[#0e0b16] ring-1 ring-white/[0.06] shadow-xl shadow-black/60 transition-all duration-300 active:scale-[0.97] md:hover:scale-105 md:hover:ring-2 md:hover:ring-[#8b5cf6]/70">
        <div class="relative aspect-[2/3] w-full overflow-hidden bg-zinc-900">
          <img src="${posterSrc}" alt="${name} poster" loading="lazy" class="h-full w-full object-cover md:group-hover/card:scale-105 transition">
          <div class="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0e0b16]/80 to-transparent"></div>
          <span class="absolute top-2 left-2 rounded-md bg-[#8b5cf6]/25 text-[#ddd6fe] ring-[#8b5cf6]/50 px-2 py-0.5 text-[10px] font-bold tracking-wide ring-1 ring-inset backdrop-blur-sm">
            TV
          </span>
          ${rating ? `
          <span class="absolute top-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold text-[#c4b5fd] backdrop-blur-sm">
            ★ ${rating}
          </span>
          ` : ""}
        </div>
        <div class="p-2.5 sm:p-3">
          <h3 class="font-bold text-white text-[13px] sm:text-sm truncate group-hover/card:text-[#c4b5fd] transition">${name}</h3>
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

    <!-- RESULTS HEADER -->
    <section class="mt-4 sm:mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
      <div>
        <h1 class="flex items-center gap-2.5 text-xl font-black tracking-wide text-white sm:text-2xl">
          <span class="h-6 w-1 rounded-full bg-gradient-to-b from-[#a78bfa] to-[#6d28d9]"></span>Popular TV Series
        </h1>
        <p class="mt-1 text-xs text-zinc-500 font-medium">${totalResults.toLocaleString()} total results</p>
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
            <h2 class="mt-4 text-lg font-bold text-white">No results on this page</h2>
            <p class="mt-1 text-sm text-zinc-500">Try going back to an earlier page.</p>
          </div>`
      }
    </section>

    <!-- PAGINATION (buttons stretch full-width on phones for easy tapping) -->
    ${totalPages > 1 ? `
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

  </main>
</div>
  `;
}

// Tears down every document/window-level listener registered by this page
// in one shot (see destroyLatestTvPage() at the bottom). Created fresh
// each time initLatestTvPage() runs. Currently a no-op body since this
// page has no interactive listeners beyond plain <a> navigation, but kept
// for consistency with the other pages and in case that changes later.
let controller: AbortController | undefined;

export function initPopularTvPage(): void {
  controller = new AbortController();
  window.scrollTo({top: 0,behavior: "smooth",});
}

// Call this before unmounting the page (e.g. navigating to another route).
// Removes every document/window listener registered above, so nothing
// keeps this page's DOM alive or fires after it's gone.
export function destroyPopularTvPage(): void {
  controller?.abort();
  controller = undefined;
}