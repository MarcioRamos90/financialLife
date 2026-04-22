import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AccountForm from './AccountForm'
import * as useAccountsModule from './useAccounts'
import type { Account } from './types'

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

const mockAccount: Account = {
  id: 'acc-1',
  household_id: 'hh-1',
  name: 'My Wallet',
  type: 'cash',
  is_joint: true,
  currency: 'BRL',
  color: '#3B82F6',
  icon: '',
  initial_balance: 250,
  archived_at: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

function mockMutations() {
  const createMutate = vi.fn().mockResolvedValue(mockAccount)
  const updateMutate = vi.fn().mockResolvedValue(mockAccount)
  vi.spyOn(useAccountsModule, 'useCreateAccount').mockReturnValue({ mutateAsync: createMutate, isPending: false } as any)
  vi.spyOn(useAccountsModule, 'useUpdateAccount').mockReturnValue({ mutateAsync: updateMutate, isPending: false } as any)
  return { createMutate, updateMutate }
}

describe('AccountForm — create mode', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders all required fields', () => {
    mockMutations()
    renderWithClient(<AccountForm onSuccess={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByTestId('input-name')).toBeInTheDocument()
    expect(screen.getByTestId('select-type')).toBeInTheDocument()
    expect(screen.getByTestId('input-initial-balance')).toBeInTheDocument()
    expect(screen.getByTestId('btn-submit-account')).toBeInTheDocument()
    expect(screen.getByTestId('btn-cancel-account')).toBeInTheDocument()
  })

  it('shows error when name is empty on submit', async () => {
    mockMutations()
    renderWithClient(<AccountForm onSuccess={vi.fn()} onCancel={vi.fn()} />)

    // Clear the name field and use fireEvent.submit to bypass HTML5 required validation
    fireEvent.change(screen.getByTestId('input-name'), { target: { value: '' } })
    fireEvent.submit(document.querySelector('form')!)

    await waitFor(() => {
      expect(screen.getByText(/account name is required/i)).toBeInTheDocument()
    })
  })

  it('calls createAccount mutation on valid submit', async () => {
    const { createMutate } = mockMutations()
    const onSuccess = vi.fn()
    renderWithClient(<AccountForm onSuccess={onSuccess} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'Savings' } })
    fireEvent.click(screen.getByTestId('btn-submit-account'))

    await waitFor(() => {
      expect(createMutate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Savings' }))
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('calls onCancel when cancel button clicked', () => {
    mockMutations()
    const onCancel = vi.fn()
    renderWithClient(<AccountForm onSuccess={vi.fn()} onCancel={onCancel} />)

    fireEvent.click(screen.getByTestId('btn-cancel-account'))
    expect(onCancel).toHaveBeenCalled()
  })
})

describe('AccountForm — edit mode', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('pre-fills fields with existing account data', () => {
    mockMutations()
    renderWithClient(<AccountForm account={mockAccount} onSuccess={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByTestId('input-name')).toHaveValue('My Wallet')
    expect(screen.getByTestId('select-type')).toHaveValue('cash')
    expect(screen.getByTestId('input-initial-balance')).toHaveValue(250)
  })

  it('calls updateAccount mutation on valid submit', async () => {
    const { updateMutate } = mockMutations()
    const onSuccess = vi.fn()
    renderWithClient(<AccountForm account={mockAccount} onSuccess={onSuccess} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'Updated Wallet' } })
    fireEvent.click(screen.getByTestId('btn-submit-account'))

    await waitFor(() => {
      expect(updateMutate).toHaveBeenCalledWith({ id: 'acc-1', data: expect.objectContaining({ name: 'Updated Wallet' }) })
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('shows Edit Account heading in edit mode', () => {
    mockMutations()
    renderWithClient(<AccountForm account={mockAccount} onSuccess={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Edit Account')).toBeInTheDocument()
  })
})
