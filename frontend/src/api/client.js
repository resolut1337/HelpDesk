// Base API URL
const BASE_URL = 'http://localhost:8000/api'

const STORAGE_KEYS = {
  access: 'hd_access',
  refresh: 'hd_refresh',
}

// ── Token helpers ────────────────────────────────────────────────────────────

export function getAccessToken() {
  return localStorage.getItem(STORAGE_KEYS.access)
}

export function getRefreshToken() {
  return localStorage.getItem(STORAGE_KEYS.refresh)
}

export function saveTokens({ access, refresh }) {
  localStorage.setItem(STORAGE_KEYS.access, access)
  if (refresh) localStorage.setItem(STORAGE_KEYS.refresh, refresh)
}

export function clearTokens() {
  localStorage.removeItem(STORAGE_KEYS.access)
  localStorage.removeItem(STORAGE_KEYS.refresh)
}

// ── Token refresh ────────────────────────────────────────────────────────────

let isRefreshing = false
let refreshQueue = []

async function refreshAccessToken() {
  const refresh = getRefreshToken()
  if (!refresh) throw new Error('No refresh token')

  const res = await fetch(`${BASE_URL}/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })

  if (!res.ok) {
    clearTokens()
    throw new Error('Session expired. Please log in again.')
  }

  const data = await res.json()
  saveTokens({ access: data.access, refresh: data.refresh ?? refresh })
  return data.access
}

// ── Core request function ─────────────────────────────────────────────────────

async function request(path, options = {}, retry = true) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  const token = getAccessToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  // 401 → спробувати оновити токен і повторити запит
  if (res.status === 401 && retry) {
    if (isRefreshing) {
      // Поставити в чергу поки інший запит оновлює токен
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject })
      }).then(() => request(path, options, false))
    }

    isRefreshing = true
    try {
      await refreshAccessToken()
      refreshQueue.forEach(({ resolve }) => resolve())
      refreshQueue = []
      return request(path, options, false)
    } catch (err) {
      refreshQueue.forEach(({ reject }) => reject(err))
      refreshQueue = []
      throw err
    } finally {
      isRefreshing = false
    }
  }

  if (!res.ok) {
    let errorData
    try {
      errorData = await res.json()
    } catch {
      errorData = { detail: `HTTP ${res.status}` }
    }
    const error = new Error(extractErrorMessage(errorData))
    error.status = res.status
    error.data = errorData
    throw error
  }

  // 204 No Content
  if (res.status === 204) return null

  return res.json()
}

function extractErrorMessage(data) {
  if (!data) return 'Невідома помилка'
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  // Зібрати всі помилки полів
  const messages = Object.entries(data)
    .map(([field, msgs]) => {
      const text = Array.isArray(msgs) ? msgs.join(' ') : String(msgs)
      return field === 'non_field_errors' ? text : `${field}: ${text}`
    })
    .join('; ')
  return messages || 'Невідома помилка'
}

// ── Auth API ──────────────────────────────────────────────────────────────────

export const authApi = {
  /** POST /api/auth/register/ */
  register: (data) =>
    request('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** POST /api/auth/login/ */
  login: (data) =>
    request('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** POST /api/auth/logout/ */
  logout: (refresh) =>
    request('/auth/logout/', {
      method: 'POST',
      body: JSON.stringify({ refresh }),
    }),

  /** GET /api/auth/me/ */
  me: () => request('/auth/me/'),

  /** PATCH /api/auth/me/ */
  updateMe: (data) =>
    request('/auth/me/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}

// ── Tickets API ───────────────────────────────────────────────────────────────

export const ticketsApi = {
  /** GET /api/tickets/ */
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/tickets/${qs ? '?' + qs : ''}`)
  },

  /** GET /api/tickets/:id/ */
  get: (id) => request(`/tickets/${id}/`),

  /** POST /api/tickets/ */
  create: (data) =>
    request('/tickets/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** PATCH /api/tickets/:id/ */
  update: (id, data) =>
    request(`/tickets/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /** DELETE /api/tickets/:id/ */
  remove: (id) =>
    request(`/tickets/${id}/`, { method: 'DELETE' }),
}

// ── Categories API ────────────────────────────────────────────────────────────

export const categoriesApi = {
  list: () => request('/categories/'),
  get: (id) => request(`/categories/${id}/`),
  create: (data) => request('/categories/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/categories/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id) => request(`/categories/${id}/`, { method: 'DELETE' }),
}

// ── Comments API ──────────────────────────────────────────────────────────────

export const commentsApi = {
  /** GET /api/tickets/:id/comments/ */
  list: (ticketId) => request(`/tickets/${ticketId}/comments/`),

  /** POST /api/tickets/:id/comments/ */
  create: (ticketId, data) =>
    request(`/tickets/${ticketId}/comments/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** PATCH /api/tickets/:id/comments/:commentId/ */
  update: (ticketId, commentId, data) =>
    request(`/tickets/${ticketId}/comments/${commentId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /** DELETE /api/tickets/:id/comments/:commentId/ */
  remove: (ticketId, commentId) =>
    request(`/tickets/${ticketId}/comments/${commentId}/`, { method: 'DELETE' }),
}

// ── Attachments API ───────────────────────────────────────────────────────────

export const attachmentsApi = {
  /** GET /api/tickets/:id/attachments/ */
  list: (ticketId) => request(`/tickets/${ticketId}/attachments/`),

  /**
   * POST /api/tickets/:id/attachments/
   * Приймає File об'єкт і завантажує через multipart/form-data
   */
  upload: async (ticketId, file, onProgress) => {
    const token = getAccessToken()
    const formData = new FormData()
    formData.append('file', file)

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${BASE_URL}/tickets/${ticketId}/attachments/`)

      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded / e.total) * 100))
          }
        })
      }

      xhr.onload = () => {
        if (xhr.status === 201) {
          resolve(JSON.parse(xhr.responseText))
        } else {
          let msg = `HTTP ${xhr.status}`
          try {
            const data = JSON.parse(xhr.responseText)
            msg = data.detail || data.file?.[0] || msg
          } catch {}
          reject(new Error(msg))
        }
      }

      xhr.onerror = () => reject(new Error('Network error during file upload'))
      xhr.send(formData)
    })
  },

  /** DELETE /api/tickets/:id/attachments/:attachmentId/ */
  remove: (ticketId, attachmentId) =>
    request(`/tickets/${ticketId}/attachments/${attachmentId}/`, { method: 'DELETE' }),
}
