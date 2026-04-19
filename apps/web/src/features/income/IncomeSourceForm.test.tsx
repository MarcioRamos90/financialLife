import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import IncomeSourceForm from './IncomeSourceForm'
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
  name: 'Freelance',
  category: 'Other',
  default_amount: 2000,
  currency: 'BRL',
  recurrence_day: 0,
  is_joint: false,
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

function mockMutations() {
  const mutateCreate = vi.fn().mockResolvedValue({})
  const mutateUpdate = vi.fn().mockResolvedValue({})
  vi.spyOn(useIncomeSourcesModule, 'useCreateIncomeSource').mockReturnValue({ mutateAsync: mutateCreate, isPending: false } as any)
  vi.spyOn(useIncomeSourcesModule, 'useUpdateIncomeSource').mockReturnValue({ mutateAsync: mutateUpdate, isPending: false } as any)
  return { mutateCreate, mutateUpdate }
}

describe('IncomeSourceForm (create mode)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders with "New Income Source" title', () => {
    mockMutations()
    renderWithClient(<IncomeSourceForm onClose={vi.fn()} />)
    expect(screen.getByText('New Income Source')).toBeInTheDocument()
  })

  it('has the income-source-form testid', () => {
    mockMutations()
    renderWithClient(<IncomeSourceForm onClose={vi.fn()} />)
    expect(screen.getByTestId('income-source-form')).toBeInTheDocument()
  })

  it('renders Name, Category, Expected monthly amount fields', () => {
    mockMutations()
    renderWithClient(<IncomeSourceForm onClose={vi.fn()} />)
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Category')).toBeInTheDocument()
    expect(screen.getByLabelText(/expected monthly amount/i)).toBeInTheDocument()
  })

  it('renders the joint account checkbox', () => {
    mockMutations()
    renderWithClient(<IncomeSourceForm onClose={vi.fn()} />)
    expect(screen.getByLabelText(/goes to joint account/i)).toBeInTheDocument()
  })

  it('shows validation error when name is empty on submit', async () => {
    mockMutations()
    renderWithClient(<IncomeSourceForm onClose={vi.fn()} />)
    // Use fireEvent.submit on the form directly to bypass jsdom's HTML5 required-field
    // constraint validation, which blocks click-on-submit from reaching the React handler.
    fireEvent.submit(document.querySelector('form')!)
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    })
  })

  it('calls createMutation with the correct data on valid submit', async () => {
    const { mutateCreate } = mockMutations()
    const onClose = vi.fn()
    renderWithClient(<IncomeSourceForm onClose={onClose} />)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Consulting' } })
    fireEvent.change(screen.getByLabelText(/expected monthly amount/i), { target: { value: '3000' } })
    fireEvent.click(screen.getByTestId('btn-submit-source'))

    await waitFor(() => {
      expect(mutateCreate).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Consulting',
        default_amount: '3000',
      }))
    })
  })

  it('calls onClose after successful create', async () => {
    mockMutations()
    const onClose = vi.fn()
    renderWithClient(<IncomeSourceForm onClose={onClose} />)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Salary' } })
    fireEvent.click(screen.getByTestId('btn-submit-source'))

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('calls onClose when Cancel is clicked', () => {
    mockMutations()
    const onClose = vi.fn()
    renderWithClient(<IncomeSourceForm onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when × is clicked', () => {
    mockMutations()
    const onClose = vi.fn()
    renderWithClient(<IncomeSourceForm onClose={onClose} />)
    fireEvent.click(screen.getByText('×'))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('IncomeSourceForm (edit mode)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders with "Edit Income Source" title', () => {
    mockMutations()
    renderWithClient(<IncomeSourceForm source={makeSource()} onClose={vi.fn()} />)
    expect(screen.getByText('Edit Income Source')).toBeInTheDocument()
  })

  it('pre-fills the form with existing source values', () => {
    mockMutations()
    renderWithClient(<IncomeSourceForm source={makeSource({ name: 'Freelance', default_amount: 2000 })} onClose={vi.fn()} />)
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Freelance')
    expect((screen.getByLabelText(/expected monthly amount/i) as HTMLInputElement).value).toBe('2000')
  })

  it('shows the submit button as "Save changes"', () => {
    mockMutations()
    renderWithClient(<IncomeSourceForm source={makeSource()} onClose={vi.fn()} />)
    expect(screen.getByTestId('btn-submit-source').textContent).toBe('Save changes')
  })

  it('calls updateMutation with updated data on submit', async () => {
    const { mutateUpdate } = mockMutations()
    const onClose = vi.fn()
    renderWithClient(<IncomeSourceForm source={makeSource({ id: 'src-99' })} onClose={onClose} />)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Freelance Design' } })
    fireEvent.click(screen.getByTestId('btn-submit-source'))

    await waitFor(() => {
      expect(mutateUpdate).toHaveBeenCalledWith(expect.objectContaining({
        id: 'src-99',
        data: expect.objectContaining({ name: 'Freelance Design' }),
      }))
    })
  })
})
