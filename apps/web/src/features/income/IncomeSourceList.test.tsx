import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import IncomeSourceList from './IncomeSourceList'
import * as useIncomeSourcesModule from './useIncomeSources'
import type { IncomeSource } from './types'

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

const makeSource = (overrides: Partial<IncomeSource> = {}): IncomeSource => ({
  id: 'src-1',
  household_id: 'hh-1',
  user_id: 'user-1',
  owner_name: 'Marcio',
  name: 'Monthly Salary',
  category: 'Salary',
  default_amount: 5000,
  currency: 'BRL',
  recurrence_day: 5,
  is_joint: false,
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

function mockHooks({
  sources = [] as IncomeSource[],
  isLoading = false,
  isError = false,
} = {}) {
  const mutateDelete = vi.fn().mockResolvedValue(undefined)
  vi.spyOn(useIncomeSourcesModule, 'useIncomeSources').mockReturnValue({ data: sources, isLoading, isError } as any)
  vi.spyOn(useIncomeSourcesModule, 'useDeleteIncomeSource').mockReturnValue({ mutateAsync: mutateDelete, isPending: false } as any)
  return { mutateDelete }
}

describe('IncomeSourceList', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders the page title and New source button', () => {
    mockHooks()
    renderWithClient(<IncomeSourceList />)
    expect(screen.getByText('Income Sources')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new source/i })).toBeInTheDocument()
  })

  it('shows a loading indicator while fetching', () => {
    mockHooks({ isLoading: true })
    renderWithClient(<IncomeSourceList />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows an error message on fetch failure', () => {
    mockHooks({ isError: true })
    renderWithClient(<IncomeSourceList />)
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
  })

  it('shows an empty-state prompt when no sources exist', () => {
    mockHooks({ sources: [] })
    renderWithClient(<IncomeSourceList />)
    expect(screen.getByText(/no income sources yet/i)).toBeInTheDocument()
  })

  it('renders a card for each source', () => {
    const sources = [
      makeSource({ id: 'src-1', name: 'Monthly Salary' }),
      makeSource({ id: 'src-2', name: 'Freelance', is_joint: false }),
    ]
    mockHooks({ sources })
    renderWithClient(<IncomeSourceList />)
    expect(screen.getByText('Monthly Salary')).toBeInTheDocument()
    expect(screen.getByText('Freelance')).toBeInTheDocument()
  })

  it('renders personal sources in the personal section', () => {
    const sources = [makeSource({ name: 'My Salary', is_joint: false })]
    mockHooks({ sources })
    renderWithClient(<IncomeSourceList />)
    expect(screen.getByTestId('section-personal')).toBeInTheDocument()
    expect(screen.queryByTestId('section-joint')).not.toBeInTheDocument()
  })

  it('renders joint sources in the joint section', () => {
    const sources = [makeSource({ name: 'Shared Rent', is_joint: true })]
    mockHooks({ sources })
    renderWithClient(<IncomeSourceList />)
    expect(screen.getByTestId('section-joint')).toBeInTheDocument()
    expect(screen.queryByTestId('section-personal')).not.toBeInTheDocument()
  })

  it('renders both sections when both types exist', () => {
    const sources = [
      makeSource({ id: 'src-1', name: 'My Salary', is_joint: false }),
      makeSource({ id: 'src-2', name: 'Shared Rent', is_joint: true }),
    ]
    mockHooks({ sources })
    renderWithClient(<IncomeSourceList />)
    expect(screen.getByTestId('section-personal')).toBeInTheDocument()
    expect(screen.getByTestId('section-joint')).toBeInTheDocument()
    expect(screen.getByTestId('section-personal').textContent).toContain('My Salary')
    expect(screen.getByTestId('section-joint').textContent).toContain('Shared Rent')
  })

  it('shows total expected amount summary when sources exist', () => {
    const sources = [
      makeSource({ id: 'src-1', default_amount: 3000 }),
      makeSource({ id: 'src-2', name: 'Bonus', default_amount: 1000 }),
    ]
    mockHooks({ sources })
    renderWithClient(<IncomeSourceList />)
    // Total = 4000; formatted as R$ 4.000,00 in pt-BR locale
    expect(screen.getByText(/4\.000/)).toBeInTheDocument()
  })

  it('opens the new income source form on button click', () => {
    mockHooks()
    renderWithClient(<IncomeSourceList />)
    fireEvent.click(screen.getByRole('button', { name: /new source/i }))
    expect(screen.getByTestId('income-source-form')).toBeInTheDocument()
  })

  it('opens the delete confirmation dialog when Delete is clicked', () => {
    mockHooks({ sources: [makeSource()] })
    renderWithClient(<IncomeSourceList />)
    fireEvent.click(screen.getByTestId('btn-delete-source'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/delete income source\?/i)).toBeInTheDocument()
  })

  it('cancels deletion when Cancel is clicked in the dialog', () => {
    mockHooks({ sources: [makeSource()] })
    renderWithClient(<IncomeSourceList />)
    fireEvent.click(screen.getByTestId('btn-delete-source'))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('calls deleteSource with the correct id on confirmation', async () => {
    const { mutateDelete } = mockHooks({ sources: [makeSource({ id: 'src-42' })] })
    renderWithClient(<IncomeSourceList />)
    fireEvent.click(screen.getByTestId('btn-delete-source'))
    // Click the Delete button inside the dialog
    const deleteBtn = screen.getAllByRole('button', { name: /^delete$/i })
      .find(b => b.closest('.fixed'))
    fireEvent.click(deleteBtn!)
    await waitFor(() => {
      expect(mutateDelete).toHaveBeenCalledWith('src-42')
    })
  })

  it('source cards have edit and record-entry buttons', () => {
    mockHooks({ sources: [makeSource()] })
    renderWithClient(<IncomeSourceList />)
    expect(screen.getByTestId('btn-edit-source')).toBeInTheDocument()
    expect(screen.getByTestId('btn-record-entry')).toBeInTheDocument()
  })
})
