import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import type { IncomeSource, IncomeEntry, IncomeSourceFormData, IncomeEntryFormData } from './types'
import type { ImportResult } from '../../types/importexport'

const KEYS = {
  all:     ['income-sources'] as const,
  list:    ['income-sources', 'list'] as const,
  history: (id: string) => ['income-sources', id, 'history'] as const,
}

type ApiResponse<T> = { data: T }

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useIncomeSources() {
  return useQuery({
    queryKey: KEYS.list,
    queryFn: () => api.get<ApiResponse<IncomeSource[]>>('/income-sources').then(r => r.data),
  })
}

export function useIncomeHistory(sourceId: string) {
  return useQuery({
    queryKey: KEYS.history(sourceId),
    queryFn: () => api.get<ApiResponse<IncomeEntry[]>>(`/income-sources/${sourceId}/history`).then(r => r.data),
    enabled: !!sourceId,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateIncomeSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: IncomeSourceFormData) =>
      api.post<ApiResponse<IncomeSource>>('/income-sources', {
        ...data,
        default_amount: parseFloat(data.default_amount) || 0,
        recurrence_day: parseInt(data.recurrence_day) || 0,
      }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useUpdateIncomeSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: IncomeSourceFormData }) =>
      api.put<ApiResponse<IncomeSource>>(`/income-sources/${id}`, {
        ...data,
        default_amount: parseFloat(data.default_amount) || 0,
        recurrence_day: parseInt(data.recurrence_day) || 0,
      }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useDeleteIncomeSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/income-sources/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

// ─── Import / Export ──────────────────────────────────────────────────────────

export function useExportIncomeSources() {
  const download = async () => {
    const blob = await api.getBlob('/income-sources/export')
    triggerIncomeDownload(blob, 'income-sources.xlsx')
  }
  return { download }
}

export function useExportIncomeSourceTemplate() {
  const download = async () => {
    const blob = await api.getBlob('/income-sources/export/template')
    triggerIncomeDownload(blob, 'income-sources-template.xlsx')
  }
  return { download }
}

export function useImportIncomeSources() {
  const qc = useQueryClient()
  return useMutation<ImportResult, Error, File>({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api.postForm<{ data: ImportResult }>('/income-sources/import', form)
        .then(r => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

function triggerIncomeDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function useRecordIncomeEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sourceId, data }: { sourceId: string; data: IncomeEntryFormData }) =>
      api.post<ApiResponse<IncomeEntry>>(`/income-sources/${sourceId}/entries`, {
        ...data,
        expected_amount: parseFloat(data.expected_amount) || 0,
        received_amount: parseFloat(data.received_amount) || 0,
        received_on: data.received_on || null,
      }).then(r => r.data),
    onSuccess: (_, { sourceId }) => {
      qc.invalidateQueries({ queryKey: KEYS.history(sourceId) })
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}
