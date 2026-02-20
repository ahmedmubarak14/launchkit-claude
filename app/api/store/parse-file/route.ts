import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/store/parse-file
 * Server-side PDF/XLSX text extraction.
 * Accepts multipart/form-data with a "file" field.
 * Returns { text: string, rows?: object[] }
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const name = file.name.toLowerCase();

    // ── PDF ────────────────────────────────────────────────────────────────────
    if (name.endsWith(".pdf")) {
      // require() used because pdf-parse has no clean ESM default export
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string; numpages: number }>;
      const data = await pdfParse(buffer);
      return NextResponse.json({
        type: "pdf",
        text: data.text.slice(0, 8000), // cap to avoid huge prompts
        pages: data.numpages,
      });
    }

    // ── XLSX / XLS ─────────────────────────────────────────────────────────────
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      // Convert to JSON array-of-objects
      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      // Also produce a compact CSV-like text for the AI
      const csvText = XLSX.utils.sheet_to_csv(sheet);
      return NextResponse.json({
        type: "xlsx",
        rows: rows.slice(0, 200), // cap rows
        text: csvText.slice(0, 8000),
        sheetName,
        totalRows: rows.length,
      });
    }

    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  } catch (err) {
    console.error("[parse-file] error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
