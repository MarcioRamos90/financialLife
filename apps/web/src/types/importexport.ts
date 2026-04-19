export interface ImportRowError {
  row: number
  reason: string
}

export interface ImportResult {
  imported: number
  skipped: number
  errors: ImportRowError[]
}
