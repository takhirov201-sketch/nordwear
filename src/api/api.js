import axios from 'axios'

// Vercel serves the API from the same origin under /api. For local work against
// the legacy server.js set VITE_API_BASE_URL=http://localhost:4000
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'

const TOKEN_KEY = 'nordwear_token'

export function getToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function setToken(token) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token)
    else window.localStorage.removeItem(TOKEN_KEY)
  } catch {
    // private mode / blocked storage — the session simply won't survive reload
  }
}

export function clearToken() {
  setToken('')
}

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/* Translates transport failures into the stable keys the UI already knows, so
   the user sees a localized message instead of a raw axios string. */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.messageKey = 'auth.networkError'
    } else if (error.response.status === 401) {
      clearToken()
      error.messageKey = 'auth.sessionExpired'
    } else if (typeof error.response.data?.error === 'string') {
      error.messageKey = error.response.data.error
    }
    return Promise.reject(error)
  },
)

export default api
