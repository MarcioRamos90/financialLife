import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import type { Transaction, PaymentMethod, TransactionFilters, TransactionFormData } from './types'
import type { ImportResult } from '../../types/importexport'

const KEYS = {
  all:            ['transactions'] as const,
  list:           (f: TransactionFilters) => ['transactions', f] as const,
  paymentMethods: ['payment-methods'] as const,
}

type ApiResponse<T> = { data: T }

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useTransactions(filters: TransactionFilters = {}) {
  const params = new URLSearchParams()
  if (filters.start_date) params.set('start_date', filters.start_date)
  if (filters.end_date)   params.set('end_date',   filters.end_date)
  if (filters.type)       params.set('type',        filters.type)
  if (filters.category)   params.set('category',    filters.category)

  const query = params.toString() ? `?${params}` : ''

  return useQuery({
    queryKey: KEYS.list(filters),
    queryFn: () => api.get<ApiResponse<Transaction[]>>(`/transactions${query}`)
      .then(r => r.data),
  })
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: KEYS.paymentMethods,
    queryFn: () => api.get<ApiResponse<PaymentMethod[]>>('/transactions/payment-methods')
      .then(r => r.data),
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TransactionFormData) =>
      api.post<ApiResponse<Transaction>>('/transactions', {
        ...data,
        amount:            parseFloat(data.amount),
        to_account_id:     data.to_account_id     || null,
        payment_method_id: data.payment_method_id || null,
      }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TransactionFormData }) =>
      api.put<ApiResponse<Transaction>>(`/transactions/${id}`, {
        ...data,
        amount:            parseFloat(data.amount),
        to_account_id:     data.to_account_id     || null,
        payment_method_id: data.payment_method_id || null,
      }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/transactions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

// ─── Import / Export ──────────────────────────────────────────────────────────

export function useExportTransactions(filters: TransactionFilters = {}) {
  const download = async () => {
    const params = new URLSearchParams()
    if (filters.start_date) params.set('start_date', filters.start_date)
    if (filters.end_date)   params.set('end_date',   filters.end_date)
    if (filters.type)       params.set('type',        filters.type)
    if (filters.category)   params.set('category',    filters.category)

    const blob = await api.getBlob('/transactions/export', params)
    triggerDownload(blob, 'transactions.xlsx')
  }
  return { download }
}

export function useExportTransactionTemplate() {
  const download = async () => {
    const blob = await api.getBlob('/transactions/export/template')
    triggerDownload(blob, 'transactions-template.xlsx')
  }
  return { download }
}

export function useImportTransactions() {
  const qc = useQueryClient()
  return useMutation<ImportResult, Error, File>({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api.postForm<{ data: ImportResult }>('/transactions/import', form)
        .then(r => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
