import { useEffect, useMemo, useReducer } from 'react'

import { AppStateContext } from './appStateContext.js'

const STORAGE_KEY = 'helpdesk.globalState.v1'

const defaultUser = {
  fullName: 'Guest User',
  email: 'guest@helpdesk.app',
  phone: '+380 00 000 00 00',
  timezone: 'UTC+02:00',
}

const defaultTickets = [
  {
    id: 'HD-4108',
    title: 'Unable to login from VPN',
    status: 'open',
    updated: '5 min ago',
    category: 'Access Issues',
    attachmentsCount: 1,
  },
  {
    id: 'HD-4107',
    title: 'Mailbox sync delay',
    status: 'pending',
    updated: '20 min ago',
    category: 'Software Bug',
    attachmentsCount: 0,
  },
  {
    id: 'HD-4103',
    title: 'Issue with Slack notifications',
    status: 'resolved',
    updated: '1 h ago',
    category: 'Network',
    attachmentsCount: 2,
  },
]

const initialState = {
  isAuthenticated: false,
  user: defaultUser,
  tickets: defaultTickets,
}

function normalizeState(rawState) {
  if (!rawState || typeof rawState !== 'object') {
    return initialState
  }

  const safeUser =
    rawState.user && typeof rawState.user === 'object'
      ? {
          ...defaultUser,
          fullName: String(rawState.user.fullName ?? defaultUser.fullName),
          email: String(rawState.user.email ?? defaultUser.email),
          phone: String(rawState.user.phone ?? defaultUser.phone),
          timezone: String(rawState.user.timezone ?? defaultUser.timezone),
        }
      : defaultUser

  const safeTickets = Array.isArray(rawState.tickets)
    ? rawState.tickets
        .map((ticket) => ({
          id: String(ticket?.id ?? ''),
          title: String(ticket?.title ?? ''),
          status: String(ticket?.status ?? 'open'),
          updated: String(ticket?.updated ?? 'just now'),
          category: String(ticket?.category ?? 'Other'),
          attachmentsCount: Number.isFinite(ticket?.attachmentsCount)
            ? ticket.attachmentsCount
            : 0,
        }))
        .filter((ticket) => ticket.id && ticket.title)
    : defaultTickets

  return {
    isAuthenticated: Boolean(rawState.isAuthenticated),
    user: safeUser,
    tickets: safeTickets.length > 0 ? safeTickets : defaultTickets,
  }
}

function loadState() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return initialState
    }
    return normalizeState(JSON.parse(stored))
  } catch {
    return initialState
  }
}

function getNextTicketId(tickets) {
  const numbers = tickets
    .map((ticket) => Number.parseInt(String(ticket.id).replace(/\D+/g, ''), 10))
    .filter((value) => Number.isFinite(value))

  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 4100
  return `HD-${maxNumber + 1}`
}

function appStateReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_SUCCESS': {
      const { email, fullName } = action.payload
      return {
        ...state,
        isAuthenticated: true,
        user: {
          ...state.user,
          email,
          fullName,
        },
      }
    }
    case 'REGISTER_SUCCESS': {
      const { email, fullName } = action.payload
      return {
        ...state,
        isAuthenticated: true,
        user: {
          ...state.user,
          email,
          fullName,
        },
      }
    }
    case 'LOGOUT': {
      return {
        ...state,
        isAuthenticated: false,
      }
    }
    case 'CREATE_TICKET': {
      const { title, category, attachmentsCount } = action.payload
      const newTicket = {
        id: getNextTicketId(state.tickets),
        title,
        category,
        attachmentsCount,
        status: 'open',
        updated: 'just now',
      }
      return {
        ...state,
        tickets: [newTicket, ...state.tickets],
      }
    }
    default:
      return state
  }
}

export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(appStateReducer, initialState, loadState)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Ignore write failures (private mode, quota, etc.)
    }
  }, [state])

  const value = useMemo(() => {
    return {
      isAuthenticated: state.isAuthenticated,
      user: state.user,
      tickets: state.tickets,
      login: ({ email, fullName }) =>
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { email, fullName },
        }),
      register: ({ email, fullName }) =>
        dispatch({
          type: 'REGISTER_SUCCESS',
          payload: { email, fullName },
        }),
      logout: () => dispatch({ type: 'LOGOUT' }),
      createTicket: ({ title, category, attachmentsCount }) =>
        dispatch({
          type: 'CREATE_TICKET',
          payload: { title, category, attachmentsCount },
        }),
    }
  }, [state.isAuthenticated, state.tickets, state.user])

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}
