// api.js  (replaces app.cjs: same logic, no HTTP layer)
import * as tmdb from './tmdb.js';
import { decrypt, decryptMovieSvrs, decryptTvSeriesSvrs, decryptNotifications} from './decrypt.js';

let DECRYPTKEY = false;
let MOVIE_ENDPOINT = false;

let movieSvrs = null;
let initPromise = null;
let defaultSvr = 1;


// --- bridge -----------------

const pending = new Map();
let nextId = 0;
 
// The native side calls this (via inject js) to answer a request.
 
window.__resolve = (id, data, error) => {
  const p = pending.get(id);
  if (!p) {
    console.warn("[bridge] orphan reply", id, "pending:", [...pending.keys()]);
    return;
  }

  clearTimeout(p.timer);
  pending.delete(id);

  // Resolve in a fresh task, not inside the injectJavaScript call stack,
  // so the DOM updates that follow trigger a normal repaint.
  setTimeout(() => {
    error ? p.reject(new Error(error)) : p.resolve(data);
  }, 0);
};


function call(cmd, ...args) {
  return new Promise((resolve, reject) => {
    if (!window.ReactNativeWebView) {
      reject(new Error("Not running inside the app"));
      return;
    }
    const id = ++nextId;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("Native call timed out: " + cmd));
    }, 100000);//100 seconsds
    pending.set(id, { resolve, reject, timer });
    window.ReactNativeWebView.postMessage(
        JSON.stringify({ id, cmd, args, token: window.__BRIDGE_TOKEN })
    );
  });
}



// Lazy, de-duplicated init. Every call awaits it, so there's no race
// with the old fire-and-forget startup. Failed attempts can be retried.
function init() {
    if (movieSvrs) return Promise.resolve();
    if (!initPromise) {
        initPromise = (async () => {
            if(!DECRYPTKEY || !MOVIE_ENDPOINT){
                const data = await call("getInitData");
                DECRYPTKEY = data.decrypt_key;
                MOVIE_ENDPOINT = data.movie_endpoint;
            }
            try {
                const data = await tmdb.fetchData(MOVIE_ENDPOINT);
                if (!tmdb.hasTmdbCredentials()) {
                    tmdb.configureTmdb({ apiKey: await decrypt(data.apikey, DECRYPTKEY) });
                }
                movieSvrs = data;
            } catch (err) {
                initPromise = null;
                throw err;
            }
        })();
    }
    return initPromise;
}

const pickServer = (server) => {
    defaultSvr = server ? Number(server) : defaultSvr;
    return defaultSvr;
};




// --- lists / search / recommendations ---------------------------------------

export const getPopularMovies = async (page = 1, region) => (await init(), tmdb.getPopularMovies(Number(page) || 1, region));
export const getPopularTvSeries = async (page = 1) => (await init(), tmdb.getPopularTVSeries(Number(page) || 1));
export const getTrending = async (page = 1) => (await init(), tmdb.getTrending(Number(page) || 1));
export const getByCategory = async (kind, page = 1, region) => (await init(), tmdb.getPopularByCategory(kind, Number(page) || 1, region));


export async function searchMoviesAndTv(query, page = 1) {
    if (!query) throw new Error("Missing required field 'q'");
    await init();
    return tmdb.searchMoviesAndTV(query, Number(page) || 1);
}

export async function movieRecomend(id, page = 1) {
    if (!id) throw new Error("Missing required field 'id'");
    await init();
    return tmdb.getMovieRecommendations(id, Number(page) || 1);
}

export async function tvRecomend(id, page = 1) {
    if (!id) throw new Error("Missing required field 'id'");
    await init();
    return tmdb.getTVRecommendations(id, Number(page) || 1);
}

// --- details ----------------------------------------------------------------

export async function getMovieById(id, hst_update, server, append) {
    if (!id) throw new Error("Missing required field 'id'");
    await init();
    if(hst_update === true){
        try {
            void updatateHistory(id, "movie").catch(err => {
                console.error("History update failed:", err);
            });
        } catch (err) { console.log(err); }
    }
    const svrs = await decryptMovieSvrs(movieSvrs.movie_servers.movie, DECRYPTKEY, id);
    return tmdb.getMovieById(id, pickServer(server), append, svrs);
}

export async function getTvSeriesById(id, append) {
    if (!id) throw new Error("Missing required field 'id'");
    await init();
    return tmdb.getTVSeriesById(id, append);
}

export async function getTvSeason(id, season, episode = 1, hst_update, server, append) {
    if (!id) throw new Error("Missing required field 'id'");
    await init();
    if(hst_update === true){
        try{
            void updatateHistory(id, "tv", season, episode).catch(err => {
                console.error("History update failed:", err);
            });
        }catch(err){console.log(err)}
    }
    const tvSvrs = await decryptTvSeriesSvrs(movieSvrs.movie_servers.tv, DECRYPTKEY, id, season, episode);
    return tmdb.getTVSeason(id, season, pickServer(server), append, tvSvrs);
}

// --- history ----------------------------------------------------------


export async function updatateHistory(id, type, season = 1, episode = 1) {
    return await call("updateWatchHistory", id, type, season, episode);
}

export async function getHistory(page = 1, limit = 20) {
    try{
        const result = await call("getWatchHistory", page, limit);
        //return "ssss "+JSON.stringify(result);
        const data = await Promise.all(
            result.data.map(async (entry) => {
                try {
                    const details = entry.type === "movie"? 
                    await window.getMovieById(entry.tmdb_id, false, false) :
                    await window.getTvSeriesById(entry.tmdb_id);
                    return { entry, details };
                } catch (err){
                    return { entry, details: null };
                }
            })
        );
        return { ...result, data };
    }catch(err){
        return('error3 '+err)
    }
}

export async function deleteHistoryAll(){
    return await call("deleteWatchHistoryAll");
}

export async function deleteHistoryById(id){
    return await call("deleteWatchHistory", id);
}


// --- saved ----------------------------------------------------------


export async function updatateWishList(id, type, season = 1, episode = 1) {
    return await call("updateWishList", id, type, season, episode);
}

export async function existInWishList(id) {
    return await call("existInWishList", id);
}

export async function getWishList(page = 1, limit = 20) {
    try{
        const result = await call("getWishList", page, limit);
        const data = await Promise.all(
            result.data.map(async (entry) => {
                try {
                    const details = entry.type === "movie"? 
                    await window.getMovieById(entry.tmdb_id, false, false) :
                    await window.getTvSeriesById(entry.tmdb_id);
                    return { entry, details };
                } catch {
                    return { entry, details: null };
                }
            })
        );
        return { ...result, data };
    }catch(err){
        return('error3 '+err)
    }
}

export async function deleteWishListAll(){
    return await call("deleteWishListAll");
}

export async function deleteWishListById(id){
    return await call("deleteWishList", id);
}


// --- configs ------------------------------------------------------------------

export async function checkHealth() {
    let internet = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
        // no-cors: we only care whether the network request succeeds
        await fetch(tmdb.TMDB_BASE_URL, { method: 'HEAD', mode: 'no-cors', signal: controller.signal });
    } catch {
        internet = false;
    } finally {
        clearTimeout(timeout);
    }
    return { localServer: true, internet };
}

export async function getNotifications() {
    await init();
    return await decryptNotifications(movieSvrs.notifications, DECRYPTKEY);
}

export async function updateApiKey(apiKey, bearerToken) {
    // accepts either updateApiKey({apiKey, bearerToken}) or positional args
    const args = typeof apiKey === 'object' && apiKey !== null ? apiKey : { apiKey, bearerToken };
    await tmdb.updateApiKey(args);
    return { updated: true };
}

export { tmdb as _tmdb };
export const BASE_IMG_URL = tmdb.TMDB_IMAGE_BASE_URL;