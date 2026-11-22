// types/window.d.ts
// Single source of truth for every window-bridge function exposed by
// preload.ts. Do NOT declare any of these again inside individual page
// files — TypeScript merges every `declare global { interface Window }`
// block project-wide, and two files declaring the same property with a
// different signature is a hard compile error, not a silent override.

interface PaginatedResult<T = any> {
  results: T[];
  page?: number;
  total_pages?: number;
  total_results?: number;
}

interface PendingOptionalUpdate {
  kind: "optional";
  version?: string;
  download: () => void;
}


declare global {
interface HistoryItem {
  entry: WatchHistoryEntry;
  details: any | null;
}

interface HistoryPageResult {
  data: HistoryItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}


  interface Window {
    // --- movie / tv data --------------------------------------------
    searchMoviesAndTv: (query: string, page?: number) => Promise<PaginatedResult>;
    getMovieById: (id: number | string, hst_update: boolean, server: Number|boolean, append?: string) => Promise<{ [key: string]: any }>;
    getTvSeriesById: (id: number | string, append?: string) => Promise<{ [key: string]: any }>;
    getTvSeason: (id: number | string, season: number | string, episode: number | string, hst_update: boolean, server: Number|boolean, append?: string) => Promise<{ [key: string]: any }>;
    getTrending: (page?: number) => Promise<PaginatedResult>;
    getByCategory: (activeKey: number | string, page?: number) => Promise<PaginatedResult>;
    getPopularMovies: (page?: number | string, region?: string) => Promise<PaginatedResult>;
    getPopularTvSeries: (page?: number | string) => Promise<PaginatedResult>;
    movieRecomend: (id: number | string, page?: number | string) => Promise<PaginatedResult>;
    tvRecomend: (id: number | string, page?: number | string) => Promise<PaginatedResult>;

    updatateHistory:  (id: number | string, type: string, season: number | string, episode: number | string) => Promise<number>;
    getHistory: (page?: number, limit?: number) => Promise<HistoryPageResult>;
    deleteHistoryById: (id: number | string) => Promise<number>;
    deleteHistoryAll: () => Promise<number>;

    updatateWishList:  (id: number | string, type: string, season: number | string, episode: number | string) => Promise<number>;
    existInWishList: (id: number | string) => Promise<number>;
    getWishList: (page?: number, limit?: number) => Promise<HistoryPageResult>;
    deleteWishListById: (id: number | string) => Promise<number>;
    deleteWishListAll: () => Promise<number>;

    BASE_IMG_URL: string;
    NOT_FOUND_IMG: string;
    devtools: () => void;

    // --- app update / server ops --------------------------------------
    appUpdate: () => Promise<any>;
    getUpdateInfo: () => Promise<any>;
    checkDownloadProgress: () => Promise<{ percentage: number; downloadedMB: number; totalMB: number; finished: boolean }>;
    downloadUpdate: () => Promise<any>;
    checkHealth: () => Promise<{ localServer: boolean; internet: boolean }>;    
    getNotifications: () => Promise<any>;
    updateApiKey: (data: { apiKey?: string; bearerToken?: string }) => Promise<any>;

    // Set by main.ts's boot gate only when there's a dismissed *optional*
    // update — lets the notification bell offer it again.
    __mstreamUpdate?: PendingOptionalUpdate;
  }
}




export {};