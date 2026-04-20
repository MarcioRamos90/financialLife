import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ImportResultModal from './ImportResultModal'
import type { ImportResult } from '../types/importexport'

const clean: ImportResult = { imported: 3, skipped: 0, errors: [] }
const withErrors: ImportResult = {
  imported: 1,
  skipped: 1,
  errors: [
    { row: 2, reason: 'amount must be greater than zero' },
    { row: 4, reason: 'invalid type "other"' },
  ],
}

describe('ImportResultModal', () => {
  it('shows imported count in summary', () => {
    render(<ImportResultModal result={clean} onClose={vi.fn()} />)
    expect(screen.getByText(/3 records imported/i)).toBeInTheDocument()
  })

  it('shows singular for one record', () => {
    render(<ImportResultModal result={{ imported: 1, skipped: 0, errors: [] }} onClose={vi.fn()} />)
    expect(screen.getByText(/1 record imported/i)).toBeInTheDocument()
  })

  it('shows skipped count when > 0', () => {
    render(<ImportResultModal result={withErrors} onClose={vi.fn()} />)
    expect(screen.getByText(/1 skipped/i)).toBeInTheDocument()
  })

  it('does not show skipped when 0', () => {
    render(<ImportResultModal result={clean} onClose={vi.fn()} />)
    expect(screen.queryByText(/skipped/i)).not.toBeInTheDocument()
  })

  it('shows error table when errors exist', () => {
    render(<ImportResultModal result={withErrors} onClose={vi.fn()} />)
    expect(screen.getByTestId('error-table')).toBeInTheDocument()
  })

  it('renders one table row per error', () => {
    render(<ImportResultModal result={withErrors} onClose={vi.fn()} />)
    const table = screen.getByTestId('error-table')
    const bodyRows = table.querySelectorAll('tbody tr')
    expect(bodyRows).toHaveLength(2)
  })

  it('shows row number and reason in each error row', () => {
    render(<ImportResultModal result={withErrors} onClose={vi.fn()} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('amount must be greater than zero')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('hides error table when no errors', () => {
    render(<ImportResultModal result={clean} onClose={vi.fn()} />)
    expect(screen.queryByTestId('error-table')).not.toBeInTheDocument()
  })

  it('calls onClose when Close button is clicked', () => {
    const onClose = vi.fn()
    render(<ImportResultModal result={clean} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('btn-close-modal'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not crash when errors is null (legacy API response)', () => {
    // Go nil slice marshals to JSON null; the modal must handle it gracefully
    const nullErrors = { imported: 0, skipped: 0, errors: null } as unknown as ImportResult
    expect(() => render(<ImportResultModal result={nullErrors} onClose={vi.fn()} />)).not.toThrow()
    expect(screen.queryByTestId('error-table')).not.toBeInTheDocument()
  })
})
