/// mssql_bak.rs — Tauri command for parsing Microsoft SQL Server .bak backup files
///
/// SQL Server .bak files use Microsoft Tape Format (MTF) as an outer wrapper.
/// Inside, the actual database data is stored in SQL Server's own 8 KB page format.
///
/// This parser reverse-engineers the storage layout for Aronium POS databases
/// (SQL Server 2014 / MSSQL12) and extracts products, product groups, and customers
/// by scanning for known row-level signatures within data pages.
///
/// Tauri command: `parse_mssql_bak(file_path: String) -> Result<MssqlBakData, String>`

use serde::{Deserialize, Serialize};
use std::io::Read;

// ---------------------------------------------------------------------------
// Public data types returned to TypeScript
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BakProduct {
    pub name: String,
    pub code: String,
    pub unit: String,
    pub price: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BakCustomer {
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MssqlBakData {
    pub products: Vec<BakProduct>,
    pub groups: Vec<String>,
    pub customers: Vec<BakCustomer>,
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/// MTF / SQL Server page layout
const PAGE_SIZE: usize = 8192;
/// SQL Server data pages begin after the 16 384-byte MTF header region
const DATA_START: usize = 16_384;

/// Fixed row prefix that immediately precedes every Aronium Product row in the
/// SQL Server internal storage (confirmed by binary analysis of MSSQL12 backup).
/// Bytes: status_A=0x17, status_B=0x00, fixed_len_lo=0x10, fixed_len_hi=0x00,
/// then 0x08 0x06 0x00 (col-null-bitmap + first fixed-width value header).
const PRODUCT_ROW_PREFIX: [u8; 7] = [0x17, 0x00, 0x10, 0x00, 0x08, 0x06, 0x00];

/// The literal ASCII string that marks the end of the variable-length "color"
/// field in Aronium product rows.  Every product row ends its variable section
/// with this color name followed by a fixed 16-byte trailer before the price.
const TRANSPARENT_MARKER: &[u8] = b"Transparent";

/// Known SQL Server system-type names that bleed through when scanning the
/// product-group signature (they live in the same catalog pages).
const SQL_SYSTEM_TYPES: &[&str] = &[
    "bigint", "binary", "bit", "char", "datetime", "decimal", "float", "image",
    "int", "money", "nchar", "ntext", "nvarchar", "numeric", "real",
    "smalldatetime", "smallint", "smallmoney", "sql_variant", "sysname", "text",
    "timestamp", "tinyint", "uniqueidentifier", "varbinary", "varchar", "xml",
    "AutoCreatedLocal", "PRIMARY", "public", "INFORMATION_SCHEMA", "db_owner",
    "db_accessadmin", "db_backupoperator", "db_datareader", "db_datawriter",
    "db_ddladmin", "db_denydatareader", "db_denydatawriter", "db_securityadmin",
    "dbo", "guest", "sys",
];

/// Group row signature found by binary analysis (occurs 566 times; filtered
/// below to remove system catalog entries).
const GROUP_ROW_SIG: [u8; 21] = [
    0x30, 0x00, 0x10, 0x00, 0x00, 0x00, 0x80, 0x3f,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80, 0x3f,
    0x04, 0x00, 0x00, 0x01, 0x00,
];

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

/// Read a UTF-16 LE printable-ASCII string from `data` starting at `offset`.
/// Stops at the first character that isn't a printable ASCII code point
/// (0x20–0x7E) in the low byte, or whose high byte is non-zero.
fn read_utf16_ascii(data: &[u8], offset: usize) -> String {
    let mut chars = Vec::new();
    let mut i = offset;
    while i + 1 < data.len() {
        let lo = data[i];
        let hi = data[i + 1];
        if hi == 0x00 && lo >= 0x20 && lo <= 0x7e {
            chars.push(lo as char);
            i += 2;
        } else {
            break;
        }
    }
    chars.iter().collect::<String>().trim().to_owned()
}

/// Find all (non-overlapping) positions of `needle` within `haystack`.
fn find_all(haystack: &[u8], needle: &[u8]) -> Vec<usize> {
    let mut positions = Vec::new();
    let mut i = 0usize;
    while i + needle.len() <= haystack.len() {
        if haystack[i..].starts_with(needle) {
            positions.push(i);
            i += needle.len(); // skip past match (non-overlapping)
        } else {
            i += 1;
        }
    }
    positions
}

/// Return true if `data[offset..]` starts with `pattern`.
#[inline]
fn starts_with_at(data: &[u8], offset: usize, pattern: &[u8]) -> bool {
    if offset + pattern.len() > data.len() {
        return false;
    }
    data[offset..offset + pattern.len()] == *pattern
}

/// Simple sanity filter: reject names that look like binary noise.
fn is_garbage_name(s: &str) -> bool {
    if s.len() < 3 {
        return true;
    }
    // Must contain at least 3 consecutive ASCII letters
    let has_alpha_run = s.as_bytes().windows(3).any(|w| {
        w.iter().all(|b| b.is_ascii_alphabetic())
    });
    if !has_alpha_run {
        return true;
    }
    // Reject leading repeated junk characters
    let first = s.chars().next().unwrap();
    if "UfF@~|!KO".contains(first) {
        let count = s.chars().take_while(|&c| c == first).count();
        if count >= 3 {
            return true;
        }
    }
    false
}

// ---------------------------------------------------------------------------
// Product extraction
// ---------------------------------------------------------------------------

/// Extracts products from the raw backup bytes.
///
/// Row structure (confirmed for Aronium MSSQL12):
/// ```
/// PRODUCT_ROW_PREFIX (7 bytes)
/// [0–24 bytes offset array]
/// name     : UTF-16LE printable-ASCII string
/// code     : ASCII bytes (no null, terminated by first UTF-16 high-byte = 0x00)
/// unit     : UTF-16LE string (Pics/PCS/Pcs/etc.)
/// color    : ASCII "Transparent" (literal)
/// [16 bytes: 2 padding + Id(i32) + Rank(i32) + ProductGroupId(i32)]
/// price    : f64 little-endian (SQL money encoded as binary64)
/// ```
fn extract_products(data: &[u8]) -> Vec<BakProduct> {
    let mut products: Vec<BakProduct> = Vec::new();
    let mut seen_names = std::collections::HashSet::new();

    let prefix_positions = find_all(data, &PRODUCT_ROW_PREFIX);

    for prefix_off in prefix_positions {
        let search_start = prefix_off + PRODUCT_ROW_PREFIX.len();

        // --- Locate the start of the UTF-16 name ---
        let name_start = {
            let window_end = (search_start + 25).min(data.len().saturating_sub(1));
            let mut found = None;
            for i in search_start..window_end {
                if i + 1 < data.len()
                    && data[i + 1] == 0x00
                    && data[i] >= 0x41
                    && data[i] <= 0x7a
                {
                    found = Some(i);
                    break;
                }
            }
            match found {
                Some(v) => v,
                None => continue,
            }
        };

        let name = read_utf16_ascii(data, name_start);
        if name.len() < 3 || is_garbage_name(&name) {
            continue;
        }
        let name_end = name_start + name.len() * 2;

        // --- Find "Transparent" anchor ---
        let trans_pos = {
            let search_end = (name_end + 250).min(data.len());
            let slice = &data[name_end..search_end];
            match slice.windows(TRANSPARENT_MARKER.len())
                .position(|w| w == TRANSPARENT_MARKER)
            {
                Some(rel) => name_end + rel,
                None => continue,
            }
        };

        // --- Extract code (ASCII bytes between name_end and UTF-16 unit start) ---
        let code = {
            let mut chars = String::new();
            let mut i = name_end;
            // Consume pure ASCII bytes (no null as second byte of UTF-16 pair yet)
            while i < trans_pos {
                let b = data[i];
                if b >= 0x20 && b <= 0x7e {
                    // Check if next byte is 0x00 (would be start of UTF-16 unit)
                    if i + 1 < data.len() && data[i + 1] == 0x00 {
                        break;
                    }
                    chars.push(b as char);
                    i += 1;
                } else {
                    break;
                }
            }
            chars.trim().to_owned()
        };

        // --- Extract unit (UTF-16LE after code, before Transparent) ---
        let unit = {
            // Find start of UTF-16 unit: first byte that is ASCII with next=0x00
            let unit_search_start = name_end + code.len();
            let raw = read_utf16_ascii(data, unit_search_start);
            // Normalize variants: Pics/PCS/Pcs/QTY -> pcs
            let lower = raw.to_lowercase();
            let normalized = lower
                .replace("qty", "pcs")
                .replace("pics", "pcs")
                .replace("pic", "pcs");
            // Keep only recognizable unit strings
            if normalized.contains("pcs") {
                "pcs".to_owned()
            } else if normalized.contains("kg") {
                "kg".to_owned()
            } else if normalized.contains("ltr") || normalized.contains("liter") {
                "ltr".to_owned()
            } else {
                "pcs".to_owned()
            }
        };

        // --- Extract price (f64 at trans_pos + 11 [marker] + 4 [padding/flags] + 12 [id/rank/gid]) ---
        //
        // After "Transparent" (11 bytes) the row contains:
        //   [2 bytes] 0x30 0x00 — UTF-16 '0' (end-of-variable-length area marker)
        //   [2 bytes] 0x53 0x00 — internal marker byte
        //   [4 bytes] ProductId  (i32 LE)
        //   [4 bytes] Rank       (i32 LE)
        //   [4 bytes] ProductGroupId (i32 LE)
        // = 16 bytes total before the 8-byte float64 price
        let price_offset = trans_pos + TRANSPARENT_MARKER.len() + 4 + 12;
        if price_offset + 8 > data.len() {
            // No room for price — insert with zero price rather than skip
            if !seen_names.contains(&name) {
                seen_names.insert(name.clone());
                products.push(BakProduct { name, code, unit, price: 0.0 });
            }
            continue;
        }
        let price_bytes: [u8; 8] = data[price_offset..price_offset + 8]
            .try_into()
            .unwrap_or([0u8; 8]);
        let price_raw = f64::from_le_bytes(price_bytes);
        let price = if price_raw > 0.0 && price_raw < 100_000_000.0 {
            // Round to 2 decimal places to remove f64 noise
            (price_raw * 100.0).round() / 100.0
        } else {
            0.0
        };

        if !seen_names.contains(&name) {
            seen_names.insert(name.clone());
            products.push(BakProduct { name, code, unit, price });
        }
    }

    products
}

// ---------------------------------------------------------------------------
// Product group extraction
// ---------------------------------------------------------------------------

fn extract_groups(data: &[u8]) -> Vec<String> {
    let mut groups: Vec<String> = Vec::new();
    let mut seen = std::collections::HashSet::new();
    let sql_sys: std::collections::HashSet<&str> = SQL_SYSTEM_TYPES.iter().copied().collect();

    let positions = find_all(data, &GROUP_ROW_SIG);

    for off in positions {
        // Skip 2-byte length field after signature, then read UTF-16 name
        let name_off = off + GROUP_ROW_SIG.len() + 2;
        let raw = read_utf16_ascii(data, name_off);
        if raw.len() < 2 {
            continue;
        }
        // Strip trailing "0" artifact from row separator
        let clean: String = raw.trim_end_matches('0').trim().to_owned();
        if clean.len() < 2 {
            continue;
        }
        // Must contain at least 2 letters
        let alpha_count = clean.chars().filter(|c| c.is_ascii_alphabetic()).count();
        if alpha_count < 2 {
            continue;
        }
        // Filter SQL system type names
        if sql_sys.contains(clean.as_str()) {
            continue;
        }
        // Filter SQL internal patterns
        if clean.starts_with("db_")
            || clean.starts_with("sys.")
            || clean.starts_with("INFORM")
            || clean == "AutoCreated"
            || clean == "PRIMARY"
            || clean == "public"
        {
            continue;
        }
        if !seen.contains(&clean) {
            seen.insert(clean.clone());
            groups.push(clean);
        }
    }

    groups
}

// ---------------------------------------------------------------------------
// Customer extraction
// ---------------------------------------------------------------------------

/// Customers are extracted by scanning for email address patterns in the
/// latin-1 decoded byte stream, then looking back for a UTF-16LE name.
fn extract_customers(data: &[u8]) -> Vec<BakCustomer> {
    let mut customers: Vec<BakCustomer> = Vec::new();
    let mut seen = std::collections::HashSet::new();

    // Decode as latin-1 for email regex scanning
    let latin1: Vec<char> = data.iter().map(|&b| b as char).collect();
    let text: String = latin1.iter().collect();

    // Simple email regex via byte scanning (avoid regex crate dependency)
    let email_positions = find_email_positions(data);

    let phone_re_fn = |s: &str| -> Option<String> {
        // Nigerian mobile: 07xx/08xx/09xx followed by 8 digits
        let bytes = s.as_bytes();
        for i in 0..bytes.len().saturating_sub(10) {
            if bytes[i] == b'0'
                && (bytes[i + 1] == b'7'
                    || bytes[i + 1] == b'8'
                    || bytes[i + 1] == b'9')
                && bytes[i + 2..i + 11].iter().all(|b| b.is_ascii_digit())
            {
                return Some(String::from_utf8_lossy(&bytes[i..i + 11]).to_string());
            }
        }
        None
    };

    for (email_start, email_end) in email_positions {
        let email_str = String::from_utf8_lossy(&data[email_start..email_end]).to_string();

        // Look back up to 250 bytes for a UTF-16 name chunk
        let lookback_start = email_start.saturating_sub(250);
        let lookback = &data[lookback_start..email_start];

        let name = extract_last_utf16_chunk(lookback);
        if name.len() < 3 {
            continue;
        }
        // Clean noise chars
        let clean_name: String = name
            .chars()
            .filter(|c| {
                c.is_ascii_alphanumeric()
                    || " &.,/-'()".contains(*c)
            })
            .collect::<String>()
            .trim()
            .to_owned();
        if clean_name.len() < 3 {
            continue;
        }
        let alpha_count = clean_name.chars().filter(|c| c.is_ascii_alphabetic()).count();
        if alpha_count < 2 {
            continue;
        }

        // Phone after email
        let after_end = (email_end + 25).min(data.len());
        let after_str = String::from_utf8_lossy(&data[email_end..after_end]).to_string();
        let phone = phone_re_fn(&after_str);

        let key = format!("{}{}", email_str, &clean_name[..clean_name.len().min(20)]);
        if !seen.contains(&key) {
            seen.insert(key);
            customers.push(BakCustomer {
                name: clean_name,
                email: Some(email_str),
                phone,
            });
        }
    }

    customers
}

/// Returns (start, end) byte ranges for email-looking substrings in `data`.
fn find_email_positions(data: &[u8]) -> Vec<(usize, usize)> {
    let mut results = Vec::new();
    let mut i = 0usize;

    while i < data.len() {
        // Look for '@'
        if data[i] == b'@' {
            // Scan backward for local part
            let local_start = {
                let mut j = i;
                while j > 0 {
                    let b = data[j - 1];
                    if b.is_ascii_alphanumeric()
                        || b == b'.'
                        || b == b'_'
                        || b == b'%'
                        || b == b'+'
                        || b == b'-'
                    {
                        j -= 1;
                    } else {
                        break;
                    }
                }
                j
            };
            if local_start == i {
                i += 1;
                continue;
            }
            // Scan forward for domain
            let domain_start = i + 1;
            let mut domain_end = domain_start;
            while domain_end < data.len() {
                let b = data[domain_end];
                if b.is_ascii_alphanumeric() || b == b'.' || b == b'-' {
                    domain_end += 1;
                } else {
                    break;
                }
            }
            // Validate: must have dot in domain and ≥2 char TLD
            let domain = &data[domain_start..domain_end];
            if let Some(dot_pos) = domain.iter().rposition(|&b| b == b'.') {
                let tld_len = domain.len() - dot_pos - 1;
                if tld_len >= 2 {
                    results.push((local_start, domain_end));
                }
            }
            i = domain_end;
        } else {
            i += 1;
        }
    }

    results
}

/// From a byte slice (the lookback before an email), find the last contiguous
/// UTF-16LE printable ASCII run and decode it.
fn extract_last_utf16_chunk(data: &[u8]) -> String {
    // Walk backwards to find the last UTF-16 chunk end
    let mut chunk_end = None;
    let mut chunk_start = None;
    let mut i = data.len().saturating_sub(2);

    // First find the last valid UTF-16 byte pair
    loop {
        if i + 1 < data.len() && data[i + 1] == 0x00 && data[i] >= 0x20 && data[i] <= 0x7e {
            if chunk_end.is_none() {
                chunk_end = Some(i + 2);
            }
            chunk_start = Some(i);
        } else if chunk_end.is_some() {
            // We've gone past the chunk
        }
        if i == 0 {
            break;
        }
        i -= 1;
    }

    match (chunk_start, chunk_end) {
        (Some(s), Some(e)) => read_utf16_ascii(data, s),
        _ => String::new(),
    }
}

// ---------------------------------------------------------------------------
// Tauri command
// ---------------------------------------------------------------------------

/// Parse a Microsoft SQL Server `.bak` file and return extracted Aronium data.
///
/// Called from TypeScript as:
/// ```ts
/// import { invoke } from "@tauri-apps/api/core";
/// const data = await invoke<MssqlBakData>("parse_mssql_bak", { filePath });
/// ```
#[tauri::command]
pub fn parse_mssql_bak(file_path: String) -> Result<MssqlBakData, String> {
    // Read entire file into memory.
    // Typical Aronium .bak is 50–200 MB which is fine; add a 2 GB guard for safety.
    let metadata =
        std::fs::metadata(&file_path).map_err(|e| format!("Cannot stat file: {e}"))?;
    if metadata.len() > 2 * 1024 * 1024 * 1024 {
        return Err("File too large (> 2 GB)".to_owned());
    }

    let mut file =
        std::fs::File::open(&file_path).map_err(|e| format!("Cannot open file: {e}"))?;
    let mut data = Vec::with_capacity(metadata.len() as usize);
    file.read_to_end(&mut data)
        .map_err(|e| format!("Cannot read file: {e}"))?;

    // Verify MTF magic ("TAPE")
    if data.len() < 4 || &data[..4] != b"TAPE" {
        return Err(
            "Not a valid SQL Server backup file (missing MTF TAPE magic)".to_owned(),
        );
    }
    if data.len() < DATA_START + PAGE_SIZE {
        return Err("File too small to contain SQL Server data pages".to_owned());
    }

    let products = extract_products(&data);
    let groups = extract_groups(&data);
    let customers = extract_customers(&data);

    Ok(MssqlBakData { products, groups, customers })
}