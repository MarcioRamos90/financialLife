import { useState } from 'react'
import TransactionList from '../transactions/TransactionList'
import { useAccountBalance } from './useAccounts'

interface Props {
  accountId: string
  accountName: string
  currency: string
}

export default function AccountTransactionsPanel({ accountId, accountName, currency }: Props) {
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  const { data: balance } = useAccountBalance(accountId, {
    start_date: dateRange.start || undefined,
    end_date:   dateRange.end   || undefined,
  })

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency })

  return (
    <div data-testid="account-transactions-panel" className="border-t bg-gray-50 px-5 py-4 space-y-4">

      <p className="text-sm font-medium text-gray-600">{accountName} — transactions</p>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-0.5">Income</p>
          <p data-testid="account-summary-income" className="text-sm font-bold text-green-700">
            {fmt(balance?.income ?? 0)}
          </p>
        </div>
        <div className="bg-red-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-0.5">Expense</p>
          <p data-testid="account-summary-expense" className="text-sm font-bold text-red-700">
            {fmt(balance?.expense ?? 0)}
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-0.5">Balance</p>
          <p data-testid="account-summary-balance" className={`text-sm font-bold ${(balance?.balance ?? 0) >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
            {fmt(balance?.balance ?? 0)}
          </p>
        </div>
      </div>

      {/* Transaction list — date range is shared so the summary stays in sync */}
      <TransactionList
        accountId={accountId}
        embedded
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />
    </div>
  )
}
