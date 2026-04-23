import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTransactions, useDeleteTransaction, useExportTransactions, useExportTransactionTemplate, useImportTransactions } from './useTransactions'
import { useAccounts } from '../accounts/useAccounts'
import TransactionForm from './TransactionForm'
import ImportExportToolbar from '../../components/ImportExportToolbar'
import type { Transaction, TransactionFilters } from './types'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from './types'
import type { Account } from '../accounts/types'
import { ACCOUNT_TYPES } from '../accounts/types'

// ─── Transfer label helpers ───────────────────────────────────────────────────

function accountName(id: string | null | undefined, accounts: Account[]): string {
  if (!id) return '—'
  return accounts.find(a => a.id === id)?.name ?? '—'
}

function transferLabel(tx: Transaction, activeAccountId: string, accounts: Account[]): string {
  if (!activeAccountId) return 'Transfer'
  if (tx.account_id === activeAccountId) {
    return `Transfer out → ${accountName(tx.to_account_id, accounts)}`
  }
  return `Transfer in ← ${accountName(tx.account_id, accounts)}`
}

function transferAmount(tx: Transaction, activeAccountId: string): number {
  if (!activeAccountId || tx.account_id === activeAccountId) return -tx.amount
  return tx.amount
}

// ─── Transaction row ──────────────────────────────────────────────────────────

function TxRow({
  tx,
  activeAccountId,
  accounts,
  onEdit,
  onDelete,
}: {
  tx: Transaction
  activeAccountId: string
  accounts: Account[]
  onEdit: (t: Transaction) => void
  onDelete: (t: Transaction) => void
}) {
  const isTransfer = tx.type === 'transfer'
  const description = isTransfer
    ? transferLabel(tx, activeAccountId, accounts)
    : tx.description || <span className="text-gray-400 italic">—</span>

  let amountValue: number
  let amountColor: string
  let amountPrefix: string

  if (isTransfer) {
    const signed = transferAmount(tx, activeAccountId)
    amountValue = Math.abs(signed)
    amountColor = signed >= 0 ? 'text-green-700' : 'text-blue-700'
    amountPrefix = signed >= 0 ? '+' : '−'
  } else if (tx.type === 'income') {
    amountValue = tx.amount
    amountColor = 'text-green-700'
    amountPrefix = '+'
  } else {
    amountValue = tx.amount
    amountColor = 'text-red-700'
    amountPrefix = '−'
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{tx.transaction_date}</td>
      <td className="px-4 py-3 text-gray-800">
        {description}
        {tx.is_joint && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">joint</span>}
      </td>
      <td className="px-4 py-3 text-gray-500">{tx.category || '—'}</td>
      <td className="px-4 py-3 text-gray-500">{tx.recorded_by_name}</td>
      <td className="px-4 py-3 font-medium whitespace-nowrap">
        <span className={amountColor}>
          {amountPrefix}{amountValue.toLocaleString('pt-BR', { style: 'currency', currency: tx.currency })}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2 justify-end">
          <button onClick={() => onEdit(tx)} className="text-xs text-blue-600 hover:underline">Edit</button>
          <button onClick={() => onDelete(tx)} className="text-xs text-red-500 hover:underline">Delete</button>
        </div>
      </td>
    </tr>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  /** When set, the account picker is hidden and this account_id is always applied. */
  accountId?: string
  /** Hide the top bar (used when embedded inside AccountTransactionsPanel). */
  embedded?: boolean
  /** When embedded, the parent controls the date range so the summary stays in sync. */
  dateRange?: { start?: string; end?: string }
  onDateRangeChange?: (range: { start: string; end: string }) => void
}

export default function TransactionList({ accountId: fixedAccountId, embedded = false, dateRange, onDateRangeChange }: Props) {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlAccountId = searchParams.get('account_id') ?? ''
  const activeAccountId = fixedAccountId ?? urlAccountId

  const [filters, setFilters] = useState<Omit<TransactionFilters, 'account_id' | 'start_date' | 'end_date'>>({})
  const [internalStart, setInternalStart] = useState('')
  const [internalEnd,   setInternalEnd]   = useState('')
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState<Transaction | null>(null)
  const [deleting, setDeleting]   = useState<Transaction | null>(null)

  const activeStart = dateRange !== undefined ? (dateRange.start ?? '') : internalStart
  const activeEnd   = dateRange !== undefined ? (dateRange.end   ?? '') : internalEnd

  const effectiveFilters: TransactionFilters = {
    ...filters,
    start_date: activeStart  || undefined,
    end_date:   activeEnd    || undefined,
    account_id: activeAccountId || undefined,
  }

  const { data: transactions = [], isLoading, isError } = useTransactions(effectiveFilters)
  const { data: accounts = [] } = useAccounts()
  const deleteMutation     = useDeleteTransaction()
  const { download: exportDownload }   = useExportTransactions(effectiveFilters)
  const { download: templateDownload } = useExportTransactionTemplate()
  const importMutation     = useImportTransactions()

  const setFilter = (key: keyof Omit<TransactionFilters, 'account_id' | 'start_date' | 'end_date'>, value: string) =>
    setFilters(f => ({ ...f, [key]: value || undefined }))

  const setStartDate = (v: string) => {
    if (onDateRangeChange) onDateRangeChange({ start: v, end: activeEnd })
    else setInternalStart(v)
  }
  const setEndDate = (v: string) => {
    if (onDateRangeChange) onDateRangeChange({ start: activeStart, end: v })
    else setInternalEnd(v)
  }

  const setUrlAccountId = (id: string) => {
    setSearchParams(prev => {
      if (id) prev.set('account_id', id)
      else prev.delete('account_id')
      return prev
    })
  }

  const hasFilters = Object.keys(filters).length > 0 || !!urlAccountId || !!activeStart || !!activeEnd

  const clearFilters = () => {
    setFilters({})
    setInternalStart('')
    setInternalEnd('')
    if (onDateRangeChange) onDateRangeChange({ start: '', end: '' })
    setSearchParams(prev => { prev.delete('account_id'); return prev })
  }

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
    <div className={embedded ? '' : 'min-h-screen bg-gray-50'}>

      {!embedded && (
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
      )}

      <div className={embedded ? 'space-y-4' : 'max-w-5xl mx-auto p-6 space-y-4'}>

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
        <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3 items-center">
          {!fixedAccountId && (
            <select
              data-testid="filter-account"
              aria-label="Filter by account"
              value={urlAccountId}
              onChange={e => setUrlAccountId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All accounts</option>
              {accounts.map(a => {
                const typeLabel = ACCOUNT_TYPES.find(t => t.value === a.type)?.label ?? a.type
                return (
                  <option key={a.id} value={a.id}>
                    {a.name} · {typeLabel}
                  </option>
                )
              })}
            </select>
          )}

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
            value={activeStart}
            onChange={e => setStartDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="self-center text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={activeEnd}
            onChange={e => setEndDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {hasFilters && (
            <button
              data-testid="btn-clear-filters"
              onClick={clearFilters}
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
            <table className="w-full text-sm" data-testid="transaction-table">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Date', 'Description', 'Category', 'By', 'Amount', ''].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100" data-testid="account-transactions-list">
                {transactions.map(tx => (
                  <TxRow
                    key={tx.id}
                    tx={tx}
                    activeAccountId={activeAccountId}
                    accounts={accounts}
                    onEdit={setEditing}
                    onDelete={setDeleting}
                  />
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
