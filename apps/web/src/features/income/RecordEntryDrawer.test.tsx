import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import RecordEntryDrawer from './RecordEntryDrawer'
import * as useIncomeSourcesModule from './useIncomeSources'
import type { IncomeSource, IncomeEntry } from './types'

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
  name: 'Salary',
  category: 'Salary',
  default_amount: 4000,
  currency: 'BRL',
  recurrence_day: 5,
  is_joint: false,
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

const makeEntry = (overrides: Partial<IncomeEntry> = {}): IncomeEntry => ({
  id: 'entry-1',
  income_source_id: 'src-1',
  user_id: 'user-1',
  year: 2025,
  month: 1,
  expected_amount: 4000,
  received_amount: 3800,
  received_on: '2025-01-28',
  notes: 'Partial',
  created_at: '2025-01-28T00:00:00Z',
  updated_at: '2025-01-28T00:00:00Z',
  ...overrides,
})

function mockMutations({ history = [] as IncomeEntry[] } = {}) {
  const mutateRecord = vi.fn().mockResolvedValue({})
  vi.spyOn(useIncomeSourcesModule, 'useIncomeHistory').mockReturnValue({ data: history } as any)
  vi.spyOn(useIncomeSourcesModule, 'useRecordIncomeEntry').mockReturnValue({ mutateAsync: mutateRecord, isPending: false } as any)
  return { mutateRecord }
}

describe('RecordEntryDrawer', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders with the record-entry-drawer testid', () => {
    mockMutations()
    renderWithClient(<RecordEntryDrawer source={makeSource()} onClose={vi.fn()} />)
    expect(screen.getByTestId('record-entry-drawer')).toBeInTheDocument()
  })

  it('shows the source name in the header', () => {
    mockMutations()
    renderWithClient(<RecordEntryDrawer source={makeSource({ name: 'Consulting Fee' })} onClose={vi.fn()} />)
    expect(screen.getByText('Consulting Fee')).toBeInTheDocument()
  })

  it('renders Month, Year, Received amount, and Date received fields', () => {
    mockMutations()
    renderWithClient(<RecordEntryDrawer source={makeSource()} onClose={vi.fn()} />)
    expect(screen.getByLabelText('Month')).toBeInTheDocument()
    expect(screen.getByLabelText('Year')).toBeInTheDocument()
    expect(screen.getByLabelText(/received amount/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/date received/i)).toBeInTheDocument()
  })

  it('pre-fills expected amount from source default', () => {
    mockMutations()
    renderWithClient(<RecordEntryDrawer source={makeSource({ default_amount: 4000 })} onClose={vi.fn()} />)
    expect((screen.getByLabelText(/expected amount/i) as HTMLInputElement).value).toBe('4000')
  })

  it('has the btn-submit-entry testid on the submit button', () => {
    mockMutations()
    renderWithClient(<RecordEntryDrawer source={makeSource()} onClose={vi.fn()} />)
    expect(screen.getByTestId('btn-submit-entry')).toBeInTheDocument()
  })

  it('calls recordMutation with the correct data on submit', async () => {
    const { mutateRecord } = mockMutations()
    const onClose = vi.fn()
    renderWithClient(<RecordEntryDrawer source={makeSource({ id: 'src-7' })} onClose={onClose} />)

    fireEvent.change(screen.getByLabelText(/received amount/i), { target: { value: '3800' } })
    fireEvent.click(screen.getByTestId('btn-submit-entry'))

    await waitFor(() => {
      expect(mutateRecord).toHaveBeenCalledWith(expect.objectContaining({
        sourceId: 'src-7',
        data: expect.objectContaining({ received_amount: '3800' }),
      }))
    })
  })

  it('calls onClose after successful record', async () => {
    mockMutations()
    const onClose = vi.fn()
    renderWithClient(<RecordEntryDrawer source={makeSource()} onClose={onClose} />)
    fireEvent.change(screen.getByLabelText(/received amount/i), { target: { value: '4000' } })
    fireEvent.click(screen.getByTestId('btn-submit-entry'))
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('calls onClose when Cancel is clicked', () => {
    mockMutations()
    const onClose = vi.fn()
    renderWithClient(<RecordEntryDrawer source={makeSource()} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when the backdrop is clicked', () => {
    mockMutations()
    const onClose = vi.fn()
    const { container } = renderWithClient(<RecordEntryDrawer source={makeSource()} onClose={onClose} />)
    // The backdrop is the first fixed div (before the drawer)
    const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/40.z-40')
    fireEvent.click(backdrop!)
    expect(onClose).toHaveBeenCalled()
  })

  it('pre-fills received amount from history when an entry exists for the current month', () => {
    const now = new Date()
    const entry = makeEntry({ year: now.getFullYear(), month: now.getMonth() + 1, received_amount: 2900, notes: 'Partial payment' })
    mockMutations({ history: [entry] })
    renderWithClient(<RecordEntryDrawer source={makeSource()} onClose={vi.fn()} />)
    expect((screen.getByLabelText(/received amount/i) as HTMLInputElement).value).toBe('2900')
    expect((screen.getByLabelText(/notes/i) as HTMLTextAreaElement).value).toBe('Partial payment')
  })

  it('shows recent history section when history entries exist', () => {
    const entry = makeEntry()
    mockMutations({ history: [entry] })
    renderWithClient(<RecordEntryDrawer source={makeSource()} onClose={vi.fn()} />)
    expect(screen.getByText(/recent history/i)).toBeInTheDocument()
  })

  it('does not show history section when there are no entries', () => {
    mockMutations({ history: [] })
    renderWithClient(<RecordEntryDrawer source={makeSource()} onClose={vi.fn()} />)
    expect(screen.queryByText(/recent history/i)).not.toBeInTheDocument()
  })
})
