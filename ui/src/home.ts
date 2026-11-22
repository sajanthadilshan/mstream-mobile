// pages/home.ts
import { isApiKeyError, renderApiKeyAlert, initApiKeyAlert } from "./tmdb_key";
import { hasNumber,addNumber } from "./cookies";

// ============================================================
// DESIGN TOKENS (reference)
// base        #060509  near-black with a faint violet undertone
// surface     #0e0b16  cards, panels
// primary     #8b5cf6  violet (buttons, badges)
// primary-dk  #6d28d9  gradient end
// accent      #a78bfa  soft violet (links, active states)
// lavender    #c4b5fd  highlights / hover text
// ============================================================

// ============================================================
// template
// no inline event handlers used all use data=* for select elements
// ============================================================

//hero slides styles
const HERO_STYLE_PRESETS = [
  { badgeBg: "bg-[#8b5cf6]/20", badgeText: "text-[#c4b5fd]", badgeRing: "ring-[#8b5cf6]/40", dot: "bg-[#a78bfa]" },
  { badgeBg: "bg-[#c4b5fd]/15", badgeText: "text-[#ddd6fe]", badgeRing: "ring-[#c4b5fd]/30", dot: "bg-[#8b5cf6]" },
  { badgeBg: "bg-[#818cf8]/20", badgeText: "text-[#a5b4fc]", badgeRing: "ring-[#818cf8]/40", dot: "bg-[#818cf8]" },
];

// Eased fade-out so the backdrop dissolves into the page instead of ending on an edge.
// -webkit- variant is needed for Safari / iOS WebViews.
const HERO_FADE_MASK =
  "[mask-image:linear-gradient(to_bottom,#000_0%,#000_45%,rgba(0,0,0,0.85)_60%,rgba(0,0,0,0.5)_78%,rgba(0,0,0,0.18)_90%,transparent_100%)] " +
  "[-webkit-mask-image:linear-gradient(to_bottom,#000_0%,#000_45%,rgba(0,0,0,0.85)_60%,rgba(0,0,0,0.5)_78%,rgba(0,0,0,0.18)_90%,transparent_100%)]";

let notifications: any[] = [];

// ------------------------------------------------------------
// side menu helpers
// ------------------------------------------------------------
const menuItemClass =
  "group/mi flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-zinc-300 " +
  "hover:bg-[#8b5cf6]/10 hover:text-[#c4b5fd] active:bg-[#8b5cf6]/15 transition";

function menuIcon(path: string): string {
  return `<svg class="h-5 w-5 flex-shrink-0 text-[#a78bfa]" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${path}"/></svg>`;
}

function menuItem(href: string, label: string, iconPath: string): string {
  return `<a href="${href}" data-menu-link class="${menuItemClass}">${menuIcon(iconPath)}${label}</a>`;
}

function renderHeroSlide(item: any, index: number, isActive: boolean): string {
  const isMovie = item.media_type === "movie";
  const title = isMovie ? (item.title || item.original_title) : (item.name || item.original_name);
  const backdropPath = item.backdrop_path || item.poster_path;
  const backdropSrc = backdropPath
    ? `${window.BASE_IMG_URL}${backdropPath}`
    : `${window.NOT_FOUND_IMG}`;
  const href = isMovie ? `#movie?id=${item.id}` : `#tv?id=${item.id}&season=1`;
  const style = HERO_STYLE_PRESETS[index % HERO_STYLE_PRESETS.length];

  return `
    <div id="hero-slide-${index}" class="hero-slide slide-opacity absolute inset-0 w-full h-full ${
      isActive ? "opacity-100 scale-100 z-10 pointer-events-auto" : "opacity-0 scale-95 z-0 pointer-events-none"
    } transition-all duration-700 ease-in-out">
      <!-- masked layer: image + tints fade to transparent so the hero dissolves into the page background -->
      <div class="absolute inset-0 ${HERO_FADE_MASK}">
        <img src="${backdropSrc}" class="h-full w-full object-cover object-top sm:object-center brightness-[0.4]" alt="${title || "Featured title"} backdrop">
        <div class="absolute inset-0 bg-gradient-to-t from-[#060509]/80 via-[#060509]/30 to-transparent"></div>
        <div class="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#060509]/70 to-transparent"></div>
        <div class="absolute inset-0 bg-gradient-to-tr from-[#6d28d9]/15 via-transparent to-transparent"></div>
      </div>
      <div class="absolute bottom-0 left-0 right-0 mx-auto w-full max-w-7xl px-5 pb-24 sm:px-6 sm:pb-24 lg:px-8 z-20">
        <span class="inline-flex items-center gap-1.5 rounded-full ${style.badgeBg} px-3 py-1 text-[11px] sm:text-xs font-semibold tracking-wide ${style.badgeText} ring-1 ring-inset ${style.badgeRing} backdrop-blur-sm">
          <span class="h-1.5 w-1.5 rounded-full ${style.dot} animate-pulse"></span>${isMovie ? "TRENDING MOVIE" : "TRENDING SERIES"}
        </span>
        <h1 class="mt-3 sm:mt-4 text-3xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-7xl max-w-3xl drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)]">
          ${title || "Untitled"}
        </h1>
        ${item.overview ? `
        <p class="mt-3 sm:mt-4 max-w-xl text-[13px] sm:text-base text-zinc-300 leading-relaxed line-clamp-2 sm:line-clamp-3">
          ${item.overview}
        </p>
        ` : ""}
        <div class="mt-5 sm:mt-6 flex items-center gap-3">
          <a href="${href}" class="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] px-6 py-3 text-sm sm:text-base font-bold text-white shadow-lg shadow-[#8b5cf6]/25 ring-1 ring-inset ring-white/10 active:scale-[0.98] md:hover:scale-[1.03] md:hover:shadow-[#8b5cf6]/40 transition duration-200">
            <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>${isMovie ? "Watch Now" : "Watch Episode 1"}
          </a>
        </div>
      </div>
    </div>`;
}

function renderHeroFallbackSlide(): string {
  return `
    <div id="hero-slide-0" class="hero-slide slide-opacity absolute inset-0 w-full h-full opacity-100 scale-100 z-10 pointer-events-auto transition-all duration-700 ease-in-out">
      <div class="absolute inset-0 ${HERO_FADE_MASK}">
        <img src="${window.NOT_FOUND_IMG}" class="h-full w-full object-cover brightness-[0.35]" alt="Showcase Backdrop">
        <div class="absolute inset-0 bg-gradient-to-t from-[#060509]/80 via-[#060509]/30 to-transparent"></div>
        <div class="absolute inset-0 bg-gradient-to-tr from-[#6d28d9]/15 via-transparent to-transparent"></div>
      </div>
      <div class="absolute bottom-0 left-0 right-0 mx-auto w-full max-w-7xl px-5 pb-24 sm:px-6 lg:px-8 z-20">
        <span class="inline-flex items-center gap-1.5 rounded-full bg-[#8b5cf6]/20 px-3 py-1 text-[11px] sm:text-xs font-semibold tracking-wide text-[#c4b5fd] ring-1 ring-inset ring-[#8b5cf6]/40">
          <span class="h-1.5 w-1.5 rounded-full bg-[#a78bfa] animate-pulse"></span>WELCOME TO MSTREAM
        </span>
        <h1 class="mt-3 sm:mt-4 text-3xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-7xl max-w-3xl">
          DISCOVER YOUR NEXT <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#a78bfa] to-[#6d28d9]">WATCH</span>
        </h1>
      </div>
    </div>`;
}

function renderMediaCard(item: any, mediaType: "movie" | "tv"): string {
  const isMovie = mediaType === "movie";
  const title = isMovie ? (item.title || item.original_title) : (item.name || item.original_name);
  const dateStr = isMovie ? item.release_date : item.first_air_date;
  const year = (dateStr || "").slice(0, 4);
  const backdropPath = item.backdrop_path || item.poster_path;
  const imageSrc = backdropPath
    ? `${window.BASE_IMG_URL}${backdropPath}`
    : `${window.NOT_FOUND_IMG}`;
  const href = isMovie ? `#movie?id=${item.id}` : `#tv?id=${item.id}&season=1`;

  return `
  <a href="${href}" class="group/card relative w-[10.5rem] flex-shrink-0 snap-start cursor-pointer overflow-hidden rounded-xl bg-[#0e0b16] ring-1 ring-white/[0.06] shadow-xl shadow-black/60 transition-all duration-300 active:scale-[0.97] md:hover:scale-105 md:hover:ring-2 md:hover:ring-[#8b5cf6]/70 md:hover:shadow-[#8b5cf6]/10 sm:w-60 lg:w-64">
    <img src="${imageSrc}" alt="${title || "Untitled"} thumb" loading="lazy" class="aspect-[16/10] w-full object-cover">
    <div class="p-2.5 sm:p-3">
      <h3 class="font-bold text-white text-[13px] sm:text-base truncate group-hover/card:text-[#c4b5fd] transition">${title || "Untitled"}</h3>
      <div class="mt-1 flex items-center gap-2 text-[11px] sm:text-xs text-zinc-500">
        <span class="text-[#a78bfa] font-semibold">${isMovie ? "Movie" : "TV Series"}</span>
        <span>${year || "—"}</span>
      </div>
    </div>
  </a>`;
}

// Reusable horizontally-scrolling row. Each [data-scroll-row] is
// self-contained (no shared IDs), so it's safe to render as many as needed.
// Arrow buttons are desktop-only (max-md:!hidden) - on touch devices people swipe.
function renderScrollRow(title: string, seeAllHref: string, cardsHtml: string): string {
  const arrow = (dir: -1 | 1, hidden: boolean) => `
    <button data-scroll-dir="${dir}" aria-label="${dir === -1 ? "Scroll left" : "Scroll right"}" class="${hidden ? "hidden" : "flex"} max-md:!hidden absolute ${dir === -1 ? "-left-5" : "-right-5"} top-1/2 z-40 h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-[#0e0b16]/85 border border-white/10 text-white opacity-0 backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-[#8b5cf6] hover:border-transparent group-hover/slider:opacity-100 shadow-xl shadow-black/60">
      <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${dir === -1 ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"}"></path></svg>
    </button>`;

  return `
    <section class="mb-8 sm:mb-12">
      <div class="mb-1 sm:mb-3 flex items-center justify-between">
        <h2 class="flex items-center gap-2.5 text-lg font-bold tracking-wide text-white sm:text-2xl">
          <span class="h-5 w-1 rounded-full bg-gradient-to-b from-[#a78bfa] to-[#6d28d9]"></span>${title}
        </h2>
        <a href="${seeAllHref}" class="rounded-full px-3 py-1.5 text-xs font-semibold text-[#a78bfa] hover:text-[#c4b5fd] hover:bg-[#8b5cf6]/10 transition">See all &rarr;</a>
      </div>
      <div class="group/slider relative" data-scroll-row>
        ${arrow(-1, true)}
        <div data-scroll-track class="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto scroll-smooth px-4 py-4 sm:mx-0 sm:gap-4 sm:px-2">
          ${cardsHtml}
        </div>
        ${arrow(1, false)}
      </div>
    </section>`;
}

// getByCategory returns { movies, tv, totalPages } (not { results }).
// Interleave both lists into one row, tagging each item with its type so
// the right card/link is rendered even if the API omitted media_type.
function buildCategoryCards(raw: any, emptyMessage: string): string {
  const movies: any[] = Array.isArray(raw?.movies) ? raw.movies : [];
  const tv: any[] = Array.isArray(raw?.tv) ? raw.tv : [];

  const out: string[] = [];
  const max = Math.max(movies.length, tv.length);
  for (let i = 0; i < max; i++) {
    if (movies[i]) out.push(renderMediaCard(movies[i], "movie"));
    if (tv[i]) out.push(renderMediaCard(tv[i], "tv"));
  }

  return out.length
    ? out.join("")
    : `<p class="text-sm text-zinc-500 px-2 py-4">${emptyMessage}</p>`;
}

export async function renderHome(): Promise<string> {
  let tmdbError: unknown = null;
  const captureError = (err: unknown) => { tmdbError = err; return null; };

  // Fetched in parallel — none of these depend on each other.
  const [trendingRaw, popularMoviesRaw, popularTvRaw, romanceRaw, horrorRaw, notificationRaw] = await Promise.all([
    window.getTrending(1).catch(captureError) as Promise<any>,
    window.getPopularMovies(1).catch(captureError) as Promise<any>,
    window.getPopularTvSeries(1).catch(captureError) as Promise<any>,
    window.getByCategory("romance", 1).catch(captureError) as Promise<any>,
    window.getByCategory("horror", 1).catch(captureError) as Promise<any>,
    window.getNotifications().catch(captureError) as Promise<any>,
  ]);

  if (isApiKeyError(tmdbError)) {
    return renderApiKeyAlert();
  }

  // Hero: top 4 trending movie/tv items (drop 'person' results, which
  // /trending/all/day can also return and which have no player page).
  const trendingResults: any[] = Array.isArray(trendingRaw?.results) ? trendingRaw.results : [];
  const heroItems = trendingResults
    .filter((item) => item.media_type === "movie" || item.media_type === "tv")
    .slice(0, 4);

  console.log(notificationRaw)
  const allNotifications: any[] = Array.isArray(notificationRaw) ? notificationRaw : [];
  notifications = allNotifications;
  let newNotifications = false;
  const notificationHtml = allNotifications.map((item: any) => 
    `<div style="display:none;">${hasNumber(item.id)?"": newNotifications = true}</div>
    <div>
      <div class="flex items-center gap-2">
        <span class="h-1.5 w-1.5 rounded-full bg-[#a78bfa]"></span>
        <span class="text-xs font-bold text-white">${item.title}</span>
        <span class="text-[10px] text-zinc-500">${item.date}</span>
      </div>
      <ul class="mt-2 space-y-1.5 pl-3.5">
        <li class="text-xs text-zinc-400">${item.message}</li>
      </ul>
    </div>`).join("");

  const heroSlidesHtml = heroItems.length
    ? heroItems.map((item, i) => renderHeroSlide(item, i, i === 0)).join("")
    : renderHeroFallbackSlide();

  const indicatorsHtml = heroItems.length
    ? heroItems.map((_, i) => {
        return i === 0
          ? `<button data-slide-index="0" id="indicator-0" aria-label="Slide 1" class="h-2 w-8 rounded-full bg-[#a78bfa] shadow-sm shadow-[#a78bfa] transition-all duration-300"></button>`
          : `<button data-slide-index="${i}" id="indicator-${i}" aria-label="Slide ${i + 1}" class="h-2 w-2 rounded-full bg-white/25 hover:bg-[#8b5cf6] transition-all duration-300"></button>`;
      }).join("")
    : `<button data-slide-index="0" id="indicator-0" aria-label="Slide 1" class="h-2 w-8 rounded-full bg-[#a78bfa] shadow-sm shadow-[#a78bfa] transition-all duration-300"></button>`;

  // Popular rows: first page each, defensive against a failed fetch.
  const popularMovies: any[] = Array.isArray(popularMoviesRaw?.results) ? popularMoviesRaw.results : [];
  const popularTv: any[] = Array.isArray(popularTvRaw?.results) ? popularTvRaw.results : [];

  const popularMoviesHtml = popularMovies.length
    ? popularMovies.map((item) => renderMediaCard(item, "movie")).join("")
    : `<p class="text-sm text-zinc-500 px-2 py-4">No popular movies available right now.</p>`;

  const popularTvHtml = popularTv.length
    ? popularTv.map((item) => renderMediaCard(item, "tv")).join("")
    : `<p class="text-sm text-zinc-500 px-2 py-4">No popular TV series available right now.</p>`;

  const romanceHtml = buildCategoryCards(romanceRaw, "No romance titles available right now.");
  const horrorHtml = buildCategoryCards(horrorRaw, "No horror titles available right now.");

  // Shared chip style for the genre buttons at the bottom.
  const chip = "rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-bold text-zinc-400 active:scale-95 hover:border-[#8b5cf6]/50 hover:bg-[#8b5cf6]/10 hover:text-white transition";

  return `
<div class="relative min-h-screen bg-[#060509] text-zinc-100 font-sans antialiased selection:bg-[#8b5cf6] selection:text-white overflow-x-hidden">

  <!-- BACKGROUND AMBIENT GLOW SYSTEM (kept dim so the page reads as near-black) -->
  <div class="fixed inset-0 z-0 pointer-events-none">
    <div class="absolute -top-40 -left-40 h-[360px] w-[360px] sm:h-[500px] sm:w-[500px] rounded-full bg-[#8b5cf6]/[0.09] blur-[120px] animate-pulse" style="animation-duration: 8s;"></div>
    <div class="absolute bottom-0 right-0 h-[380px] w-[380px] sm:h-[600px] sm:w-[600px] rounded-full bg-[#6d28d9]/[0.07] blur-[140px] animate-pulse" style="animation-duration: 12s;"></div>
  </div>

  <!-- 1. RESPONSIVE HEADER & NAVBAR (WITH REAL-TIME SEARCH) -->
  <!-- header is the positioning parent for dropdowns on mobile so they span the full screen width -->
  <header id="main-header" class="fixed top-0 z-50 w-full bg-gradient-to-b from-[#060509] via-[#060509]/70 to-transparent backdrop-blur-sm transition-all duration-300" style="padding-top: env(safe-area-inset-top);">
    <div class="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 pt-0 pb-2 sm:px-6 sm:py-4 lg:px-8">

      <!-- Left Anchor: Menu button & Navigation -->
      <div class="flex items-center gap-8">
        <!-- Menu button (opens side drawer) -->
        <button id="menu-btn" type="button" aria-label="Open menu" aria-controls="side-menu" aria-expanded="false"
          class="group/menu relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-white/[0.14] to-white/[0.04] text-[#c4b5fd] backdrop-blur-md ring-1 ring-inset ring-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_16px_rgba(139,92,246,0.18)] hover:from-[#8b5cf6]/30 hover:to-white/[0.06] hover:text-white hover:ring-[#a78bfa]/40 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa] transition-all duration-200">
          <!-- glass sheen -->
          <span class="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.12] to-transparent"></span>
          <svg class="relative h-5 w-5 drop-shadow-[0_0_6px_rgba(167,139,250,0.55)]" fill="none" stroke="currentColor" stroke-width="2.25" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M4 12h16M4 17h10"/></svg>
        </button>

        <nav class="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
          <a href="#" class="text-white hover:text-[#c4b5fd] transition duration-200">Home</a>
          <a href="#popular_tv" class="hover:text-[#c4b5fd] transition duration-200">TV Shows</a>
          <a href="#popular_movies" class="hover:text-[#c4b5fd] transition duration-200">Movies</a>
        </nav>
      </div>

      <!-- Right Anchor: Functional Actions, Search Engine & Notifications -->
      <div class="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-4 sm:flex-none">

        <!-- Live Search Field Wrapper Container -->
        <div class="flex min-w-0 flex-1 flex-col justify-center sm:relative sm:flex-none">
          <div class="relative flex items-center">
            <input
              id="search-input"
              type="search"
              inputmode="search"
              enterkeyhint="search"
              placeholder="Search titles, genres..."
              class="w-full sm:w-72 lg:w-[420px] rounded-full bg-white/[0.06] border border-white/10 py-2.5 sm:py-2 pl-4 pr-10 text-base sm:text-sm text-zinc-200 placeholder-zinc-500 focus:border-[#a78bfa] focus:bg-white/[0.08] focus:outline-none focus:ring-1 focus:ring-[#a78bfa] transition-all duration-300"
              autocomplete="off">
            <svg class="absolute right-3.5 h-4 w-4 text-zinc-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <!-- DYNAMIC SEARCH RESULT PANEL -->
          <div id="search-results-panel" class="hidden absolute left-3 right-3 top-full mt-2 sm:left-auto sm:right-0 sm:mt-3 sm:w-72 lg:w-[420px] max-h-[70vh] sm:max-h-96 overflow-y-auto rounded-2xl bg-[#0e0b16]/95 border border-white/10 p-2 shadow-2xl shadow-black/70 backdrop-blur-xl z-50 no-scrollbar transition-all duration-200">
            <div id="results-target" class="flex flex-col gap-1">
              <!-- Rendered Javascript elements inject here natively -->
            </div>
          </div>
        </div>

        <!-- NOTIFICATION ICON & SUB-MENU CONTAINER (now shows release notes / version info) -->
        <div class="flex flex-shrink-0 flex-col justify-center sm:relative">
          <button
            id="notification-btn"
            type="button"
            class="relative p-2.5 text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded-full transition-all duration-200 focus:outline-none ring-1 ring-white/10"
            aria-label="View release notes">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            ${newNotifications?`<span id="notification-badge" class="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#a78bfa] opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#a78bfa]"></span>
            </span>`:""}
          </button>

          <!-- RELEASE NOTES SUB-MENU PANEL -->
          <div id="notification-panel" class="hidden absolute left-3 right-3 top-full mt-2 sm:left-auto sm:right-0 sm:mt-3 sm:w-96 rounded-2xl bg-[#0e0b16]/95 border border-white/10 p-4 shadow-2xl shadow-black/70 backdrop-blur-xl z-50 transition-all duration-200">
            <div class="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-bold text-white">Hello there...</h3>
              </div>
              <button id="clear-notifications" class="hidden text-xs text-zinc-400 hover:text-[#c4b5fd] transition duration-150">Dismiss</button>
            </div>

            <div class="flex flex-col gap-4 max-h-[60vh] sm:max-h-80 overflow-y-auto no-scrollbar pr-1">

              <!-- v1.1.0 -->
              ${notificationHtml}

            </div>

            <a href="#" class="mt-3 block text-center text-xs font-semibold text-[#a78bfa] hover:underline transition">
              <!--View full changelog &rarr;-->
            </a>
          </div>
        </div>

      </div>
    </div>
  </header>

  <!-- SIDE MENU: overlay + drawer. Lives OUTSIDE <header>: the header's backdrop-blur would otherwise make
       these fixed elements position relative to the header instead of the viewport. -->
  <div id="side-menu-overlay" class="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-300"></div>

  <aside id="side-menu" aria-label="Main menu" aria-hidden="true" inert
    class="fixed inset-y-0 left-0 z-[70] flex w-72 max-w-[85vw] -translate-x-full flex-col border-r border-white/[0.07] bg-[#0e0b16]/95 shadow-2xl shadow-black/70 backdrop-blur-xl transition-transform duration-300 ease-out"
    style="padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom);">

    <!-- ambient glow -->
    <div class="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-[#8b5cf6]/[0.12] blur-[90px]"></div>

    <div class="relative flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
      <a href="#" data-menu-link aria-label="MSTREAM home" class="text-lg font-black tracking-wide text-white">
        <span class="text-[#a78bfa]">M</span>STREAM
      </a>
      <button id="menu-close" type="button" aria-label="Close menu" class="rounded-full p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white transition">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>

    <nav class="relative flex-1 overflow-y-auto no-scrollbar px-3 py-4">
      <p class="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Browse</p>
      ${menuItem("#", "Home", "M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10")}
      ${menuItem("#categories", "Categories", "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z")}
      <button type="button" data-menu-search class="${menuItemClass}">
        ${menuIcon("M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z")}Search
      </button>
      ${menuItem("#popular_movies", "Movies", "M7 4v16M17 4v16M3 8h4M17 8h4M3 12h18M3 16h4M17 16h4M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z")}
      ${menuItem("#popular_tv", "TV Series", "M4 7h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1zM8 3l4 4 4-4")}

      <div class="my-4 h-px bg-white/[0.07]"></div>

      <p class="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Library</p>
      ${menuItem("#watch_history", "Watch History", "M12 8v4l3 2M21 12a9 9 0 11-3-6.7L21 8M21 3v5h-5")}
      ${menuItem("#wish_list", "Wishlist", "M5 4h14v17l-7-4-7 4z")}
    </nav>

    <div class="relative border-t border-white/[0.07] px-5 py-4 text-[11px] text-zinc-600">MSTREAM &middot; v2.0.0</div>
  </aside>

  <!-- 2. MULTI-SLIDE HERO BANNER ANIMATION MODULE (top 4 trending movies/TV) -->
  <!-- no bg-black here: the slides fade to transparent so the hero dissolves into the page background -->
  <!-- <section class="relative h-[80vh] min-h-[460px] w-full overflow-hidden sm:h-[80vh] lg:h-[95vh]"> -->
  <section class="relative h-[56vh] min-h-[440px] w-full overflow-hidden sm:h-[80vh] lg:h-[95vh]">

    ${heroSlidesHtml}

    <!-- SLIDESHOW INDICATORS: centered row on mobile, vertical stack bottom-right on desktop -->
    <div data-hero-indicators class="absolute bottom-8 left-1/2 -translate-x-1/2 md:bottom-20 md:left-auto md:right-12 md:translate-x-0 z-30 flex flex-row md:flex-col items-center gap-2.5 md:gap-3 rounded-full bg-black/30 px-3 py-2 md:bg-transparent md:p-0 backdrop-blur-sm md:backdrop-blur-none">
      ${indicatorsHtml}
    </div>
  </section>

  <!-- 3. CATEGORIZED MEDIA BROWSING ROWS -->
  <main class="relative z-20 mx-auto max-w-8xl px-4 pb-20 sm:px-6 sm:pb-24 lg:px-8 pt-8 sm:pt-12" style="padding-bottom: max(5rem, env(safe-area-inset-bottom));">

    ${renderScrollRow("Popular Movies", "#popular_movies", popularMoviesHtml)}
    ${renderScrollRow("Popular TV Series", "#popular_tv", popularTvHtml)}
    ${renderScrollRow("Romance", "#categories?cat=romance", romanceHtml)}
    ${renderScrollRow("Horror", "#categories?cat=horror", horrorHtml)}

    <!-- MORE CATEGORIES CTA -->
    <section class="mb-8 mt-4 rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[#8b5cf6]/[0.07] to-[#0e0b16]/70 p-5 sm:p-8 text-center backdrop-blur-sm">
      <h2 class="text-lg font-bold tracking-wide text-white sm:text-2xl">Looking for something else?</h2>
      <p class="mt-2 text-sm text-zinc-400">Browse movies and TV series by genre.</p>
      <div class="mt-5 sm:mt-6 flex flex-wrap items-center justify-center gap-2">
        <a href="#categories?cat=action" class="${chip}">Action</a>
        <a href="#categories?cat=comedy" class="${chip}">Comedy</a>
        <a href="#categories?cat=horror" class="${chip}">Horror</a>
        <a href="#categories?cat=scifi" class="${chip}">Sci-Fi</a>
        <a href="#categories?cat=animation" class="${chip}">Animation</a>
        <a href="#categories?cat=thriller" class="${chip}">Thriller</a>
      </div>
      <a href="#categories" class="mt-6 inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#8b5cf6]/25 ring-1 ring-inset ring-white/10 active:scale-[0.98] md:hover:scale-[1.03] transition duration-200">
        Explore All Categories
        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path></svg>
      </a>
    </section>

  </main>

</div>
  `;
}

// ============================================================
// hero caserousel
// ============================================================

let currentSlideIndex = 0;
//total number of slides
let totalSlides = 1;
let autoRotateTimer: ReturnType <typeof setInterval> | undefined;

//assign event listners to conroller
let controller: AbortController | undefined;

function switchHeroSlide(targetIndex: number): void {
  if (targetIndex === currentSlideIndex) {
    startAutoRotation();
    return;
  }

  clearAutoRotation();

  const currentSlide = document.getElementById(`hero-slide-${currentSlideIndex}`);
  const targetSlide = document.getElementById(`hero-slide-${targetIndex}`);
  const currentIndicator = document.getElementById(`indicator-${currentSlideIndex}`);
  const targetIndicator = document.getElementById(`indicator-${targetIndex}`);

  if (!currentSlide || !targetSlide || !currentIndicator || !targetIndicator) return;

  currentSlide.classList.remove("opacity-100", "scale-100", "z-10", "pointer-events-auto");
  currentSlide.classList.add("opacity-0", "scale-95", "z-0", "pointer-events-none");
  currentIndicator.classList.remove("w-8", "bg-[#a78bfa]", "shadow-sm", "shadow-[#a78bfa]");
  currentIndicator.classList.add("w-2", "bg-white/25");

  targetSlide.classList.remove("opacity-0", "scale-95", "z-0", "pointer-events-none");
  targetSlide.classList.add("opacity-100", "scale-100", "z-10", "pointer-events-auto");
  targetIndicator.classList.remove("w-2", "bg-white/25");
  targetIndicator.classList.add("w-8", "bg-[#a78bfa]", "shadow-sm", "shadow-[#a78bfa]");

  currentSlideIndex = targetIndex;
  startAutoRotation();
}

function startAutoRotation(): void {
  clearAutoRotation();
  if (totalSlides <= 1) return;
  autoRotateTimer = setInterval(() => {
    switchHeroSlide((currentSlideIndex + 1) % totalSlides);
  }, 6000);
}

function clearAutoRotation(): void {
  if (autoRotateTimer) {
    clearInterval(autoRotateTimer);
    autoRotateTimer = undefined;
  }
}

function initHeroIndicators(): void {
  currentSlideIndex = 0;
  totalSlides = document.querySelectorAll(".hero-slide").length || 1;

  const container = document.querySelector<HTMLElement>("[data-hero-indicators]");
  if (!container) return;

  container.addEventListener(
    "click",
    (event) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>("[data-slide-index]");
      if (!button) return;
      const index = Number(button.dataset.slideIndex);
      if (!Number.isNaN(index)) switchHeroSlide(index);
    },
    { signal: controller?.signal }
  );
}

// Swipe left/right on the hero to change slides (mobile).
function initHeroSwipe(): void {
  const hero = document.querySelector<HTMLElement>("[data-hero-indicators]")?.parentElement;
  if (!hero || totalSlides <= 1) return;

  let startX = 0;
  let startY = 0;
  const signal = controller?.signal;

  hero.addEventListener(
    "touchstart",
    (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    },
    { passive: true, signal }
  );

  hero.addEventListener(
    "touchend",
    (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      // Only treat clearly horizontal swipes as slide changes.
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
      const next = dx < 0
        ? (currentSlideIndex + 1) % totalSlides
        : (currentSlideIndex - 1 + totalSlides) % totalSlides;
      switchHeroSlide(next);
    },
    { passive: true, signal }
  );
}

// ============================================================
// horizontal scroll
// ============================================================

function initScrollRows(): void {
  const rows = document.querySelectorAll<HTMLElement>("[data-scroll-row]");

  rows.forEach((row) => {
    const track = row.querySelector<HTMLElement>("[data-scroll-track]");
    const leftBtn = row.querySelector<HTMLElement>('[data-scroll-dir="-1"]');
    const rightBtn = row.querySelector<HTMLElement>('[data-scroll-dir="1"]');
    if (!track || !leftBtn || !rightBtn) return;

    const updateButtons = () => {
      const atStart = track.scrollLeft <= 2;
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
      leftBtn.classList.toggle("hidden", atStart);
      leftBtn.classList.toggle("flex", !atStart);
      rightBtn.classList.toggle("hidden", atEnd);
      rightBtn.classList.toggle("flex", !atEnd);
    };

    const signal = controller?.signal;
    leftBtn.addEventListener("click", () => track.scrollBy({ left: -600, behavior: "smooth" }), { signal });
    rightBtn.addEventListener("click", () => track.scrollBy({ left: 600, behavior: "smooth" }), { signal });
    track.addEventListener("scroll", updateButtons, { signal });
    window.addEventListener("resize", updateButtons, { signal });

    // The Tailwind Play CDN injects its generated styles asynchronously
    // (via a MutationObserver), so right after innerHTML is set the track
    // can briefly have none of its flex/overflow classes actually applied
    // yet — any scrollWidth/clientWidth read at that instant is wrong,
    // which is why the arrow only appeared after a manual scroll event
    // forced a recheck. A ResizeObserver re-measures whenever the track's
    // real layout settles (style injection, image loads, container
    // resize, etc.) instead of guessing how many frames to wait.
    const resizeObserver = new ResizeObserver(updateButtons);
    resizeObserver.observe(track);
    signal?.addEventListener("abort", () => resizeObserver.disconnect());

    updateButtons();
  });
}

// ============================================================
// movie search baar
// ============================================================

function initSearch(): void {
  const searchInput = document.getElementById("search-input") as HTMLInputElement | null;
  const resultsPanel = document.getElementById("search-results-panel");
  const resultsTarget = document.getElementById("results-target");
  const notificationPanel = document.getElementById("notification-panel");

  if (!searchInput || !resultsPanel || !resultsTarget) return;

  const signal = controller?.signal;

  searchInput.addEventListener(
    "input",
    async () => {
      const query = searchInput.value.toLowerCase().trim();

      if (query === "") {
        resultsPanel.classList.add("hidden");
        return;
      }

      const resResults = await window.searchMoviesAndTv(query);
      const matches = resResults.results;

      // Render results
      resultsTarget.innerHTML =
        matches.length === 0
          ? `<p class="text-xs text-zinc-500 p-3 text-center"> No streaming matches found </p>`
          : matches.map((item) => {
              const title = item.media_type === "tv" ? item.name : item.title;
              const date = (item.media_type === "tv" ? item.first_air_date : item.release_date)?.slice(0, 4);
              const image = item.backdrop_path ? `${window.BASE_IMG_URL}${item.backdrop_path}` : `${window.NOT_FOUND_IMG}`;
              // Your site's detail URLs
              const href = item.media_type === "tv" ? `#tv?id=${item.id}` : `#movie?id=${item.id}`;
              return `
            <a href="${href}" class="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.06] active:bg-white/[0.08] group transition duration-150">
                <img src="${image}" alt="${title || "Unknown title"}" class="h-12 w-[4.5rem] sm:h-10 sm:w-14 flex-shrink-0 object-cover rounded bg-zinc-900 border border-white/10" loading="lazy">
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-bold text-white truncate group-hover:text-[#c4b5fd] transition">
                      ${title || "Unknown title"}
                    </h4>
                    <p class="text-xs text-zinc-500 truncate">
                        ${date || "N/A"} • ${item.media_type.toUpperCase()}
                    </p>
                </div>
                <span class="text-zinc-600">▶</span>
            </a>
        `;
            }).join("");

      // Keep the two dropdowns mutually exclusive.
      notificationPanel?.classList.add("hidden");
      resultsPanel.classList.remove("hidden");
    },
    { signal }
  );

  searchInput.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter") {
        const query = searchInput.value.toLowerCase().trim();
        if (query === "") {
          resultsPanel.classList.add("hidden");
          return;
        }
        window.location.href = `#search?q=${query}`;
        // Dismiss the on-screen keyboard on mobile after submitting.
        searchInput.blur();
      }
    },
    { signal }
  );

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target as Node;
      if (!searchInput.contains(target) && !resultsPanel.contains(target)) {
        resultsPanel.classList.add("hidden");
      }
    },
    { signal }
  );
}

// ============================================================
// init notification window
// ============================================================

function markAllRead(): void {
  notifications.forEach((item: any) => addNumber(item.id));
  document.getElementById("notification-badge")?.classList.add("hidden");
}

function initNotifications(): void {
  const notifBtn = document.getElementById("notification-btn");
  const notifPanel = document.getElementById("notification-panel");
  const clearBtn = document.getElementById("clear-notifications");
  const badge = document.getElementById("notification-badge");
  const searchResultsPanel = document.getElementById("search-results-panel");

  if (!notifBtn || !notifPanel) return;

  const signal = controller?.signal;

  notifBtn.addEventListener(
    "click",
    (event) => {
      event.stopPropagation();
      searchResultsPanel?.classList.add("hidden");
      const nowOpen = notifPanel.classList.toggle("hidden") === false;
      if (nowOpen) markAllRead()
    },
    { signal }
  );

  clearBtn?.addEventListener("click", () => badge?.classList.add("hidden"), { signal });

  notifPanel.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-action="download-update"]')) {
        window.__mstreamUpdate?.download();
      }
    },
    { signal }
  );

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target as Node;
      if (!notifPanel.contains(target) && !notifBtn.contains(target)) {
        notifPanel.classList.add("hidden");
      }
    },
    { signal }
  );
}

// ============================================================
// side menu
// ============================================================

function initSideMenu(): void {
  const btn = document.getElementById("menu-btn");
  const drawer = document.getElementById("side-menu");
  const overlay = document.getElementById("side-menu-overlay");
  const closeBtn = document.getElementById("menu-close");
  if (!btn || !drawer || !overlay) return;

  const signal = controller?.signal;
  drawer.inert = true; // keeps hidden links out of the tab order

  const setOpen = (open: boolean) => {
    drawer.classList.toggle("-translate-x-full", !open);
    overlay.classList.toggle("opacity-0", !open);
    overlay.classList.toggle("pointer-events-none", !open);
    overlay.classList.toggle("opacity-100", open);
    drawer.inert = !open;
    drawer.setAttribute("aria-hidden", String(!open));
    btn.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
    if (open) closeBtn?.focus();
    else if (document.activeElement && drawer.contains(document.activeElement)) btn.focus();
  };

  btn.addEventListener("click", () => setOpen(true), { signal });
  closeBtn?.addEventListener("click", () => setOpen(false), { signal });
  overlay.addEventListener("click", () => setOpen(false), { signal });

  document.addEventListener(
    "keydown",
    (e) => { if (e.key === "Escape") setOpen(false); },
    { signal }
  );

  // Close after navigating via any link in the drawer
  drawer.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-menu-link]")) {
        setOpen(false);
        return;
      }
      // "Search" just closes the drawer and focuses the search field
      if (target.closest("[data-menu-search]")) {
        setOpen(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        // wait for the drawer's inert state to clear before focusing
        setTimeout(() => document.getElementById("search-input")?.focus(), 50);
      }
    },
    { signal }
  );
}

// ============================================================
// init header scroll
// ============================================================

function initHeaderScroll(): void {
  const header = document.getElementById("main-header");
  if (!header) return;

  window.addEventListener(
    "scroll",
    () => {
      const scrolled = window.scrollY > 40;
      header.classList.toggle("bg-[#060509]/95", scrolled);
      header.classList.toggle("shadow-xl", scrolled);
      header.classList.toggle("shadow-black/50", scrolled);
      header.classList.toggle("border-b", scrolled);
      header.classList.toggle("border-white/[0.06]", scrolled);
    },
    { passive: true, signal: controller?.signal }
  );
}

// ============================================================
// init page
// ============================================================

export function initHome(): void {
  if (document.getElementById("api-key-form")) {
    initApiKeyAlert();
    return;
  }
  controller = new AbortController();
  initSideMenu();
  initHeroIndicators();
  initHeroSwipe();
  initScrollRows();
  initSearch();
  initNotifications();
  initHeaderScroll();
  startAutoRotation();
}

//unmount the page from dom along with event handlers
export function destroyHome(): void {
  clearAutoRotation();
  document.body.style.overflow = ""; // never leave scroll locked after leaving the page
  controller?.abort();
  controller = undefined;
}