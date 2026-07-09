export interface CsvColumn<T> {
  key: keyof T;
  header: string;
}

function escapeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map(c => escapeCsvCell(c.header)).join(',');
  const lines = rows.map(row => columns.map(c => escapeCsvCell(row[c.key])).join(','));
  return [header, ...lines].join('\r\n');
}
