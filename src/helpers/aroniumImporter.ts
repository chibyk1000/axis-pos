import Database from "@tauri-apps/plugin-sql";
import { readFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { sqlite } from "@/db/database";
import { ensureRootNode } from "@/hooks/controllers/nodes";
import { invalidateChildNodeIdsCache } from "@/hooks/controllers/products";

export interface ImportResult {
  success: boolean;
  message: string;
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
  Payment: any[];
  PaymentType: any[];
  // Aronium stock tables
  Stock: any[];        // Id, ProductId, WarehouseId, Quantity
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
    Payment: [],
    PaymentType: [],
    Stock: [],
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

interface AroniumData {
  aroniumTaxes: any[];
  aroniumGroups: any[];
  aroniumProducts: any[];
  aroniumBarcodes: any[];
  aroniumProductTaxes: any[];
  aroniumCustomers: any[];
  aroniumDocuments: any[];
  aroniumDocumentItems: any[];
  aroniumPayments: any[];
  aroniumPaymentTypes: any[];
  aroniumStock: any[];        // Aronium Stock table (quantity per product/warehouse)
  aroniumStockControls: any[]; // Aronium StockControl table (reorder points etc.)
  countryMap: Map<number, string>;
}

async function runImport(data: AroniumData): Promise<ImportResult> {
  const {
    aroniumTaxes,
    aroniumGroups,
    aroniumProducts,
    aroniumBarcodes,
    aroniumProductTaxes,
    aroniumCustomers,
    aroniumDocuments,
    aroniumDocumentItems,
    aroniumPayments,
    aroniumPaymentTypes,
    aroniumStock,
    aroniumStockControls,
    countryMap,
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
  const nowTimestamp = Date.now();

  // ── TAXES ─────────────────────────────────────────────────────────────────
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
  const validProductIds = new Set<number>();
  const productIdMap = new Map<number, string>();

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
    const posNodeId = `aronium-product-node-${pId}`;
    productIdMap.set(pId, posProductId);
    const name = p.Name ?? p.name ?? "Unnamed Product";
    await sqlite.execute(
      `INSERT OR IGNORE INTO nodes (id, name, display_name, type, parent_id, image, color, position, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        posNodeId,
        name,
        name,
        "product",
        "root",
        null,
        p.Color ?? p.color ?? "Transparent",
        Number(p.Rank ?? p.rank ?? 0),
        nowTimestamp,
        nowTimestamp,
      ],
    );
    await sqlite.execute(
      `INSERT OR IGNORE INTO products (id, node_id, supplier_id, owner_id, company_id, title, code, unit, active, service, default_quantity, age_restriction, description, image, color, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        posProductId,
        posNodeId,
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

  // ── DOCUMENTS ─────────────────────────────────────────────────────────────
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
    const rawDate = doc.Date ?? doc.date ?? doc.CreatedAt ?? doc.createdat;
    if (rawDate) {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) docDate = parsed.getTime();
    }

    const totalWithTax = Number(
      doc.TotalWithTax ?? doc.totalwithtax ?? doc.Total ?? doc.total ?? 0,
    );
    const totalWithoutTax = Number(
      doc.TotalWithoutTax ?? doc.totalwithouttax ?? 0,
    );
    const taxTotal = Number(doc.TaxTotal ?? doc.taxtotal ?? 0);

    // Aronium marks deleted/voided documents via IsDeleted flag or PosVoid rows.
    // We treat IsDeleted=1 as cancelled; everything else as posted.
    const isDeleted =
      (doc.IsDeleted ?? doc.isdeleted) === true ||
      (doc.IsDeleted ?? doc.isdeleted) === 1;
    const status = isDeleted ? "cancelled" : "posted";

    const posDocId = `aronium-doc-${id}`;

    await sqlite.execute(
      `INSERT OR IGNORE INTO documents (id, number, external_number, customer_id, date, paid, type, status, total_before_tax, tax_total, total, total_paid, outstanding_balance, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        posDocId,
        rawNumber,
        doc.ExternalNumber ?? doc.externalnumber ?? null,
        posCustomerId,
        docDate,
        isDeleted ? 0 : 1,
        200, // sale type
        status,
        totalWithoutTax,
        taxTotal,
        totalWithTax,
        isDeleted ? 0 : totalWithTax,
        0,
        docDate,
      ],
    );
    documentCount++;

    // ── DocumentItem → document_items ────────────────────────────────────
    for (const item of itemsByDocId.get(Number(id)) ?? []) {
      const aroniumProdId = item.ProductId ?? item.productid ?? item.product_id;
      const posProductId =
        aroniumProdId != null
          ? (productIdMap.get(Number(aroniumProdId)) ?? null)
          : null;
      if (!posProductId) continue;

      await sqlite.execute(
        `INSERT OR IGNORE INTO document_items (id, document_id, product_id, name, unit, quantity, price_before_tax, tax_rate, discount, total) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          `aronium-di-${item.Id ?? item.id ?? crypto.randomUUID()}`,
          posDocId,
          posProductId,
          String(item.Name ?? item.name ?? "Product"),
          item.MeasurementUnit ?? item.measurementunit ?? null,
          Number(item.Quantity ?? item.quantity ?? 1),
          Number(
            item.PriceWithoutTax ??
              item.pricewithoutax ??
              item.Price ??
              item.price ??
              0,
          ),
          Number(item.TaxRate ?? item.taxrate ?? 0),
          Number(item.Discount ?? item.discount ?? 0),
          Number(
            item.TotalWithTax ??
              item.totalwithtax ??
              item.Total ??
              item.total ??
              0,
          ),
        ],
      );
      documentItemCount++;
    }

    // ── Payment → docmentPayments ────────────────────────────────────────
    for (const payment of paymentsByDocId.get(Number(id)) ?? []) {
      const ptId =
        payment.PaymentTypeId ??
        payment.paymenttypeid ??
        payment.payment_type_id;
      const paymentType =
        ptId != null
          ? (paymentTypeNameMap.get(Number(ptId)) ?? "Cash")
          : "Cash";

      await sqlite.execute(
        `INSERT OR IGNORE INTO docmentPayments (id, document_id, payment_id, status, payment_type, amount, date) VALUES (?,?,?,?,?,?,?)`,
        [
          `aronium-pay-${payment.Id ?? payment.id ?? crypto.randomUUID()}`,
          posDocId,
          `aronium-pt-${ptId ?? "unknown"}`,
          "paid",
          paymentType,
          Number(payment.Amount ?? payment.amount ?? 0),
          docDate,
        ],
      );
      documentPaymentCount++;
    }
  }

  // ── STOCK ─────────────────────────────────────────────────────────────────
  // Aronium Stock table: Id, ProductId, WarehouseId, Quantity
  // One row per product/warehouse pair. We SUM across warehouses so the
  // stock_entries table (one row per product) gets the total on-hand qty.

  // Build a map: aroniumProductId → total quantity (summed across warehouses)
  const stockQtyMap = new Map<number, number>();
  for (const s of aroniumStock) {
    const aroniumProdId = s.ProductId ?? s.productid ?? s.product_id;
    if (aroniumProdId == null) continue;
    const pId = Number(aroniumProdId);
    if (!validProductIds.has(pId)) continue;
    const qty = Number(s.Quantity ?? s.quantity ?? 0);
    stockQtyMap.set(pId, (stockQtyMap.get(pId) ?? 0) + qty);
  }

  // Build a map: aroniumProductId → StockControl row (reorder info)
  const stockControlMap = new Map<number, any>();
  for (const sc of aroniumStockControls) {
    const aroniumProdId = sc.ProductId ?? sc.productid ?? sc.product_id;
    if (aroniumProdId == null) continue;
    stockControlMap.set(Number(aroniumProdId), sc);
  }

  for (const [pId, quantity] of stockQtyMap) {
    const posProductId = `aronium-product-${pId}`;
    const sc = stockControlMap.get(pId);
    const reorderPoint = sc
      ? Number(sc.ReorderPoint ?? sc.reorderpoint ?? 0)
      : null;
    const preferredQty = sc
      ? Number(sc.PreferredQuantity ?? sc.preferredquantity ?? 0)
      : null;
    const lowStockWarning = sc
      ? (sc.IsLowStockWarningEnabled ?? sc.islowstockwarningenabled) === 1
        ? 1
        : 0
      : 0;
    const lowStockWarningQty = sc
      ? Number(
          sc.LowStockWarningQuantity ?? sc.lowstockwarningquantity ?? 0,
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

  // ── HIERARCHY PASS 2 ──────────────────────────────────────────────────────
  // IDs are always run through Number(...) before being interpolated into a
  // node id here — matching exactly how they were coerced when the group/
  // product node was first inserted above. Building the id string from a raw
  // (possibly string-typed) value in one pass and a Number-coerced value in
  // the other would make the two template strings diverge (e.g.
  // "aronium-group-5" vs "aronium-group-05"), so the UPDATE below would
  // silently match zero rows and the row would quietly stay parented to
  // "root" instead of its real group.
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
  let productsLinked = 0,
    productsSkipped = 0;
  for (const p of aroniumProducts) {
    const rawId = pickField(p, "Id", "id");
    if (rawId == null) continue;
    const pId = Number(rawId);
    if (isNaN(pId)) continue;
    const rawProductGroupId = pickField(
      p,
      "ProductGroupId",
      "product_group_id",
      "GroupId",
    );
    if (rawProductGroupId == null) continue;
    const productGroupId = Number(rawProductGroupId);
    if (!isNaN(productGroupId) && validGroupIds.has(productGroupId)) {
      await sqlite.execute(`UPDATE nodes SET parent_id = ? WHERE id = ?`, [
        `aronium-group-${productGroupId}`,
        `aronium-product-node-${pId}`,
      ]);
      productsLinked++;
    } else {
      productsSkipped++;
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

  // The node tree just changed (new groups + product nodes reparented under
  // them) via raw SQL, bypassing the node mutation hooks that normally bust
  // this cache — clear it so "products by group" queries see the new
  // hierarchy instead of a stale pre-import parent/child mapping.
  invalidateChildNodeIdsCache();

  return {
    success: true,
    message: "Database imported successfully!",
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
): Promise<ImportResult> {
  try {
    await ensureRootNode();
    const fileType = await detectFileType(filePath);
    console.log("Detected Aronium file type:", fileType);

    // ── Path A: Microsoft SQL Server .bak ────────────────────────────────
    if (fileType === "mssql-bak") {
      let tablesJson: string;
      try {
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

      const tables: Record<string, any[]> = JSON.parse(tablesJson);

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
        aroniumPayments: tables["Payment"] ?? [],
        aroniumPaymentTypes: tables["PaymentType"] ?? [],
        aroniumStock: tables["Stock"] ?? [],
        aroniumStockControls: tables["StockControl"] ?? [],
        countryMap,
      });
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
          aroniumPayments: await q("Payment"),
          aroniumPaymentTypes: await q("PaymentType"),
          aroniumStock: await q("Stock"),
          aroniumStockControls: await q("StockControl"),
          countryMap,
        });
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
      aroniumPayments: tables.Payment,
      aroniumPaymentTypes: tables.PaymentType,
      aroniumStock: tables.Stock,
      aroniumStockControls: tables.StockControl,
      countryMap,
    });
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
