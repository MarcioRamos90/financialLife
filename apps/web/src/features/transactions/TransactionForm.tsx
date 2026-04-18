import { useEffect, useState } from 'react'
import type { Transaction, TransactionFormData } from './types'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from './types'
import { usePaymentMethods, useCreateTransaction, useUpdateTransaction } from './useTransactions'

interface Props {
  transaction?: Transaction   // if provided → edit mode
  onClose: () => void
}

const today = () => new Date().toISOString().slice(0, 10)

const empty: TransactionFormData = {
  type: 'expense',
  amount: '',
  currency: 'BRL',
  description: '',
  category: '',
  is_joint: false,
  payment_method_id: '',
  transaction_date: today(),
}

export default function TransactionForm({ transaction, onClose }: Props) {
  const [form, setForm] = useState<TransactionFormData>(
    transaction
      ? {
          type:              transaction.type,
          amount:            String(transaction.amount),
          currency:          transaction.currency,
          description:       transaction.description,
          category:          transaction.category,
          is_joint:          transaction.is_joint,
          payment_method_id: transaction.payment_method_id ?? '',
          transaction_date:  transaction.transaction_date,
        }
      : empty
  )
  const [error, setError] = useState('')

  const { data: paymentMethods = [] } = usePaymentMethods()
  const createMutation = useCreateTransaction()
  const updateMutation = useUpdateTransaction()
  const isLoading = createMutation.isPending || updateMutation.isPending

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  // Reset category when type changes
  useEffect(() => {
    setForm(f => ({ ...f, category: '' }))
  }, [form.type])

  const set = (field: keyof TransactionFormData, value: string | boolean) =>
    setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError('Amount must be greater than zero.')
      return
    }
    if (!form.transaction_date) {
      setError('Date is required.')
      return
    }
    try {
      if (transaction) {
        await updateMutation.mutateAsync({ id: transaction.id, data: form })
      } else {
        await createMutation.mutateAsync(form)
      }
      onClose()
    } catch {
      setError('Failed to save transaction. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            {transaction ? 'Edit Transaction' : 'New Transaction'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Type */}
          <div className="flex gap-2">
            {(['expense', 'income', 'transfer'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => set('type', t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                  form.type === t
                    ? t === 'income'  ? 'bg-green-100 text-green-800 ring-1 ring-green-400'
                    : t === 'expense' ? 'bg-red-100 text-red-800 ring-1 ring-red-400'
                    :                   'bg-blue-100 text-blue-800 ring-1 ring-blue-400'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >{t}</button>
            ))}
          </div>

          {/* Amount + Currency */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                id="amount"
                type="number" step="0.01" min="0.01" required
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
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

          {/* Date */}
          <div>
            <label htmlFor="transaction_date" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              id="transaction_date"
              type="date" required
              value={form.transaction_date}
              onChange={e => set('transaction_date', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              id="description"
              type="text"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="e.g. Supermarket, Monthly salary…"
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
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Payment method */}
          {paymentMethods.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={form.payment_method_id}
                onChange={e => set('payment_method_id', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— none —</option>
                {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}

          {/* Joint / Transfer pool label */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_joint}
              onChange={e => set('is_joint', e.target.checked)}
              className="mt-0.5 w-4 h-4 text-blue-600"
            />
            <span className="text-sm text-gray-700">
              {form.type === 'transfer' ? (
                <>
                  <span className="font-medium">Moving to joint account</span>
                  <span className="block text-gray-400">Check to move money from your personal pool into the joint account. Uncheck to withdraw from joint into your personal pool.</span>
                </>
              ) : (
                <>
                  <span className="font-medium">Shared household</span>
                  <span className="block text-gray-400">This transaction belongs to the joint account pool.</span>
                </>
              )}
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
              type="submit" disabled={isLoading}
              className="flex-1 py-2 rounded-lg bg-blue-800 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium"
            >{isLoading ? 'Saving…' : transaction ? 'Save changes' : 'Add transaction'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
