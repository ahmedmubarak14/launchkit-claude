import { BulkProductItem } from "@/types";

/**
 * Parse a CSV string into an array of row objects keyed by header name.
 * Handles quoted fields containing commas. Trims whitespace from values.
 */
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]).map((h) => h.trim().toLowerCase());

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = splitCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = (values[idx] ?? "").trim();
    });
    rows.push(row);
  }
  return rows;
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/**
 * Map a parsed CSV row to a BulkProductItem.
 * Accepted column names:
 *   name_ar / name-ar / namear
 *   name_en / name-en / nameen
 *   price
 *   description_ar / desc_ar
 *   description_en / desc_en
 */
export function mapRowToBulkProduct(row: Record<string, string>): BulkProductItem | null {
  const nameAr =
    row["name_ar"] || row["name-ar"] || row["namear"] || row["اسم عربي"] || row["arabic name"] || "";
  const nameEn =
    row["name_en"] || row["name-en"] || row["nameen"] || row["english name"] || row["name"] || "";

  if (!nameAr && !nameEn) return null;

  const priceRaw = row["price"] || row["سعر"] || "0";
  const price = parseFloat(priceRaw.replace(/[^0-9.]/g, "")) || 0;

  return {
    nameAr: nameAr || nameEn,
    nameEn: nameEn || nameAr,
    price,
    descriptionAr: row["description_ar"] || row["desc_ar"] || row["وصف"] || undefined,
    descriptionEn: row["description_en"] || row["desc_en"] || row["description"] || undefined,
  };
}

export function parseProductsFromCSV(text: string): BulkProductItem[] {
  const rows = parseCSV(text);
  return rows.map(mapRowToBulkProduct).filter((p): p is BulkProductItem => p !== null);
}
