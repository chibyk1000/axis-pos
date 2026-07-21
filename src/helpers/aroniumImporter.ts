import Database from "@tauri-apps/plugin-sql";
import { readFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { sqlite } from "@/db/database";
import { ensureRootNode } from "@/hooks/controllers/nodes";
import { invalidateChildNodeIdsCache } from "@/hooks/controllers/products";

export interface ImportResult {
  success: boolean;
  message: string;
  /** Non-fatal problems from the import — e.g. a table that failed to fetch
   * from the SQL Server backup after retrying, so it silently contributed
   * zero rows instead of aborting the whole import. */
  warnings?: string[];
  counts: {
    taxes: number;
    groups: number;
    products: number;
    barcodes: number;
    productTaxes: number;
    customers: number;
    documents: number;
    documentItems: number;
    documentPayments: number;
    stockEntries: number;
  };
}

// ---------------------------------------------------------------------------
// File-type detection
// ---------------------------------------------------------------------------

type AroniumFileType = "sqlite" | "sql-dump" | "mssql-bak";

async function detectFileType(filePath: string): Promise<AroniumFileType> {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "bak") return "mssql-bak";
  if (ext === "sql") return "sql-dump";

  try {
    const header = await readFile(filePath);
    const magic = String.fromCharCode(
      header[0],
      header[1],
      header[2],
      header[3],
    );
    if (magic === "TAPE") return "mssql-bak";
  } catch {
    // fall through
  }

  try {
    const probe = await Database.load(`sqlite:${filePath}`);
    await probe.select("SELECT 1");
    return "sqlite";
  } catch {
    // not SQLite
  }

  return "sql-dump";
}

// ---------------------------------------------------------------------------
// SQL dump parser
// ---------------------------------------------------------------------------

interface ParsedDumpTables {
  Tax: any[];
  ProductGroup: any[];
  Product: any[];
  Barcode: any[];
  ProductTax: any[];
  Customer: any[];
  Country: any[];
  Document: any[];
  DocumentItem: any[];
  DocumentItemTax: any[];
  DocumentType: any[];
  Payment: any[];
  PaymentType: any[];
  // Aronium stock tables
  Stock: any[];        // Id, ProductId, WarehouseId, Quantity
  StockEntry: any[];   // Same shape as Stock — some Aronium versions use this name instead
  StockControl: any[]; // ProductId, ReorderPoint, PreferredQuantity, IsLowStockWarningEnabled, LowStockWarningQuantity
  PosOrder: any[];
  PosOrderItem: any[];
}

function parseSqlDump(sql: string): ParsedDumpTables {
  const tables: Record<string, any[]> = {
    Tax: [],
    ProductGroup: [],
    Product: [],
    Barcode: [],
    ProductTax: [],
    Customer: [],
    Country: [],
    Document: [],
    DocumentItem: [],
    DocumentItemTax: [],
    DocumentType: [],
    Payment: [],
    PaymentType: [],
    Stock: [],
    StockEntry: [],
    StockControl: [],
    PosOrder: [],
    PosOrderItem: [],
  };

  const createRe =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`\[]?(\w+)["`\]]?\s*\(([^;]+)\)/gi;
  const columnMap: Record<string, string[]> = {};
  let m: RegExpExecArray | null;
  while ((m = createRe.exec(sql)) !== null) {
    const cols: string[] = [];
    for (const line of m[2].split("\n")) {
      const t = line.trim();
      if (!t || /^(PRIMARY|UNIQUE|CHECK|FOREIGN|CONSTRAINT)/i.test(t)) continue;
      const c = t.match(/^["`\[]?(\w+)["`\]]?/);
      if (c) cols.push(c[1]);
    }
    columnMap[m[1]] = cols;
  }

  const insertRe =
    /INSERT\s+INTO\s+["`\[]?(\w+)["`\]]?\s*(?:\(([^)]+)\)\s*)?VALUES\s*([\s\S]+?);/gi;
  while ((m = insertRe.exec(sql)) !== null) {
    const tableName = m[1];
    if (!(tableName in tables)) continue;
    const columns = m[2]
      ? m[2].split(",").map((c) => c.trim().replace(/["`\[\]]/g, ""))
      : (columnMap[tableName] ?? []);
    const tupleRe = /\(([^)]*(?:'[^']*'[^)]*)*)\)/g;
    let tm: RegExpExecArray | null;
    while ((tm = tupleRe.exec(m[3])) !== null) {
      const values = parseValuesList(tm[1]);
      const row: Record<string, any> = {};
      columns.forEach((col, i) => {
        row[col] = i < values.length ? values[i] : null;
      });
      tables[tableName].push(row);
    }
  }
  return tables as unknown as ParsedDumpTables;
}

function parseValuesList(raw: string): any[] {
  const values: any[] = [];
  let current = "";
  let inString = false;
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    if (!inString && ch === "'") {
      inString = true;
      i++;
      continue;
    }
    if (inString && ch === "'") {
      if (raw[i + 1] === "'") {
        current += "'";
        i += 2;
        continue;
      }
      inString = false;
      i++;
      continue;
    }
    if (!inString && ch === ",") {
      values.push(coerceValue(current.trim()));
      current = "";
      i++;
      continue;
    }
    current += ch;
    i++;
  }
  if (current.trim() || values.length) values.push(coerceValue(current.trim()));
  return values;
}

function coerceValue(raw: string): any {
  if (raw.toUpperCase() === "NULL") return null;
  const num = Number(raw);
  if (!isNaN(num) && raw !== "") return num;
  return raw;
}

// ---------------------------------------------------------------------------
// Shared import logic
// ---------------------------------------------------------------------------

/**
 * Reads a field off an Aronium row trying each candidate name first, then
 * falling back to a case-insensitive scan of the row's actual keys. Source
 * rows can come from three different pipelines (SQL Server FOR JSON AUTO,
 * a raw SQLite export, or a hand-parsed .sql dump) that don't always agree
 * on casing — a silent miss here means a product/group never gets linked to
 * its parent and quietly stays under the root node.
 */
function pickField(row: any, ...candidates: string[]): any {
  for (const key of candidates) {
    if (row[key] !== undefined && row[key] !== null) return row[key];
  }
  const lowerCandidates = candidates.map((k) => k.toLowerCase());
  for (const actualKey of Object.keys(row)) {
    if (lowerCandidates.includes(actualKey.toLowerCase())) {
      const value = row[actualKey];
      if (value !== undefined && value !== null) return value;
    }
  }
  return undefined;
}

/**
 * Multi-row `INSERT OR IGNORE` in chunks. A 70k-document Aronium backup
 * would otherwise need ~360k sequential single-row execute() round-trips —
 * far too slow to ever finish. Chunks stay well under SQLite's 999-bind-
 * parameter compatibility limit.
 */
async function batchInsert(
  table: string,
  columns: string[],
  rows: any[][],
  onChunk?: (inserted: number, total: number) => void,
): Promise<void> {
  if (rows.length === 0) return;
  const chunkSize = Math.max(1, Math.floor(800 / columns.length));
  const placeholderRow = `(${columns.map(() => "?").join(",")})`;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await sqlite.execute(
      `INSERT OR IGNORE INTO ${table} (${columns.join(",")}) VALUES ${chunk
        .map(() => placeholderRow)
        .join(",")}`,
      chunk.flat(),
    );
    onChunk?.(Math.min(i + chunkSize, rows.length), rows.length);
  }
}

interface AroniumData {
  aroniumTaxes: any[];
  aroniumGroups: any[];
  aroniumProducts: any[];
  aroniumBarcodes: any[];
  aroniumProductTaxes: any[];
  aroniumCustomers: any[];
  aroniumDocuments: any[];
  aroniumDocumentItems: any[];
  aroniumDocumentItemTaxes: any[];
  aroniumDocumentTypes: any[];
  aroniumPayments: any[];
  aroniumPaymentTypes: any[];
  aroniumStock: any[];        // Aronium Stock table (quantity per product/warehouse)
  aroniumStockEntries: any[]; // Aronium StockEntry table — same shape, different name on some versions
  aroniumStockControls: any[]; // Aronium StockControl table (reorder points etc.)
  countryMap: Map<number, string>;
  /** Table fetch/parse failures surfaced by the .bak reader (see
   * `_ImportErrors` in sql_server.rs) — not fatal, but worth showing. */
  sourceWarnings?: string[];
}

async function runImport(
  data: AroniumData,
  onProgress: (stage: string) => void = () => {},
): Promise<ImportResult> {
  const {
    aroniumTaxes,
    aroniumGroups,
    aroniumProducts,
    aroniumBarcodes,
    aroniumProductTaxes,
    aroniumCustomers,
    aroniumDocuments,
    aroniumDocumentItems,
    aroniumDocumentItemTaxes,
    aroniumDocumentTypes,
    aroniumPayments,
    aroniumPaymentTypes,
    aroniumStock,
    aroniumStockEntries,
    aroniumStockControls,
    countryMap,
    sourceWarnings = [],
  } = data;

  // ── Pre-load existing keys to avoid duplicates ───────────────────────────
  const existingProducts = await sqlite
    .select<any[]>("SELECT code FROM products")
    .catch(() => []);
  const existingCodes = new Set<string>(
    existingProducts
      .map((p) => String(p.code ?? "").toLowerCase())
      .filter(Boolean),
  );
  const existingCustomers = await sqlite
    .select<any[]>("SELECT code FROM customers")
    .catch(() => []);
  const existingCustCodes = new Set<string>(
    existingCustomers
      .map((c) => String(c.code ?? "").toLowerCase())
      .filter(Boolean),
  );
  const existingBarcodes = await sqlite
    .select<any[]>("SELECT value FROM barcodes")
    .catch(() => []);
  const existingBarcodeValues = new Set<string>(
    existingBarcodes
      .map((b) => String(b.value ?? "").toLowerCase())
      .filter(Boolean),
  );
  const existingTaxes = await sqlite
    .select<any[]>("SELECT code FROM taxes")
    .catch(() => []);
  const existingTaxCodes = new Set<string>(
    existingTaxes
      .map((t) => String(t.code ?? "").toLowerCase())
      .filter(Boolean),
  );
  const existingDocs = await sqlite
    .select<any[]>("SELECT number FROM documents")
    .catch(() => []);
  const existingDocNums = new Set<string>(
    existingDocs
      .map((d) => String(d.number ?? "").toLowerCase())
      .filter(Boolean),
  );

  // ── Suspend LAN-sync triggers for the duration of the import ─────────────
  // Every insert below would otherwise fire a sync_* trigger writing a JSON
  // event row into sync_queue — a full Aronium import generated 360k+ queue
  // rows, bogging down both the import itself and the sync machinery ever
  // after. A fresh import should reach other terminals via a snapshot push,
  // not a row-by-row event replay. Triggers are re-created before returning;
  // if the import crashes mid-way, the Rust side re-installs them on the
  // next app launch (setup_database_triggers in lib.rs).
  const syncTriggers = (await sqlite
    .select<any[]>(
      `SELECT name, sql FROM sqlite_master WHERE type = 'trigger' AND name LIKE 'sync_%'`,
    )
    .catch(() => [])) as { name: string; sql: string }[];
  for (const trigger of syncTriggers) {
    await sqlite.execute(`DROP TRIGGER IF EXISTS "${trigger.name}"`);
  }
  const restoreSyncTriggers = async () => {
    for (const trigger of syncTriggers) {
      if (trigger.sql) {
        await sqlite
          .execute(trigger.sql)
          .catch((e) =>
            console.warn(
              `[aronium-import] failed to restore trigger ${trigger.name}:`,
              e,
            ),
          );
      }
    }
  };

  let taxCount = 0,
    groupCount = 0,
    productCount = 0,
    barcodeCount = 0;
  let productTaxCount = 0,
    customerCount = 0,
    documentCount = 0;
  let documentItemCount = 0,
    documentPaymentCount = 0,
    stockEntryCount = 0;
  // Epoch SECONDS, not milliseconds: every timestamp column in the app's
  // drizzle schema uses integer mode "timestamp", which reads values as
  // `new Date(value * 1000)` and writes `getTime() / 1000`. Writing raw
  // Date.now() ms here (as this importer once did) made every imported
  // date deserialize ~55,000 years in the future, so date-range queries
  // (dashboard charts, sales history) never matched a single imported row.
  const nowTimestamp = Math.floor(Date.now() / 1000);

  // ── TAXES ─────────────────────────────────────────────────────────────────
  onProgress(`Importing taxes (${aroniumTaxes.length})…`);
  const taxIdMap = new Map<number, string>();
  for (const t of aroniumTaxes) {
    const id = t.Id ?? t.id;
    if (id == null) continue;
    const originalCode = (t.Code ?? t.code ?? t.Name ?? t.name ?? "").trim();
    if (!originalCode) continue;
    let taxCode = originalCode;
    let c = 1;
    while (existingTaxCodes.has(taxCode.toLowerCase()))
      taxCode = `${originalCode}-${c++}`;
    existingTaxCodes.add(taxCode.toLowerCase());
    const posTaxId = `aronium-tax-${id}`;
    taxIdMap.set(Number(id), posTaxId);
    await sqlite.execute(
      `INSERT OR IGNORE INTO taxes (id, name, code, rate, fixed, enabled, position, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        posTaxId,
        t.Name ?? t.name ?? taxCode,
        taxCode,
        Number(t.Rate ?? t.rate ?? 0),
        (t.IsFixed ?? t.isfixed) === 1 ? 1 : 0,
        (t.IsEnabled ?? t.isenabled) !== 0 ? 1 : 0,
        0,
        nowTimestamp,
        nowTimestamp,
      ],
    );
    taxCount++;
  }

  // ── GROUPS ────────────────────────────────────────────────────────────────
  onProgress(`Importing groups (${aroniumGroups.length})…`);
  const validGroupIds = new Set<number>(
    aroniumGroups
      .map((g) => Number(pickField(g, "Id", "id")))
      .filter((id) => !isNaN(id)),
  );
  for (const g of aroniumGroups) {
    const rawId = pickField(g, "Id", "id");
    if (rawId == null) continue;
    const gId = Number(rawId);
    if (isNaN(gId)) continue;
    await sqlite.execute(
      `INSERT OR IGNORE INTO nodes (id, name, display_name, type, parent_id, image, color, position, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        `aronium-group-${gId}`,
        g.Name ?? g.name ?? "Unnamed Group",
        g.Name ?? g.name ?? "Unnamed Group",
        "group",
        "root",
        null,
        g.Color ?? g.color ?? "Transparent",
        Number(g.Rank ?? g.rank ?? 0),
        nowTimestamp,
        nowTimestamp,
      ],
    );
    groupCount++;
  }

  // ── PRODUCTS ──────────────────────────────────────────────────────────────
  onProgress(`Importing products (${aroniumProducts.length})…`);
  const validProductIds = new Set<number>();
  const productIdMap = new Map<number, string>();
  let productsLinked = 0,
    productsSkipped = 0;

  for (const p of aroniumProducts) {
    const rawId = pickField(p, "Id", "id");
    if (rawId == null) continue;
    const pId = Number(rawId);
    if (isNaN(pId)) continue;
    validProductIds.add(pId);
    const originalCode = String(p.Code ?? p.code ?? pId).trim();
    let code = originalCode;
    let c = 1;
    while (existingCodes.has(code.toLowerCase()))
      code = `${originalCode}-${c++}`;
    existingCodes.add(code.toLowerCase());
    const posProductId = `aronium-product-${pId}`;
    productIdMap.set(pId, posProductId);
    const name = p.Name ?? p.name ?? "Unnamed Product";

    // Products attach directly to their group's node, exactly like a
    // manually-created product does (see useCreateProduct's
    // `nodeId: groupId`) — there is no separate per-product node. The
    // `nodes.products` relation that powers the sidebar tree and the
    // "products in this group" queries only ever matches
    // `products.nodeId === nodes.id` directly, so routing through an extra
    // per-product proxy node (as this importer used to) meant the relation
    // never found the product at all.
    const rawProductGroupId = pickField(
      p,
      "ProductGroupId",
      "product_group_id",
      "GroupId",
    );
    const productGroupId =
      rawProductGroupId == null ? NaN : Number(rawProductGroupId);
    const productNodeId =
      !isNaN(productGroupId) && validGroupIds.has(productGroupId)
        ? `aronium-group-${productGroupId}`
        : "root";
    if (productNodeId === "root") productsSkipped++;
    else productsLinked++;

    await sqlite.execute(
      `INSERT OR IGNORE INTO products (id, node_id, supplier_id, owner_id, company_id, title, code, unit, active, service, default_quantity, age_restriction, description, image, color, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        posProductId,
        productNodeId,
        null,
        null,
        null,
        name,
        code,
        p.MeasurementUnit ?? p.measurementunit ?? "pcs",
        (p.IsEnabled ?? p.isenabled) !== 0 ? 1 : 0,
        (p.IsService ?? p.isservice) === 1 ? 1 : 0,
        (p.IsUsingDefaultQuantity ?? p.isusingdefaultquantity) !== 0 ? 1 : 0,
        p.AgeRestriction ?? p.agerestriction ?? null,
        p.Description ?? p.description ?? null,
        null,
        p.Color ?? p.color ?? "Transparent",
        nowTimestamp,
        nowTimestamp,
      ],
    );
    await sqlite.execute(
      `INSERT OR IGNORE INTO product_prices (id, product_id, wholesale, cost, markup, sale_price, price_after_tax, price_change_allowed, is_default, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        `aronium-price-${pId}`,
        posProductId,
        0,
        Number(p.Cost ?? p.cost ?? 0),
        Number(p.Markup ?? p.markup ?? 0),
        Number(p.Price ?? p.price ?? 0),
        (p.IsTaxInclusivePrice ?? p.istaxinclusiveprice) !== 0 ? 1 : 0,
        (p.IsPriceChangeAllowed ?? p.ispricechangeallowed) === 1 ? 1 : 0,
        1,
        nowTimestamp,
        nowTimestamp,
      ],
    );
    productCount++;
  }

  // ── BARCODES ──────────────────────────────────────────────────────────────
  onProgress(`Importing barcodes (${aroniumBarcodes.length})…`);
  for (const b of aroniumBarcodes) {
    const id = b.Id ?? b.id;
    const aroniumProductId = b.ProductId ?? b.productid ?? b.product_id;
    const value = String(b.Value ?? b.value ?? "").trim();
    if (id == null || !aroniumProductId || !value) continue;
    if (!validProductIds.has(Number(aroniumProductId))) continue;
    if (existingBarcodeValues.has(value.toLowerCase())) continue;
    existingBarcodeValues.add(value.toLowerCase());
    await sqlite.execute(
      `INSERT OR IGNORE INTO barcodes (id, type, value, product_id, is_primary, created_at) VALUES (?,?,?,?,?,?)`,
      [
        `aronium-barcode-${id}`,
        "CODE128",
        value,
        `aronium-product-${aroniumProductId}`,
        1,
        nowTimestamp,
      ],
    );
    barcodeCount++;
  }

  // ── PRODUCT TAXES ─────────────────────────────────────────────────────────
  for (const pt of aroniumProductTaxes) {
    const aroniumProductId = pt.ProductId ?? pt.productid ?? pt.product_id;
    const aroniumTaxId = pt.TaxId ?? pt.taxid ?? pt.tax_id;
    if (!aroniumProductId || !aroniumTaxId) continue;
    if (!validProductIds.has(Number(aroniumProductId))) continue;
    if (!taxIdMap.has(Number(aroniumTaxId))) continue;
    await sqlite.execute(
      `INSERT OR IGNORE INTO product_taxes (product_id, tax_id) VALUES (?,?)`,
      [
        `aronium-product-${aroniumProductId}`,
        taxIdMap.get(Number(aroniumTaxId))!,
      ],
    );
    productTaxCount++;
  }

  // ── CUSTOMERS ─────────────────────────────────────────────────────────────
  onProgress(`Importing customers (${aroniumCustomers.length})…`);
  const customerIdMap = new Map<number, string>();

  for (const cust of aroniumCustomers) {
    const id = cust.Id ?? cust.id;
    if (id == null) continue;
    const name = cust.Name ?? cust.name ?? "Unnamed Customer";
    const originalCode = String(
      cust.Code ?? cust.code ?? `aronium-cust-${id}`,
    ).trim();
    let code = originalCode;
    let c = 1;
    while (existingCustCodes.has(code.toLowerCase()))
      code = `${originalCode}-${c++}`;
    existingCustCodes.add(code.toLowerCase());
    const posCustomerId = `aronium-customer-${id}`;
    customerIdMap.set(Number(id), posCustomerId);
    const countryId = cust.CountryId ?? cust.countryid ?? cust.country_id;
    const country =
      countryId != null ? (countryMap.get(Number(countryId)) ?? null) : null;
    await sqlite.execute(
      `INSERT OR IGNORE INTO customers (id, name, code, tax_number, street_name, building_number, additional_street_name, plot_identification, district, postal_code, city, country, phone_number, email, active, customer, payment_terms_days, tax_exempt, position, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        posCustomerId,
        name,
        code,
        cust.TaxNumber ?? cust.taxnumber ?? null,
        cust.StreetName ?? cust.streetname ?? null,
        cust.BuildingNumber ?? cust.buildingnumber ?? null,
        cust.AdditionalStreetName ?? cust.additionalstreetname ?? null,
        cust.PlotIdentification ?? cust.plotidentification ?? null,
        cust.CitySubdivisionName ?? cust.citysubdivisionname ?? null,
        cust.PostalCode ?? cust.postalcode ?? null,
        cust.City ?? cust.city ?? null,
        country,
        cust.PhoneNumber ?? cust.phonenumber ?? null,
        cust.Email ?? cust.email ?? null,
        (cust.IsEnabled ?? cust.isenabled) !== 0 ? 1 : 0,
        (cust.IsCustomer ?? cust.iscustomer) !== 0 ? 1 : 0,
        Number(cust.DueDatePeriod ?? cust.duedateperiod ?? 0),
        (cust.IsTaxExempt ?? cust.istaxexempt) === 1 ? 1 : 0,
        0,
        nowTimestamp,
        nowTimestamp,
      ],
    );
    customerCount++;
  }

  // ── PAYMENT TYPES ─────────────────────────────────────────────────────────
  // Map Aronium PaymentType id → name (used as paymentType string on payments)
  const paymentTypeNameMap = new Map<number, string>();
  for (const pt of aroniumPaymentTypes) {
    const id = pt.Id ?? pt.id;
    const name = pt.Name ?? pt.name ?? "Cash";
    if (id != null) paymentTypeNameMap.set(Number(id), String(name));
    const posId = `aronium-pt-${id}`;
    await sqlite.execute(
      `INSERT OR IGNORE INTO payment_types (id, name, position, code, enabled, quick_payment, customer_required, change_allowed, mark_transaction_as_paid, print_receipt, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        posId,
        name,
        Number(pt.Rank ?? pt.rank ?? 0),
        String(name).toUpperCase().replace(/\s+/g, "_"),
        1,
        0,
        0,
        (pt.IsChangeAllowed ?? pt.ischangeallowed) === 1 ? 1 : 0,
        1,
        0,
        nowTimestamp,
        nowTimestamp,
      ],
    );
  }

  // ── STOCK ─────────────────────────────────────────────────────────────────
  onProgress("Importing stock quantities…");
  // Aronium Stock/StockEntry table: Id, ProductId, WarehouseId, Quantity —
  // one row per product/warehouse pair. We SUM across warehouses so the
  // stock_entries table (one row per product) gets the total on-hand qty.
  //
  // Different Aronium versions/backups appear to use different table names
  // for this ("Stock" vs "StockEntry" — the Rust .bak reader queries both).
  // Reading only "Stock" meant imports from a backup whose data actually
  // lives in "StockEntry" silently produced zero stock rows. Prefer "Stock"
  // and fall back to "StockEntry" only if it's empty — summing both
  // unconditionally would double-count on the (unlikely but possible) chance
  // a database has real rows in both.
  const stockRows = aroniumStock.length > 0 ? aroniumStock : aroniumStockEntries;
  if (aroniumStock.length === 0 && aroniumStockEntries.length > 0) {
    console.info(
      `[aronium-import] stock quantities came from "StockEntry" (${aroniumStockEntries.length} rows) — "Stock" was empty.`,
    );
  }

  // Build a map: aroniumProductId → total quantity (summed across warehouses)
  const stockQtyMap = new Map<number, number>();
  for (const s of stockRows) {
    const aroniumProdId = pickField(s, "ProductId", "product_id");
    if (aroniumProdId == null) continue;
    const pId = Number(aroniumProdId);
    if (isNaN(pId) || !validProductIds.has(pId)) continue;
    const qty = Number(pickField(s, "Quantity", "quantity") ?? 0);
    stockQtyMap.set(pId, (stockQtyMap.get(pId) ?? 0) + qty);
  }

  // Build a map: aroniumProductId → StockControl row (reorder info)
  const stockControlMap = new Map<number, any>();
  for (const sc of aroniumStockControls) {
    const aroniumProdId = pickField(sc, "ProductId", "product_id");
    if (aroniumProdId == null) continue;
    const scId = Number(aroniumProdId);
    if (!isNaN(scId)) stockControlMap.set(scId, sc);
  }

  for (const [pId, quantity] of stockQtyMap) {
    const posProductId = `aronium-product-${pId}`;
    const sc = stockControlMap.get(pId);
    // pickField (not a raw `??` chain) is required here: it falls back to a
    // case-insensitive scan of the row's actual keys, which is what catches
    // camelCase source columns like "preferredQuantity" — `sc.reorderpoint`
    // is a literal property lookup and does NOT match a real key spelled
    // "reorderPoint", so these silently resolved to their 0/null default for
    // any camelCase-named export.
    const reorderPoint = sc
      ? Number(pickField(sc, "ReorderPoint", "reorder_point") ?? 0)
      : null;
    const preferredQty = sc
      ? Number(pickField(sc, "PreferredQuantity", "preferred_quantity") ?? 0)
      : null;
    const lowStockWarning = sc
      ? Number(
          pickField(
            sc,
            "IsLowStockWarningEnabled",
            "is_low_stock_warning_enabled",
          ),
        ) === 1
        ? 1
        : 0
      : 0;
    const lowStockWarningQty = sc
      ? Number(
          pickField(
            sc,
            "LowStockWarningQuantity",
            "low_stock_warning_quantity",
          ) ?? 0,
        )
      : 0;

    // Proper upsert: INSERT ... ON CONFLICT DO UPDATE (no INSERT OR IGNORE
    // which would silently swallow conflicts and prevent the SET clause
    // from running).
    await sqlite.execute(
      `INSERT INTO stock_entries
         (id, product_id, type, quantity, reorder_point, preferred_quantity,
          low_stock_warning, low_stock_warning_quantity, created_at)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON CONFLICT(product_id) DO UPDATE SET
         quantity                  = excluded.quantity,
         type                      = excluded.type,
         reorder_point             = excluded.reorder_point,
         preferred_quantity        = excluded.preferred_quantity,
         low_stock_warning         = excluded.low_stock_warning,
         low_stock_warning_quantity= excluded.low_stock_warning_quantity`,
      [
        `aronium-se-${pId}`,
        posProductId,
        "adjustment",
        quantity,
        reorderPoint,
        preferredQty,
        lowStockWarning,
        lowStockWarningQty,
        nowTimestamp,
      ],
    );
    stockEntryCount++;
  }
  console.info(
    `[aronium-import] stock: ${stockRows.length} source row(s) → ${stockQtyMap.size} product(s) got a stock_entries row ` +
      `(${aroniumProducts.length} product(s) total, ${aroniumStockControls.length} StockControl row(s) matched). ` +
      `Source table: ${aroniumStock.length > 0 ? "Stock" : aroniumStockEntries.length > 0 ? "StockEntry" : "(none found)"}.`,
  );
  // Always dump a few raw source rows and their resolved (productId,
  // quantity) pairs — whether the count above looks right or not, this is
  // the fastest way to confirm the actual column names/values coming out of
  // a real Aronium export match what this importer assumes.
  if (stockRows.length > 0) {
    console.info(
      "[aronium-import] sample Stock/StockEntry rows (raw):",
      stockRows.slice(0, 3),
    );
  } else {
    console.warn(
      "[aronium-import] Neither \"Stock\" nor \"StockEntry\" returned any rows at all.",
    );
  }
  if (stockQtyMap.size > 0) {
    console.info(
      "[aronium-import] sample resolved (productId → quantity):",
      [...stockQtyMap.entries()].slice(0, 5),
    );
  } else if (stockRows.length > 0) {
    console.warn(
      "[aronium-import] Stock/StockEntry rows exist but none resolved to a quantity — " +
        "likely a ProductId/Quantity field-name or type mismatch. Sample raw row:",
      stockRows[0],
    );
  }

  // ── HIERARCHY PASS 2 ──────────────────────────────────────────────────────
  // Nests subgroups under their real parent group (products already got
  // their correct node_id directly at insert time above — no product-level
  // reparenting needed).
  //
  // IDs are always run through Number(...) before being interpolated into a
  // node id here — matching exactly how they were coerced when the group
  // node was first inserted above. Building the id string from a raw
  // (possibly string-typed) value in one pass and a Number-coerced value in
  // the other would make the two template strings diverge (e.g.
  // "aronium-group-5" vs "aronium-group-05"), so the UPDATE below would
  // silently match zero rows and the group would quietly stay parented to
  // "root" instead of its real parent.
  let groupsLinked = 0,
    groupsSkipped = 0;
  for (const g of aroniumGroups) {
    const rawId = pickField(g, "Id", "id");
    if (rawId == null) continue;
    const gId = Number(rawId);
    if (isNaN(gId)) continue;
    const rawParentGroupId = pickField(g, "ParentGroupId", "parent_group_id");
    if (rawParentGroupId == null) continue;
    const parentGroupId = Number(rawParentGroupId);
    if (!isNaN(parentGroupId) && validGroupIds.has(parentGroupId)) {
      await sqlite.execute(`UPDATE nodes SET parent_id = ? WHERE id = ?`, [
        `aronium-group-${parentGroupId}`,
        `aronium-group-${gId}`,
      ]);
      groupsLinked++;
    } else {
      groupsSkipped++;
    }
  }
  console.info(
    `[aronium-import] group hierarchy: ${groupsLinked} linked, ${groupsSkipped} skipped (no/unknown parent). ` +
      `product grouping: ${productsLinked} linked, ${productsSkipped} skipped (no/unknown group).`,
  );
  if (aroniumProducts.length > 0 && productsLinked === 0) {
    console.warn(
      "[aronium-import] No products were linked to any group. Sample product row keys:",
      Object.keys(aroniumProducts[0]),
    );
  }

  // The node tree just changed (new groups + products attached to them) via
  // raw SQL, bypassing the node mutation hooks that normally bust this cache
  // — clear it so "products by group" queries see the new hierarchy instead
  // of a stale pre-import parent/child mapping.
  invalidateChildNodeIdsCache();

  // ── DOCUMENTS ─────────────────────────────────────────────────────────────
  onProgress(
    `Importing documents (${aroniumDocuments.length} — this is the long part)…`,
  );
  // Aronium Document columns: Id, Number, ExternalNumber, CustomerId, Date,
  //   TotalWithTax, TotalWithoutTax, TaxTotal, DocumentTypeId, IsDeleted, etc.
  // Payment links to Document via DocumentId.

  // Fallback "Unknown" customer for documents with no CustomerId
  let unknownCustomerId: string | null = null;
  const ensureUnknownCustomer = async (): Promise<string> => {
    if (unknownCustomerId) return unknownCustomerId;
    const existing = await sqlite
      .select<any[]>(`SELECT id FROM customers WHERE name = 'Unknown' LIMIT 1`)
      .catch(() => []);
    if (existing.length > 0) {
      unknownCustomerId = String(existing[0].id);
    } else {
      unknownCustomerId = `aronium-customer-unknown`;
      await sqlite.execute(
        `INSERT OR IGNORE INTO customers (id, name, code, active, customer, payment_terms_days, tax_exempt, position, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          unknownCustomerId,
          "Unknown",
          "UNKNOWN",
          1,
          1,
          0,
          0,
          0,
          nowTimestamp,
          nowTimestamp,
        ],
      );
    }
    return unknownCustomerId;
  };

  // Index document items by DocumentId for O(1) lookup
  const itemsByDocId = new Map<number, any[]>();
  for (const item of aroniumDocumentItems) {
    const did = Number(item.DocumentId ?? item.documentid ?? item.document_id);
    if (isNaN(did)) continue;
    if (!itemsByDocId.has(did)) itemsByDocId.set(did, []);
    itemsByDocId.get(did)!.push(item);
  }

  // Index payments by DocumentId for O(1) lookup.
  // Aronium Payment.DocumentId is the FK — verify with:
  //   SELECT TOP 1 * FROM Payment FOR JSON AUTO
  // If the column is named differently adjust the fallback chain below.
  const paymentsByDocId = new Map<number, any[]>();
  for (const payment of aroniumPayments) {
    const did = Number(
      payment.DocumentId ?? payment.documentid ?? payment.document_id,
    );
    if (isNaN(did)) continue;
    if (!paymentsByDocId.has(did)) paymentsByDocId.set(did, []);
    paymentsByDocId.get(did)!.push(payment);
  }

  // ── Lookup maps ──────────────────────────────────────────────────────────
  // Aronium's real schema (verified against a live backup):
  //   Document:      Id, Number, UserId, CustomerId, Date, Total,
  //                  DocumentTypeId, PaidStatus, Discount, DueDate, …
  //   DocumentItem:  Id, DocumentId, ProductId, Quantity, PriceBeforeTax,
  //                  Price, Discount, Total, … (NO Name/Unit/TaxRate columns)
  //   DocumentType:  Id, Name, Code — Code maps 1:1 onto this app's document
  //                  type codes (100 Purchase, 120 Stock Return, 200 Sales,
  //                  220 Refund, 230 Proforma, 300 Inventory, 400 Loss).
  //   DocumentItemTax: DocumentItemId, TaxId, Amount — per-item tax.

  // DocumentTypeId → app type code. Hardcoding 200 here (as this importer
  // once did) turned every purchase/refund/inventory-count into a "Sale".
  const typeCodeById = new Map<number, number>();
  for (const dt of aroniumDocumentTypes) {
    const dtId = Number(pickField(dt, "Id", "id"));
    const code = Number(pickField(dt, "Code", "code"));
    if (!isNaN(dtId) && !isNaN(code)) typeCodeById.set(dtId, code);
  }

  // DocumentItem has no product name/unit — resolve them from the product.
  const productInfoById = new Map<
    number,
    { name: string; unit: string | null }
  >();
  for (const p of aroniumProducts) {
    const pId = Number(pickField(p, "Id", "id"));
    if (isNaN(pId)) continue;
    productInfoById.set(pId, {
      name: String(p.Name ?? p.name ?? "Product"),
      unit: p.MeasurementUnit ?? p.measurementunit ?? null,
    });
  }

  // Per-item tax rate/amount via DocumentItemTax → Tax.
  const taxRateById = new Map<number, number>();
  for (const t of aroniumTaxes) {
    const tId = Number(pickField(t, "Id", "id"));
    if (!isNaN(tId)) taxRateById.set(tId, Number(t.Rate ?? t.rate ?? 0));
  }
  const itemTaxRate = new Map<number, number>();
  const itemTaxAmount = new Map<number, number>();
  for (const it of aroniumDocumentItemTaxes) {
    const itemId = Number(pickField(it, "DocumentItemId", "document_item_id"));
    if (isNaN(itemId)) continue;
    const taxId = Number(pickField(it, "TaxId", "tax_id"));
    itemTaxRate.set(
      itemId,
      (itemTaxRate.get(itemId) ?? 0) + (taxRateById.get(taxId) ?? 0),
    );
    itemTaxAmount.set(
      itemId,
      (itemTaxAmount.get(itemId) ?? 0) +
        Number(pickField(it, "Amount", "amount") ?? 0),
    );
  }

  // ── Accumulate rows, then batch-insert ───────────────────────────────────
  const docRows: any[][] = [];
  const itemRows: any[][] = [];
  const payRows: any[][] = [];

  for (const doc of aroniumDocuments) {
    const id = doc.Id ?? doc.id;
    if (id == null) continue;

    const rawNumber = String(doc.Number ?? doc.number ?? `DOC-${id}`).trim();
    if (existingDocNums.has(rawNumber.toLowerCase())) continue;
    existingDocNums.add(rawNumber.toLowerCase());

    const aroniumCustomerId =
      doc.CustomerId ?? doc.customerid ?? doc.customer_id;
    let posCustomerId: string;
    if (
      aroniumCustomerId != null &&
      customerIdMap.has(Number(aroniumCustomerId))
    ) {
      posCustomerId = customerIdMap.get(Number(aroniumCustomerId))!;
    } else {
      posCustomerId = await ensureUnknownCustomer();
    }

    let docDate: number = nowTimestamp;
    const rawDate = doc.Date ?? doc.date ?? doc.DateCreated ?? doc.datecreated;
    if (rawDate) {
      const parsed = new Date(rawDate);
      // Epoch seconds — see the nowTimestamp comment above.
      if (!isNaN(parsed.getTime()))
        docDate = Math.floor(parsed.getTime() / 1000);
    }

    const rawTypeId = doc.DocumentTypeId ?? doc.documenttypeid;
    const typeCode =
      rawTypeId != null ? (typeCodeById.get(Number(rawTypeId)) ?? 200) : 200;

    const totalWithTax = Number(doc.Total ?? doc.total ?? 0);
    const posDocId = `doc-${id}`;

    // ── DocumentItem → document_items ────────────────────────────────────
    let docTaxTotal = 0;
    for (const item of itemsByDocId.get(Number(id)) ?? []) {
      const aroniumProdId = item.ProductId ?? item.productid ?? item.product_id;
      const posProductId =
        aroniumProdId != null
          ? (productIdMap.get(Number(aroniumProdId)) ?? null)
          : null;
      if (!posProductId) continue;

      const itemId = Number(item.Id ?? item.id);
      const info = productInfoById.get(Number(aroniumProdId));
      docTaxTotal += itemTaxAmount.get(itemId) ?? 0;

      itemRows.push([
        `doc-item-${item.Id ?? item.id ?? crypto.randomUUID()}`,
        posDocId,
        posProductId,
        info?.name ?? "Product",
        info?.unit ?? null,
        Number(item.Quantity ?? item.quantity ?? 1),
        Number(item.PriceBeforeTax ?? item.pricebeforetax ?? item.Price ?? 0),
        itemTaxRate.get(itemId) ?? 0,
        Number(item.Discount ?? item.discount ?? 0),
        Number(item.Total ?? item.total ?? 0),
      ]);
      documentItemCount++;
    }

    // ── Payment → docmentPayments ────────────────────────────────────────
    let paidSum = 0;
    for (const payment of paymentsByDocId.get(Number(id)) ?? []) {
      const ptId =
        payment.PaymentTypeId ??
        payment.paymenttypeid ??
        payment.payment_type_id;
      const paymentType =
        ptId != null
          ? (paymentTypeNameMap.get(Number(ptId)) ?? "Cash")
          : "Cash";
      const amount = Number(payment.Amount ?? payment.amount ?? 0);
      paidSum += amount;

      payRows.push([
        `aronium-pay-${payment.Id ?? payment.id ?? crypto.randomUUID()}`,
        posDocId,
        `aronium-pt-${ptId ?? "unknown"}`,
        "paid",
        paymentType,
        amount,
        docDate,
      ]);
      documentPaymentCount++;
    }

    // `paid` is derived from actual payment rows rather than Aronium's
    // PaidStatus enum, whose values proved ambiguous in real data.
    const isPaid = totalWithTax > 0 && paidSum >= totalWithTax - 0.005;

    docRows.push([
      posDocId,
      rawNumber,
      null, // Aronium Document has no external-number column
      posCustomerId,
      docDate,
      isPaid ? 1 : 0,
      typeCode,
      "posted",
      totalWithTax - docTaxTotal,
      docTaxTotal,
      totalWithTax,
      paidSum,
      Math.max(0, totalWithTax - paidSum),
      docDate,
    ]);
    documentCount++;
  }

  await batchInsert(
    "documents",
    [
      "id",
      "number",
      "external_number",
      "customer_id",
      "date",
      "paid",
      "type",
      "status",
      "total_before_tax",
      "tax_total",
      "total",
      "total_paid",
      "outstanding_balance",
      "created_at",
    ],
    docRows,
    (done, total) => onProgress(`Importing documents ${done}/${total}…`),
  );
  await batchInsert(
    "document_items",
    [
      "id",
      "document_id",
      "product_id",
      "name",
      "unit",
      "quantity",
      "price_before_tax",
      "tax_rate",
      "discount",
      "total",
    ],
    itemRows,
    (done, total) => onProgress(`Importing document items ${done}/${total}…`),
  );
  await batchInsert(
    "docmentPayments",
    ["id", "document_id", "payment_id", "status", "payment_type", "amount", "date"],
    payRows,
    (done, total) => onProgress(`Importing payments ${done}/${total}…`),
  );

  await restoreSyncTriggers();

  if (sourceWarnings.length > 0) {
    console.warn(
      `[aronium-import] ${sourceWarnings.length} table(s) failed to fetch from the source database ` +
        `and contributed zero rows:`,
      sourceWarnings,
    );
  }

  return {
    success: true,
    message: "Database imported successfully!",
    warnings: sourceWarnings.length > 0 ? sourceWarnings : undefined,
    counts: {
      taxes: taxCount,
      groups: groupCount,
      products: productCount,
      barcodes: barcodeCount,
      productTaxes: productTaxCount,
      customers: customerCount,
      documents: documentCount,
      documentItems: documentItemCount,
      documentPayments: documentPaymentCount,
      stockEntries: stockEntryCount,
    },
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function importAroniumDatabase(
  filePath: string,
  onProgress: (stage: string) => void = () => {},
): Promise<ImportResult> {
  try {
    await ensureRootNode();
    const fileType = await detectFileType(filePath);
    console.log("Detected Aronium file type:", fileType);

    // ── Path A: Microsoft SQL Server .bak ────────────────────────────────
    if (fileType === "mssql-bak") {
      // Pre-flight: make sure sqlcmd is resolvable (on PATH, cached, or
      // downloaded now) *before* the restore starts, so first-time
      // provisioning shows its own progress stage instead of appearing to
      // hang mid-restore. Kept in its own try/catch so a download/extraction
      // failure surfaces its own actionable message rather than being
      // overwritten by the "Make sure SQL Server LocalDB is installed" text
      // below, which is misleading here — LocalDB itself is fine, sqlcmd
      // just couldn't be provisioned.
      try {
        onProgress("Preparing SQL command-line tools…");
        await invoke<void>("ensure_sqlcmd_available");
      } catch (err) {
        throw new Error(String(err));
      }

      let tablesJson: string;
      try {
        onProgress("Restoring SQL Server backup (this can take a minute)…");
        tablesJson = await invoke<string>("import_aronium_bak", { filePath });
        console.log(
          "Aronium .bak import completed, JSON length:",
          tablesJson.length,
          tablesJson.slice(0, 80),
        );
      } catch (err) {
        throw new Error(
          `SQL Server restore failed: ${err}\n\nMake sure SQL Server LocalDB is installed. ` +
            `You can install it from the Database settings page.`,
        );
      }

      onProgress("Parsing exported tables…");
      const tables: Record<string, any[]> = JSON.parse(tablesJson);
      const sourceWarnings: string[] = (tables["_ImportErrors"] ?? []) as string[];
      if (sourceWarnings.length > 0) {
        console.warn(
          "[aronium-import] .bak reader reported table fetch failures:",
          sourceWarnings,
        );
      }

      const countryMap = new Map<number, string>();
      for (const c of tables["Country"] ?? []) {
        const cId = c.Id ?? c.id;
        const cName = c.Name ?? c.name;
        if (cId != null && cName != null)
          countryMap.set(Number(cId), String(cName));
      }

      return await runImport({
        aroniumTaxes: tables["Tax"] ?? [],
        aroniumGroups: tables["ProductGroup"] ?? [],
        aroniumProducts: tables["Product"] ?? [],
        aroniumBarcodes: tables["Barcode"] ?? [],
        aroniumProductTaxes: tables["ProductTax"] ?? [],
        aroniumCustomers: tables["Customer"] ?? [],
        aroniumDocuments: tables["Document"] ?? [],
        aroniumDocumentItems: tables["DocumentItem"] ?? [],
        aroniumDocumentItemTaxes: tables["DocumentItemTax"] ?? [],
        aroniumDocumentTypes: tables["DocumentType"] ?? [],
        aroniumPayments: tables["Payment"] ?? [],
        aroniumPaymentTypes: tables["PaymentType"] ?? [],
        aroniumStock: tables["Stock"] ?? [],
        aroniumStockEntries: tables["StockEntry"] ?? [],
        aroniumStockControls: tables["StockControl"] ?? [],
        countryMap,
        sourceWarnings,
      }, onProgress);
    }

    // ── Path B: binary SQLite ─────────────────────────────────────────────
    if (fileType === "sqlite") {
      let aroniumSqlite: Database | null = null;
      try {
        aroniumSqlite = await Database.load(`sqlite:${filePath}`);
        const q = (t: string) =>
          aroniumSqlite!.select<any[]>(`SELECT * FROM ${t}`).catch(() => []);

        const aroniumCountries = await q("Country");
        const countryMap = new Map<number, string>();
        for (const c of aroniumCountries) {
          const cId = c.Id ?? c.id;
          const cName = c.Name ?? c.name;
          if (cId != null && cName != null)
            countryMap.set(Number(cId), String(cName));
        }

        return await runImport({
          aroniumTaxes: await q("Tax"),
          aroniumGroups: await q("ProductGroup"),
          aroniumProducts: await q("Product"),
          aroniumBarcodes: await q("Barcode"),
          aroniumProductTaxes: await q("ProductTax"),
          aroniumCustomers: await q("Customer"),
          aroniumDocuments: await q("Document"),
          aroniumDocumentItems: await q("DocumentItem"),
          aroniumDocumentItemTaxes: await q("DocumentItemTax"),
          aroniumDocumentTypes: await q("DocumentType"),
          aroniumPayments: await q("Payment"),
          aroniumPaymentTypes: await q("PaymentType"),
          aroniumStock: await q("Stock"),
          aroniumStockEntries: await q("StockEntry"),
          aroniumStockControls: await q("StockControl"),
          countryMap,
        }, onProgress);
      } finally {
        aroniumSqlite = null;
      }
    }

    // ── Path C: plain-text SQL dump ───────────────────────────────────────
    const rawBytes = await readFile(filePath);
    const startIndex =
      rawBytes[0] === 0xef && rawBytes[1] === 0xbb && rawBytes[2] === 0xbf
        ? 3
        : 0;
    const sqlText = new TextDecoder("utf-8").decode(rawBytes.slice(startIndex));
    const tables = parseSqlDump(sqlText);

    const countryMap = new Map<number, string>();
    for (const c of tables.Country) {
      const cId = c.Id ?? c.id;
      const cName = c.Name ?? c.name;
      if (cId != null && cName != null)
        countryMap.set(Number(cId), String(cName));
    }

    return await runImport({
      aroniumTaxes: tables.Tax,
      aroniumGroups: tables.ProductGroup,
      aroniumProducts: tables.Product,
      aroniumBarcodes: tables.Barcode,
      aroniumProductTaxes: tables.ProductTax,
      aroniumCustomers: tables.Customer,
      aroniumDocuments: tables.Document,
      aroniumDocumentItems: tables.DocumentItem,
      aroniumDocumentItemTaxes: tables.DocumentItemTax,
      aroniumDocumentTypes: tables.DocumentType,
      aroniumPayments: tables.Payment,
      aroniumPaymentTypes: tables.PaymentType,
      aroniumStock: tables.Stock,
      aroniumStockEntries: tables.StockEntry,
      aroniumStockControls: tables.StockControl,
      countryMap,
    }, onProgress);
  } catch (err) {
    console.error("Aronium import error:", err);
    return {
      success: false,
      message: String(err),
      counts: {
        taxes: 0,
        groups: 0,
        products: 0,
        barcodes: 0,
        productTaxes: 0,
        customers: 0,
        documents: 0,
        documentItems: 0,
        documentPayments: 0,
        stockEntries: 0,
      },
    };
  }
}
