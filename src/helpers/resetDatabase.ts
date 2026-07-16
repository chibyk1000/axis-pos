import { sqlite } from "@/db/database";
import { ensureRootNode } from "@/hooks/controllers/nodes";

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
 * Reverse foreign-key graph: table → the tables that hold a row referencing
 * it. Deleting a table without also deleting its dependents would leave a
 * dangling foreign key, so a partial reset must always pull these in too —
 * e.g. clearing "products" also has to clear "barcodes" (barcodes.product_id
 * → products), which in turn has no dependents of its own.
 */
const DEPENDENTS: Record<string, string[]> = {
  products: [
    "barcodes",
    "comments",
    "customer_discounts",
    "document_items",
    "product_taxes",
    "stock_entries",
    "stock_logs",
    "promotion_bogo",
    "promotion_products",
    "product_prices",
  ],
  comments: ["comments"],
  companies: ["void_reasons", "documents", "products", "users"],
  customers: [
    "customer_discounts",
    "loyalty_cards",
    "documents",
    "products",
    "stock_entries",
    "promotion_customers",
  ],
  documents: ["document_items", "docmentPayments", "stock_logs"],
  payment_types: ["docmentPayments"],
  users: ["documents", "products"],
  nodes: ["nodes", "products", "promotion_nodes"],
  taxes: ["product_taxes"],
  promotions: [
    "promotion_bogo",
    "promotion_customers",
    "promotion_nodes",
    "promotion_products",
  ],
  open_sales: ["open_sale_items"],
};

/** Human-facing grouping of tables for the reset UI. Selecting a category
 * only pre-selects its listed tables — the actual delete set is always
 * expanded through `DEPENDENTS` before anything runs. */
export const TABLE_CATEGORIES: { label: string; tables: string[] }[] = [
  {
    label: "Products & catalog",
    tables: ["products", "barcodes", "product_prices", "product_taxes", "comments"],
  },
  { label: "Categories / groups", tables: ["nodes"] },
  { label: "Stock", tables: ["stock_entries", "stock_logs"] },
  {
    label: "Sales & documents",
    tables: ["documents", "document_items", "docmentPayments"],
  },
  {
    label: "Customers",
    tables: ["customers", "customer_discounts", "loyalty_cards", "customer_balances"],
  },
  { label: "Cash & credit", tables: ["cash_entries", "credit_payments"] },
  {
    label: "Promotions",
    tables: [
      "promotions",
      "promotion_bogo",
      "promotion_customers",
      "promotion_nodes",
      "promotion_products",
    ],
  },
  { label: "Open / parked sales", tables: ["open_sales", "open_sale_items"] },
  { label: "Taxes & payment types", tables: ["taxes", "payment_types"] },
  { label: "Users & company", tables: ["users", "companies", "void_reasons"] },
  { label: "Reference data", tables: ["countries"] },
  { label: "LAN sync", tables: ["devices", "sync_queue"] },
];

/** Expands a table selection with every table that transitively depends on
 * it, so deleting the result never leaves a dangling foreign key. */
function expandWithDependents(selected: Iterable<string>): Set<string> {
  const result = new Set<string>();
  const queue = [...selected];
  while (queue.length) {
    const table = queue.pop()!;
    if (result.has(table)) continue;
    result.add(table);
    for (const dependent of DEPENDENTS[table] ?? []) queue.push(dependent);
  }
  return result;
}

/** Resolves what a given table selection will *actually* clear, once
 * dependent tables are pulled in — for showing the user a preview before
 * they confirm. Pass no argument (or an empty array) to preview a full
 * reset. */
export function previewResetTables(tables?: string[]): string[] {
  const requested = tables && tables.length > 0 ? tables : DELETE_ORDER;
  return DELETE_ORDER.filter((t) => expandWithDependents(requested).has(t));
}

/**
 * Wipes the given tables (and anything that references them) from the local
 * SQLite database, leaving the schema and migration history intact so the
 * app can keep running against the same connection without a restart. Pass
 * no argument (or an empty array) to wipe every table — products, customers,
 * documents, stock, users, everything.
 *
 * The `nodes` table is a special case: the "root" category node is never
 * deleted (other code assumes it always exists), and `ensureRootNode()` is
 * re-run afterward as a safety net.
 *
 * On a full reset, `sync_queue` is always cleared too (even though nothing
 * references it) so delete events fired by the sync triggers during the
 * wipe don't linger and get replayed to other LAN-synced terminals. A
 * partial reset only touches it if the caller explicitly asked to.
 */
export async function resetDatabase(
  tables?: string[],
): Promise<{ cleared: string[] }> {
  const allTables = (await sqlite.select(
    /*sql*/ `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations'`,
  )) as { name: string }[];
  const existing = new Set(allTables.map((t) => t.name));

  const isFullReset = !tables || tables.length === 0;
  const requested = (isFullReset ? [...existing] : tables).filter((t) =>
    existing.has(t),
  );
  const targetSet = expandWithDependents(requested);
  if (isFullReset) targetSet.add("sync_queue");

  // Any table not in the hand-ordered list (e.g. added by a future
  // migration) gets deleted first, before anything it might reference.
  const extras = [...existing].filter(
    (name) => name !== "sync_queue" && !DELETE_ORDER.includes(name),
  );
  const orderedAll = [...extras, ...DELETE_ORDER, "sync_queue"];
  const deleteList = orderedAll.filter(
    (table) => targetSet.has(table) && existing.has(table),
  );

  await sqlite.execute("PRAGMA foreign_keys = OFF");

  try {
    // deleteList is ordered to avoid FK violations in the common case, but
    // that ordering can't be fully trusted: the underlying connection pool
    // can dispatch each `execute()` call to a different physical SQLite
    // connection, and it's the CURRENT connection's foreign_keys setting
    // (not a global one) that decides whether a delete is checked — so a
    // "PRAGMA foreign_keys = OFF" issued above may not be in effect for the
    // connection that ends up running a given DELETE. Rather than depend on
    // a hand-maintained order being flawless against that, retry: if a
    // delete fails on an FK violation, defer it and try again after the
    // other tables in this pass have gone through — one of them is likely
    // the thing it was blocked on. Keep making passes until nothing is left
    // or a whole pass makes zero progress (a genuine unresolvable case).
    let remaining = deleteList;
    let lastError: unknown = null;
    while (remaining.length > 0) {
      const stillRemaining: string[] = [];
      for (const table of remaining) {
        try {
          if (table === "nodes") {
            await sqlite.execute(`DELETE FROM "nodes" WHERE id != 'root'`);
          } else {
            await sqlite.execute(`DELETE FROM "${table}"`);
          }
        } catch (err) {
          lastError = err;
          stillRemaining.push(table);
        }
      }
      if (stillRemaining.length === remaining.length) {
        throw lastError instanceof Error
          ? lastError
          : new Error(
              `Could not clear table(s): ${stillRemaining.join(", ")}`,
            );
      }
      remaining = stillRemaining;
    }

    if (deleteList.includes("sync_queue")) {
      await sqlite.execute(`DELETE FROM sqlite_sequence WHERE name = 'sync_queue'`);
    }
  } finally {
    await sqlite.execute("PRAGMA foreign_keys = ON");
  }

  if (deleteList.includes("nodes")) {
    await ensureRootNode();
  }

  await sqlite.execute("VACUUM");

  return { cleared: deleteList };
}
