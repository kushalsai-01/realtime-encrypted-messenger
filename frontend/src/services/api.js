import axios from 'axios'

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000'

export const api = axios.create({ baseURL: `${BASE_URL}/api` })

let isRefreshing = false
let refreshQueue = []

function processQueue(token, error) {
  refreshQueue.forEach((cb) => (error ? cb.reject(error) : cb.resolve(token)))
  refreshQueue = []
}

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('cl_access_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status !== 401 || original._retry) return Promise.reject(err)
    if (original.url?.includes('/auth/refresh') || original.url?.includes('/auth/login')) {
      return Promise.reject(err)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(api(original))
          },
          reject
        })
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      const refreshToken = localStorage.getItem('cl_refresh_token')
      if (!refreshToken) throw new Error('No refresh token')
      const { data } = await api.post('/auth/refresh', { refreshToken })
      const { accessToken, refreshToken: newRefresh } = data.data
      localStorage.setItem('cl_access_token', accessToken)
      if (newRefresh) localStorage.setItem('cl_refresh_token', newRefresh)
      processQueue(accessToken, null)
      original.headers.Authorization = `Bearer ${accessToken}`
      return api(original)
    } catch (e) {
      processQueue(null, e)
      localStorage.removeItem('cl_access_token')
      localStorage.removeItem('cl_refresh_token')
      localStorage.removeItem('cl_user')
      window.location.href = '/login'
      return Promise.reject(e)
    } finally {
      isRefreshing = false
    }
  }
)
