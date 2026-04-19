import { useState } from 'react'
import { useTransactions, useDeleteTransaction, useExportTransactions, useExportTransactionTemplate, useImportTransactions } from './useTransactions'
import TransactionForm from './TransactionForm'
import ImportExportToolbar from '../../components/ImportExportToolbar'
import type { Transaction, TransactionFilters } from './types'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from './types'

export default function TransactionList() {
  const [filters, setFilters] = useState<TransactionFilters>({})
  const [showForm, setShowForm]       = useState(false)
  const [editing, setEditing]         = useState<Transaction | null>(null)
  const [deleting, setDeleting]       = useState<Transaction | null>(null)

  const { data: transactions = [], isLoading, isError } = useTransactions(filters)
  const deleteMutation = useDeleteTransaction()
  const { download: exportDownload } = useExportTransactions(filters)
  const { download: templateDownload } = useExportTransactionTemplate()
  const importMutation = useImportTransactions()

  const setFilter = (key: keyof TransactionFilters, value: string) =>
    setFilters(f => ({ ...f, [key]: value || undefined }))

  const handleDelete = async () => {
    if (!deleting) return
    await deleteMutation.mutateAsync(deleting.id)
    setDeleting(null)
  }

  const allCategories = [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])].sort()

  const totals = transactions.reduce(
    (acc, t) => {
      if (t.type === 'income')  acc.income  += t.amount
      if (t.type === 'expense') acc.expense += t.amount
      return acc
    },
    { income: 0, expense: 0 }
  )
  const surplus = totals.income - totals.expense

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top bar */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-blue-900">Transactions</h1>
        <div className="flex items-center gap-2">
          <ImportExportToolbar
            onExport={exportDownload}
            onImport={file => importMutation.mutateAsync(file)}
            onDownloadTemplate={templateDownload}
            isImporting={importMutation.isPending}
          />
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-800 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >+ New transaction</button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-4">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Income',  value: totals.income,  color: 'text-green-700', bg: 'bg-green-50' },
            { label: 'Expense', value: totals.expense, color: 'text-red-700',   bg: 'bg-red-50' },
            { label: 'Surplus', value: surplus,        color: surplus >= 0 ? 'text-blue-700' : 'text-red-700', bg: 'bg-blue-50' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl p-4`}>
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-lg font-bold ${color}`}>
                {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3">
          <select
            aria-label="Filter by type"
            value={filters.type ?? ''}
            onChange={e => setFilter('type', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </select>

          <select
            value={filters.category ?? ''}
            onChange={e => setFilter('category', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All categories</option>
            {allCategories.map(c => <option key={c}>{c}</option>)}
          </select>

          <input
            type="date"
            value={filters.start_date ?? ''}
            onChange={e => setFilter('start_date', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="self-center text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={filters.end_date ?? ''}
            onChange={e => setFilter('end_date', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {Object.keys(filters).length > 0 && (
            <button
              onClick={() => setFilters({})}
              className="text-sm text-gray-400 hover:text-red-500"
            >Clear filters</button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border overflow-hidden">
          {isLoading && (
            <p className="text-sm text-gray-400 text-center py-12">Loading…</p>
          )}
          {isError && (
            <p className="text-sm text-red-500 text-center py-12">Failed to load transactions.</p>
          )}
          {!isLoading && !isError && transactions.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-12">No transactions yet. Add your first one!</p>
          )}
          {!isLoading && transactions.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Date', 'Description', 'Category', 'By', 'Amount', ''].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{tx.transaction_date}</td>
                    <td className="px-4 py-3 text-gray-800">
                      {tx.description || <span className="text-gray-400 italic">—</span>}
                      {tx.is_joint && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">joint</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{tx.category || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{tx.recorded_by_name}</td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      <span className={tx.type === 'income' ? 'text-green-700' : tx.type === 'expense' ? 'text-red-700' : 'text-blue-700'}>
                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : ''}
                        {tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: tx.currency })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditing(tx)}
                          className="text-xs text-blue-600 hover:underline"
                        >Edit</button>
                        <button
                          onClick={() => setDeleting(tx)}
                          className="text-xs text-red-500 hover:underline"
                        >Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* New / Edit modal */}
      {(showForm || editing) && (
        <TransactionForm
          transaction={editing ?? undefined}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      {/* Delete confirm dialog */}
      {deleting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div role="dialog" aria-modal="true" className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete transaction?</h3>
            <p className="text-sm text-gray-500 mb-6">
              <strong>{deleting.description || 'This transaction'}</strong> ({deleting.transaction_date}) will be permanently removed.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleting(null)}
                className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
              >Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium"
              >{deleteMutation.isPending ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
