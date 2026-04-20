import * as XLSX from 'xlsx';

/** Builds a valid transactions xlsx buffer ready for setInputFiles. */
export function buildTransactionXLSX(
  rows: (string | number)[][]
): { name: string; mimeType: string; buffer: Buffer } {
  const data = [
    ['Date', 'Type', 'Amount', 'Currency', 'Description', 'Category', 'Is Joint', 'Payment Method', 'Recorded By'],
    ...rows,
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
  const buffer = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  return { name: 'transactions.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer };
}

/** Builds a valid income-sources xlsx buffer ready for setInputFiles. */
export function buildIncomeXLSX(
  rows: (string | number)[][]
): { name: string; mimeType: string; buffer: Buffer } {
  const data = [
    ['Name', 'Category', 'Default Amount', 'Currency', 'Recurrence Day', 'Is Joint', 'Owner'],
    ...rows,
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Income Sources');
  const buffer = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  return { name: 'income-sources.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer };
}
