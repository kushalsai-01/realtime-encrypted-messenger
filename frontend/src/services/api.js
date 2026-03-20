import axios from 'axios'

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000'

export const api = axios.create({
  baseURL: `${BASE_URL}/api`
})
