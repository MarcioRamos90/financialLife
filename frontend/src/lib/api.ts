// Native fetch wrapper — no external HTTP library.
// Provides the same auto-refresh-on-401 behaviour that axios interceptors gave us.

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

// ─── In-memory access token (never stored in localStorage) ───────────────────
let accessToken: string | null = null

export const setAccessToken = (token: string | null) => { accessToken = token }
export const getAccessToken = () => accessToken

// ─── Token refresh state ──────────────────────────────────────────────────────
let isRefreshing = false
let refreshQueue: Array<(token: string | null) => void> = []

async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing) {
    // Wait for the in-progress refresh to complete
    return new Promise((resolve) => { refreshQueue.push(resolve) })
  }

  isRefreshing = true
  try {
    const res = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) throw new Error('refresh failed')
    const body = await res.json()
    const newToken: string = body.data.access_token
    setAccessToken(newToken)
    refreshQueue.forEach((cb) => cb(newToken))
    return newToken
  } catch {
    setAccessToken(null)
    refreshQueue.forEach((cb) => cb(null))
    return null
  } finally {
    refreshQueue = []
    isRefreshing = false
  }
}

// ─── Core request function ────────────────────────────────────────────────────

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

async function request<T>(path: string, options: RequestOptions = {}, retry = true): Promise<T> {
  const { body, headers: extraHeaders, ...rest } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string>),
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // Auto-refresh on 401 then retry once
  if (res.status === 401 && retry) {
    const newToken = await refreshAccessToken()
    if (!newToken) {
      window.location.href = '/login'
      throw new Error('Session expired')
    }
    return request<T>(path, options, false)
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? `Request failed: ${res.status}`)
  }

  // 204 No Content
  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

// ─── Convenience methods ──────────────────────────────────────────────────────

const api = {
  get:    <T>(path: string, opts?: RequestOptions)         => request<T>(path, { ...opts, method: 'GET' }),
  post:   <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'POST', body }),
  put:    <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'PUT', body }),
  patch:  <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T>(path: string, opts?: RequestOptions)         => request<T>(path, { ...opts, method: 'DELETE' }),
}

export default api
