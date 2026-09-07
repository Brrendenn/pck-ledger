const ROMAN_MONTHS = [
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"
];

export function formatInvoiceDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function generateInvoiceNumber(sequence: number, date: Date = new Date()): string {
  const romanMonth = ROMAN_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${sequence}/${romanMonth}/${year}`;
}