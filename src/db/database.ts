import { drizzle } from "drizzle-orm/sqlite-proxy";
import Database from '@tauri-apps/plugin-sql';
import * as schema from "./schema/index";

/**
 * Represents the result of a SELECT query.
 */
export type SelectQueryResult = {
  [key: string]: any;
};

/**
 * Loads the sqlite database via the Tauri Proxy.
 */
export const sqlite = await Database.load("sqlite:data.db");

// Enable WAL mode for concurrent read/write access and prevent lock errors
await sqlite.execute("PRAGMA journal_mode = WAL");
await sqlite.execute("PRAGMA busy_timeout = 30000");
// PERF: with WAL already enabled, NORMAL is safe (durable across app
// crashes, only loses the last few transactions on an OS crash/power loss)
// and avoids an fsync on every single transaction commit — FULL (the
// default) was making every insert/update wait on disk.
await sqlite.execute("PRAGMA synchronous = NORMAL");
// PERF: bump the page cache from SQLite's tiny default (~2MB) so repeated
// reads of hot tables (products, stock_entries, product_taxes, etc.) are
// served from memory instead of re-reading from disk. Negative value = KB.
await sqlite.execute("PRAGMA cache_size = -16000"); // ~16MB cache
// PERF: keep temp tables/indexes used during sorts and GROUP BY (dashboard
// queries, reporting) in memory instead of spilling to disk temp files.
await sqlite.execute("PRAGMA temp_store = MEMORY");

/**
 * The drizzle database instance.
 */
export const db = drizzle<typeof schema>(
  async (sql, params, method) => {
    let rows: any = [];
    let results = [];

    // If the query is a SELECT, use the select method
    if (isSelectQuery(sql)) {
      rows = await sqlite.select(sql, params).catch((e) => {
        console.error("SQL Error:", e);
        return [];
      });
    } else {
      // Otherwise, use the execute method
      rows = await sqlite.execute(sql, params).catch((e) => {
        console.log("SQL Error:", e, sql);
        return [];
      });
      return { rows: [] };
    }

    rows = rows.map((row: any) => {
      return Object.values(row);
    });

    // If the method is "all", return all rows
    results = method === "all" ? rows : rows[0];

    return { rows: results };
  },
  // PERF: `logger: true` was serializing and printing every single query +
  // params for every read and write the app does (every cart calc, every
  // focus-triggered refetch, every 5s sync tick). That's pure overhead on
  // the hottest path in the app. Flip on manually when you need to debug.
  { schema: schema, logger: false },
);

/**
 * Checks if the given SQL query is a SELECT query.
 * @param sql The SQL query to check.
 * @returns True if the query is a SELECT query, false otherwise.
 */
function isSelectQuery(sql: string): boolean {
  const selectRegex = /^\s*SELECT\b/i;
  return selectRegex.test(sql);
}




