import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ImportExportToolbar from './ImportExportToolbar'
import type { ImportResult } from '../types/importexport'

const cleanResult: ImportResult = { imported: 3, skipped: 0, errors: [] }
const errorResult: ImportResult = {
  imported: 1,
  skipped: 0,
  errors: [{ row: 2, reason: 'bad date' }],
}

function makeFile(name = 'test.xlsx') {
  return new File(['dummy'], name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

describe('ImportExportToolbar', () => {
  const defaultProps = {
    onExport: vi.fn(),
    onImport: vi.fn<(file: File) => Promise<ImportResult>>().mockResolvedValue(cleanResult),
    onDownloadTemplate: vi.fn(),
  }

  beforeEach(() => { vi.clearAllMocks() })

  it('renders Export button, Import button, and template link', () => {
    render(<ImportExportToolbar {...defaultProps} />)
    expect(screen.getByTestId('btn-export')).toBeInTheDocument()
    expect(screen.getByTestId('btn-import')).toBeInTheDocument()
    expect(screen.getByTestId('link-download-template')).toBeInTheDocument()
  })

  it('calls onExport when Export button is clicked', () => {
    render(<ImportExportToolbar {...defaultProps} />)
    fireEvent.click(screen.getByTestId('btn-export'))
    expect(defaultProps.onExport).toHaveBeenCalledOnce()
  })

  it('calls onDownloadTemplate when template link is clicked', () => {
    render(<ImportExportToolbar {...defaultProps} />)
    fireEvent.click(screen.getByTestId('link-download-template'))
    expect(defaultProps.onDownloadTemplate).toHaveBeenCalledOnce()
  })

  it('calls onImport with the selected File when a file is chosen', async () => {
    render(<ImportExportToolbar {...defaultProps} />)
    const file = makeFile()
    const input = screen.getByTestId('input-import-file') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => expect(defaultProps.onImport).toHaveBeenCalledWith(file))
  })

  it('shows spinner on Export button when isExporting=true', () => {
    render(<ImportExportToolbar {...defaultProps} isExporting />)
    expect(screen.getByTestId('export-spinner')).toBeInTheDocument()
    expect(screen.getByTestId('btn-export')).toBeDisabled()
  })

  it('shows spinner on Import button when isImporting=true', () => {
    render(<ImportExportToolbar {...defaultProps} isImporting />)
    expect(screen.getByTestId('import-spinner')).toBeInTheDocument()
    expect(screen.getByTestId('btn-import')).toBeDisabled()
  })

  it('shows the result modal after a successful import', async () => {
    render(<ImportExportToolbar {...defaultProps} />)
    const input = screen.getByTestId('input-import-file')
    fireEvent.change(input, { target: { files: [makeFile()] } })
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    expect(screen.getByText(/3 records imported/i)).toBeInTheDocument()
  })

  it('shows error table in modal when import result has errors', async () => {
    const props = { ...defaultProps, onImport: vi.fn<(file: File) => Promise<ImportResult>>().mockResolvedValue(errorResult) }
    render(<ImportExportToolbar {...props} />)
    fireEvent.change(screen.getByTestId('input-import-file'), { target: { files: [makeFile()] } })
    await waitFor(() => expect(screen.getByTestId('error-table')).toBeInTheDocument())
  })

  it('closes the modal when Close is clicked', async () => {
    render(<ImportExportToolbar {...defaultProps} />)
    fireEvent.change(screen.getByTestId('input-import-file'), { target: { files: [makeFile()] } })
    await waitFor(() => screen.getByRole('dialog'))
    fireEvent.click(screen.getByTestId('btn-close-modal'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
