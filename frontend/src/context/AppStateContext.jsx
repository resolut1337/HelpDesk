import { useCallback, useEffect, useMemo, useReducer } from 'react'

import { attachmentsApi, authApi, categoriesApi, clearTokens, commentsApi, getAccessToken, getRefreshToken, saveTokens, ticketsApi } from '../api/client.js'
import { AppStateContext } from './appStateContext.js'

// ── State shape ───────────────────────────────────────────────────────────────

const initialState = {
  isAuthenticated: !!getAccessToken(),
  user: null,
  userLoading: !!getAccessToken(), // true якщо є токен — чекаємо me()
  tickets: [],
  ticketsMeta: { count: 0, next: null, previous: null },
  categories: [],
  loading: {
    auth: false,
    tickets: false,
    categories: false,
  },
  error: null,
}

// ── Reducer ───────────────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: { ...state.loading, ...action.payload } }

    case 'SET_ERROR':
      return { ...state, error: action.payload }

    case 'CLEAR_ERROR':
      return { ...state, error: null }

    case 'AUTH_SUCCESS': {
      const { user } = action.payload
      return {
        ...state,
        isAuthenticated: true,
        user: normalizeUser(user),
        userLoading: false,
        error: null,
        loading: { ...state.loading, auth: false },
      }
    }

    case 'LOGOUT':
      return {
        ...initialState,
        isAuthenticated: false,
        user: null,
        userLoading: false,
      }

    case 'SET_CATEGORIES':
      return {
        ...state,
        categories: action.payload,
        loading: { ...state.loading, categories: false },
      }

    case 'SET_TICKETS':
      return {
        ...state,
        tickets: action.payload.results.map(normalizeTicket),
        ticketsMeta: {
          count: action.payload.count,
          next: action.payload.next,
          previous: action.payload.previous,
        },
        loading: { ...state.loading, tickets: false },
      }

    case 'ADD_TICKET':
      return {
        ...state,
        tickets: [normalizeTicket(action.payload), ...state.tickets],
      }

    case 'UPDATE_TICKET':
      return {
        ...state,
        tickets: state.tickets.map((t) =>
          String(t.id) === String(action.payload.id) ? normalizeTicket(action.payload) : t
        ),
      }

    case 'ADD_COMMENT': {
      const { ticketId, comment } = action.payload
      return {
        ...state,
        tickets: state.tickets.map((t) =>
          t.id === String(ticketId)
            ? { ...t, comments: [...(t.comments ?? []), normalizeComment(comment)] }
            : t
        ),
      }
    }

    case 'REMOVE_COMMENT': {
      const { ticketId, commentId } = action.payload
      return {
        ...state,
        tickets: state.tickets.map((t) =>
          t.id === String(ticketId)
            ? { ...t, comments: (t.comments ?? []).filter((c) => c.id !== commentId) }
            : t
        ),
      }
    }

    case 'DELETE_TICKET':
      return {
        ...state,
        tickets: state.tickets.filter((t) => t.id !== action.payload),
      }

    case 'SET_ME':
      return { ...state, user: normalizeUser(action.payload), userLoading: false }

    case 'USER_LOAD_FAILED':
      return { ...state, userLoading: false }

    default:
      return state
  }
}

// ── Normalizers ───────────────────────────────────────────────────────────────

function normalizeUser(raw) {
  if (!raw) return null
  return {
    id: raw.id,
    username: raw.username ?? '',
    email: raw.email ?? '',
    firstName: raw.first_name ?? '',
    lastName: raw.last_name ?? '',
    fullName: raw.full_name ?? (`${raw.first_name ?? ''} ${raw.last_name ?? ''}`.trim() || raw.username),
    role: raw.role ?? 'client',
    roleDisplay: raw.role_display ?? '',
    isStaff: raw.is_staff ?? false,
    isSupport: raw.is_support ?? false,
    phone: raw.phone ?? '',
    department: raw.department ?? '',
    avatar: raw.avatar ?? '',
    bio: raw.bio ?? '',
  }
}

function normalizeComment(raw) {
  if (!raw) return null
  const author = raw.author
  return {
    id: raw.id,
    body: raw.body ?? '',
    isInternal: raw.is_internal ?? false,
    author: author ?? null,
    authorName: author
      ? (`${author.first_name ?? ''} ${author.last_name ?? ''}`.trim() || author.username)
      : 'Unknown',
    role: raw.is_internal ? 'support' : 'user',
    at: raw.created_at ? raw.created_at.slice(0, 16).replace('T', ' ') : '',
    createdAt: raw.created_at ?? '',
    updatedAt: raw.updated_at ?? '',
  }
}

function normalizeTicket(raw) {
  if (!raw) return null
  const author = raw.author
    ? `${raw.author.first_name ?? ''} ${raw.author.last_name ?? ''}`.trim() || raw.author.username
    : ''
  return {
    id: String(raw.id),
    title: raw.title ?? '',
    description: raw.description ?? '',
    status: raw.status ?? 'new',
    statusDisplay: raw.status_display ?? raw.status ?? '',
    priority: raw.priority ?? 'medium',
    priorityDisplay: raw.priority_display ?? raw.priority ?? '',
    category: raw.category ? raw.category.name : '',
    categoryId: raw.category ? raw.category.id : null,
    author: raw.author ?? null,
    requester: author,
    assignee: raw.assignee ?? null,
    createdAt: raw.created_at ? raw.created_at.slice(0, 16).replace('T', ' ') : '',
    updated: raw.updated_at ? raw.updated_at.slice(0, 16).replace('T', ' ') : '',
    attachmentsCount: raw.attachments_count ?? 0,
    attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
    history: [],
    comments: Array.isArray(raw.comments) ? raw.comments.map(normalizeComment) : [],
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Завантажити профіль якщо є токен при старті
  useEffect(() => {
    if (state.isAuthenticated && !state.user) {
      authApi.me()
        .then((data) => dispatch({ type: 'SET_ME', payload: data }))
        .catch(() => {
          clearTokens()
          dispatch({ type: 'LOGOUT' })
        })
    } else if (!state.isAuthenticated) {
      dispatch({ type: 'USER_LOAD_FAILED' })
    }
  }, [state.isAuthenticated, state.user])

  // Завантажити категорії при логіні
  useEffect(() => {
    if (state.isAuthenticated && state.categories.length === 0) {
      categoriesApi.list()
        .then((data) => dispatch({ type: 'SET_CATEGORIES', payload: data.results ?? data }))
        .catch(() => {})
    }
  }, [state.isAuthenticated, state.categories.length])

  // ── Auth actions ─────────────────────────────────────────────────────────────

  const login = useCallback(async ({ username, password }) => {
    dispatch({ type: 'SET_LOADING', payload: { auth: true } })
    dispatch({ type: 'CLEAR_ERROR' })
    try {
      const data = await authApi.login({ username, password })
      saveTokens({ access: data.access, refresh: data.refresh })
      dispatch({ type: 'AUTH_SUCCESS', payload: { user: data.user } })
      return { ok: true }
    } catch (err) {
      dispatch({ type: 'SET_LOADING', payload: { auth: false } })
      dispatch({ type: 'SET_ERROR', payload: err.message })
      return { ok: false, error: err.message }
    }
  }, [])

  const register = useCallback(async ({ username, email, password, password2, firstName, lastName }) => {
    dispatch({ type: 'SET_LOADING', payload: { auth: true } })
    dispatch({ type: 'CLEAR_ERROR' })
    try {
      const data = await authApi.register({
        username,
        email,
        password,
        password2,
        first_name: firstName ?? '',
        last_name: lastName ?? '',
      })
      saveTokens({ access: data.access, refresh: data.refresh })
      dispatch({ type: 'AUTH_SUCCESS', payload: { user: data.user } })
      return { ok: true }
    } catch (err) {
      dispatch({ type: 'SET_LOADING', payload: { auth: false } })
      dispatch({ type: 'SET_ERROR', payload: err.message })
      return { ok: false, error: err.message }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      const refresh = getRefreshToken()
      if (refresh) await authApi.logout(refresh)
    } catch {
      // ігноруємо помилки при logout
    } finally {
      clearTokens()
      dispatch({ type: 'LOGOUT' })
    }
  }, [])

  // ── Ticket actions ────────────────────────────────────────────────────────────

  const fetchTickets = useCallback(async (params = {}) => {
    dispatch({ type: 'SET_LOADING', payload: { tickets: true } })
    try {
      const data = await ticketsApi.list(params)
      dispatch({ type: 'SET_TICKETS', payload: data })
      return { ok: true }
    } catch (err) {
      dispatch({ type: 'SET_LOADING', payload: { tickets: false } })
      dispatch({ type: 'SET_ERROR', payload: err.message })
      return { ok: false, error: err.message }
    }
  }, [])

  const createTicket = useCallback(async (payload) => {
    try {
      const data = await ticketsApi.create(payload)
      dispatch({ type: 'ADD_TICKET', payload: data })
      return { ok: true, data }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
      return { ok: false, error: err.message }
    }
  }, [])

  const updateTicket = useCallback(async (id, payload) => {
    try {
      const data = await ticketsApi.update(String(id), payload)
      dispatch({ type: 'UPDATE_TICKET', payload: data })
      return { ok: true, data }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
      return { ok: false, error: err.message }
    }
  }, [])

  const deleteTicket = useCallback(async (id) => {
    try {
      await ticketsApi.remove(id)
      dispatch({ type: 'DELETE_TICKET', payload: id })
      return { ok: true }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
      return { ok: false, error: err.message }
    }
  }, [])

  const uploadAttachment = useCallback(async (ticketId, file, onProgress) => {
    try {
      const attachment = await attachmentsApi.upload(String(ticketId), file, onProgress)
      const updated = await ticketsApi.get(String(ticketId))
      dispatch({ type: 'UPDATE_TICKET', payload: updated })
      return { ok: true, data: attachment }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
      return { ok: false, error: err.message }
    }
  }, [])

  const addComment = useCallback(async (ticketId, { body, isInternal = false }) => {
    try {
      const comment = await commentsApi.create(ticketId, { body, is_internal: isInternal })
      dispatch({ type: 'ADD_COMMENT', payload: { ticketId, comment } })
      return { ok: true, data: comment }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
      return { ok: false, error: err.message }
    }
  }, [])

  const removeComment = useCallback(async (ticketId, commentId) => {
    try {
      await commentsApi.remove(ticketId, commentId)
      dispatch({ type: 'REMOVE_COMMENT', payload: { ticketId, commentId } })
      return { ok: true }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
      return { ok: false, error: err.message }
    }
  }, [])

  const deleteAttachment = useCallback(async (ticketId, attachmentId) => {
    try {
      await attachmentsApi.remove(String(ticketId), attachmentId)
      const updated = await ticketsApi.get(String(ticketId))
      dispatch({ type: 'UPDATE_TICKET', payload: updated })
      return { ok: true }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
      return { ok: false, error: err.message }
    }
  }, [])

  // ── Context value ─────────────────────────────────────────────────────────────

  const value = useMemo(() => ({
    // State
    isAuthenticated: state.isAuthenticated,
    user: state.user,
    userLoading: state.userLoading,
    tickets: state.tickets,
    ticketsMeta: state.ticketsMeta,
    categories: state.categories,
    loading: state.loading,
    error: state.error,

    // Auth
    login,
    register,
    logout,

    // Tickets
    fetchTickets,
    createTicket,
    updateTicket,
    deleteTicket,

    // Attachments
    uploadAttachment,
    deleteAttachment,

    // Comments
    addComment,
    removeComment,

    // Legacy helpers для сумісності з існуючим App.jsx
    addTicketComment: () => {},
    updateTicketStatus: ({ ticketId, status }) => updateTicket(ticketId, { status }),
  }), [
    state.isAuthenticated,
    state.user,
    state.userLoading,
    state.tickets,
    state.ticketsMeta,
    state.categories,
    state.loading,
    state.error,
    login,
    register,
    logout,
    fetchTickets,
    createTicket,
    updateTicket,
    deleteTicket,
    uploadAttachment,
    deleteAttachment,
    addComment,
    removeComment,
  ])

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}
