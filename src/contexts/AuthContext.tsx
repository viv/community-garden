import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { User, AuthToken, LoginCredentials, RegisterData } from '@types/index'
import { authService } from '@services/authService'
import { storageService } from '@services/storageService'

interface AuthState {
  user: User | null
  token: AuthToken | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: AuthToken } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'CLEAR_ERROR' }

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
  updateUser: (user: User) => void
  clearError: () => void
  isTokenExpired: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null
      }
    
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      }
    
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      }
    
    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false
      }
    
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload
      }
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      }
    
    default:
      return state
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState)
  const queryClient = useQueryClient()

  // Check for existing authentication on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = await storageService.getToken()
        const user = await storageService.getUser()
        
        if (token && user && !isTokenExpired(token)) {
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: { user, token }
          })
        } else {
          // Clear invalid/expired data
          await storageService.clear()
          dispatch({ type: 'AUTH_FAILURE', payload: 'Session expired' })
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        dispatch({ type: 'AUTH_FAILURE', payload: 'Failed to initialize authentication' })
      }
    }

    initAuth()
  }, [])

  // Auto-refresh token before expiration
  useEffect(() => {
    if (!state.token || !state.isAuthenticated) return

    const tokenExpiration = new Date(state.token.expiresAt).getTime()
    const now = Date.now()
    const timeUntilExpiry = tokenExpiration - now
    const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 0) // 5 minutes before expiry

    if (refreshTime > 0) {
      const timeoutId = setTimeout(() => {
        refreshToken()
      }, refreshTime)

      return () => clearTimeout(timeoutId)
    }
  }, [state.token])

  const isTokenExpired = (token?: AuthToken) => {
    const currentToken = token || state.token
    if (!currentToken) return true
    
    const expirationTime = new Date(currentToken.expiresAt).getTime()
    const currentTime = Date.now()
    const bufferTime = 5 * 60 * 1000 // 5 minutes buffer
    
    return currentTime >= (expirationTime - bufferTime)
  }

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: authService.login,
    onMutate: () => {
      dispatch({ type: 'AUTH_START' })
    },
    onSuccess: async (data) => {
      await storageService.setToken(data.token)
      await storageService.setUser(data.user)
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user: data.user, token: data.token }
      })
      
      toast.success(`Welcome back, ${data.user.name}!`)
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Login failed'
      dispatch({ type: 'AUTH_FAILURE', payload: message })
      toast.error(message)
    }
  })

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: authService.register,
    onMutate: () => {
      dispatch({ type: 'AUTH_START' })
    },
    onSuccess: async (data) => {
      await storageService.setToken(data.token)
      await storageService.setUser(data.user)
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user: data.user, token: data.token }
      })
      
      toast.success(`Welcome to Garden Hub, ${data.user.name}!`)
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Registration failed'
      dispatch({ type: 'AUTH_FAILURE', payload: message })
      toast.error(message)
    }
  })

  // Refresh token mutation
  const refreshMutation = useMutation({
    mutationFn: () => authService.refreshToken(state.token!.refreshToken),
    onSuccess: async (data) => {
      await storageService.setToken(data.token)
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user: state.user!, token: data.token }
      })
    },
    onError: async (error: any) => {
      console.error('Token refresh failed:', error)
      await logout()
      toast.error('Session expired. Please log in again.')
    }
  })

  const login = async (credentials: LoginCredentials) => {
    await loginMutation.mutateAsync(credentials)
  }

  const register = async (data: RegisterData) => {
    await registerMutation.mutateAsync(data)
  }

  const logout = async () => {
    try {
      // Attempt to notify server of logout
      if (state.token) {
        await authService.logout(state.token.accessToken)
      }
    } catch (error) {
      console.warn('Server logout failed:', error)
    } finally {
      // Clear local storage and state regardless
      await storageService.clear()
      queryClient.clear()
      dispatch({ type: 'LOGOUT' })
      toast.success('Logged out successfully')
    }
  }

  const refreshToken = async () => {
    if (!state.token) return
    await refreshMutation.mutateAsync()
  }

  const updateUser = (user: User) => {
    dispatch({ type: 'UPDATE_USER', payload: user })
    storageService.setUser(user)
  }

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' })
  }

  const contextValue: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshToken,
    updateUser,
    clearError,
    isTokenExpired: () => isTokenExpired()
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}