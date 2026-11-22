// pages/wish-list.ts
//
// Infinite-scroll watch history, grouped by date. Distinct from home.ts's
// card-grid rows on purpose: history is inherently chronological, so a
// vertical list with date headers (like browser history) reads better
// than a thumbnail grid here.
//
// Data comes from the native bridge (see native_bridge.js):
//   window.getHistory(page, limit)  -> { data: [{ entry, details }], page, total, hasNextPage, ... }
//   window.deleteHistoryById(id)
//   window.deleteHistoryAll()
// window.getHistory() already fetches the TMDB details, so this page no longer
// enriches entries itself.
//
// Design note on scroll loading: pagination state lives on the
// #history-groups container's dataset instead of module-level JS state,
// so it can't go stale across re-navigations. The list block (groups +
// sentinel + end message) lives inside #history-content, which is swapped
// wholesale for the empty state.
//
// DESIGN TOKENS (shared with the other pages)
// base #060509 | surface #0e0b16 | primary #8b5cf6 | primary-dk #6d28d9
// accent #a78bfa | lavender #c4b5fd | destructive actions stay red

const HISTORY_PAGE_LIMIT = 15;
const MIN_DELETING_CARD_MS = 450; // so the deleting card never just flashes

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================================
// DATA HELPERS
// ============================================================

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatRelativeTime(sqliteUtc: string): string {
  // SQLite's datetime('now') returns UTC with no timezone marker —
  // parsed as-is, JS treats that as *local* time, silently skewing every
  // timestamp by the viewer's UTC offset. Force UTC interpretation first.
  const utcIso = sqliteUtc.replace(' ', 'T') + 'Z';
  const then = new Date(utcIso).getTime();
  const diffMin = Math.floor((Date.now() - then) / 60000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(utcIso).toLocaleDateString();
}

/** Bucket key for a timestamp, in the viewer's local time. */
function dateGroupKey(sqliteUtc: string): 'today' | 'yesterday' | 'week' | 'older' {
  const utcIso = sqliteUtc.replace(' ', 'T') + 'Z';
  const date = new Date(utcIso);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.floor((startOfDay(now) - startOfDay(date)) / 86400000);

  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return 'week';
  return 'older';
}

function dateGroupLabel(key: string): string {
  switch (key) {
    case 'today': return 'Today';
    case 'yesterday': return 'Yesterday';
    case 'week': return 'This Week';
    default: return 'Earlier';
  }
}

/**
 * Buckets a chronologically-sorted list into contiguous date groups.
 * Relies on the backend already returning rows ordered by time DESC —
 * that ordering means each date bucket forms one unbroken run, so a
 * single forward pass (no re-sorting/searching) is enough to group them,
 * and the same guarantee is what makes appendEntriesToDom()'s incremental
 * merge (below) safe to do without re-scanning existing DOM groups.
 */
function groupEntries(items: HistoryItem[]): { key: string; label: string; items: HistoryItem[] }[] {
  const groups: { key: string; label: string; items: HistoryItem[] }[] = [];
  for (const item of items) {
    const key = dateGroupKey(item.entry.time);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
    } else {
      groups.push({ key, label: dateGroupLabel(key), items: [item] });
    }
  }
  return groups;
}

// ============================================================
// TEMPLATE
// ============================================================

function renderSpinner(sizeClass: string): string {
  return `
  <svg class="animate-spin ${sizeClass}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
    <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
  </svg>`;
}

function renderHistoryRow({ entry, details }: HistoryItem): string {
  const isMovie = entry.type === 'movie';
  const rawTitle = details
    ? (isMovie ? (details.title || details.original_title) : (details.name || details.original_name))
    : `Unknown ${isMovie ? 'Movie' : 'Series'}`;
  const title = escapeHtml(rawTitle);
  const backdropPath = details?.backdrop_path || details?.poster_path;
  const imageSrc = backdropPath
    ? `${window.BASE_IMG_URL}${backdropPath}`
    : `${window.NOT_FOUND_IMG}`;

  const href = isMovie
    ? `#movie?id=${entry.tmdb_id}`
    : `#tv?id=${entry.tmdb_id}&season=${entry.season || 1}&ep=${entry.episode}`;

  const episodeLabel = !isMovie && entry.season
    ? `S${entry.season}${entry.episode ? ` · E${entry.episode}` : ''}`
    : null;
history
  return `
  <div data-history-row data-row-id="${entry.id}" class="group/row flex items-center gap-3 rounded-xl bg-[#0e0b16] p-2 pr-1.5 ring-1 ring-white/[0.06] shadow-lg shadow-black/50 transition-all duration-200 active:bg-[#14101f] md:hover:bg-[#14101f] md:hover:ring-[#8b5cf6]/50 sm:gap-4 sm:pr-3">
    <a href="${href}" data-link class="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
      <img src="${imageSrc}" alt="${title} thumb" loading="lazy" class="h-14 w-24 flex-shrink-0 rounded-lg object-cover ring-1 ring-white/10 sm:h-20 sm:w-36">
      <div class="min-w-0 flex-1">
        <h3 class="truncate text-sm font-bold text-white transition group-hover/row:text-[#c4b5fd] sm:text-base">${title}</h3>
        <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-500 sm:text-xs">
          <span class="font-semibold text-[#a78bfa]">${isMovie ? 'Movie' : 'TV Series'}</span>
          ${episodeLabel ? `<span>${episodeLabel}</span>` : ''}
          <span>${formatRelativeTime(entry.time)}</span>
        </div>
      </div>
    </a>
    <button
      data-action="remove-history"
      data-row-id="${entry.id}"
      aria-label="Remove from history"
      class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-zinc-500 transition active:bg-red-500/15 active:text-red-400 md:h-8 md:w-8 md:text-zinc-600 md:hover:bg-red-500/10 md:hover:text-red-400">
      <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>`;
}

/** Classes swapped onto a row while its "deleting" card is showing. */
const DELETING_ROW_CLASS =
  'flex min-h-[72px] items-center gap-3 rounded-xl bg-[#0e0b16] p-2 pr-3 ring-1 ring-[#8b5cf6]/30 shadow-lg shadow-black/50 sm:min-h-[96px] sm:gap-4';

function renderDeletingCard(title: string): string {
  return `
    <div class="flex h-14 w-24 flex-shrink-0 items-center justify-center rounded-lg bg-[#8b5cf6]/10 text-[#a78bfa] sm:h-20 sm:w-36">
      ${renderSpinner('h-6 w-6')}
    </div>
    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold text-zinc-200">Removing from wish list…</p>
      <p class="mt-0.5 truncate text-xs text-zinc-500">${escapeHtml(title)}</p>
    </div>`;
}

function renderDeleteFailedCard(title: string): string {
  return `
    <div class="flex h-14 w-24 flex-shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400 sm:h-20 sm:w-36">
      <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
    </div>
    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold text-red-300">Couldn't remove this entry</p>
      <p class="mt-0.5 truncate text-xs text-zinc-500">${escapeHtml(title)}</p>
    </div>`;
}

function renderGroupSection(group: { key: string; label: string; items: HistoryItem[] }): string {
  return `
  <section class="history-group" data-group-key="${group.key}">
    <h2 class="sticky top-0 z-20 -mx-4 mb-3 mt-6 flex items-center gap-2 bg-[#060509]/85 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#a78bfa] backdrop-blur-md first:mt-0 sm:static sm:mx-0 sm:mt-8 sm:bg-transparent sm:px-0 sm:py-0 sm:text-sm sm:text-zinc-500 sm:backdrop-blur-none">
      <span class="h-3.5 w-1 rounded-full bg-gradient-to-b from-[#a78bfa] to-[#6d28d9] sm:hidden"></span>${group.label}
    </h2>
    <div data-group-list class="flex flex-col gap-2">
      ${group.items.map(renderHistoryRow).join('')}
    </div>
  </section>`;
}

/** The list block: groups container + scroll sentinel + end message. */
function renderListBlock(page: HistoryPageResult): string {
  const groups = groupEntries(page.data);
  const lastGroupKey = groups.length ? groups[groups.length - 1].key : '';

  return `
    <div
      id="history-groups"
      data-has-more="${page.hasNextPage}"
      data-next-page="${page.page + 1}"
      data-last-group-key="${lastGroupKey}">
      ${groups.map(renderGroupSection).join('')}
    </div>

    <div id="history-sentinel" class="h-1"></div>
    <p id="history-end-message" class="${page.hasNextPage ? 'hidden ' : ''}mt-8 text-center text-xs text-zinc-600">
      You've reached the end of the wish list.
    </p>`;
}

function renderSkeletonRow(): string {
  return `
  <div class="flex items-center gap-4 rounded-xl bg-[#0e0b16] p-2 pr-3 ring-1 ring-white/[0.06] animate-pulse">
    <div class="h-14 w-24 flex-shrink-0 rounded-lg bg-[#8b5cf6]/10 sm:h-20 sm:w-36"></div>
    <div class="flex-1 space-y-2">
      <div class="h-4 w-1/3 rounded bg-[#8b5cf6]/10"></div>
      <div class="h-3 w-1/4 rounded bg-[#8b5cf6]/10"></div>
    </div>
  </div>`;
}

function renderLoadErrorRow(): string {
  return `
  <div id="history-load-error" class="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
    <span>Couldn't load more from wish list.</span>
    <button data-action="retry-load-more" class="rounded-md px-2 py-1 font-semibold text-red-400 transition hover:underline">Retry</button>
  </div>`;
}

function renderEmptyState(): string {
  return `
  <div class="flex flex-col items-center justify-center px-4 py-24 text-center">
    <div class="flex h-20 w-20 items-center justify-center rounded-full bg-[#8b5cf6]/10 ring-1 ring-[#8b5cf6]/30">
      <svg class="h-10 w-10 text-[#a78bfa]" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <p class="mt-5 max-w-xs text-sm text-zinc-500">Nothing here yet. Titles you add to watch list will appear here.</p>
    <a href="#home" data-link class="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#8b5cf6]/25 ring-1 ring-inset ring-white/10 active:scale-95 transition">Browse titles &rarr;</a>
  </div>`;
}

function renderClearHistoryModal(): string {
  return `
  <div id="confirm-clear-modal" class="hidden fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 px-4 pb-4 backdrop-blur-sm sm:items-center sm:pb-0">
    <div class="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0e0b16] p-6 text-center shadow-2xl shadow-black" style="padding-bottom: max(1.5rem, env(safe-area-inset-bottom));">

      <div data-clear-panel="confirm">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/30">
          <svg class="h-6 w-6 text-red-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
          </svg>
        </div>
        <h3 class="text-base font-bold text-white">Clear all of the wish list?</h3>
        <p class="mt-1.5 text-sm text-zinc-400">This removes every title from your history. This can't be undone.</p>
        <p id="clear-error" class="mt-3 hidden text-xs font-semibold text-red-400">Couldn't clear your wish list. Please try again.</p>
        <div class="mt-5 flex gap-3">
          <button data-action="cancel-clear-history" class="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-zinc-300 transition active:scale-95 hover:bg-white/[0.08]">
            Cancel
          </button>
          <button data-action="confirm-clear-history" class="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition active:scale-95 hover:bg-red-500">
            Clear All
          </button>
        </div>
      </div>

      <div data-clear-panel="progress" class="hidden py-4" role="status" aria-live="polite">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#8b5cf6]/10 text-[#a78bfa] ring-1 ring-[#8b5cf6]/30">
          ${renderSpinner('h-6 w-6')}
        </div>
        <h3 class="text-base font-bold text-white">Clearing your history…</h3>
        <p class="mt-1.5 text-sm text-zinc-400">Removing every title. Hang tight.</p>
      </div>

    </div>
  </div>`;
}

function renderHeader(total: number): string {
  return `
  <header class="relative z-10 mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-6 lg:px-8" style="padding-top: max(1rem, env(safe-area-inset-top));">
    <div class="flex min-w-0 items-center gap-3 sm:gap-4">
      <a href="#home" data-link aria-label="Back to home" class="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-white/[0.04] py-2 pl-2.5 pr-3.5 text-sm font-semibold text-zinc-400 ring-1 ring-white/10 transition active:scale-95 hover:bg-white/[0.08] hover:text-white sm:bg-transparent sm:p-0 sm:ring-0 sm:hover:bg-transparent sm:hover:text-[#c4b5fd]">
        <svg class="h-4 w-4 text-[#a78bfa]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        Home
      </a>
      <h1 class="truncate text-lg font-bold text-white sm:text-2xl">Wish List</h1>
    </div>
    <button id="clear-all-btn" data-action="clear-all-history" class="${total > 0 ? '' : 'hidden '}flex-shrink-0 rounded-lg border border-red-500/30 px-3.5 py-2 text-xs font-semibold text-red-400 transition active:scale-95 hover:bg-red-500/10 sm:px-4">
      Clear All
    </button>
  </header>`;
}

// Shared ambient glow (kept dim so the page reads as near-black).
const AMBIENT_GLOW = `
  <div class="fixed inset-0 z-0 pointer-events-none">
    <div class="absolute -top-40 -left-40 h-[360px] w-[360px] sm:h-[500px] sm:w-[500px] rounded-full bg-[#8b5cf6]/[0.09] blur-[120px]"></div>
    <div class="absolute bottom-0 right-0 h-[320px] w-[320px] sm:h-[500px] sm:w-[500px] rounded-full bg-[#6d28d9]/[0.06] blur-[140px]"></div>
  </div>`;

export async function renderWishList(_params: URLSearchParams): Promise<string> {
  let historyPage: HistoryPageResult;
  try {
    // Already enriched: each item is { entry, details }.
    // historyPage = (await window.getWishList(1, HISTORY_PAGE_LIMIT)) as HistoryPageResult;
    historyPage = await window.getWishList(1, HISTORY_PAGE_LIMIT);
  } catch (err) {
    document.body.innerText = 
    "<h1 style='color:white;'>If you see this, the wish list list has crashed!<h1>"+JSON.stringify(err);
   historyPage = { data: [], page: 1, limit: HISTORY_PAGE_LIMIT, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false };
  }

  const hasHistory = historyPage.total > 0;

  return `
<div id="history-main" class="relative min-h-screen overflow-x-hidden bg-[#060509] text-zinc-100 font-sans antialiased selection:bg-[#8b5cf6] selection:text-white">
  ${AMBIENT_GLOW}

  ${renderHeader(historyPage.total)}

  <main class="relative z-10 mx-auto max-w-4xl px-4 pb-24 sm:px-6 lg:px-8" style="padding-bottom: max(6rem, env(safe-area-inset-bottom));">
    <div id="history-content">
      ${hasHistory ? renderListBlock(historyPage) : renderEmptyState()}
    </div>
  </main>

  ${renderClearHistoryModal()}
</div>`;
}

// ============================================================
// PAGE INITIALIZER
// ============================================================

let controller: AbortController | undefined;
let observer: IntersectionObserver | undefined;
let isLoadingMore = false;
let isClearing = false;
let epoch = 0; // bumped when the list is wiped, so in-flight page loads get dropped

/**
 * Merges a newly-fetched page's entries into the existing #history-groups
 * DOM. Because the backend returns rows ordered by time DESC and
 * groupEntries() buckets contiguously, at most the *first* new group can
 * possibly continue the DOM's last-rendered group — everything after
 * that in the new batch is guaranteed to start a fresh section. That's
 * what makes a single forward merge pass correct without re-scanning
 * earlier groups already in the DOM.
 */
function appendEntriesToDom(container: HTMLElement, items: HistoryItem[]): void {
  const groups = groupEntries(items);

  groups.forEach((group, i) => {
    if (i === 0 && container.dataset.lastGroupKey === group.key) {
      const lastSection = container.lastElementChild;
      const list = lastSection?.querySelector('[data-group-list]');
      list?.insertAdjacentHTML('beforeend', group.items.map(renderHistoryRow).join(''));
    } else {
      container.insertAdjacentHTML('beforeend', renderGroupSection(group));
    }
    container.dataset.lastGroupKey = group.key;
  });
}

export function initWishList(): void {
  
  document.getElementById('page-loader')?.style.setProperty('display', 'none');

  controller = new AbortController();
  const signal = controller.signal;

  isLoadingMore = false;
  isClearing = false;
  epoch++;

  const getContent = () => document.getElementById('history-content');
  const getGroups = () => document.getElementById('history-groups');
  const getSentinel = () => document.getElementById('history-sentinel');
  const modal = document.getElementById('confirm-clear-modal');
  const clearAllBtn = document.getElementById('clear-all-btn');

  // ---------- modal ----------

  function setModalBusy(busy: boolean, failed = false): void {
    modal?.querySelector('[data-clear-panel="confirm"]')?.classList.toggle('hidden', busy);
    modal?.querySelector('[data-clear-panel="progress"]')?.classList.toggle('hidden', !busy);
    document.getElementById('clear-error')?.classList.toggle('hidden', !failed);
  }

  const openClearModal = () => {
    setModalBusy(false);
    modal?.classList.remove('hidden');
  };
  const closeClearModal = () => {
    if (isClearing) return; // can't dismiss mid-delete
    modal?.classList.add('hidden');
  };

  // ---------- observer ----------

  function setupObserver(): void {
    observer?.disconnect();
    observer = undefined;

    const groups = getGroups();
    const sentinel = getSentinel();
    // Only watch for scroll-triggered loads if there's actually more to load.
    if (!groups || !sentinel || groups.dataset.hasMore !== 'true') return;

    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadNextPage();
      },
      { rootMargin: '400px 0px' } // fire the fetch before the sentinel is actually on-screen
    );
    observer.observe(sentinel);
  }

  /** Re-arm the observer: if the sentinel is still on-screen after a load, this fires again. */
  function rearmSentinel(): void {
    const sentinel = getSentinel();
    if (!observer || !sentinel) return;
    observer.unobserve(sentinel);
    observer.observe(sentinel);
  }

  // ---------- empty state ----------

  /** Wipes the list area and shows the empty state. Header + modal stay mounted. */
  function showEmptyState(): void {
    epoch++; // cancel any in-flight page load
    observer?.disconnect();
    observer = undefined;
    isLoadingMore = false;

    const content = getContent();
    if (content) content.innerHTML = renderEmptyState();
    clearAllBtn?.classList.add('hidden');
    window.scrollTo({ top: 0 });
  }

  // ---------- infinite scroll ----------

  async function loadNextPage(): Promise<void> {
    const groups = getGroups();
    const sentinel = getSentinel();
    if (!groups || isLoadingMore) return;
    if (groups.dataset.hasMore !== 'true') return;

    isLoadingMore = true;
    const myEpoch = epoch;
    document.getElementById('history-load-error')?.remove();

    const skeletonMarker = document.createElement('div');
    skeletonMarker.dataset.skeletonBatch = 'true';
    skeletonMarker.className = 'mt-2 flex flex-col gap-2';
    skeletonMarker.innerHTML = [0, 1, 2].map(() => renderSkeletonRow()).join('');
    sentinel?.insertAdjacentElement('beforebegin', skeletonMarker);

    const nextPage = Number(groups.dataset.nextPage || '2');

    try {
      const result = (await window.getWishList(nextPage, HISTORY_PAGE_LIMIT)) as HistoryPageResult;
      if (myEpoch !== epoch) return; // list was wiped meanwhile; discard

      appendEntriesToDom(groups, result.data);

      groups.dataset.hasMore = String(result.hasNextPage);
      groups.dataset.nextPage = String(result.page + 1);

      if (!result.hasNextPage) {
        observer?.disconnect();
        document.getElementById('history-end-message')?.classList.remove('hidden');
      } else {
        rearmSentinel();
      }
    } catch (err) {
      if (myEpoch === epoch) {
        getSentinel()?.insertAdjacentHTML('beforebegin', renderLoadErrorRow());
      }
      console.error('Failed to load more history:', err);
    } finally {
      skeletonMarker.remove();
      if (myEpoch === epoch) isLoadingMore = false;
    }
  }

  // ---------- deleting a single row ----------

  /** Drop empty date sections and keep lastGroupKey pointing at the real last section. */
  function pruneEmptyGroups(): void {
    const groups = getGroups();
    if (!groups) return;
    groups.querySelectorAll<HTMLElement>('.history-group').forEach((section) => {
      if (!section.querySelector('[data-history-row]')) section.remove();
    });
    const last = groups.lastElementChild as HTMLElement | null;
    groups.dataset.lastGroupKey = last?.dataset.groupKey ?? '';
  }

  function afterRowsChanged(): void {
    pruneEmptyGroups();
    const groups = getGroups();
    if (!groups) return;
    if (groups.querySelectorAll('[data-history-row]').length > 0) return;

    // Nothing left on screen.
    if (groups.dataset.hasMore === 'true') {
      void loadNextPage(); // there's more history behind what we've loaded
    } else {
      showEmptyState();
    }
  }

  async function removeRow(removeBtn: HTMLElement): Promise<void> {
    const row = removeBtn.closest<HTMLElement>('[data-history-row]');
    const rowId = removeBtn.dataset.rowId;
    if (!row || !rowId || row.dataset.deleting === 'true') return;

    row.dataset.deleting = 'true';
    const originalHtml = row.innerHTML;
    const originalClass = row.className;
    const title = row.querySelector('h3')?.textContent?.trim() || 'this title';

    // Swap the row for a "deleting" card (same footprint, so the list doesn't jump).
    row.className = DELETING_ROW_CLASS;
    row.setAttribute('aria-busy', 'true');
    row.innerHTML = renderDeletingCard(title);

    const startedAt = Date.now();
    try {
      await window.deleteWishListById(rowId);

      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_DELETING_CARD_MS) await sleep(MIN_DELETING_CARD_MS - elapsed);

      // Fade out, then remove.
      row.style.transition = 'opacity 200ms ease, transform 200ms ease';
      row.style.opacity = '0';
      row.style.transform = 'translateX(12px)';
      await sleep(200);

      row.remove();
      afterRowsChanged();
    } catch (err) {
      console.error('Failed to remove wish list entry:', err);
      row.className = DELETING_ROW_CLASS;
      row.innerHTML = renderDeleteFailedCard(title);
      await sleep(1800);
      // Restore the original row so the user can retry.
      row.className = originalClass;
      row.innerHTML = originalHtml;
      row.removeAttribute('aria-busy');
      delete row.dataset.deleting;
    }
  }

  // ---------- clear all ----------

  async function clearAllHistory(): Promise<void> {
    if (isClearing) return;
    isClearing = true;
    setModalBusy(true);

    const startedAt = Date.now();
    try {
      await window.deleteWishListAll();

      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_DELETING_CARD_MS) await sleep(MIN_DELETING_CARD_MS - elapsed);

      isClearing = false;
      closeClearModal();
      showEmptyState(); // clears the screen in place — no page reload
    } catch (err) {
      console.error('Failed to clear wish list:', err);
      isClearing = false;
      setModalBusy(false, true); // back to the confirm panel with an error line
    }
  }

  // ---------- wiring ----------

  setupObserver();

  document.body.addEventListener(
    'click',
    async (event) => {
      const target = event.target as HTMLElement;

      const removeBtn = target.closest<HTMLElement>('[data-action="remove-history"]');
      if (removeBtn) {
        event.preventDefault(); // the row underneath is a link; don't navigate
        await removeRow(removeBtn);
        return;
      }

      if (target.closest('[data-action="clear-all-history"]')) { openClearModal(); return; }
      if (target.closest('[data-action="cancel-clear-history"]')) { closeClearModal(); return; }

      if (target.closest('[data-action="confirm-clear-history"]')) {
        await clearAllHistory();
        return;
      }

      if (target.closest('[data-action="retry-load-more"]')) {
        document.getElementById('history-load-error')?.remove();
        void loadNextPage();
        return;
      }

      if (target.id === 'confirm-clear-modal') closeClearModal();
    },
    { signal }
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') closeClearModal();
    },
    { signal }
  );
}

export function destroyWishList(): void {
  epoch++;
  observer?.disconnect();
  observer = undefined;
  controller?.abort();
  controller = undefined;
  isLoadingMore = false;
  isClearing = false;
}