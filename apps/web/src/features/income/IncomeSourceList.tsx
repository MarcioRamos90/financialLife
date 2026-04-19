import { useState } from 'react'
import { useIncomeSources, useDeleteIncomeSource } from './useIncomeSources'
import IncomeSourceForm from './IncomeSourceForm'
import RecordEntryDrawer from './RecordEntryDrawer'
import type { IncomeSource } from './types'

export default function IncomeSourceList() {
  const [showForm, setShowForm]       = useState(false)
  const [editing, setEditing]         = useState<IncomeSource | null>(null)
  const [recording, setRecording]     = useState<IncomeSource | null>(null)
  const [deleting, setDeleting]       = useState<IncomeSource | null>(null)

  const { data: sources = [], isLoading, isError } = useIncomeSources()
  const deleteMutation = useDeleteIncomeSource()

  const personalSources = sources.filter(s => !s.is_joint)
  const jointSources    = sources.filter(s =>  s.is_joint)

  const handleDelete = async () => {
    if (!deleting) return
    await deleteMutation.mutateAsync(deleting.id)
    setDeleting(null)
  }

  const totalExpected = sources.reduce((sum, s) => sum + s.default_amount, 0)

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top bar */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-blue-900">Income Sources</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-800 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >+ New source</button>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">

        {/* Summary */}
        {sources.length > 0 && (
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Total expected monthly</p>
            <p className="text-lg font-bold text-green-700">
              {totalExpected.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        )}

        {isLoading && (
          <p className="text-sm text-gray-400 text-center py-12">Loading…</p>
        )}
        {isError && (
          <p className="text-sm text-red-500 text-center py-12">Failed to load income sources.</p>
        )}

        {!isLoading && !isError && sources.length === 0 && (
          <div className="bg-white rounded-xl border p-12 text-center">
            <p className="text-gray-400 text-sm mb-3">No income sources yet.</p>
            <button
              onClick={() => setShowForm(true)}
              className="text-sm text-blue-700 hover:underline"
            >Add your first income source</button>
          </div>
        )}

        {/* Personal sources */}
        {personalSources.length > 0 && (
          <section data-testid="section-personal">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Personal</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {personalSources.map(s => (
                <SourceCard
                  key={s.id}
                  source={s}
                  onEdit={() => setEditing(s)}
                  onRecord={() => setRecording(s)}
                  onDelete={() => setDeleting(s)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Joint sources */}
        {jointSources.length > 0 && (
          <section data-testid="section-joint">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Joint account</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {jointSources.map(s => (
                <SourceCard
                  key={s.id}
                  source={s}
                  onEdit={() => setEditing(s)}
                  onRecord={() => setRecording(s)}
                  onDelete={() => setDeleting(s)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* New / Edit modal */}
      {(showForm || editing) && (
        <IncomeSourceForm
          source={editing ?? undefined}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      {/* Record entry drawer */}
      {recording && (
        <RecordEntryDrawer
          source={recording}
          onClose={() => setRecording(null)}
        />
      )}

      {/* Delete confirm dialog */}
      {deleting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div role="dialog" aria-modal="true" className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete income source?</h3>
            <p className="text-sm text-gray-500 mb-6">
              <strong>{deleting.name}</strong> and all its history will be removed.
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

// ─── Source card ──────────────────────────────────────────────────────────────

interface CardProps {
  source: IncomeSource
  onEdit: () => void
  onRecord: () => void
  onDelete: () => void
}

function SourceCard({ source, onEdit, onRecord, onDelete }: CardProps) {
  return (
    <div data-testid="source-card" className="bg-white rounded-xl border p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-800">{source.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {source.category || 'No category'}
            {source.owner_name && ` · ${source.owner_name}`}
            {source.recurrence_day > 0 && ` · due the ${source.recurrence_day}th`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-green-700">
            {source.default_amount.toLocaleString('pt-BR', { style: 'currency', currency: source.currency })}
          </p>
          <p className="text-xs text-gray-400">/ month</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          data-testid="btn-record-entry"
          onClick={onRecord}
          className="flex-1 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-800 text-xs font-medium"
        >Record entry</button>
        <button
          data-testid="btn-edit-source"
          onClick={onEdit}
          className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs"
        >Edit</button>
        <button
          data-testid="btn-delete-source"
          onClick={onDelete}
          className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-red-50 text-red-500 text-xs"
        >Delete</button>
      </div>
    </div>
  )
}
