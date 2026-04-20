import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import React from 'react'
import api from '../../lib/api'
import {
  useExportTransactions,
  useExportTransactionTemplate,
  useImportTransactions,
} from './useTransactions'
import type { ImportResult } from '../../types/importexport'

// jsdom does not implement URL.createObjectURL / revokeObjectURL
URL.createObjectURL = vi.fn(() => 'blob:mock')
URL.revokeObjectURL = vi.fn()

// Suppress anchor .click() in jsdom
HTMLAnchorElement.prototype.click = vi.fn()

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children)
  }
}

function makeQC() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

const mockImportResult: ImportResult = { imported: 2, skipped: 0, errors: [] }

describe('useExportTransactions', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('calls api.getBlob with the correct path', async () => {
    const getBlob = vi.spyOn(api, 'getBlob').mockResolvedValue(new Blob())
    const { result } = renderHook(() => useExportTransactions())
    await act(async () => { await result.current.download() })
    expect(getBlob).toHaveBeenCalledWith('/transactions/export', expect.any(URLSearchParams))
  })

  it('forwards active filters as query params', async () => {
    const getBlob = vi.spyOn(api, 'getBlob').mockResolvedValue(new Blob())
    const { result } = renderHook(() =>
      useExportTransactions({ type: 'income', start_date: '2025-01-01', category: 'Food' })
    )
    await act(async () => { await result.current.download() })

    const params: URLSearchParams = getBlob.mock.calls[0][1] as URLSearchParams
    expect(params.get('type')).toBe('income')
    expect(params.get('start_date')).toBe('2025-01-01')
    expect(params.get('category')).toBe('Food')
  })

  it('does not include empty filter keys in params', async () => {
    const getBlob = vi.spyOn(api, 'getBlob').mockResolvedValue(new Blob())
    const { result } = renderHook(() => useExportTransactions({ type: '' }))
    await act(async () => { await result.current.download() })

    const params: URLSearchParams = getBlob.mock.calls[0][1] as URLSearchParams
    expect(params.has('type')).toBe(false)
  })

  it('triggers a file download with the correct filename', async () => {
    vi.spyOn(api, 'getBlob').mockResolvedValue(new Blob())
    const createElement = vi.spyOn(document, 'createElement')
    const { result } = renderHook(() => useExportTransactions())
    await act(async () => { await result.current.download() })

    const anchor = createElement.mock.results.find(r => r.value instanceof HTMLAnchorElement)?.value as HTMLAnchorElement
    expect(anchor?.download).toBe('transactions.xlsx')
  })
})

describe('useExportTransactionTemplate', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('calls api.getBlob on the template endpoint', async () => {
    const getBlob = vi.spyOn(api, 'getBlob').mockResolvedValue(new Blob())
    const { result } = renderHook(() => useExportTransactionTemplate())
    await act(async () => { await result.current.download() })
    expect(getBlob).toHaveBeenCalledWith('/transactions/export/template')
  })

  it('triggers a download named transactions-template.xlsx', async () => {
    vi.spyOn(api, 'getBlob').mockResolvedValue(new Blob())
    const createElement = vi.spyOn(document, 'createElement')
    const { result } = renderHook(() => useExportTransactionTemplate())
    await act(async () => { await result.current.download() })

    const anchor = createElement.mock.results.find(r => r.value instanceof HTMLAnchorElement)?.value as HTMLAnchorElement
    expect(anchor?.download).toBe('transactions-template.xlsx')
  })
})

describe('useImportTransactions', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('posts to /transactions/import with a FormData body containing the file', async () => {
    const postForm = vi.spyOn(api, 'postForm').mockResolvedValue({ data: mockImportResult })
    const qc = makeQC()
    const { result } = renderHook(() => useImportTransactions(), { wrapper: makeWrapper(qc) })

    const file = new File(['data'], 'import.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    await act(async () => { await result.current.mutateAsync(file) })

    expect(postForm).toHaveBeenCalledWith('/transactions/import', expect.any(FormData))
    const form: FormData = (postForm.mock.calls[0] as [string, FormData])[1]
    expect(form.get('file')).toBe(file)
  })

  it('returns the ImportResult unwrapped from the data envelope', async () => {
    vi.spyOn(api, 'postForm').mockResolvedValue({ data: mockImportResult })
    const qc = makeQC()
    const { result } = renderHook(() => useImportTransactions(), { wrapper: makeWrapper(qc) })

    const file = new File(['data'], 'import.xlsx')
    let mutationResult: ImportResult | undefined
    await act(async () => {
      mutationResult = await result.current.mutateAsync(file)
    })

    expect(mutationResult).toEqual(mockImportResult)
  })

  it('invalidates the transactions query on success', async () => {
    vi.spyOn(api, 'postForm').mockResolvedValue({ data: mockImportResult })
    const qc = makeQC()
    const invalidate = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useImportTransactions(), { wrapper: makeWrapper(qc) })

    const file = new File(['data'], 'import.xlsx')
    await act(async () => { await result.current.mutateAsync(file) })

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['transactions'] })
    })
  })

  it('throws when the API returns an error', async () => {
    vi.spyOn(api, 'postForm').mockRejectedValue(new Error('sheet named "Transactions" not found'))
    const qc = makeQC()
    const { result } = renderHook(() => useImportTransactions(), { wrapper: makeWrapper(qc) })

    const file = new File(['data'], 'wrong-sheet.xlsx')
    await expect(
      act(async () => { await result.current.mutateAsync(file) })
    ).rejects.toThrow('sheet named "Transactions" not found')
  })
})
