import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import type { Account, AccountBalance, AccountFormData } from './types'

type ApiResponse<T> = { data: T }

export const ACCOUNT_KEYS = {
  all:     ['accounts'] as const,
  balance: (id: string) => ['accounts', id, 'balance'] as const,
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useAccounts() {
  return useQuery({
    queryKey: ACCOUNT_KEYS.all,
    queryFn:  () => api.get<ApiResponse<Account[]>>('/accounts').then(r => r.data),
  })
}

export function useAccountBalance(id: string, filters: { start_date?: string; end_date?: string } = {}) {
  const params = new URLSearchParams()
  if (filters.start_date) params.set('start_date', filters.start_date)
  if (filters.end_date)   params.set('end_date',   filters.end_date)
  const query = params.toString() ? `?${params}` : ''

  return useQuery({
    queryKey: [...ACCOUNT_KEYS.balance(id), filters] as const,
    queryFn:  () => api.get<ApiResponse<AccountBalance>>(`/accounts/${id}/balance${query}`).then(r => r.data),
    enabled:  !!id,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AccountFormData) =>
      api.post<ApiResponse<Account>>('/accounts', {
        ...data,
        initial_balance: parseFloat(data.initial_balance) || 0,
      }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ACCOUNT_KEYS.all }),
  })
}

export function useUpdateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AccountFormData }) =>
      api.put<ApiResponse<Account>>(`/accounts/${id}`, {
        ...data,
        initial_balance: parseFloat(data.initial_balance) || 0,
      }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ACCOUNT_KEYS.all }),
  })
}

export function useArchiveAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/accounts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ACCOUNT_KEYS.all }),
  })
}
