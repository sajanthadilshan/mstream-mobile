// pages/categories.ts

// window functions (expose these in the same place as getPopularMovies)
// declare global {
//   interface Window {
//     getPopularByCategory: (kind: string, page?: number, region?: string) => Promise<{
//       label: string;
//       movies: any[];
//       tv: any[];
//       totalPages: { movies: number; tv: number };
//     }>;
//     BASE_IMG_URL: string;
//     NOT_FOUND_IMG: string;
//   }
// }

// ============================================================
// DESIGN TOKENS (shared with the other pages)
// base        #060509  near-black with a faint violet undertone
// surface     #0e0b16  cards, panels
// primary     #8b5cf6  violet
// primary-dk  #6d28d9  gradient end
// accent      #a78bfa  soft violet (links, active states)
// lavender    #c4b5fd  highlights / hover text
// ============================================================

// Must match the keys of CATEGORIES in tmdb.js.
const CATEGORY_TAGS: { key: string; label: string }[] = [
  { key: "action", label: "Action" },
  { key: "adventure", label: "Adventure" },
  { key: "animation", label: "Animation" },
  { key: "comedy", label: "Comedy" },
  { key: "crime", label: "Crime" },
  { key: "documentary", label: "Documentary" },
  { key: "drama", label: "Drama" },
  { key: "family", label: "Family" },
  { key: "fantasy", label: "Fantasy" },
  { key: "history", label: "History" },
  { key: "horror", label: "Horror" },
  { key: "music", label: "Music" },
  { key: "mystery", label: "Mystery" },
  { key: "romance", label: "Romance" },
  { key: "scifi", label: "Sci-Fi" },
  { key: "thriller", label: "Thriller" },
  { key: "war", label: "War" },
  { key: "western", label: "Western" },
  { key: "kids", label: "Kids" },
  { key: "reality", label: "Reality" },
  { key: "news", label: "News" },
  { key: "tvmovie", label: "TV Movie" },
];

const DEFAULT_CATEGORY = "action";

// Alternates movies and TV so one type doesn't dominate the top of the grid.
function interleave(movies: any[], tv: any[]): any[] {
  const out: any[] = [];
  const max = Math.max(movies.length, tv.length);
  for (let i = 0; i < max; i++) {
    if (movies[i]) out.push(movies[i]);
    if (tv[i]) out.push(tv[i]);
  }
  return out;
}

export async function renderCategoriesPage(params: URLSearchParams): Promise<string> {

  let page = Number(params.get("page")) || 1;
  if (page < 1) page = 1;

  const requested = params.get("cat") || DEFAULT_CATEGORY;
  const activeKey = CATEGORY_TAGS.some((c) => c.key === requested) ? requested : DEFAULT_CATEGORY;
  const activeLabel = CATEGORY_TAGS.find((c) => c.key === activeKey)!.label;

  let results: any[] = [];
  let totalPages = 1;
  let loadFailed = false;

  try {
    const data: any = await window.getByCategory(activeKey, page);
    results = interleave(data?.movies ?? [], data?.tv ?? []);
    totalPages = Math.min(Math.max(data?.totalPages?.movies || 0, data?.totalPages?.tv || 0, 1), 500); // TMDB caps at 500
  } catch (err) {
    console.error(`Failed to load category "${activeKey}":`, err);
    loadFailed = true;
  }

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const pageHref = (p: number) => `#categories?cat=${activeKey}&page=${p}`;
  const tagHref = (key: string) => `#categories?cat=${key}`;

  // NOTE: the active tag keeps the "bg-gradient-to-r" class on purpose -
  // initCategoriesPage() uses it to scroll the selected tag into view.
  const renderTag = (c: { key: string; label: string }): string => {
    const active = c.key === activeKey;
    return `
    <a href="${tagHref(c.key)}" data-link data-cat-tag="${c.key}"
       class="shrink-0 rounded-full px-4 py-2 text-xs font-bold tracking-wide transition active:scale-95 ${
         active
           ? "bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] text-white shadow-lg shadow-[#8b5cf6]/25 ring-1 ring-inset ring-white/10"
           : "border border-white/10 bg-white/[0.03] text-zinc-400 hover:border-[#8b5cf6]/50 hover:bg-[#8b5cf6]/10 hover:text-white"
       }">
      ${c.label}
    </a>`;
  };

  const renderCard = (item: any): string => {
    const isTv = item.media_type === "tv";
    const name = (isTv ? item.name || item.original_name : item.title || item.original_title) || "Untitled";
    const year = ((isTv ? item.first_air_date : item.release_date) || "").slice(0, 4);
    const rating = typeof item.vote_average === "number" && item.vote_average > 0
      ? item.vote_average.toFixed(1)
      : null;
    const posterSrc = item.poster_path
      ? `${window.BASE_IMG_URL}${item.poster_path}`
      : `${window.NOT_FOUND_IMG}`;
    const href = isTv ? `#tv?id=${item.id}` : `#movie?id=${item.id}`;
    // TV = violet, Movie = lavender/indigo, so the two stay distinguishable
    // without leaving the purple palette.
    const badge = isTv
      ? "bg-[#8b5cf6]/25 text-[#ddd6fe] ring-[#8b5cf6]/50"
      : "bg-[#818cf8]/20 text-[#c7d2fe] ring-[#818cf8]/40";

    return `
    <a href="${href}">
      <div class="group/card relative w-full cursor-pointer overflow-hidden rounded-xl bg-[#0e0b16] ring-1 ring-white/[0.06] shadow-xl shadow-black/60 transition-all duration-300 active:scale-[0.97] md:hover:scale-105 md:hover:ring-2 md:hover:ring-[#8b5cf6]/70">
        <div class="relative aspect-[2/3] w-full overflow-hidden bg-zinc-900">
          <img src="${posterSrc}" alt="${name} poster" loading="lazy" class="h-full w-full object-cover md:group-hover/card:scale-105 transition">
          <div class="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0e0b16]/80 to-transparent"></div>
          <span class="absolute top-2 left-2 rounded-md ${badge} px-2 py-0.5 text-[10px] font-bold tracking-wide ring-1 ring-inset backdrop-blur-sm">
            ${isTv ? "TV" : "MOVIE"}
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

  const emptyState = loadFailed
    ? { icon: "⚠️", title: "Couldn't load this category", text: "Check your connection or try another category." }
    : { icon: "🗂️", title: "No results on this page", text: "Try another category or go back to an earlier page." };

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

    <!-- CATEGORY TAGS (swipeable row on phones, wraps on larger screens) -->
    <nav id="category-tags" aria-label="Categories"
         class="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-3 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
         style="scrollbar-width: none;">
      ${CATEGORY_TAGS.map(renderTag).join("")}
    </nav>

    <!-- RESULTS HEADER -->
    <section class="mt-5 sm:mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
      <div>
        <h1 class="flex items-center gap-2.5 text-xl font-black tracking-wide text-white sm:text-2xl">
          <span class="h-6 w-1 rounded-full bg-gradient-to-b from-[#a78bfa] to-[#6d28d9]"></span>${activeLabel}
        </h1>
        <p class="mt-1 text-xs text-zinc-500 font-medium">Popular movies &amp; TV series · ${results.length} on this page</p>
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
            <span class="text-4xl">${emptyState.icon}</span>
            <h2 class="mt-4 text-lg font-bold text-white">${emptyState.title}</h2>
            <p class="mt-1 text-sm text-zinc-500">${emptyState.text}</p>
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

let controller: AbortController | undefined;

export function initCategoriesPage(): void {
  controller = new AbortController();
  window.scrollTo({ top: 0, behavior: "smooth" });

  // Keep the selected tag visible when the row is horizontally scrollable (mobile).
  document
    .querySelector<HTMLElement>("#category-tags .bg-gradient-to-r")
    ?.scrollIntoView({ inline: "center", block: "nearest" });
}

export function destroyCategoriesPage(): void {
  controller?.abort();
  controller = undefined;
}