import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './features/auth/AuthContext'
import LoginPage from './features/auth/LoginPage'
import PrivateRoute from './features/auth/PrivateRoute'

// ── Placeholder dashboard — replaced in Week 6 ───────────────────────────────
function DashboardPage() {
  const { user, logout } = useAuth()
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-blue-900">FinancialLife</h1>
            <p className="text-sm text-gray-500">Welcome back, {user?.display_name}!</p>
          </div>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            Sign out
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {[
            { label: 'Transactions',     week: 3 },
            { label: 'Income Sources',   week: 4 },
            { label: 'Allocation Engine',week: 5 },
            { label: 'Monthly Report',   week: 6 },
          ].map(({ label, week }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="font-semibold text-gray-700">{label}</h2>
              <p className="text-sm text-gray-400 mt-1">Coming in Week {week}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Router ────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
