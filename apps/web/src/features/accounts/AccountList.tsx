import { useState } from 'react'
import { useAccounts, useArchiveAccount, useAccountBalance } from './useAccounts'
import AccountForm from './AccountForm'
import AccountTransactionsPanel from './AccountTransactionsPanel'
import type { Account } from './types'
import { ACCOUNT_TYPES } from './types'

// ─── Single account card ──────────────────────────────────────────────────────

function AccountCard({
  account,
  isExpanded,
  onEdit,
  onArchive,
  onToggleTransactions,
}: {
  account: Account
  isExpanded: boolean
  onEdit: (a: Account) => void
  onArchive: (a: Account) => void
  onToggleTransactions: (id: string) => void
}) {
  const { data: balanceData } = useAccountBalance(account.id)
  const balance = balanceData?.balance ?? account.initial_balance
  const typeLabel = ACCOUNT_TYPES.find(t => t.value === account.type)?.label ?? account.type
  const accentColor = account.color || '#3B82F6'

  return (
    <div
      data-testid="account-card"
      className="bg-white rounded-xl border shadow-sm overflow-hidden"
      style={{ borderTop: `4px solid ${accentColor}` }}
    >
      <div className="p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-gray-800 text-base">{account.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {typeLabel} · {account.currency} {account.is_joint ? '· Joint' : '· Personal'}
            </p>
          </div>
          <div className="flex gap-1">
            <button
              data-testid={`btn-edit-account-${account.id}`}
              onClick={() => onEdit(account)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors text-xs"
              title="Edit"
            >✏️</button>
            <button
              data-testid={`btn-archive-account-${account.id}`}
              onClick={() => onArchive(account)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors text-xs"
              title="Archive"
            >🗄️</button>
          </div>
        </div>

        <div className="text-2xl font-bold" style={{ color: accentColor }}>
          {balance.toLocaleString('pt-BR', { style: 'currency', currency: account.currency })}
        </div>

        <button
          data-testid="btn-view-transactions"
          onClick={() => onToggleTransactions(account.id)}
          className="self-start text-xs text-blue-600 hover:underline"
        >
          {isExpanded ? 'Hide transactions ▲' : 'View transactions ▼'}
        </button>
      </div>

      {isExpanded && (
        <AccountTransactionsPanel
          accountId={account.id}
          accountName={account.name}
          currency={account.currency}
        />
      )}
    </div>
  )
}

// ─── Accounts page ────────────────────────────────────────────────────────────

export default function AccountList() {
  const { data: accounts = [], isLoading, isError } = useAccounts()
  const archiveMutation = useArchiveAccount()

  const [showForm, setShowForm]         = useState(false)
  const [editing, setEditing]           = useState<Account | null>(null)
  const [archiving, setArchiving]       = useState<Account | null>(null)
  const [expandedId, setExpandedId]     = useState<string | null>(null)

  const toggleTransactions = (id: string) =>
    setExpandedId(prev => (prev === id ? null : id))

  const handleArchiveConfirm = async () => {
    if (!archiving) return
    await archiveMutation.mutateAsync(archiving.id)
    if (expandedId === archiving.id) setExpandedId(null)
    setArchiving(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top bar */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-blue-900">Accounts</h1>
        <button
          data-testid="btn-new-account"
          onClick={() => setShowForm(true)}
          className="bg-blue-800 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >+ New account</button>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">

        {isLoading && (
          <p className="text-gray-400 text-sm">Loading accounts…</p>
        )}

        {isError && (
          <p className="text-red-500 text-sm">Failed to load accounts.</p>
        )}

        {!isLoading && !isError && accounts.length === 0 && (
          <div data-testid="empty-state" className="text-center py-16">
            <p className="text-gray-400 text-lg mb-4">No accounts yet.</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-800 hover:bg-blue-700 text-white text-sm font-medium px-6 py-2 rounded-lg"
            >Create your first account</button>
          </div>
        )}

        <div data-testid="account-list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(a => (
            <AccountCard
              key={a.id}
              account={a}
              isExpanded={expandedId === a.id}
              onEdit={setEditing}
              onArchive={setArchiving}
              onToggleTransactions={toggleTransactions}
            />
          ))}
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <AccountForm
          onSuccess={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Edit form */}
      {editing && (
        <AccountForm
          account={editing}
          onSuccess={() => setEditing(null)}
          onCancel={() => setEditing(null)}
        />
      )}

      {/* Archive confirmation */}
      {archiving && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Archive account?</h3>
            <p className="text-sm text-gray-500">
              <span className="font-medium">"{archiving.name}"</span> will be hidden from the list.
              All transaction history is preserved. This action can't be undone from the UI.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setArchiving(null)}
                className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
              >Cancel</button>
              <button
                onClick={handleArchiveConfirm}
                disabled={archiveMutation.isPending}
                data-testid="btn-confirm-archive"
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium"
              >{archiveMutation.isPending ? 'Archiving…' : 'Archive'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
