// historyDb.ts  (React Native / Expo side)
// npx expo install expo-sqlite

import { getInitData } from "../config/config";
import * as SQLite from "expo-sqlite";

export interface WatchHistoryEntry {
  id: number;
  tmdb_id: number;
  type: "movie" | "tv";
  season: number | null;
  episode: number | null;
  time: string; // SQLite UTC "YYYY-MM-DD HH:MM:SS" (watch_history.ts expects exactly this)
}



// ---- open the DB once and create BOTH tables on first use ----
// One shared promise: if history and wish list each had their own init
// function sharing the same cache, whichever ran first would win and the
// other table would never be created.
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  dbPromise ??= (async () => {
    const db = await SQLite.openDatabaseAsync("mstream.db");
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS watch_history (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        tmdb_id  INTEGER NOT NULL,
        type     TEXT    NOT NULL CHECK (type IN ('movie','tv')),
        season   INTEGER,
        episode  INTEGER,
        time     TEXT    NOT NULL DEFAULT (datetime('now')),
        UNIQUE (tmdb_id, type)
      );
      CREATE INDEX IF NOT EXISTS idx_history_time ON watch_history (time DESC, id DESC);

      CREATE TABLE IF NOT EXISTS wish_list (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        tmdb_id  INTEGER NOT NULL,
        type     TEXT    NOT NULL CHECK (type IN ('movie','tv')),
        season   INTEGER,
        episode  INTEGER,
        time     TEXT    NOT NULL DEFAULT (datetime('now')),
        UNIQUE (tmdb_id, type)
      );
      CREATE INDEX IF NOT EXISTS idx_wishlist_time ON wish_list (time DESC, id DESC);
    `);
    return db;
  })();
  return dbPromise;
}

const toInt = (v: unknown, fallback: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : fallback;
};

//watch history

async function getWatchHistory(page: unknown = 1, limit: unknown = 20) {
  const db = await getDb(); 
  const p = Math.max(1, toInt(page, 1)); 
  const l = Math.min(50, Math.max(1, toInt(limit, 20))); 
 
  const totalRow = await db.getFirstAsync<{ c: number }>("SELECT COUNT(*) AS c FROM watch_history");
  const total = totalRow?.c ?? 0;
  const totalPages = Math.ceil(total / l); 

  // Newest first: the page groups rows by date and relies on this order.
  const data = await db.getAllAsync<WatchHistoryEntry>(
    "SELECT id, tmdb_id, type, season, episode, time FROM watch_history ORDER BY time DESC, id DESC LIMIT ? OFFSET ?",
    [l, (p - 1) * l]
  );

  return {
    data,
    page: p,
    limit: l,
    total,
    totalPages,
    hasNextPage: p < totalPages,
    hasPreviousPage: p > 1,
  };
}

// One row per title: watching again just moves it to the top and
// updates the season/episode instead of adding duplicates.
async function updateWatchHistory(id: any, type: string, season: any, episode: any) {
  const tmdbId = toInt(id, NaN);
  if (!Number.isFinite(tmdbId) || (type !== "movie" && type !== "tv")) {
    throw new Error("Invalid history entry");
  }
  const pseason = type === "tv" ? toInt(season, 1) : null;
  const pepisode = type === "tv" ? toInt(episode, 1) : null;

  const db = await getDb();
  await db.runAsync(
    `INSERT INTO watch_history (tmdb_id, type, season, episode, time)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT (tmdb_id, type) DO UPDATE SET
       season  = excluded.season,
       episode = excluded.episode,
       time    = datetime('now')`,
    [tmdbId, type, pseason, pepisode]
  );
  return true;
}

async function deleteWatchHistory(rowId: unknown) {
  const id = toInt(rowId, NaN);
  if (!Number.isFinite(id)) throw new Error("Invalid id");
  const db = await getDb();
  await db.runAsync("DELETE FROM watch_history WHERE id = ?", [id]);
  return true;
}

async function deleteWatchHistoryAll() {
  const db = await getDb();
  await db.runAsync("DELETE FROM watch_history");
  return true;
}

//wish list

async function getWishList(page: unknown = 1, limit: unknown = 20) {
  const db = await getDb();
  const p = Math.max(1, toInt(page, 1));
  const l = Math.min(50, Math.max(1, toInt(limit, 20)));

  const totalRow = await db.getFirstAsync<{ c: number }>("SELECT COUNT(*) AS c FROM wish_list");
  const total = totalRow?.c ?? 0;
  const totalPages = Math.ceil(total / l);

  const data = await db.getAllAsync<WatchHistoryEntry>(
    "SELECT id, tmdb_id, type, season, episode, time FROM wish_list ORDER BY time DESC, id DESC LIMIT ? OFFSET ?",
    [l, (p - 1) * l]
  );

  return {
    data,
    page: p,
    limit: l,
    total,
    totalPages,
    hasNextPage: p < totalPages,
    hasPreviousPage: p > 1,
  };
}

// Returns true/false. `type` is optional: pass "movie" or "tv" to match
// exactly (TMDB movie and TV ids can collide), or omit it to match either.
async function existInWishList(id: unknown, type?: unknown): Promise<boolean> {
  const tmdbId = toInt(id, NaN);
  if (!Number.isFinite(tmdbId)) return false;

  const db = await getDb();
  const row =
    type === "movie" || type === "tv"
      ? await db.getFirstAsync<{ x: number }>(
          "SELECT 1 AS x FROM wish_list WHERE tmdb_id = ? AND type = ? LIMIT 1",
          [tmdbId, type]
        )
      : await db.getFirstAsync<{ x: number }>(
          "SELECT 1 AS x FROM wish_list WHERE tmdb_id = ? LIMIT 1",
          [tmdbId]
        );

  return row != null;
}

// Adding a title that is already in the list is a no-op (it keeps its
// original position instead of jumping to the top).
async function updateWishList(id: any, type: string, season: any, episode: any) {
  const tmdbId = toInt(id, NaN);
  if (!Number.isFinite(tmdbId) || (type !== "movie" && type !== "tv")) {
    throw new Error("Invalid wish list entry");
  }
  const pseason = type === "tv" ? toInt(season, 1) : null;
  const pepisode = type === "tv" ? toInt(episode, 1) : null;

  const db = await getDb();
  await db.runAsync(
    `INSERT INTO wish_list (tmdb_id, type, season, episode, time)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT (tmdb_id, type) DO NOTHING`,
    [tmdbId, type, pseason, pepisode]
  );
  return true;
}

async function deleteWishList(rowId: unknown) {
  const id = toInt(rowId, NaN);
  if (!Number.isFinite(id)) throw new Error("Invalid id");
  const db = await getDb();
  await db.runAsync("DELETE FROM wish_list WHERE id = ?", [id]);
  return true;
}

async function deleteWishListAll() {
  const db = await getDb();
  await db.runAsync("DELETE FROM wish_list");
  return true;
}

// Whitelist: the page can only call these names, never raw SQL.
export const historyHandlers: Record<string, (...args: any[]) => Promise<any>> = {
  getInitData,

  getWatchHistory,
  updateWatchHistory,
  deleteWatchHistory,
  deleteWatchHistoryAll,

  getWishList,
  existInWishList,
  updateWishList,
  deleteWishList,
  deleteWishListAll,
};