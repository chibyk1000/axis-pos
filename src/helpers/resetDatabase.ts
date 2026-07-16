import { sqlite } from "@/db/database";

/**
 * Tables in child-before-parent order, so every row can be deleted without
 * ever violating a `NO ACTION`/`RESTRICT` foreign key (e.g. documents →
 * customers/users/companies, products → customers/users/companies,
 * document_items → products, stock_entries → customers, ...).
 *
 * `PRAGMA foreign_keys = OFF` alone isn't reliable here: tauri-plugin-sql's
 * underlying connection pool can dispatch each `execute()` call to a
 * different physical SQLite connection, and `foreign_keys` is a
 * per-connection setting — so a pragma set before the deletes may not be in
 * effect on whichever connection actually runs them. Deleting in dependency
 * order makes the reset correct regardless of which connection is used.
 */
const DELETE_ORDER = [
  "promotion_bogo",
  "promotion_customers",
  "promotion_nodes",
  "promotion_products",
  "product_taxes",
  "barcodes",
  "comments",
  "customer_discounts",
  "loyalty_cards",
  "document_items",
  "docmentPayments",
  "stock_logs",
  "stock_entries",
  "open_sale_items",
  "product_prices",
  "void_reasons",
  "documents",
  "open_sales",
  "promotions",
  "products",
  "users",
  "customers",
  "nodes",
  "companies",
  "taxes",
  "payment_types",
  "countries",
  "cash_entries",
  "credit_payments",
  "customer_balances",
  "devices",
];

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
  const allTables = (await sqlite.select(
    /*sql*/ `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations'`,
  )) as { name: string }[];
  const existing = new Set(allTables.map((t) => t.name));

  // Any table not in the hand-ordered list (e.g. added by a future
  // migration) gets deleted first, before anything it might reference.
  const extras = [...existing].filter(
    (name) => name !== "sync_queue" && !DELETE_ORDER.includes(name),
  );

  await sqlite.execute("PRAGMA foreign_keys = OFF");

  try {
    for (const table of [...extras, ...DELETE_ORDER]) {
      if (!existing.has(table)) continue;
      await sqlite.execute(`DELETE FROM "${table}"`);
    }
    await sqlite.execute(`DELETE FROM "sync_queue"`);
    await sqlite.execute(`DELETE FROM sqlite_sequence`);
  } finally {
    await sqlite.execute("PRAGMA foreign_keys = ON");
  }

  await sqlite.execute("VACUUM");
}
