import { useEffect, useRef, useState } from 'react'
import type { IncomeSource, IncomeEntryFormData } from './types'
import { MONTH_NAMES } from './types'
import { useRecordIncomeEntry, useIncomeHistory } from './useIncomeSources'

interface Props {
  source: IncomeSource
  onClose: () => void
}

const currentYear  = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1  // 1-12

export default function RecordEntryDrawer({ source, onClose }: Props) {
  const [form, setForm] = useState<IncomeEntryFormData>({
    year:            currentYear,
    month:           currentMonth,
    expected_amount: String(source.default_amount),
    received_amount: '',
    received_on:     '',
    notes:           '',
  })
  const [error, setError] = useState('')

  const { data: history = [] } = useIncomeHistory(source.id)
  const recordMutation = useRecordIncomeEntry()

  // Track the last period the effect synced so we know when month/year changes vs. history reloads.
  const prevPeriodRef = useRef({ year: form.year, month: form.month })

  useEffect(() => {
    const existing = history.find(e => e.year === form.year && e.month === form.month)
    const periodChanged =
      prevPeriodRef.current.year !== form.year || prevPeriodRef.current.month !== form.month
    prevPeriodRef.current = { year: form.year, month: form.month }

    if (existing) {
      // Always prefill from a saved entry.
      setForm(f => ({
        ...f,
        expected_amount: String(existing.expected_amount),
        received_amount: String(existing.received_amount),
        received_on:     existing.received_on ?? '',
        notes:           existing.notes ?? '',
      }))
    } else if (periodChanged) {
      // User picked a different month/year with no entry — reset to defaults.
      setForm(f => ({
        ...f,
        expected_amount: String(source.default_amount),
        received_amount: '',
        received_on:     '',
        notes:           '',
      }))
    }
    // history loaded/reloaded with no entry and period unchanged → keep whatever the user typed.
  }, [form.year, form.month, history])

  const set = <K extends keyof IncomeEntryFormData>(field: K, value: IncomeEntryFormData[K]) =>
    setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const received = parseFloat(form.received_amount)
    if (isNaN(received) || received < 0) {
      setError('Received amount must be zero or greater.')
      return
    }
    try {
      await recordMutation.mutateAsync({ sourceId: source.id, data: form })
      onClose()
    } catch {
      setError('Failed to record entry. Please try again.')
    }
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Drawer */}
      <div data-testid="record-entry-drawer" className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Record entry</h2>
            <p className="text-sm text-gray-400">{source.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Month / Year picker */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select
                id="month"
                value={form.month}
                onChange={e => set('month', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>
            <div className="w-28">
              <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select
                id="year"
                value={form.year}
                onChange={e => set('year', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {yearOptions.map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Expected amount */}
          <div>
            <label htmlFor="expected_amount" className="block text-sm font-medium text-gray-700 mb-1">
              Expected amount
            </label>
            <input
              id="expected_amount"
              type="number" step="0.01" min="0"
              value={form.expected_amount}
              onChange={e => set('expected_amount', e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Received amount */}
          <div>
            <label htmlFor="received_amount" className="block text-sm font-medium text-gray-700 mb-1">
              Received amount
            </label>
            <input
              id="received_amount"
              type="number" step="0.01" min="0" required
              value={form.received_amount}
              onChange={e => set('received_amount', e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Received on date */}
          <div>
            <label htmlFor="received_on" className="block text-sm font-medium text-gray-700 mb-1">
              Date received <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="received_on"
              type="date"
              value={form.received_on}
              onChange={e => set('received_on', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="notes"
              rows={2}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="e.g. Includes bonus"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* History preview */}
          {history.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Recent history</p>
              <div className="space-y-1">
                {history.slice(0, 4).map(e => (
                  <div key={e.id} className="flex justify-between text-sm">
                    <span className="text-gray-500">{MONTH_NAMES[e.month - 1]} {e.year}</span>
                    <span className={e.received_amount >= e.expected_amount ? 'text-green-700' : 'text-amber-600'}>
                      {e.received_amount.toLocaleString('pt-BR', { style: 'currency', currency: source.currency })}
                      {e.expected_amount > 0 && (
                        <span className="text-gray-400 ml-1">
                          / {e.expected_amount.toLocaleString('pt-BR', { style: 'currency', currency: source.currency })}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex gap-2">
          <button
            type="button" onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
          >Cancel</button>
          <button
            data-testid="btn-submit-entry"
            onClick={handleSubmit}
            disabled={recordMutation.isPending}
            className="flex-1 py-2 rounded-lg bg-green-700 hover:bg-green-600 disabled:opacity-60 text-white text-sm font-medium"
          >{recordMutation.isPending ? 'Saving…' : 'Record entry'}</button>
        </div>
      </div>
    </>
  )
}
