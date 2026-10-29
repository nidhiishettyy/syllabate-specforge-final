import mammoth from "mammoth";
import WordExtractor from "word-extractor";
import * as cheerio from "cheerio";

export async function extractText(filename: string, buffer: Buffer): Promise<string> {
  const lower = filename.toLowerCase();

  try {
    if (lower.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value.trim();
    }

    if (lower.endsWith(".doc")) {
      const extractor = new WordExtractor();
      const extracted = await extractor.extract(buffer);
      return extracted.getBody().trim();
    }

    if (lower.endsWith(".pdf")) {
      // Dynamic import to handle pdf-parse ESM/CJS quirks safely
      const pdfParseModule = await import("pdf-parse");
      const pdf = (pdfParseModule.default || pdfParseModule) as (buf: Buffer) => Promise<{ text: string }>;
      const parsed = await pdf(buffer);
      return parsed.text.trim();
    }

    if (lower.endsWith(".html") || lower.endsWith(".htm")) {
      const $ = cheerio.load(buffer.toString("utf-8"));
      return $("body").text().trim() || $.text().trim();
    }

    // Default: try UTF-8 text decode
    return buffer.toString("utf-8").trim();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to extract text from ${filename}: ${msg}`);
  }
}
