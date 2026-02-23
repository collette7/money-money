import Papa from "papaparse";

export interface ParsedTransaction {
  date: string;
  amount: number;
  description: string;
  fitid?: string;
}

export interface CSVParseResult {
  headers: string[];
  rows: string[][];
}

export function parseCSV(text: string): CSVParseResult {
  const result = Papa.parse(text, {
    skipEmptyLines: true,
  });

  const data = result.data as string[][];
  if (data.length < 2) {
    throw new Error("CSV file must have at least a header row and one data row");
  }

  return {
    headers: data[0],
    rows: data.slice(1),
  };
}

export interface CSVColumnMapping {
  date: number;
  amount: number;
  description: number;
  debitColumn?: number;
  creditColumn?: number;
  dateFormat: string;
}

export function mapCSVToTransactions(
  rows: string[][],
  mapping: CSVColumnMapping
): ParsedTransaction[] {
  return rows
    .map((row) => {
      const rawDate = row[mapping.date]?.trim();
      const description = row[mapping.description]?.trim();

      if (!rawDate || !description) return null;

      let amount: number;
      if (mapping.debitColumn !== undefined && mapping.creditColumn !== undefined) {
        const debit = parseAmount(row[mapping.debitColumn]);
        const credit = parseAmount(row[mapping.creditColumn]);
        amount = credit - debit;
      } else {
        amount = parseAmount(row[mapping.amount]);
      }

      if (isNaN(amount)) return null;

      return {
        date: normalizeDate(rawDate, mapping.dateFormat),
        amount,
        description,
      };
    })
    .filter((tx): tx is ParsedTransaction => tx !== null);
}

export async function parseOFX(text: string): Promise<ParsedTransaction[]> {
  const { parse } = await import("ofx-js");
  const data = await parse(text);

  const statement =
    data.OFX.BANKMSGSRSV1?.STMTTRNRS.STMTRS ??
    data.OFX.CREDITCARDMSGSRSV1?.CCSTMTTRNRS.CCSTMTRS;

  if (!statement?.BANKTRANLIST) {
    throw new Error("No transactions found in OFX file");
  }

  const rawTransactions = statement.BANKTRANLIST.STMTTRN;
  const transactions = Array.isArray(rawTransactions)
    ? rawTransactions
    : [rawTransactions];

  return transactions.map((tx) => ({
    date: parseOFXDate(tx.DTPOSTED),
    amount: parseFloat(tx.TRNAMT),
    description: tx.NAME || tx.MEMO || "Unknown",
    fitid: tx.FITID,
  }));
}

function parseAmount(value: string | undefined): number {
  if (!value) return NaN;
  const cleaned = value.replace(/[^0-9.\-+]/g, "");
  return parseFloat(cleaned);
}

function parseOFXDate(dateStr: string): string {
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${year}-${month}-${day}`;
}

function normalizeDate(dateStr: string, format: string): string {
  const cleaned = dateStr.replace(/[/.\-]/g, "/");
  const parts = cleaned.split("/");

  let year: string, month: string, day: string;

  switch (format) {
    case "MM/DD/YYYY":
      [month, day, year] = parts;
      break;
    case "DD/MM/YYYY":
      [day, month, year] = parts;
      break;
    case "YYYY-MM-DD":
      [year, month, day] = parts;
      break;
    case "YYYY/MM/DD":
      [year, month, day] = parts;
      break;
    default:
      [month, day, year] = parts;
  }

  if (year.length === 2) {
    year = `20${year}`;
  }

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
