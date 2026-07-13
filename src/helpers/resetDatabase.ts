import { sqlite } from "@/db/database";

/**
 * Wipes every row from every table in the local SQLite database — products,
 * customers, documents, stock, users, everything — while leaving the schema
 * (tables/indexes) and migration history intact, so the app can keep running
 * against the same connection without needing a restart.
 *
 * `sync_queue` is cleared last so that delete events fired by the sync
 * triggers during this reset don't linger and get replayed to other
 * LAN-synced terminals.
 */
export async function resetDatabase(): Promise<void> {
  const tables = (await sqlite.select(
    /*sql*/ `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations'`,
  )) as { name: string }[];

  await sqlite.execute("PRAGMA foreign_keys = OFF");

  try {
    for (const { name } of tables) {
      if (name === "sync_queue") continue;
      await sqlite.execute(`DELETE FROM "${name}"`);
    }
    await sqlite.execute(`DELETE FROM "sync_queue"`);
    await sqlite.execute(`DELETE FROM sqlite_sequence`);
  } finally {
    await sqlite.execute("PRAGMA foreign_keys = ON");
  }

  await sqlite.execute("VACUUM");
}
