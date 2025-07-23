import axios, { AxiosResponse } from 'axios'
import { 
  User, 
  AuthToken, 
  LoginCredentials, 
  RegisterData, 
  PasswordResetRequest, 
  PasswordReset,
  ApiResponse 
} from '@types/index'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Create axios instance with default config
const authClient = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for auth token
authClient.interceptors.request.use(
  (config) => {
    // Token will be added by the auth context when needed
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
authClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle specific auth errors
    if (error.response?.status === 401) {
      // Token expired or invalid - will be handled by auth context
      window.dispatchEvent(new CustomEvent('auth-error', { 
        detail: { type: 'UNAUTHORIZED', message: error.response.data?.message } 
      }))
    }
    
    return Promise.reject(error)
  }
)

export interface AuthResponse {
  user: User
  token: AuthToken
}

export const authService = {
  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response: AxiosResponse<ApiResponse<AuthResponse>> = await authClient.post('/login', {
      email: credentials.email,
      password: credentials.password,
      remember: credentials.rememberMe || false
    })
    
    return response.data.data
  },

  // Register new user
  async register(data: RegisterData): Promise<AuthResponse> {
    const response: AxiosResponse<ApiResponse<AuthResponse>> = await authClient.post('/register', {
      name: data.name,
      email: data.email,
      password: data.password,
      confirmPassword: data.confirmPassword,
      agreeToTerms: data.agreeToTerms
    })
    
    return response.data.data
  },

  // Refresh authentication token
  async refreshToken(refreshToken: string): Promise<{ token: AuthToken }> {
    const response: AxiosResponse<ApiResponse<{ token: AuthToken }>> = await authClient.post('/refresh', {
      refreshToken
    })
    
    return response.data.data
  },

  // Logout user
  async logout(accessToken: string): Promise<void> {
    await authClient.post('/logout', {}, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })
  },

  // Request password reset
  async requestPasswordReset(data: PasswordResetRequest): Promise<void> {
    await authClient.post('/forgot-password', {
      email: data.email
    })
  },

  // Reset password with token
  async resetPassword(data: PasswordReset): Promise<void> {
    await authClient.post('/reset-password', {
      token: data.token,
      password: data.password,
      confirmPassword: data.confirmPassword
    })
  },

  // Verify email address
  async verifyEmail(token: string): Promise<void> {
    await authClient.post('/verify-email', {
      token
    })
  },

  // Resend email verification
  async resendVerification(email: string): Promise<void> {
    await authClient.post('/resend-verification', {
      email
    })
  },

  // Get current user profile
  async getProfile(accessToken: string): Promise<User> {
    const response: AxiosResponse<ApiResponse<User>> = await authClient.get('/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })
    
    return response.data.data
  },

  // Update user profile
  async updateProfile(accessToken: string, updates: Partial<User>): Promise<User> {
    const response: AxiosResponse<ApiResponse<User>> = await authClient.put('/profile', updates, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })
    
    return response.data.data
  },

  // Change password
  async changePassword(accessToken: string, data: {
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }): Promise<void> {
    await authClient.post('/change-password', data, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })
  },

  // Delete user account
  async deleteAccount(accessToken: string, password: string): Promise<void> {
    await authClient.delete('/account', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      data: {
        password
      }
    })
  }
}