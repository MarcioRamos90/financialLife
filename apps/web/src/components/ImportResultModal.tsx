import type { ImportResult } from '../types/importexport'

interface Props {
  result: ImportResult
  onClose: () => void
}

export default function ImportResultModal({ result, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4"
      >
        <h3 className="text-lg font-semibold text-gray-800">Import complete</h3>

        <p className="text-sm text-gray-600">
          <span className="font-medium text-green-700">{result.imported} record{result.imported !== 1 ? 's' : ''} imported</span>
          {result.skipped > 0 && (
            <>, <span className="font-medium text-yellow-600">{result.skipped} skipped</span></>
          )}
          .
        </p>

        {result.errors.length > 0 && (
          <div>
            <p className="text-sm font-medium text-red-600 mb-2">{result.errors.length} row{result.errors.length !== 1 ? 's' : ''} could not be imported:</p>
            <div className="overflow-auto max-h-64 rounded-lg border border-red-100">
              <table data-testid="error-table" className="w-full text-sm">
                <thead className="bg-red-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium text-red-700 uppercase tracking-wide w-16">Row</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-red-700 uppercase tracking-wide">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-50">
                  {result.errors.map((e, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-500">{e.row}</td>
                      <td className="px-3 py-2 text-gray-700">{e.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            data-testid="btn-close-modal"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-blue-800 hover:bg-blue-700 text-white text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
