import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LoginPage from './LoginPage'
import * as AuthContext from './AuthContext'

// Mock the react-router-dom useNavigate hook
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the login form correctly', () => {
    // Mock a neutral auth state
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ login: vi.fn() } as any)

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )

    expect(screen.getByText('FinancialLife')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@home.local')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('navigates to dashboard on successful login', async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ login: mockLogin } as any)

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )

    fireEvent.change(screen.getByPlaceholderText('you@home.local'), { target: { value: 'marcio@home.local' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('marcio@home.local', 'password')
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('shows an error message on failed login', async () => {
    const mockLogin = vi.fn().mockRejectedValue(new Error('Invalid credentials'))
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ login: mockLogin } as any)

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )

    fireEvent.change(screen.getByPlaceholderText('you@home.local'), { target: { value: 'wrong@home.local' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrongpass' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    // Ensure loading text appears
    expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password. Please try again.')).toBeInTheDocument()
    })
  })
})