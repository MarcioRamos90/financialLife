import { createContext, useContext, useEffect, useState } from 'react'
import api, { setAccessToken } from '../../lib/api'
import type { AuthContextValue, UserProfile } from './types'

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On mount: try to restore the session via the refresh cookie
  useEffect(() => {
    fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('no session')
        return res.json()
      })
      .then((body) => {
        setAccessToken(body.data.access_token)
        return api.get<{ data: UserProfile }>('/auth/me')
      })
      .then((body) => setUser(body.data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const body = await api.post<{ data: { access_token: string; user: UserProfile } }>(
      '/auth/login',
      { email, password }
    )
    setAccessToken(body.data.access_token)
    setUser(body.data.user)
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      setAccessToken(null)
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
