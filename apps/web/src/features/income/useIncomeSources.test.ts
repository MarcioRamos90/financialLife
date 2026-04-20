import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import React from 'react'
import api from '../../lib/api'
import {
  useExportIncomeSources,
  useExportIncomeSourceTemplate,
  useImportIncomeSources,
} from './useIncomeSources'
import type { ImportResult } from '../../types/importexport'

URL.createObjectURL = vi.fn(() => 'blob:mock')
URL.revokeObjectURL = vi.fn()
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

const mockImportResult: ImportResult = { imported: 2, skipped: 1, errors: [] }

describe('useExportIncomeSources', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('calls api.getBlob on the income-sources export endpoint', async () => {
    const getBlob = vi.spyOn(api, 'getBlob').mockResolvedValue(new Blob())
    const { result } = renderHook(() => useExportIncomeSources())
    await act(async () => { await result.current.download() })
    expect(getBlob).toHaveBeenCalledWith('/income-sources/export')
  })

  it('triggers a download named income-sources.xlsx', async () => {
    vi.spyOn(api, 'getBlob').mockResolvedValue(new Blob())
    const createElement = vi.spyOn(document, 'createElement')
    const { result } = renderHook(() => useExportIncomeSources())
    await act(async () => { await result.current.download() })

    const anchor = createElement.mock.results.find(r => r.value instanceof HTMLAnchorElement)?.value as HTMLAnchorElement
    expect(anchor?.download).toBe('income-sources.xlsx')
  })
})

describe('useExportIncomeSourceTemplate', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('calls api.getBlob on the income-sources template endpoint', async () => {
    const getBlob = vi.spyOn(api, 'getBlob').mockResolvedValue(new Blob())
    const { result } = renderHook(() => useExportIncomeSourceTemplate())
    await act(async () => { await result.current.download() })
    expect(getBlob).toHaveBeenCalledWith('/income-sources/export/template')
  })

  it('triggers a download named income-sources-template.xlsx', async () => {
    vi.spyOn(api, 'getBlob').mockResolvedValue(new Blob())
    const createElement = vi.spyOn(document, 'createElement')
    const { result } = renderHook(() => useExportIncomeSourceTemplate())
    await act(async () => { await result.current.download() })

    const anchor = createElement.mock.results.find(r => r.value instanceof HTMLAnchorElement)?.value as HTMLAnchorElement
    expect(anchor?.download).toBe('income-sources-template.xlsx')
  })
})

describe('useImportIncomeSources', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('posts to /income-sources/import with a FormData body containing the file', async () => {
    const postForm = vi.spyOn(api, 'postForm').mockResolvedValue({ data: mockImportResult })
    const qc = makeQC()
    const { result } = renderHook(() => useImportIncomeSources(), { wrapper: makeWrapper(qc) })

    const file = new File(['data'], 'import.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    await act(async () => { await result.current.mutateAsync(file) })

    expect(postForm).toHaveBeenCalledWith('/income-sources/import', expect.any(FormData))
    const form: FormData = (postForm.mock.calls[0] as [string, FormData])[1]
    expect(form.get('file')).toBe(file)
  })

  it('returns the ImportResult unwrapped from the data envelope', async () => {
    vi.spyOn(api, 'postForm').mockResolvedValue({ data: mockImportResult })
    const qc = makeQC()
    const { result } = renderHook(() => useImportIncomeSources(), { wrapper: makeWrapper(qc) })

    const file = new File(['data'], 'import.xlsx')
    let mutationResult: ImportResult | undefined
    await act(async () => {
      mutationResult = await result.current.mutateAsync(file)
    })

    expect(mutationResult).toEqual(mockImportResult)
    expect(mutationResult?.skipped).toBe(1)
  })

  it('invalidates the income-sources query on success', async () => {
    vi.spyOn(api, 'postForm').mockResolvedValue({ data: mockImportResult })
    const qc = makeQC()
    const invalidate = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useImportIncomeSources(), { wrapper: makeWrapper(qc) })

    const file = new File(['data'], 'import.xlsx')
    await act(async () => { await result.current.mutateAsync(file) })

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['income-sources'] })
    })
  })

  it('throws when the API returns an error', async () => {
    vi.spyOn(api, 'postForm').mockRejectedValue(new Error('sheet named "Income Sources" not found'))
    const qc = makeQC()
    const { result } = renderHook(() => useImportIncomeSources(), { wrapper: makeWrapper(qc) })

    const file = new File(['data'], 'wrong-sheet.xlsx')
    await expect(
      act(async () => { await result.current.mutateAsync(file) })
    ).rejects.toThrow('sheet named "Income Sources" not found')
  })
})
