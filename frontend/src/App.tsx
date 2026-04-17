import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// ── Placeholder pages (replace week by week) ─────────────────────────────────
function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-md p-10 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-blue-900 mb-1">FinancialLife</h1>
        <p className="text-sm text-gray-500 mb-8">Household Financial Controller</p>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              placeholder="you@home.local"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-800 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition-colors"
          >
            Sign in
          </button>
        </form>

        {/* Week 1 health check indicator */}
        <HealthCheck />
      </div>
    </div>
  )
}

function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold text-blue-900">Dashboard</h1>
      <p className="text-gray-500 mt-2">Coming in Week 6 — allocation rings, income bar, expense pie.</p>
    </div>
  )
}

// ── Health check widget — confirms API is reachable ───────────────────────────
function HealthCheck() {
  const [status, setStatus] = React.useState<'checking' | 'ok' | 'error'>('checking')

  React.useEffect(() => {
    fetch('/health')
      .then((r) => r.ok ? setStatus('ok') : setStatus('error'))
      .catch(() => setStatus('error'))
  }, [])

  const colours = {
    checking: 'bg-yellow-100 text-yellow-700',
    ok:       'bg-green-100 text-green-700',
    error:    'bg-red-100 text-red-700',
  }
  const labels = { checking: 'Connecting to API…', ok: 'API reachable ✓', error: 'API unreachable — is Docker running?' }

  return (
    <div className={`mt-6 rounded-lg px-3 py-2 text-xs font-medium ${colours[status]}`}>
      {labels[status]}
    </div>
  )
}

// ── React import needed for HealthCheck ───────────────────────────────────────
import React from 'react'

// ── Router ────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"     element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        {/* Default: redirect to login (auth guard added in Week 2) */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
