import { useEffect, useState } from 'react'
import type { IncomeSource, IncomeSourceFormData } from './types'
import { INCOME_SOURCE_CATEGORIES } from './types'
import { useCreateIncomeSource, useUpdateIncomeSource } from './useIncomeSources'

interface Props {
  source?: IncomeSource  // if provided → edit mode
  onClose: () => void
}

const empty: IncomeSourceFormData = {
  name: '',
  category: '',
  default_amount: '',
  currency: 'BRL',
  recurrence_day: '',
  is_joint: false,
}

export default function IncomeSourceForm({ source, onClose }: Props) {
  const [form, setForm] = useState<IncomeSourceFormData>(
    source
      ? {
          name:           source.name,
          category:       source.category,
          default_amount: String(source.default_amount),
          currency:       source.currency,
          recurrence_day: source.recurrence_day > 0 ? String(source.recurrence_day) : '',
          is_joint:       source.is_joint,
        }
      : empty
  )
  const [error, setError] = useState('')

  const createMutation = useCreateIncomeSource()
  const updateMutation = useUpdateIncomeSource()
  const isLoading = createMutation.isPending || updateMutation.isPending

  // Keep form in sync if the source prop changes (e.g. opening a different edit)
  useEffect(() => {
    if (source) {
      setForm({
        name:           source.name,
        category:       source.category,
        default_amount: String(source.default_amount),
        currency:       source.currency,
        recurrence_day: source.recurrence_day > 0 ? String(source.recurrence_day) : '',
        is_joint:       source.is_joint,
      })
    }
  }, [source?.id])

  const set = (field: keyof IncomeSourceFormData, value: string | boolean) =>
    setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    const amount = parseFloat(form.default_amount)
    if (form.default_amount && (isNaN(amount) || amount < 0)) {
      setError('Default amount must be zero or greater.')
      return
    }
    try {
      if (source) {
        await updateMutation.mutateAsync({ id: source.id, data: form })
      } else {
        await createMutation.mutateAsync(form)
      }
      onClose()
    } catch {
      setError('Failed to save income source. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div data-testid="income-source-form" className="bg-white rounded-2xl shadow-xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            {source ? 'Edit Income Source' : 'New Income Source'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              id="name"
              type="text" required
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Monthly salary, Freelance…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              id="category"
              value={form.category}
              onChange={e => set('category', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— select —</option>
              {INCOME_SOURCE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Default amount + currency */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label htmlFor="default_amount" className="block text-sm font-medium text-gray-700 mb-1">
                Expected monthly amount
              </label>
              <input
                id="default_amount"
                type="number" step="0.01" min="0"
                value={form.default_amount}
                onChange={e => set('default_amount', e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="w-24">
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                id="currency"
                value={form.currency}
                onChange={e => set('currency', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>BRL</option>
                <option>USD</option>
                <option>EUR</option>
              </select>
            </div>
          </div>

          {/* Recurrence day */}
          <div>
            <label htmlFor="recurrence_day" className="block text-sm font-medium text-gray-700 mb-1">
              Expected payment day <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="recurrence_day"
              type="number" min="1" max="31"
              value={form.recurrence_day}
              onChange={e => set('recurrence_day', e.target.value)}
              placeholder="e.g. 5 for the 5th of each month"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Joint toggle */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_joint}
              onChange={e => set('is_joint', e.target.checked)}
              className="mt-0.5 w-4 h-4 text-blue-600"
            />
            <span className="text-sm text-gray-700">
              <span className="font-medium">Goes to joint account</span>
              <span className="block text-gray-400">This income flows into the shared household pool instead of your personal pool.</span>
            </span>
          </label>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
            >Cancel</button>
            <button
              data-testid="btn-submit-source"
              type="submit" disabled={isLoading}
              className="flex-1 py-2 rounded-lg bg-blue-800 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium"
            >{isLoading ? 'Saving…' : source ? 'Save changes' : 'Add income source'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
