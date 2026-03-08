import { useEffect, useMemo, useReducer } from 'react'

import { AppStateContext } from './appStateContext.js'

const STORAGE_KEY = 'helpdesk.globalState.v2'

const defaultUser = {
  fullName: 'Guest User',
  email: 'guest@helpdesk.app',
  phone: '+380 00 000 00 00',
  timezone: 'UTC+02:00',
  isStaff: true,
}

const defaultTickets = [
  {
    id: 'HD-4108',
    title: 'Unable to login from VPN',
    status: 'open',
    updated: '5 min ago',
    category: 'Access Issues',
    attachmentsCount: 1,
    description:
      'User cannot authenticate through corporate VPN after password reset. Browser shows timeout.',
    requester: 'lina.melnyk@helpdesk.app',
    priority: 'High',
    createdAt: '2026-03-04 09:10',
    attachments: [{ name: 'vpn-error.png', sizeKb: 430 }],
    history: [
      {
        id: 'HD-4108-H1',
        at: '2026-03-04 09:10',
        actor: 'Lina Melnyk',
        action: 'Ticket created',
        note: 'Issue appeared after password reset.',
      },
      {
        id: 'HD-4108-H2',
        at: '2026-03-04 09:15',
        actor: 'Support Bot',
        action: 'Status changed to Open',
        note: 'Ticket assigned to first line support queue.',
      },
    ],
    comments: [
      {
        id: 'HD-4108-C1',
        at: '2026-03-04 09:12',
        author: 'Lina Melnyk',
        role: 'user',
        message: 'I can login in browser, but VPN app keeps failing.',
      },
      {
        id: 'HD-4108-C2',
        at: '2026-03-04 09:16',
        author: 'Agent Marta',
        role: 'support',
        message: 'Received. Please attach a screenshot of the VPN error.',
      },
    ],
  },
  {
    id: 'HD-4107',
    title: 'Mailbox sync delay',
    status: 'pending',
    updated: '20 min ago',
    category: 'Software Bug',
    attachmentsCount: 0,
    description: 'Outlook sync is delayed by 10-15 minutes on Wi-Fi.',
    requester: 'danylo.k@helpdesk.app',
    priority: 'Medium',
    createdAt: '2026-03-04 08:45',
    attachments: [],
    history: [
      {
        id: 'HD-4107-H1',
        at: '2026-03-04 08:45',
        actor: 'Danylo K.',
        action: 'Ticket created',
        note: 'Issue on laptop only.',
      },
      {
        id: 'HD-4107-H2',
        at: '2026-03-04 09:05',
        actor: 'Agent Marta',
        action: 'Status changed to Pending',
        note: 'Waiting for logs from user.',
      },
    ],
    comments: [],
  },
  {
    id: 'HD-4103',
    title: 'Issue with Slack notifications',
    status: 'resolved',
    updated: '1 h ago',
    category: 'Network',
    attachmentsCount: 2,
    description: 'Desktop Slack client stopped receiving channel notifications.',
    requester: 'oleksii.v@helpdesk.app',
    priority: 'Low',
    createdAt: '2026-03-04 07:20',
    attachments: [
      { name: 'slack-settings.png', sizeKb: 380 },
      { name: 'console-log.txt', sizeKb: 16 },
    ],
    history: [
      {
        id: 'HD-4103-H1',
        at: '2026-03-04 07:20',
        actor: 'Oleksii V.',
        action: 'Ticket created',
        note: 'No notifications since morning.',
      },
      {
        id: 'HD-4103-H2',
        at: '2026-03-04 08:10',
        actor: 'Agent Iryna',
        action: 'Status changed to Resolved',
        note: 'Push notifications were re-enabled.',
      },
    ],
    comments: [
      {
        id: 'HD-4103-C1',
        at: '2026-03-04 07:35',
        author: 'Agent Iryna',
        role: 'support',
        message: 'Please verify notification settings in Slack desktop app.',
      },
    ],
  },
]

const initialState = {
  isAuthenticated: false,
  user: defaultUser,
  tickets: defaultTickets,
}

function nowStamp() {
  const date = new Date()
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}

function normalizeAttachment(rawAttachment) {
  if (!rawAttachment || typeof rawAttachment !== 'object') {
    return null
  }
  return {
    name: String(rawAttachment.name ?? ''),
    sizeKb: Number.isFinite(rawAttachment.sizeKb) ? rawAttachment.sizeKb : 0,
  }
}

function normalizeHistoryItem(rawItem, fallbackId, fallbackAt) {
  if (!rawItem || typeof rawItem !== 'object') {
    return {
      id: fallbackId,
      at: fallbackAt,
      actor: 'System',
      action: 'Status changed',
      note: '',
    }
  }
  return {
    id: String(rawItem.id ?? fallbackId),
    at: String(rawItem.at ?? fallbackAt),
    actor: String(rawItem.actor ?? 'System'),
    action: String(rawItem.action ?? 'Status changed'),
    note: String(rawItem.note ?? ''),
  }
}

function normalizeCommentItem(rawItem, fallbackId, fallbackAt) {
  if (!rawItem || typeof rawItem !== 'object') {
    return {
      id: fallbackId,
      at: fallbackAt,
      author: 'System',
      role: 'support',
      message: '',
    }
  }
  const role = rawItem.role === 'support' ? 'support' : 'user'
  return {
    id: String(rawItem.id ?? fallbackId),
    at: String(rawItem.at ?? fallbackAt),
    author: String(rawItem.author ?? 'System'),
    role,
    message: String(rawItem.message ?? ''),
  }
}

function normalizeTicket(rawTicket) {
  const id = String(rawTicket?.id ?? '')
  const title = String(rawTicket?.title ?? '').trim()
  if (!id || !title) {
    return null
  }

  const createdAt = String(rawTicket?.createdAt ?? nowStamp())
  const attachments = Array.isArray(rawTicket?.attachments)
    ? rawTicket.attachments.map(normalizeAttachment).filter(Boolean)
    : []

  const history = Array.isArray(rawTicket?.history)
    ? rawTicket.history
        .map((item, index) => normalizeHistoryItem(item, `${id}-H${index + 1}`, createdAt))
        .filter(Boolean)
    : []

  const comments = Array.isArray(rawTicket?.comments)
    ? rawTicket.comments
        .map((item, index) => normalizeCommentItem(item, `${id}-C${index + 1}`, createdAt))
        .filter((item) => item.message.trim())
    : []

  return {
    id,
    title,
    status: String(rawTicket?.status ?? 'open'),
    updated: String(rawTicket?.updated ?? 'just now'),
    category: String(rawTicket?.category ?? 'Other'),
    attachmentsCount: Number.isFinite(rawTicket?.attachmentsCount)
      ? rawTicket.attachmentsCount
      : attachments.length,
    description: String(rawTicket?.description ?? 'No description provided yet.'),
    requester: String(rawTicket?.requester ?? defaultUser.email),
    priority: String(rawTicket?.priority ?? 'Medium'),
    createdAt,
    attachments,
    history:
      history.length > 0
        ? history
        : [
            {
              id: `${id}-H1`,
              at: createdAt,
              actor: 'System',
              action: 'Ticket created',
              note: '',
            },
          ],
    comments,
  }
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
          isStaff: Boolean(rawState.user.isStaff ?? defaultUser.isStaff),
        }
      : defaultUser

  const safeTickets = Array.isArray(rawState.tickets)
    ? rawState.tickets.map(normalizeTicket).filter(Boolean)
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
          isStaff: state.user.isStaff,
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
          isStaff: state.user.isStaff,
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
      const { title, category, description, attachments, requester } = action.payload
      const newId = getNextTicketId(state.tickets)
      const createdAt = nowStamp()

      const newTicket = {
        id: newId,
        title,
        category,
        attachmentsCount: attachments.length,
        status: 'open',
        updated: 'just now',
        description,
        requester,
        priority: 'Medium',
        createdAt,
        attachments,
        history: [
          {
            id: `${newId}-H1`,
            at: createdAt,
            actor: requester,
            action: 'Ticket created',
            note: 'Submitted from ticket creation form.',
          },
        ],
        comments: [],
      }
      return {
        ...state,
        tickets: [newTicket, ...state.tickets],
      }
    }
    case 'ADD_TICKET_COMMENT': {
      const { ticketId, author, role, message } = action.payload
      const stamp = nowStamp()
      return {
        ...state,
        tickets: state.tickets.map((ticket) => {
          if (ticket.id !== ticketId) return ticket

          const nextCommentId = `${ticketId}-C${ticket.comments.length + 1}`
          const nextHistoryId = `${ticketId}-H${ticket.history.length + 1}`
          const cleanMessage = message.trim()

          if (!cleanMessage) return ticket

          return {
            ...ticket,
            updated: 'just now',
            comments: [
              ...ticket.comments,
              {
                id: nextCommentId,
                at: stamp,
                author,
                role: role === 'support' ? 'support' : 'user',
                message: cleanMessage,
              },
            ],
            history: [
              ...ticket.history,
              {
                id: nextHistoryId,
                at: stamp,
                actor: author,
                action: 'Comment added',
                note: cleanMessage.length > 80 ? `${cleanMessage.slice(0, 80)}...` : cleanMessage,
              },
            ],
          }
        }),
      }
    }
    case 'UPDATE_TICKET_STATUS': {
      const { ticketId, status, actor } = action.payload
      const stamp = nowStamp()
      return {
        ...state,
        tickets: state.tickets.map((ticket) => {
          if (ticket.id !== ticketId || ticket.status === status) return ticket

          return {
            ...ticket,
            status,
            updated: 'just now',
            history: [
              ...ticket.history,
              {
                id: `${ticketId}-H${ticket.history.length + 1}`,
                at: stamp,
                actor,
                action: `Status changed to ${String(status).charAt(0).toUpperCase()}${String(status).slice(1)}`,
                note: '',
              },
            ],
          }
        }),
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
      createTicket: ({ title, category, description, attachments, requester }) =>
        dispatch({
          type: 'CREATE_TICKET',
          payload: { title, category, description, attachments, requester },
        }),
      addTicketComment: ({ ticketId, author, role, message }) =>
        dispatch({
          type: 'ADD_TICKET_COMMENT',
          payload: { ticketId, author, role, message },
        }),
      updateTicketStatus: ({ ticketId, status, actor }) =>
        dispatch({
          type: 'UPDATE_TICKET_STATUS',
          payload: { ticketId, status, actor },
        }),
    }
  }, [state.isAuthenticated, state.tickets, state.user])

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}
