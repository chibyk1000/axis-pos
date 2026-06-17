import Database from "@tauri-apps/plugin-sql";
import { sqlite } from "@/db/database";
import { ensureRootNode } from "@/hooks/controllers/nodes";

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
  };
}

export async function importAroniumDatabase(filePath: string): Promise<ImportResult> {
  let aroniumSqlite: Database | null = null;
  try {
    // 1. Ensure ROOT node exists in the destination database
    await ensureRootNode();

    // 2. Load the source Aronium sqlite database
    aroniumSqlite = await Database.load(`sqlite:${filePath}`);

    // 3. Select all relevant data from Aronium database
    // Fetch countries mapping
    const aroniumCountries = await aroniumSqlite.select<any[]>("SELECT * FROM Country").catch(() => []);
    const countryMap = new Map<number, string>();
    for (const c of aroniumCountries) {
      const cId = c.Id ?? c.id;
      const cName = c.Name ?? c.name;
      if (cId != null && cName != null) {
        countryMap.set(Number(cId), String(cName));
      }
    }

    // Fetch Taxes
    const aroniumTaxes = await aroniumSqlite.select<any[]>("SELECT * FROM Tax").catch(() => []);
    // Fetch Product Groups
    const aroniumGroups = await aroniumSqlite.select<any[]>("SELECT * FROM ProductGroup").catch(() => []);
    // Fetch Products
    const aroniumProducts = await aroniumSqlite.select<any[]>("SELECT * FROM Product").catch(() => []);
    // Fetch Barcodes
    const aroniumBarcodes = await aroniumSqlite.select<any[]>("SELECT * FROM Barcode").catch(() => []);
    // Fetch ProductTaxes
    const aroniumProductTaxes = await aroniumSqlite.select<any[]>("SELECT * FROM ProductTax").catch(() => []);
    // Fetch Customers
    const aroniumCustomers = await aroniumSqlite.select<any[]>("SELECT * FROM Customer").catch(() => []);

    // 4. Fetch existing unique items in Axis POS to avoid duplicate constraint failures
    const existingProducts = await sqlite.select<any[]>("SELECT code FROM products").catch(() => []);
    const existingCodes = new Set<string>(
      existingProducts.map((p) => String(p.code ?? p.Code ?? "").toLowerCase()).filter(Boolean)
    );

    const existingCustomers = await sqlite.select<any[]>("SELECT code FROM customers").catch(() => []);
    const existingCustCodes = new Set<string>(
      existingCustomers.map((c) => String(c.code ?? c.Code ?? "").toLowerCase()).filter(Boolean)
    );

    const existingBarcodes = await sqlite.select<any[]>("SELECT value FROM barcodes").catch(() => []);
    const existingBarcodeValues = new Set<string>(
      existingBarcodes.map((b) => String(b.value ?? b.Value ?? "").toLowerCase()).filter(Boolean)
    );

    const existingTaxes = await sqlite.select<any[]>("SELECT code FROM taxes").catch(() => []);
    const existingTaxCodes = new Set<string>(
      existingTaxes.map((t) => String(t.code ?? t.Code ?? "").toLowerCase()).filter(Boolean)
    );

    // Counts of imported items
    let taxCount = 0;
    let groupCount = 0;
    let productCount = 0;
    let barcodeCount = 0;
    let productTaxCount = 0;
    let customerCount = 0;

    const nowTimestamp = Date.now();

    // 5. Run imports sequentially (no manual transaction — Tauri SQL manages its own)
    {
      // --- IMPORT TAXES ---
      const taxIdMap = new Map<number, string>(); // Maps Aronium Tax Id -> Axis POS Tax Id
      for (const t of aroniumTaxes) {
        const id = t.Id ?? t.id;
        if (id == null) continue;

        const originalCode = (t.Code ?? t.code ?? t.Name ?? t.name ?? "").trim();
        if (!originalCode) continue;

        let taxCode = originalCode;
        let c = 1;
        while (existingTaxCodes.has(taxCode.toLowerCase())) {
          taxCode = `${originalCode}-${c}`;
          c++;
        }
        existingTaxCodes.add(taxCode.toLowerCase());

        const posTaxId = `aronium-tax-${id}`;
        taxIdMap.set(Number(id), posTaxId);

        const taxName = t.Name ?? t.name ?? taxCode;
        const rate = Number(t.Rate ?? t.rate ?? 0);
        const fixed = (t.IsFixed ?? t.isfixed ?? t.is_fixed) === 1 ? 1 : 0;
        const enabled = (t.IsEnabled ?? t.isenabled ?? t.is_enabled) !== 0 ? 1 : 0;

        await sqlite.execute(
          `INSERT OR IGNORE INTO taxes (id, name, code, rate, fixed, enabled, position, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [posTaxId, taxName, taxCode, rate, fixed, enabled, 0, nowTimestamp, nowTimestamp]
        );
        taxCount++;
      }

      // --- IMPORT PRODUCT GROUPS (NODES) ---
      const validGroupIds = new Set<number>(aroniumGroups.map((g) => Number(g.Id ?? g.id)).filter((id) => id != null));
      for (const g of aroniumGroups) {
        const id = g.Id ?? g.id;
        if (id == null) continue;

        const posGroupId = `aronium-group-${id}`;
        const name = g.Name ?? g.name ?? "Unnamed Group";
        // Initially insert with 'root' as parent_id to avoid FK constraint violations
        const color = g.Color ?? g.color ?? "Transparent";
        const position = Number(g.Rank ?? g.rank ?? 0);

        await sqlite.execute(
          `INSERT OR IGNORE INTO nodes (id, name, display_name, type, parent_id, image, color, position, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [posGroupId, name, name, "group", "root", null, color, position, nowTimestamp, nowTimestamp]
        );
        groupCount++;
      }

      // --- IMPORT PRODUCTS ---
      const validProductIds = new Set<number>();
      for (const p of aroniumProducts) {
        const id = p.Id ?? p.id;
        if (id == null) continue;

        const pId = Number(id);
        validProductIds.add(pId);

        const originalCode = String(p.Code ?? p.code ?? pId).trim();
        let code = originalCode;
        let c = 1;
        while (existingCodes.has(code.toLowerCase())) {
          code = `${originalCode}-${c}`;
          c++;
        }
        existingCodes.add(code.toLowerCase());

        const posProductId = `aronium-product-${pId}`;
        const posNodeId = `aronium-product-node-${pId}`;

        const name = p.Name ?? p.name ?? "Unnamed Product";
        const color = p.Color ?? p.color ?? "Transparent";
        const position = Number(p.Rank ?? p.rank ?? 0);

        // 1. Insert product node (initially with 'root' as parent_id)
        await sqlite.execute(
          `INSERT OR IGNORE INTO nodes (id, name, display_name, type, parent_id, image, color, position, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [posNodeId, name, name, "product", "root", null, color, position, nowTimestamp, nowTimestamp]
        );

        // 2. Insert product
        const unit = p.MeasurementUnit ?? p.measurementunit ?? p.measurement_unit ?? "pcs";
        const active = (p.IsEnabled ?? p.isenabled ?? p.is_enabled) !== 0 ? 1 : 0;
        const service = (p.IsService ?? p.isservice ?? p.is_service) === 1 ? 1 : 0;
        const defaultQty = (p.IsUsingDefaultQuantity ?? p.isusingdefaultquantity ?? p.is_using_default_quantity) !== 0 ? 1 : 0;
        const ageRestriction = p.AgeRestriction ?? p.agerestriction ?? p.age_restriction ?? null;
        const description = p.Description ?? p.description ?? null;

        await sqlite.execute(
          `INSERT OR IGNORE INTO products (id, node_id, supplier_id, owner_id, company_id, title, code, unit, active, service, default_quantity, age_restriction, description, image, color, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [posProductId, posNodeId, null, null, null, name, code, unit, active, service, defaultQty, ageRestriction, description, null, color, nowTimestamp, nowTimestamp]
        );

        // 3. Insert product price
        const cost = Number(p.Cost ?? p.cost ?? 0);
        const markup = Number(p.Markup ?? p.markup ?? 0);
        const salePrice = Number(p.Price ?? p.price ?? 0);
        const priceAfterTax = (p.IsTaxInclusivePrice ?? p.istaxinclusiveprice ?? p.is_tax_inclusive_price) !== 0 ? 1 : 0;
        const priceChangeAllowed = (p.IsPriceChangeAllowed ?? p.ispricechangeallowed ?? p.is_price_change_allowed) === 1 ? 1 : 0;

        await sqlite.execute(
          `INSERT OR IGNORE INTO product_prices (id, product_id, wholesale, cost, markup, sale_price, price_after_tax, price_change_allowed, is_default, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [`aronium-price-${pId}`, posProductId, 0, cost, markup, salePrice, priceAfterTax, priceChangeAllowed, 1, nowTimestamp, nowTimestamp]
        );

        productCount++;
      }

      // --- IMPORT BARCODES ---
      for (const b of aroniumBarcodes) {
        const id = b.Id ?? b.id;
        const aroniumProductId = b.ProductId ?? b.productid ?? b.product_id;
        const value = String(b.Value ?? b.value ?? "").trim();

        if (id == null || !aroniumProductId || !value) continue;
        if (!validProductIds.has(Number(aroniumProductId))) continue;

        if (existingBarcodeValues.has(value.toLowerCase())) continue;
        existingBarcodeValues.add(value.toLowerCase());

        const posBarcodeId = `aronium-barcode-${id}`;
        const posProductId = `aronium-product-${aroniumProductId}`;

        await sqlite.execute(
          `INSERT OR IGNORE INTO barcodes (id, type, value, product_id, is_primary, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [posBarcodeId, "CODE128", value, posProductId, 1, nowTimestamp]
        );
        barcodeCount++;
      }

      // --- IMPORT PRODUCT TAXES ---
      for (const pt of aroniumProductTaxes) {
        const aroniumProductId = pt.ProductId ?? pt.productid ?? pt.product_id;
        const aroniumTaxId = pt.TaxId ?? pt.taxid ?? pt.tax_id;

        if (!aroniumProductId || !aroniumTaxId) continue;
        if (!validProductIds.has(Number(aroniumProductId))) continue;
        if (!taxIdMap.has(Number(aroniumTaxId))) continue;

        const posProductId = `aronium-product-${aroniumProductId}`;
        const posTaxId = taxIdMap.get(Number(aroniumTaxId))!;

        await sqlite.execute(
          `INSERT OR IGNORE INTO product_taxes (product_id, tax_id)
           VALUES (?, ?)`,
          [posProductId, posTaxId]
        );
        productTaxCount++;
      }

      // --- IMPORT CUSTOMERS ---
      for (const cust of aroniumCustomers) {
        const id = cust.Id ?? cust.id;
        if (id == null) continue;

        const name = cust.Name ?? cust.name ?? "Unnamed Customer";
        const originalCode = String(cust.Code ?? cust.code ?? `aronium-cust-${id}`).trim();
        let code = originalCode;
        let c = 1;
        while (existingCustCodes.has(code.toLowerCase())) {
          code = `${originalCode}-${c}`;
          c++;
        }
        existingCustCodes.add(code.toLowerCase());

        const posCustId = `aronium-customer-${id}`;
        const taxNumber = cust.TaxNumber ?? cust.taxnumber ?? cust.tax_number ?? null;
        const streetName = cust.StreetName ?? cust.streetname ?? cust.street_name ?? null;
        const buildingNumber = cust.BuildingNumber ?? cust.buildingnumber ?? cust.building_number ?? null;
        const additionalStreetName = cust.AdditionalStreetName ?? cust.additionalstreetname ?? cust.additional_street_name ?? null;
        const plotIdentification = cust.PlotIdentification ?? cust.plotidentification ?? cust.plot_identification ?? null;
        const district = cust.CitySubdivisionName ?? cust.citysubdivisionname ?? cust.city_subdivision_name ?? null;
        const postalCode = cust.PostalCode ?? cust.postalcode ?? cust.postal_code ?? null;
        const city = cust.City ?? cust.city ?? null;

        const countryId = cust.CountryId ?? cust.countryid ?? cust.country_id;
        const country = (countryId != null) ? (countryMap.get(Number(countryId)) ?? null) : null;

        const phoneNumber = cust.PhoneNumber ?? cust.phonenumber ?? cust.phone_number ?? null;
        const email = cust.Email ?? cust.email ?? null;

        const active = (cust.IsEnabled ?? cust.isenabled ?? cust.is_enabled) !== 0 ? 1 : 0;
        const customer = (cust.IsCustomer ?? cust.iscustomer ?? cust.is_customer) !== 0 ? 1 : 0;
        const paymentTermsDays = Number(cust.DueDatePeriod ?? cust.duedateperiod ?? cust.due_date_period ?? 0);
        const taxExempt = (cust.IsTaxExempt ?? cust.istaxexempt ?? cust.is_tax_exempt) === 1 ? 1 : 0;

        await sqlite.execute(
          `INSERT OR IGNORE INTO customers (id, name, code, tax_number, street_name, building_number, additional_street_name, plot_identification, district, postal_code, city, country, phone_number, email, active, customer, payment_terms_days, tax_exempt, position, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [posCustId, name, code, taxNumber, streetName, buildingNumber, additionalStreetName, plotIdentification, district, postalCode, city, country, phoneNumber, email, active, customer, paymentTermsDays, taxExempt, 0, nowTimestamp, nowTimestamp]
        );
        customerCount++;
      }

      // --- RESOLVE HIERARCHY (Pass 2) ---
      // 1. Update product groups parent_id
      for (const g of aroniumGroups) {
        const id = g.Id ?? g.id;
        if (id == null) continue;

        const parentGroupId = g.ParentGroupId ?? g.parentgroupid ?? g.parent_group_id;
        if (parentGroupId != null && validGroupIds.has(Number(parentGroupId))) {
          const posGroupId = `aronium-group-${id}`;
          const parentId = `aronium-group-${parentGroupId}`;
          await sqlite.execute(
            `UPDATE nodes SET parent_id = ? WHERE id = ?`,
            [parentId, posGroupId]
          );
        }
      }

      // 2. Update product nodes parent_id
      for (const p of aroniumProducts) {
        const id = p.Id ?? p.id;
        if (id == null) continue;

        const productGroupId = p.ProductGroupId ?? p.productgroupid ?? p.product_group_id;
        if (productGroupId != null && validGroupIds.has(Number(productGroupId))) {
          const posNodeId = `aronium-product-node-${id}`;
          const parentId = `aronium-group-${productGroupId}`;
          await sqlite.execute(
            `UPDATE nodes SET parent_id = ? WHERE id = ?`,
            [parentId, posNodeId]
          );
        }
      }

    }

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
      },
    };
  } catch (err) {
    console.error("Aronium import error:", err);
    return {
      success: false,
      message: String(err),
      counts: { taxes: 0, groups: 0, products: 0, barcodes: 0, productTaxes: 0, customers: 0 },
    };
  } finally {
    if (aroniumSqlite) {
      try {
        // Close dynamic connection to release the file handle
        // Note: Tauri SQL plugin dynamically loaded database closes when it's garbage collected, 
        // or we can let it be. Currently @tauri-apps/plugin-sql doesn't have a close method 
        // exposed in the JS api, but just releasing the reference is fine.
      } catch (e) {
        console.error("Error closing aronium db connection:", e);
      }
    }
  }
}
