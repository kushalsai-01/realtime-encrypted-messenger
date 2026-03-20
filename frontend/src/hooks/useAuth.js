import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api.js'

const ACCESS_KEY = 'cl_access_token'
const REFRESH_KEY = 'cl_refresh_token'
const USER_KEY = 'cl_user'

export function getAccessToken() { return localStorage.getItem(ACCESS_KEY) }
export function getRefreshToken() { return localStorage.getItem(REFRESH_KEY) }
export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)) }
  catch { return null }
}

export function setTokens(access, refresh) {
  localStorage.setItem(ACCESS_KEY, access)
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_KEY)
}

function setStoredUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function useAuth() {
  const [user, setUser] = useState(() => getStoredUser())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const login = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      const { user: u, tokens } = data.data
      setTokens(tokens.accessToken, tokens.refreshToken)
      setStoredUser(u)
      setUser(u)
      return u
    } catch (e) {
      setError(e.response?.data?.error || 'Login failed')
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (email, password, displayName) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post('/auth/register', { email, password, displayName })
      const { user: u, tokens } = data.data
      setTokens(tokens.accessToken, tokens.refreshToken)
      setStoredUser(u)
      setUser(u)
      return u
    } catch (e) {
      setError(e.response?.data?.error || 'Registration failed')
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', { refreshToken: getRefreshToken() })
    } catch {}
    clearTokens()
    setUser(null)
  }, [])

  return { user, loading, error, login, register, logout }
}
