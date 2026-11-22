// pre.js (entry point)
import {
    getPopularMovies, getPopularTvSeries, getTrending, getByCategory,searchMoviesAndTv,
    getMovieById, getTvSeriesById, getTvSeason, movieRecomend, tvRecomend,
    updatateHistory, getHistory, deleteHistoryAll, deleteHistoryById,
    updatateWishList, existInWishList, getWishList, deleteWishListAll, deleteWishListById,
    checkHealth, getNotifications, updateApiKey,
} from './api.js';

const NOT_FOUND_IMG = 'https://askimed33.github.io/mstream//not_found.png';
const BASE_IMG_URL = 'https://image.tmdb.org/t/p/w500';

function devtools() {
    window.addEventListener('keydown', (e) => {
        const k = e.key.toLowerCase();
        if (e.key === 'F12') return e.preventDefault();
        if (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(k)) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        if (e.metaKey && e.altKey && ['i', 'j', 'c'].includes(k)) {
            e.preventDefault();
            e.stopPropagation();
        }
    });
}

Object.assign(window, {
    devtools, getPopularMovies, getPopularTvSeries, getTrending, getByCategory, searchMoviesAndTv,
    getMovieById, getTvSeriesById, getTvSeason, movieRecomend, tvRecomend,
    updatateHistory, getHistory, deleteHistoryAll, deleteHistoryById,
    updatateWishList, existInWishList, getWishList, deleteWishListAll, deleteWishListById,
    checkHealth, getNotifications, updateApiKey, BASE_IMG_URL, NOT_FOUND_IMG,
});