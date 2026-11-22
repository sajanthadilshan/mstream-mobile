// tmdb.js
export const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const CONFIG_KEY = 'tmdb_config';
const tmdbConfig = { apiKey: '', bearerToken: '' };

export async function fetchData(endpoint) {
    let response;
    try {
        response = await fetch(endpoint);
    } catch {
        throw new Error('NETWORK_UNREACHABLE');
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return response.json();
}

// --- credentials ---------------------------------------------------------

function loadPersistedTmdbConfig() {
    try {
        const parsed = JSON.parse(localStorage.getItem(CONFIG_KEY));
        if (parsed && (parsed.apiKey || parsed.bearerToken)) {
            tmdbConfig.apiKey = parsed.apiKey || '';
            tmdbConfig.bearerToken = parsed.bearerToken || '';
        }
    } catch {
        /* nothing saved / unreadable */
    }
}
loadPersistedTmdbConfig();

function persistTmdbConfig({ apiKey, bearerToken }) {
    try {
        localStorage.setItem(
            CONFIG_KEY,
            JSON.stringify({ apiKey: apiKey || '', bearerToken: bearerToken || '' })
        );
    } catch {
        /* storage unavailable: key just won't persist */
    }
}

export function hasTmdbCredentials() {
    return !!(tmdbConfig.apiKey || tmdbConfig.bearerToken);
}

export function configureTmdb({ apiKey, bearerToken } = {}) {
    if (apiKey !== undefined) tmdbConfig.apiKey = apiKey;
    if (bearerToken !== undefined) tmdbConfig.bearerToken = bearerToken;
}

function buildUrl(path, params = {}) {
    const url = new URL(`${TMDB_BASE_URL}${path}`);
    if (!tmdbConfig.bearerToken) url.searchParams.set('api_key', tmdbConfig.apiKey);
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, v);
    }
    return url.toString();
}

export async function tmdbFetch(path, params = {}) {
    if (!hasTmdbCredentials()) {
        throw new Error('TMDB credentials not set. Call configureTmdb() first.');
    }
    const headers = tmdbConfig.bearerToken
        ? { Authorization: `Bearer ${tmdbConfig.bearerToken}`, accept: 'application/json' }
        : { accept: 'application/json' };

    let response;
    try {
        response = await fetch(buildUrl(path, params), { headers });
    } catch {
        throw new Error('NETWORK_UNREACHABLE');
    }
    if (response.status === 401) throw new Error('TMDB_key_invalid');
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return response.json();
}

export async function updateApiKey({ apiKey, bearerToken } = {}) {
    const k = apiKey?.trim() || '';
    const b = bearerToken?.trim() || '';
    if (!k && !b) throw new Error('Provide an apiKey or bearerToken');

    const previous = { ...tmdbConfig };
    tmdbConfig.apiKey = k;
    tmdbConfig.bearerToken = b;

    try {
        await tmdbFetch('/configuration');
    } catch {
        tmdbConfig.apiKey = previous.apiKey;
        tmdbConfig.bearerToken = previous.bearerToken;
        throw new Error('TMDB_key_invalid');
    }
    persistTmdbConfig(tmdbConfig);
    return true;
}

// --- lists ---------------------------------------------------------------

const today = () => new Date().toISOString().split('T')[0];

export function getPopularMovies(page = 1, region) {
    return tmdbFetch('/discover/movie', {
        page,
        region,
        sort_by: 'popularity.desc',
        'primary_release_date.lte': today(),
        'vote_count.gte': 1,
    });
}

export function getPopularTVSeries(page = 1) {
    return tmdbFetch('/discover/tv', {
        page,
        sort_by: 'popularity.desc',
        'first_air_date.lte': today(),
        'vote_count.gte': 1,
    });
}

export function getTrending(page = 1) {
    return tmdbFetch('/trending/all/day', { page });
}

// --- search --------------------------------------------------------------

export function searchMovies(query, page = 1, region) {
    return tmdbFetch('/search/movie', { query, page, region, include_adult: false });
}

export function searchTVSeries(query, page = 1) {
    return tmdbFetch('/search/tv', { query, page, include_adult: false });
}

export async function searchMoviesAndTV(query, page = 1, region) {
    const data = await tmdbFetch('/search/multi', { query, page, region, include_adult: false });
    const now = new Date();
    const isAvailable = (item) => {
        const dateStr = item.media_type === 'movie' ? item.release_date : item.first_air_date;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return !isNaN(d.getTime()) && d <= now;
    };
    return {
        ...data,
        results: data.results.filter(
            (i) => (i.media_type === 'movie' || i.media_type === 'tv') && isAvailable(i)
        ),
    };
}

// --- recommendations -----------------------------------------------------

export function getMovieRecommendations(id, page = 1) {
    return tmdbFetch(`/movie/${id}/recommendations`, { page });
}

export function getTVRecommendations(id, page = 1) {
    return tmdbFetch(`/tv/${id}/recommendations`, { page });
}

// --- details -------------------------------------------------------------

export async function getMovieById(tmdbId, d_server, appendToResponse, servers) {
    const movie = await tmdbFetch(`/movie/${tmdbId}`, { append_to_response: appendToResponse });
    return { ...movie, servers, default_server: d_server };
}

export function getTVSeriesById(tmdbId, appendToResponse) {
    if (!tmdbId) throw new Error('getTVSeriesById requires a tmdbId');
    return tmdbFetch(`/tv/${tmdbId}`, { append_to_response: appendToResponse });
}

export async function getTVSeason(tmdbId, seasonNumber, d_server, appendToResponse, tvSeasonSvrs) {
    if (!tmdbId) throw new Error('getTVSeason requires a tmdbId');
    if (seasonNumber === undefined || seasonNumber === null) {
        throw new Error('getTVSeason requires a seasonNumber');
    }
    const seasonData = await tmdbFetch(`/tv/${tmdbId}/season/${seasonNumber}`, {
        append_to_response: appendToResponse,
    });
    if (Array.isArray(seasonData?.episodes)) {
        seasonData.episodes = seasonData.episodes.map((ep) => ({ ...ep, servers: tvSeasonSvrs }));
    }
    return { ...seasonData, default_server: d_server };
}


//get data by category

const CATEGORIES = {
    action:      { label: 'Action',      movie: 28,    tv: { genres: '10759' } },
    adventure:   { label: 'Adventure',   movie: 12,    tv: { genres: '10759' } },
    animation:   { label: 'Animation',   movie: 16,    tv: { genres: '16' } },
    comedy:      { label: 'Comedy',      movie: 35,    tv: { genres: '35' } },
    crime:       { label: 'Crime',       movie: 80,    tv: { genres: '80' } },
    documentary: { label: 'Documentary', movie: 99,    tv: { genres: '99' } },
    drama:       { label: 'Drama',       movie: 18,    tv: { genres: '18' } },
    family:      { label: 'Family',      movie: 10751, tv: { genres: '10751' } },
    fantasy:     { label: 'Fantasy',     movie: 14,    tv: { genres: '10765' } },
    history:     { label: 'History',     movie: 36,    tv: { genres: '18|10768', keyword: 'history' } },
    horror:      { label: 'Horror',      movie: 27,    tv: { genres: '9648|10765', keyword: 'horror' } },
    music:       { label: 'Music',       movie: 10402, tv: { genres: '18|35', keyword: 'music' } },
    mystery:     { label: 'Mystery',     movie: 9648,  tv: { genres: '9648' } },
    romance:     { label: 'Romance',     movie: 10749, tv: { genres: '18|35', keyword: 'romance' } },
    scifi:       { label: 'Sci-Fi',      movie: 878,   tv: { genres: '10765' } },
    thriller:    { label: 'Thriller',    movie: 53,    tv: { genres: '9648|80', keyword: 'thriller' } },
    war:         { label: 'War',         movie: 10752, tv: { genres: '10768' } },
    western:     { label: 'Western',     movie: 37,    tv: { genres: '37' } },
    kids:        { label: 'Kids',        movie: null,  tv: { genres: '10762' } },
    reality:     { label: 'Reality',     movie: null,  tv: { genres: '10764' } },
    news:        { label: 'News',        movie: null,  tv: { genres: '10763' } },
    tvmovie:     { label: 'TV Movie',    movie: 10770, tv: null },
};
const keywordCache = new Map();

async function resolveKeywordId(term) {
    if (keywordCache.has(term)) return keywordCache.get(term);
    const data = await tmdbFetch('/search/keyword', { query: term });
    const hit = data.results.find((k) => k.name.toLowerCase() === term) || data.results[0];
    const id = hit ? hit.id : undefined;
    keywordCache.set(term, id);
    return id;
}

export async function getPopularByCategory(kind, page = 1, region) {
    const cat = CATEGORIES[kind];
    if (!cat) throw new Error(`Unknown category: ${kind}`);

    const fetchMovies = () =>
        tmdbFetch('/discover/movie', {
            page,
            region,
            with_genres: cat.movie,
            sort_by: 'popularity.desc',
            'primary_release_date.lte': today(),
            'vote_count.gte': 50,
            include_adult: false,
        });

    const fetchTV = async () => {
        let keywordId;
        if (cat.tv.keyword) {
            try {
                keywordId = await resolveKeywordId(cat.tv.keyword);
            } catch {
                /* fall back to genre-only results */
            }
        }
        return tmdbFetch('/discover/tv', {
            page,
            with_genres: cat.tv.genres,
            with_keywords: keywordId,
            sort_by: 'popularity.desc',
            'first_air_date.lte': today(),
            'vote_count.gte': 20,
            include_adult: false,
        });
    };

    const [movies, tv] = await Promise.all([
        cat.movie != null ? fetchMovies() : null,
        cat.tv ? fetchTV() : null,
    ]);

    return {
        label: cat.label,
        movies: (movies?.results ?? []).map((m) => ({ ...m, media_type: 'movie' })),
        tv: (tv?.results ?? []).map((t) => ({ ...t, media_type: 'tv' })),
        totalPages: {
            movies: movies?.total_pages ?? 0,
            tv: tv?.total_pages ?? 0,
        },
    };
}