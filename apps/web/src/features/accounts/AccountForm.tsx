import { useState } from 'react'
import type { Account, AccountFormData } from './types'
import { ACCOUNT_TYPES, ACCOUNT_COLORS } from './types'
import { useCreateAccount, useUpdateAccount } from './useAccounts'

interface Props {
  account?: Account   // if provided → edit mode
  onSuccess: () => void
  onCancel: () => void
}

const empty: AccountFormData = {
  name:            '',
  type:            'cash',
  is_joint:        true,
  currency:        'BRL',
  color:           '#3B82F6',
  icon:            '',
  initial_balance: '0',
}

export default function AccountForm({ account, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<AccountFormData>(
    account
      ? {
          name:            account.name,
          type:            account.type,
          is_joint:        account.is_joint,
          currency:        account.currency,
          color:           account.color || '#3B82F6',
          icon:            account.icon || '',
          initial_balance: String(account.initial_balance),
        }
      : empty
  )
  const [error, setError] = useState('')

  const createMutation = useCreateAccount()
  const updateMutation = useUpdateAccount()
  const isLoading = createMutation.isPending || updateMutation.isPending

  const set = (field: keyof AccountFormData, value: string | boolean) =>
    setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) {
      setError('Account name is required.')
      return
    }
    try {
      if (account) {
        await updateMutation.mutateAsync({ id: account.id, data: form })
      } else {
        await createMutation.mutateAsync(form)
      }
      onSuccess()
    } catch {
      setError('Failed to save account. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div data-testid="account-form" className="bg-white rounded-2xl shadow-xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            {account ? 'Edit Account' : 'New Account'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">

          {/* Name */}
          <div>
            <label htmlFor="account-name" className="block text-sm font-medium text-gray-700 mb-1">
              Account name <span className="text-red-500">*</span>
            </label>
            <input
              id="account-name"
              data-testid="input-name"
              type="text"
              required
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Main Checking, Wallet…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Type */}
          <div>
            <label htmlFor="account-type" className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              id="account-type"
              data-testid="select-type"
              value={form.type}
              onChange={e => set('type', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ACCOUNT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Initial balance + currency */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label htmlFor="initial-balance" className="block text-sm font-medium text-gray-700 mb-1">
                Initial balance
              </label>
              <input
                id="initial-balance"
                data-testid="input-initial-balance"
                type="number"
                step="0.01"
                value={form.initial_balance}
                onChange={e => set('initial_balance', e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="w-24">
              <label htmlFor="account-currency" className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                id="account-currency"
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

          {/* Color swatches */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {ACCOUNT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('color', c)}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          {/* Joint toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_joint}
              onChange={e => set('is_joint', e.target.checked)}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm text-gray-700">
              <span className="font-medium">Shared household account</span>
              <span className="block text-gray-400 text-xs">Visible and shared across both users.</span>
            </span>
          </label>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button" onClick={onCancel}
              data-testid="btn-cancel-account"
              className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
            >Cancel</button>
            <button
              type="submit" disabled={isLoading}
              data-testid="btn-submit-account"
              className="flex-1 py-2 rounded-lg bg-blue-800 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium"
            >{isLoading ? 'Saving…' : account ? 'Save changes' : 'Create account'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
