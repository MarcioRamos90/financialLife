import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { AuthProvider, useAuth } from './features/auth/AuthContext'
import LoginPage from './features/auth/LoginPage'
import PrivateRoute from './features/auth/PrivateRoute'
import TransactionList from './features/transactions/TransactionList'

// ─── Shared layout with nav ───────────────────────────────────────────────────
function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-blue-900 font-bold text-lg">FinancialLife</span>
          <NavLink
            to="/transactions"
            className={({ isActive }) =>
              `text-sm ${isActive ? 'text-blue-800 font-medium' : 'text-gray-500 hover:text-gray-800'}`
            }
          >Transactions</NavLink>
          {/* More nav links added in future weeks */}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{user?.display_name}</span>
          <button
            onClick={logout}
            className="text-sm text-gray-400 hover:text-red-600 transition-colors"
          >Sign out</button>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  )
}

// ─── Placeholder dashboard ────────────────────────────────────────────────────
function DashboardPage() {
  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-blue-900 mb-2">Dashboard</h1>
      <p className="text-gray-500 mb-6">Coming in Week 6 — income/expense charts and allocation rings.</p>
      <div className="grid grid-cols-1 gap-3">
        {[
          { label: 'Income Sources',    week: 4, path: '/income' },
          { label: 'Allocation Engine', week: 5, path: '/allocations' },
          { label: 'Monthly Report',    week: 6, path: '/reports' },
        ].map(({ label, week }) => (
          <div key={label} className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-gray-700">{label}</h2>
            <p className="text-sm text-gray-400 mt-1">Coming in Week {week}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Router ───────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes share the Layout */}
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <Layout>
                  <Routes>
                    <Route path="/dashboard"    element={<DashboardPage />} />
                    <Route path="/transactions" element={<TransactionList />} />
                    <Route path="*"             element={<Navigate to="/transactions" replace />} />
                  </Routes>
                </Layout>
              </PrivateRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
