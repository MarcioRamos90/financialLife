import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import React from 'react'
import api from '../../lib/api'
import {
  useAccounts,
  useAccountBalance,
  useCreateAccount,
  useUpdateAccount,
  useArchiveAccount,
} from './useAccounts'
import type { Account, AccountBalance } from './types'

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

const mockAccount: Account = {
  id: 'acc-1',
  household_id: 'hh-1',
  name: 'Cash',
  type: 'cash',
  is_joint: true,
  currency: 'BRL',
  color: '#3B82F6',
  icon: '',
  initial_balance: 0,
  archived_at: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

const mockBalance: AccountBalance = { account_id: 'acc-1', balance: 350 }

describe('useAccounts', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('fetches and returns accounts list', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [mockAccount] })
    const qc = makeQC()
    const { result } = renderHook(() => useAccounts(), { wrapper: makeWrapper(qc) })

    await waitFor(() => expect(result.current.data).toEqual([mockAccount]))
    expect(api.get).toHaveBeenCalledWith('/accounts')
  })
})

describe('useAccountBalance', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('fetches balance for given account id', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: mockBalance })
    const qc = makeQC()
    const { result } = renderHook(() => useAccountBalance('acc-1'), { wrapper: makeWrapper(qc) })

    await waitFor(() => expect(result.current.data).toEqual(mockBalance))
    expect(api.get).toHaveBeenCalledWith('/accounts/acc-1/balance')
  })

  it('does not fetch when id is empty', async () => {
    const spy = vi.spyOn(api, 'get').mockResolvedValue({ data: mockBalance })
    const qc = makeQC()
    renderHook(() => useAccountBalance(''), { wrapper: makeWrapper(qc) })

    // Give it a tick to potentially fire
    await new Promise(r => setTimeout(r, 50))
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('useCreateAccount', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('calls POST /accounts with parsed initial_balance', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: mockAccount })
    const qc = makeQC()
    const { result } = renderHook(() => useCreateAccount(), { wrapper: makeWrapper(qc) })

    await act(async () => {
      await result.current.mutateAsync({
        name: 'Cash', type: 'cash', is_joint: true,
        currency: 'BRL', color: '#3B82F6', icon: '', initial_balance: '500',
      })
    })

    expect(post).toHaveBeenCalledWith('/accounts', expect.objectContaining({
      name:            'Cash',
      initial_balance: 500,
    }))
  })

  it('invalidates accounts query on success', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({ data: mockAccount })
    const qc = makeQC()
    const invalidate = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useCreateAccount(), { wrapper: makeWrapper(qc) })

    await act(async () => {
      await result.current.mutateAsync({
        name: 'Cash', type: 'cash', is_joint: true,
        currency: 'BRL', color: '#3B82F6', icon: '', initial_balance: '0',
      })
    })

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['accounts'] })
    })
  })
})

describe('useUpdateAccount', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('calls PUT /accounts/:id', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: mockAccount })
    const qc = makeQC()
    const { result } = renderHook(() => useUpdateAccount(), { wrapper: makeWrapper(qc) })

    await act(async () => {
      await result.current.mutateAsync({
        id: 'acc-1',
        data: { name: 'Wallet', type: 'cash', is_joint: false, currency: 'BRL', color: '', icon: '', initial_balance: '100' },
      })
    })

    expect(put).toHaveBeenCalledWith('/accounts/acc-1', expect.objectContaining({ name: 'Wallet' }))
  })
})

describe('useArchiveAccount', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('calls DELETE /accounts/:id', async () => {
    const del = vi.spyOn(api, 'delete').mockResolvedValue(undefined)
    const qc = makeQC()
    const { result } = renderHook(() => useArchiveAccount(), { wrapper: makeWrapper(qc) })

    await act(async () => { await result.current.mutateAsync('acc-1') })

    expect(del).toHaveBeenCalledWith('/accounts/acc-1')
  })

  it('invalidates accounts query on success', async () => {
    vi.spyOn(api, 'delete').mockResolvedValue(undefined)
    const qc = makeQC()
    const invalidate = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useArchiveAccount(), { wrapper: makeWrapper(qc) })

    await act(async () => { await result.current.mutateAsync('acc-1') })

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['accounts'] })
    })
  })
})
