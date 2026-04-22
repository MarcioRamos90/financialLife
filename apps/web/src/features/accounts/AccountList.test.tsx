import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AccountList from './AccountList'
import * as useAccountsModule from './useAccounts'
import type { Account } from './types'

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 'acc-1',
  household_id: 'hh-1',
  name: 'Cash',
  type: 'cash',
  is_joint: true,
  currency: 'BRL',
  color: '#3B82F6',
  icon: '',
  initial_balance: 0,
  archived_at: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

function mockHooks({
  accounts  = [] as Account[],
  isLoading = false,
  isError   = false,
} = {}) {
  const mutateArchive = vi.fn().mockResolvedValue(undefined)
  vi.spyOn(useAccountsModule, 'useAccounts').mockReturnValue({ data: accounts, isLoading, isError } as any)
  vi.spyOn(useAccountsModule, 'useArchiveAccount').mockReturnValue({ mutateAsync: mutateArchive, isPending: false } as any)
  // useAccountBalance is called per card; mock it to return a zero balance
  vi.spyOn(useAccountsModule, 'useAccountBalance').mockReturnValue({ data: { account_id: 'acc-1', balance: 0 } } as any)
  return { mutateArchive }
}

describe('AccountList', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders account cards from mocked data', () => {
    mockHooks({ accounts: [makeAccount({ name: 'My Checking' })] })
    renderWithClient(<AccountList />)

    expect(screen.getByTestId('account-card')).toBeInTheDocument()
    expect(screen.getByText('My Checking')).toBeInTheDocument()
  })

  it('shows empty state when no accounts', () => {
    mockHooks({ accounts: [] })
    renderWithClient(<AccountList />)

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.queryByTestId('account-card')).not.toBeInTheDocument()
  })

  it('opens create form when btn-new-account is clicked', () => {
    mockHooks({ accounts: [] })
    renderWithClient(<AccountList />)

    fireEvent.click(screen.getByTestId('btn-new-account'))
    expect(screen.getByTestId('account-form')).toBeInTheDocument()
  })

  it('shows archive confirmation dialog when archive button clicked', async () => {
    mockHooks({ accounts: [makeAccount()] })
    renderWithClient(<AccountList />)

    fireEvent.click(screen.getByTestId('btn-archive-account-acc-1'))

    await waitFor(() => {
      expect(screen.getByTestId('btn-confirm-archive')).toBeInTheDocument()
    })
  })

  it('calls archiveAccount when confirmation is confirmed', async () => {
    const { mutateArchive } = mockHooks({ accounts: [makeAccount()] })
    renderWithClient(<AccountList />)

    fireEvent.click(screen.getByTestId('btn-archive-account-acc-1'))
    await waitFor(() => screen.getByTestId('btn-confirm-archive'))
    fireEvent.click(screen.getByTestId('btn-confirm-archive'))

    await waitFor(() => {
      expect(mutateArchive).toHaveBeenCalledWith('acc-1')
    })
  })

  it('shows loading state', () => {
    mockHooks({ isLoading: true })
    renderWithClient(<AccountList />)
    expect(screen.getByText(/loading accounts/i)).toBeInTheDocument()
  })

  it('shows error state', () => {
    mockHooks({ isError: true })
    renderWithClient(<AccountList />)
    expect(screen.getByText(/failed to load accounts/i)).toBeInTheDocument()
  })
})
