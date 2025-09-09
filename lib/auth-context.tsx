'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { apiClient, User } from './api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token')
      
      if (token) {
        apiClient.setToken(token)
        const response = await apiClient.getMe()
        
        if (response.data) {
          setUser(response.data.user)
        } else {
          // Token is invalid, clear it
          localStorage.removeItem('auth_token')
          apiClient.clearToken()
        }
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const response = await apiClient.login(email, password)
      
      if (response.data) {
        const { user, token } = response.data
        apiClient.setToken(token)
        setUser(user)
        setIsLoading(false)
        return { success: true }
      } else {
        setIsLoading(false)
        return { success: false, error: response.error || 'Login failed' }
      }
    } catch (error) {
      setIsLoading(false)
      return { success: false, error: 'Network error' }
    }
  }

  const logout = () => {
    apiClient.clearToken()
    setUser(null)
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}