import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import TransactionForm from './TransactionForm'
import * as useTransactionsModule from './useTransactions'
import * as useAccountsModule from '../accounts/useAccounts'

const mockPaymentMethods = [
  { id: 'pm-1', household_id: 'hh-1', name: 'Nubank', type: 'credit', created_at: '2024-01-01T00:00:00Z' },
  { id: 'pm-2', household_id: 'hh-1', name: 'Cash',   type: 'cash',   created_at: '2024-01-01T00:00:00Z' },
]

const mockAccounts = [
  { id: 'acc-1', household_id: 'hh-1', name: 'Cash Wallet', type: 'cash', is_joint: true, currency: 'BRL', color: '', icon: '', initial_balance: 0, archived_at: null, created_at: '', updated_at: '' },
  { id: 'acc-2', household_id: 'hh-1', name: 'Savings',     type: 'savings', is_joint: true, currency: 'BRL', color: '', icon: '', initial_balance: 0, archived_at: null, created_at: '', updated_at: '' },
]

function mockHooks({
  createPending = false,
  updatePending = false,
  createError   = false,
  updateError   = false,
} = {}) {
  const mutateCreate = vi.fn().mockImplementation(() =>
    createError ? Promise.reject(new Error('Server error')) : Promise.resolve()
  )
  const mutateUpdate = vi.fn().mockImplementation(() =>
    updateError ? Promise.reject(new Error('Server error')) : Promise.resolve()
  )
  vi.spyOn(useTransactionsModule,  'usePaymentMethods').mockReturnValue({ data: mockPaymentMethods } as any)
  vi.spyOn(useTransactionsModule,  'useCreateTransaction').mockReturnValue({ mutateAsync: mutateCreate, isPending: createPending } as any)
  vi.spyOn(useTransactionsModule,  'useUpdateTransaction').mockReturnValue({ mutateAsync: mutateUpdate, isPending: updatePending } as any)
  // Mock accounts so account_id is pre-populated.
  vi.spyOn(useAccountsModule, 'useAccounts').mockReturnValue({ data: mockAccounts } as any)
  return { mutateCreate, mutateUpdate }
}

describe('TransactionForm', () => {
  const onClose = vi.fn()

  beforeEach(() => { vi.clearAllMocks() })

  it('renders "New Transaction" title in create mode', () => {
    mockHooks()
    render(<TransactionForm onClose={onClose} />)
    expect(screen.getByText('New Transaction')).toBeInTheDocument()
  })

  it('renders "Edit Transaction" title when a transaction is passed', () => {
    mockHooks()
    const tx = { id: 'tx-1', type: 'expense' as const, amount: 50, currency: 'BRL',
      description: 'Coffee', category: 'Food & Drink', is_joint: false,
      payment_method_id: null, transaction_date: '2024-03-01' }
    render(<TransactionForm transaction={tx as any} onClose={onClose} />)
    expect(screen.getByText('Edit Transaction')).toBeInTheDocument()
  })

  it('pre-fills fields when editing an existing transaction', () => {
    mockHooks()
    const tx = { id: 'tx-1', type: 'income' as const, amount: 3000, currency: 'BRL',
      description: 'Monthly salary', category: 'Salary', is_joint: false,
      payment_method_id: null, transaction_date: '2024-03-01' }
    render(<TransactionForm transaction={tx as any} onClose={onClose} />)
    expect((screen.getByDisplayValue('3000') as HTMLInputElement).value).toBe('3000')
    expect(screen.getByDisplayValue('Monthly salary')).toBeInTheDocument()
  })

  it('shows all three type toggle buttons', () => {
    mockHooks()
    render(<TransactionForm onClose={onClose} />)
    expect(screen.getByRole('button', { name: /expense/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /income/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /transfer/i })).toBeInTheDocument()
  })

  it('renders payment method options when they exist', () => {
    mockHooks()
    render(<TransactionForm onClose={onClose} />)
    expect(screen.getByText('Nubank')).toBeInTheDocument()
    expect(screen.getByText('Cash')).toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked', () => {
    mockHooks()
    render(<TransactionForm onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows validation error when amount is zero', async () => {
    mockHooks()
    render(<TransactionForm onClose={onClose} />)
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '0' } })
    // Fire submit on the form element directly to bypass jsdom HTML5 min constraint.
    fireEvent.submit(document.querySelector('form')!)
    await waitFor(() => {
      expect(screen.getByText('Amount must be greater than zero.')).toBeInTheDocument()
    })
  })

  it('calls createMutation with correct data on valid submit', async () => {
    const { mutateCreate } = mockHooks()
    render(<TransactionForm onClose={onClose} />)
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '150.50' } })
    fireEvent.change(screen.getByPlaceholderText(/supermarket/i), { target: { value: 'Groceries' } })
    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }))
    await waitFor(() => {
      expect(mutateCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: '150.50', description: 'Groceries', type: 'expense' })
      )
    })
  })

  it('calls updateMutation when editing and submitting', async () => {
    const { mutateUpdate } = mockHooks()
    const tx = { id: 'tx-99', type: 'expense' as const, amount: 200, currency: 'BRL',
      description: 'Old value', category: 'Food & Drink', is_joint: false,
      payment_method_id: null, transaction_date: '2024-03-01' }
    render(<TransactionForm transaction={tx as any} onClose={onClose} />)
    fireEvent.change(screen.getByDisplayValue('Old value'), { target: { value: 'New value' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => {
      expect(mutateUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'tx-99', data: expect.objectContaining({ description: 'New value' }) })
      )
    })
  })

  it('shows server error message when the mutation rejects', async () => {
    mockHooks({ createError: true })
    render(<TransactionForm onClose={onClose} />)
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '50' } })
    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }))
    await waitFor(() => {
      expect(screen.getByText('Failed to save transaction. Please try again.')).toBeInTheDocument()
    })
  })

  it('disables submit button and shows saving label while pending', () => {
    mockHooks({ createPending: true })
    render(<TransactionForm onClose={onClose} />)
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
  })

  // ─── Account picker tests ─────────────────────────────────────────────────

  it('renders account picker with available accounts', () => {
    mockHooks()
    render(<TransactionForm onClose={onClose} />)
    const picker = screen.getByTestId('select-account')
    expect(picker).toBeInTheDocument()
    expect(screen.getByText('Cash Wallet')).toBeInTheDocument()
    expect(screen.getByText('Savings')).toBeInTheDocument()
  })

  it('does not render to-account picker for expense type', () => {
    mockHooks()
    render(<TransactionForm onClose={onClose} />)
    // type is "expense" by default
    expect(screen.queryByTestId('select-to-account')).not.toBeInTheDocument()
  })

  it('renders to-account picker when type is transfer', () => {
    mockHooks()
    render(<TransactionForm onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /transfer/i }))
    expect(screen.getByTestId('select-to-account')).toBeInTheDocument()
  })

  it('shows error when account_id is empty on submit', async () => {
    mockHooks()
    // Override accounts to be empty so account_id stays empty
    vi.spyOn(useAccountsModule, 'useAccounts').mockReturnValue({ data: [] } as any)
    render(<TransactionForm onClose={onClose} />)
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '50' } })
    fireEvent.submit(document.querySelector('form')!)
    await waitFor(() => {
      expect(screen.getByText('Please select an account.')).toBeInTheDocument()
    })
  })

  it('shows error when transfer to_account_id is not selected', async () => {
    mockHooks()
    render(<TransactionForm onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /transfer/i }))
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '100' } })
    fireEvent.submit(document.querySelector('form')!)
    await waitFor(() => {
      expect(screen.getByText(/please select a destination account/i)).toBeInTheDocument()
    })
  })
})
