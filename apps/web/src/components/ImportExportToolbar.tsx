import { useRef, useState } from 'react'
import type { ImportResult } from '../types/importexport'
import ImportResultModal from './ImportResultModal'

interface Props {
  onExport: () => void | Promise<void>
  onImport: (file: File) => Promise<ImportResult>
  onDownloadTemplate: () => void | Promise<void>
  isExporting?: boolean
  isImporting?: boolean
}

export default function ImportExportToolbar({
  onExport,
  onImport,
  onDownloadTemplate,
  isExporting = false,
  isImporting = false,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // reset so same file can be re-selected
    try {
      const res = await onImport(file)
      setResult(res)
    } catch {
      setResult({ imported: 0, skipped: 0, errors: [{ row: 0, reason: 'Import failed. Please check the file and try again.' }] })
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          data-testid="btn-export"
          onClick={onExport}
          disabled={isExporting}
          className="flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {isExporting
            ? <span data-testid="export-spinner" className="animate-spin h-3.5 w-3.5 border-2 border-gray-400 border-t-transparent rounded-full" />
            : <span>↓</span>
          }
          Export
        </button>

        <button
          data-testid="btn-import"
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="flex items-center gap-1.5 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {isImporting
            ? <span data-testid="import-spinner" className="animate-spin h-3.5 w-3.5 border-2 border-gray-400 border-t-transparent rounded-full" />
            : <span>↑</span>
          }
          Import
        </button>

        <input
          ref={fileInputRef}
          data-testid="input-import-file"
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          data-testid="link-download-template"
          onClick={onDownloadTemplate}
          className="text-xs text-blue-600 hover:underline"
        >
          Download template
        </button>
      </div>

      {result && (
        <ImportResultModal result={result} onClose={() => setResult(null)} />
      )}
    </>
  )
}
