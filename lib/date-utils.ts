// lib/date-utils.ts
import * as XLSX from "xlsx";

/**
 * Normalizes Excel dates into a clean ISO string anchored at UTC Noon (12:00:00Z)
 * to prevent -1/+1 day shifts across all global timezones.
 */
export function normalizeExcelDate(rawDate: any): string {
  if (!rawDate) {
    return new Date().toISOString();
  }

  // 1. If it's an Excel numeric serial date (e.g., 46258)
  if (typeof rawDate === "number") {
    const parsed = XLSX.SSF.parse_date_code(rawDate);
    if (parsed) {
      const year = parsed.y;
      const month = String(parsed.m).padStart(2, "0");
      const day = String(parsed.d).padStart(2, "0");
      return `${year}-${month}-${day}T12:00:00.000Z`;
    }
  }

  // 2. If it's already a JS Date object
  if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
    const year = rawDate.getFullYear();
    const month = String(rawDate.getMonth() + 1).padStart(2, "0");
    const day = String(rawDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}T12:00:00.000Z`;
  }

  // 3. If it's a string (e.g., "2026-08-24", "24/08/2026", "24-08-2026")
  if (typeof rawDate === "string") {
    const trimmed = rawDate.trim();

    // Standard ISO YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const [year, month, day] = trimmed.split("T")[0].split("-");
      return `${year}-${month}-${day}T12:00:00.000Z`;
    }

    // DD/MM/YYYY or DD-MM-YYYY
    const parts = trimmed.split(/[/.-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY/MM/DD
        return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}T12:00:00.000Z`;
      } else {
        // DD/MM/YYYY
        return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}T12:00:00.000Z`;
      }
    }
  }

  return new Date().toISOString();
}
