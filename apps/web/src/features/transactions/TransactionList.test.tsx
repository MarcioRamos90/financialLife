import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TransactionList from './TransactionList'
import * as useTransactionsModule from './useTransactions'
import type { Transaction } from './types'

// Wrap renders in a QueryClientProvider so sub-components that call useQuery
// (e.g. TransactionForm's usePaymentMethods) have a client available.
function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

const makeTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'tx-1',
  household_id: 'hh-1',
  recorded_by: 'user-1',
  recorded_by_name: 'Marcio',
  account_id: 'acc-1',
  to_account_id: null,
  type: 'expense',
  amount: 120.5,
  currency: 'BRL',
  description: 'Supermarket',
  category: 'Food & Drink',
  is_joint: false,
  payment_method_id: null,
  payment_method_name: null,
  income_source_id: null,
  transaction_date: '2024-04-01',
  created_at: '2024-04-01T10:00:00Z',
  updated_at: '2024-04-01T10:00:00Z',
  deleted_at: null,
  ...overrides,
})

function mockHooks({
  transactions = [] as Transaction[],
  isLoading = false,
  isError = false,
} = {}) {
  const mutateDelete = vi.fn().mockResolvedValue(undefined)
  vi.spyOn(useTransactionsModule, 'useTransactions').mockReturnValue({ data: transactions, isLoading, isError } as any)
  vi.spyOn(useTransactionsModule, 'useDeleteTransaction').mockReturnValue({ mutateAsync: mutateDelete, isPending: false } as any)
  return { mutateDelete }
}

describe('TransactionList', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders the page title and New transaction button', () => {
    mockHooks()
    renderWithClient(<TransactionList />)
    expect(screen.getByText('Transactions')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new transaction/i })).toBeInTheDocument()
  })

  it('shows the three summary cards', () => {
    mockHooks()
    renderWithClient(<TransactionList />)
    // Use selector:'p' to avoid matching identical text in the type filter select options.
    expect(screen.getByText('Income',  { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText('Expense', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText('Surplus', { selector: 'p' })).toBeInTheDocument()
  })

  it('shows a loading indicator while fetching', () => {
    mockHooks({ isLoading: true })
    renderWithClient(<TransactionList />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows an error message on fetch failure', () => {
    mockHooks({ isError: true })
    renderWithClient(<TransactionList />)
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
  })

  it('shows an empty-state prompt when there are no transactions', () => {
    mockHooks({ transactions: [] })
    renderWithClient(<TransactionList />)
    expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument()
  })

  it('renders a row for each transaction', () => {
    const txs = [
      makeTransaction({ id: 'tx-1', description: 'Supermarket' }),
      makeTransaction({ id: 'tx-2', description: 'Monthly salary', type: 'income', amount: 5000 }),
    ]
    mockHooks({ transactions: txs })
    renderWithClient(<TransactionList />)
    expect(screen.getByText('Supermarket')).toBeInTheDocument()
    expect(screen.getByText('Monthly salary')).toBeInTheDocument()
  })

  it('shows the recorded_by_name column', () => {
    mockHooks({ transactions: [makeTransaction({ recorded_by_name: 'Marcio' })] })
    renderWithClient(<TransactionList />)
    expect(screen.getByText('Marcio')).toBeInTheDocument()
  })

  it('shows the joint badge when is_joint is true', () => {
    mockHooks({ transactions: [makeTransaction({ is_joint: true })] })
    renderWithClient(<TransactionList />)
    expect(screen.getByText('joint')).toBeInTheDocument()
  })

  it('calculates the surplus correctly from mixed transactions', () => {
    const txs = [
      makeTransaction({ type: 'income', amount: 5000 }),
      makeTransaction({ id: 'tx-2', type: 'expense', amount: 1200 }),
    ]
    mockHooks({ transactions: txs })
    renderWithClient(<TransactionList />)
    // Surplus = 5000 - 1200 = 3800; formatted as R$3.800,00
    expect(screen.getByText(/3\.800/)).toBeInTheDocument()
  })

  it('renders the filter bar with type and category selectors', () => {
    mockHooks()
    renderWithClient(<TransactionList />)
    expect(screen.getByDisplayValue('All types')).toBeInTheDocument()
    expect(screen.getByDisplayValue('All categories')).toBeInTheDocument()
  })

  it('does not show "Clear filters" button when no filter is active', () => {
    mockHooks()
    renderWithClient(<TransactionList />)
    expect(screen.queryByText(/clear filters/i)).not.toBeInTheDocument()
  })

  it('shows "Clear filters" button after a filter is applied', () => {
    mockHooks()
    renderWithClient(<TransactionList />)
    fireEvent.change(screen.getByDisplayValue('All types'), { target: { value: 'income' } })
    expect(screen.getByText(/clear filters/i)).toBeInTheDocument()
  })

  it('resets all filters when "Clear filters" is clicked', () => {
    mockHooks()
    renderWithClient(<TransactionList />)
    fireEvent.change(screen.getByDisplayValue('All types'), { target: { value: 'income' } })
    fireEvent.click(screen.getByText(/clear filters/i))
    expect(screen.queryByText(/clear filters/i)).not.toBeInTheDocument()
  })

  it('opens the new-transaction modal when the button is clicked', () => {
    mockHooks()
    renderWithClient(<TransactionList />)
    fireEvent.click(screen.getByRole('button', { name: /new transaction/i }))
    expect(screen.getByText('New Transaction')).toBeInTheDocument()
  })

  it('opens a confirmation dialog when Delete is clicked', () => {
    mockHooks({ transactions: [makeTransaction()] })
    renderWithClient(<TransactionList />)
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(screen.getByText(/delete transaction\?/i)).toBeInTheDocument()
  })

  it('cancels deletion when Cancel is clicked in the dialog', () => {
    mockHooks({ transactions: [makeTransaction()] })
    renderWithClient(<TransactionList />)
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByText(/delete transaction\?/i)).not.toBeInTheDocument()
  })

  it('calls deleteTransaction with the correct id on confirmation', async () => {
    const { mutateDelete } = mockHooks({ transactions: [makeTransaction({ id: 'tx-42' })] })
    renderWithClient(<TransactionList />)
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))
    const confirmBtn = screen.getAllByRole('button', { name: /^delete$/i })
      .find(b => b.closest('.fixed'))
    fireEvent.click(confirmBtn!)
    await waitFor(() => {
      expect(mutateDelete).toHaveBeenCalledWith('tx-42')
    })
  })
})
