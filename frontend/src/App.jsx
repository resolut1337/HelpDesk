import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import './App.css'
import { useAppState } from './context/useAppState.js'
import {
  buyPremiumStatus,
  connectWallet,
  getConnectedWalletAddress,
  getPremiumStatus,
  isWalletAvailable,
  premiumConfig,
} from './utilities/blockchainUtils.js'

const navItems = [
  { id: 'home', path: '/', label: 'Головна' },
  { id: 'account', path: '/account', label: 'Акаунт' },
]

const statusLabels = {
  open: 'Open',
  pending: 'Pending',
  resolved: 'Resolved',
  closed: 'Closed',
}

const steps = [
  'User describes an issue and creates a support ticket.',
  'System stores the request and assigns a ticket number.',
  'Support agent reviews the request and updates status.',
  'Agent responds, clarifies details, and resolves the issue.',
  'Ticket is closed and the user sees the final result.',
]

const profileActivity = [
  'Email notifications were updated.',
  'Comment was added to ticket HD-4108.',
  'Role was changed to Support Agent.',
]

const ticketCategories = [
  'Access Issues',
  'Billing',
  'Software Bug',
  'Hardware',
  'Network',
  'Other',
]

const initialLoginForm = {
  email: '',
  password: '',
}

const initialRegisterForm = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
}

const initialTicketForm = {
  subject: '',
  description: '',
  category: '',
  files: [],
}

const maxFiles = 5
const maxFileSizeMb = 10
const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024
const FREE_TICKET_LIMIT = 10

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? '')
    .join('') || 'HD'
}

function shortWalletAddress(address) {
  if (!address || address.length < 12) {
    return address
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validatePassword(password) {
  if (password.length < 8) return 'Password must be at least 8 characters long.'
  if (!/[A-Za-z]/.test(password)) return 'Password must include at least one letter.'
  if (!/\d/.test(password)) return 'Password must include at least one digit.'
  return ''
}

function validateLoginForm(form) {
  const errors = {}

  if (!form.email.trim()) {
    errors.email = 'Email is required.'
  } else if (!validateEmail(form.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }

  if (!form.password) {
    errors.password = 'Password is required.'
  }

  return errors
}

function validateRegisterForm(form) {
  const errors = {}

  if (!form.fullName.trim()) {
    errors.fullName = 'Full name is required.'
  } else if (form.fullName.trim().length < 3) {
    errors.fullName = 'Full name must be at least 3 characters long.'
  }

  if (!form.email.trim()) {
    errors.email = 'Email is required.'
  } else if (!validateEmail(form.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }

  if (!form.password) {
    errors.password = 'Password is required.'
  } else {
    const passwordError = validatePassword(form.password)
    if (passwordError) errors.password = passwordError
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Confirm your password.'
  } else if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  return errors
}

function validateTicketForm(form) {
  const errors = {}

  if (!form.subject.trim()) {
    errors.subject = 'Subject is required.'
  } else if (form.subject.trim().length < 5) {
    errors.subject = 'Subject must be at least 5 characters long.'
  }

  if (!form.description.trim()) {
    errors.description = 'Description is required.'
  } else if (form.description.trim().length < 15) {
    errors.description = 'Description must be at least 15 characters long.'
  }

  if (!form.category) {
    errors.category = 'Please choose a category.'
  }

  if (form.files.length > maxFiles) {
    errors.files = `You can upload up to ${maxFiles} files.`
  } else {
    const largeFile = form.files.find((file) => file.size > maxFileSizeBytes)
    if (largeFile) {
      errors.files = `File "${largeFile.name}" exceeds ${maxFileSizeMb}MB.`
    }
  }

  return errors
}

function TicketCreationForm({ onCreateTicket, canCreateTicket, createBlockedMessage }) {
  const [form, setForm] = useState(initialTicketForm)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState('success')
  const fileInputRef = useRef(null)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
    setMessage('')
    setMessageTone('success')
  }

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || [])
    setForm((prev) => ({ ...prev, files }))
    setErrors((prev) => ({ ...prev, files: '' }))
    setMessage('')
    setMessageTone('success')
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!canCreateTicket) {
      setMessage(createBlockedMessage)
      setMessageTone('error')
      return
    }

    const validationErrors = validateTicketForm(form)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    const result = onCreateTicket({
      title: form.subject.trim(),
      category: form.category,
      description: form.description.trim(),
      attachments: form.files.map((file) => ({
        name: file.name,
        sizeKb: Math.max(1, Math.round(file.size / 1024)),
      })),
    })

    if (!result?.ok) {
      setMessage(result?.message || 'Unable to create ticket right now.')
      setMessageTone('error')
      return
    }

    setMessage(result.message || 'Ticket was created successfully.')
    setMessageTone('success')
    setForm(initialTicketForm)
    setErrors({})
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <article className="panel-card">
      <h2>Create new ticket</h2>
      <form className="ticket-form" noValidate onSubmit={handleSubmit}>
        <label className="ticket-field">
          Subject
          <input
            type="text"
            name="subject"
            value={form.subject}
            onChange={handleChange}
            placeholder="Short summary of your issue"
            aria-invalid={Boolean(errors.subject)}
          />
          {errors.subject && <span className="field-error">{errors.subject}</span>}
        </label>

        <label className="ticket-field">
          Category
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            aria-invalid={Boolean(errors.category)}
          >
            <option value="">Choose category</option>
            {ticketCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          {errors.category && <span className="field-error">{errors.category}</span>}
        </label>

        <label className="ticket-field full-width">
          Description
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={5}
            placeholder="Describe what happened, steps to reproduce, and expected behavior"
            aria-invalid={Boolean(errors.description)}
          />
          {errors.description && <span className="field-error">{errors.description}</span>}
        </label>

        <label className="ticket-field full-width">
          Attach files
          <input
            ref={fileInputRef}
            type="file"
            name="files"
            multiple
            onChange={handleFileChange}
            aria-invalid={Boolean(errors.files)}
          />
          <small className="field-hint">Up to 5 files, max 10MB each.</small>
          {errors.files && <span className="field-error">{errors.files}</span>}
          {form.files.length > 0 ? (
            <ul className="file-list">
              {form.files.map((file) => (
                <li key={`${file.name}-${file.lastModified}`}>
                  {file.name} ({Math.max(1, Math.round(file.size / 1024))} KB)
                </li>
              ))}
            </ul>
          ) : null}
        </label>

        {!canCreateTicket ? <p className="field-error ticket-limit-hint">{createBlockedMessage}</p> : null}

        {message ? (
          <p className={`form-message ${messageTone === 'error' ? 'error' : 'success'}`}>{message}</p>
        ) : null}

        <button type="submit" className="primary-btn ticket-submit" disabled={!canCreateTicket}>
          Create ticket
        </button>
      </form>
    </article>
  )
}

function HomeView({
  onOpenAccount,
  onOpenTicketDetails,
  tickets,
  user,
  onCreateTicket,
  canCreateTicket,
  createBlockedMessage,
  userTicketCount,
  freeTicketLimit,
  remainingTicketSlots,
  isPremiumUser,
  walletAddress,
  blockchainReady,
  premiumBusy,
  premiumNotice,
  premiumPriceEth,
  onConnectWallet,
  onBuyPremium,
}) {
  const ticketFormRef = useRef(null)
  const [titleQuery, setTitleQuery] = useState('')

  const normalizedQuery = titleQuery.trim().toLowerCase()
  const filteredTickets = normalizedQuery
    ? tickets.filter((ticket) => ticket.title.toLowerCase().includes(normalizedQuery))
    : tickets

  const focusTicketForm = () => {
    requestAnimationFrame(() => {
      ticketFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <div className="view-grid">
      <section className="main-column">
        <article className="hero-card">
          <p className="eyebrow">HelpDesk Dashboard</p>
          <h1>Support workspace overview</h1>
          <p>
            Keep customer requests in one place, track status changes quickly, and keep agents aligned on
            every ticket lifecycle stage.
          </p>
          <div className="hero-actions">
            <button type="button" className="primary-btn" onClick={focusTicketForm}>
              Create ticket
            </button>
            <button type="button" className="secondary-btn">
              Open all tickets
            </button>
          </div>
        </article>

        <div ref={ticketFormRef}>
          <TicketCreationForm
            onCreateTicket={onCreateTicket}
            canCreateTicket={canCreateTicket}
            createBlockedMessage={createBlockedMessage}
          />
        </div>

        <article className="panel-card">
          <h2>Ticket flow</h2>
          <ol className="steps-list">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </article>

        <article className="panel-card">
          <div className="panel-header">
          <h2>Останні тікети</h2>
            <button type="button" className="link-btn">
              View all
            </button>
          </div>
          <label className="tickets-search">
            <span>Пошук за заголовком</span>
            <input
              type="search"
              value={titleQuery}
              onChange={(event) => setTitleQuery(event.target.value)}
              placeholder="Введіть заголовок тікета..."
            />
          </label>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Files</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.length === 0 && (
                  <tr>
                    <td className="empty-row" colSpan="6">
                      {tickets.length === 0
                        ? 'Тікетів ще немає. Нові заявки зʼявляться тут.'
                        : 'За цим запитом тікети не знайдено.'}
                    </td>
                  </tr>
                )}
                {filteredTickets.map((ticket) => {
                  const statusKey = ticket.status.toLowerCase()
                  const statusText = statusLabels[statusKey] ?? ticket.status

                  return (
                    <tr key={ticket.id}>
                      <td>
                        <button
                          type="button"
                          className="link-btn table-link-btn"
                          onClick={() => onOpenTicketDetails(ticket.id)}
                        >
                          {ticket.id}
                        </button>
                      </td>
                      <td>{ticket.title}</td>
                      <td>{ticket.category}</td>
                      <td>{ticket.attachmentsCount}</td>
                      <td>
                        <span className={`status-pill status-${statusKey}`}>{statusText}</span>
                      </td>
                      <td>{ticket.updated}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <aside className="side-column">
        <article className="panel-card premium-card">
          <div className="premium-row">
            <h3>Blockchain підписка</h3>
            <span className={isPremiumUser ? 'premium-badge active' : 'premium-badge'}>
              {isPremiumUser ? 'Premium' : 'Free'}
            </span>
          </div>
          <p className="premium-text">
            {isPremiumUser
              ? 'Підписка активна. Доступна необмежена кількість тікетів.'
              : `Без підписки доступно до ${freeTicketLimit} тікетів.`}
          </p>
          <p className="premium-text">
            Ваші тікети: {userTicketCount}
            {isPremiumUser ? ' (без ліміту)' : ` / ${freeTicketLimit}`}
          </p>
          {!isPremiumUser ? <p className="premium-text">Залишилось: {remainingTicketSlots}</p> : null}
          <p className="premium-wallet">
            {walletAddress ? `Гаманець: ${shortWalletAddress(walletAddress)}` : 'Гаманець не підключено'}
          </p>
          {premiumNotice ? <p className="premium-note">{premiumNotice}</p> : null}
          <div className="premium-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={onConnectWallet}
              disabled={premiumBusy || !blockchainReady}
            >
              {walletAddress ? 'Перепідключити MetaMask' : 'Підключити MetaMask'}
            </button>
            {!isPremiumUser ? (
              <button
                type="button"
                className="primary-btn"
                onClick={onBuyPremium}
                disabled={premiumBusy || !blockchainReady}
              >
                {premiumBusy ? 'Обробка...' : `Купити Premium (${premiumPriceEth} ETH)`}
              </button>
            ) : null}
          </div>
          {!blockchainReady ? (
            <p className="field-error">Встановіть MetaMask, щоб купувати та перевіряти підписку.</p>
          ) : null}
        </article>

        <article className="panel-card account-preview">
          <div className="profile-row">
            <div className="avatar">{getInitials(user.fullName)}</div>
            <div>
              <p className="name">{user.fullName}</p>
              <p className="role">Support Agent</p>
            </div>
          </div>
          <dl className="info-list">
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Team</dt>
              <dd>Support 1st line</dd>
            </div>
            <div>
              <dt>Time zone</dt>
              <dd>UTC+02:00</dd>
            </div>
          </dl>
          <button type="button" className="primary-btn full" onClick={onOpenAccount}>
            Open account
          </button>
        </article>

        <article className="panel-card">
          <h3>Quick actions</h3>
          <div className="quick-actions">
            <button type="button" onClick={focusTicketForm}>
              New ticket
            </button>
            <button type="button">My tickets</button>
            <button type="button">Profile settings</button>
            <button type="button">Support docs</button>
          </div>
        </article>
      </aside>
    </div>
  )
}

function TicketDetailView({ ticket, currentUser, onBack, onSendComment, onChangeStatus }) {
  const [commentBody, setCommentBody] = useState('')
  const [commentRole, setCommentRole] = useState('user')
  const [commentError, setCommentError] = useState('')

  if (!ticket) {
    return (
      <section className="ticket-detail-layout">
        <article className="panel-card">
          <h2>Ticket not found</h2>
          <p>The ticket may have been removed or was not loaded yet.</p>
          <button type="button" className="secondary-btn" onClick={onBack}>
            Back to dashboard
          </button>
        </article>
      </section>
    )
  }

  const statusKey = ticket.status.toLowerCase()
  const statusText = statusLabels[statusKey] ?? ticket.status
  const canSubmitComment = commentBody.trim().length > 0
  const statusOptions = ['open', 'pending', 'resolved', 'closed']
  const isStaff = Boolean(currentUser?.isStaff)

  const handleCommentSubmit = (event) => {
    event.preventDefault()
    const body = commentBody.trim()
    if (!body) {
      setCommentError('Comment message is required.')
      return
    }

    const author =
      commentRole === 'support'
        ? 'Support Agent'
        : currentUser?.fullName?.trim() || currentUser?.email || 'User'

    onSendComment({
      ticketId: ticket.id,
      author,
      role: commentRole,
      message: body,
    })

    setCommentBody('')
    setCommentError('')
  }

  return (
    <section className="ticket-detail-layout">
      <article className="panel-card ticket-detail-main">
        <div className="ticket-detail-head">
          <div>
            <p className="eyebrow">Ticket details</p>
            <h1>
              {ticket.id} - {ticket.title}
            </h1>
          </div>
          <span className={`status-pill status-${statusKey}`}>{statusText}</span>
        </div>

        <dl className="ticket-meta">
          <div>
            <dt>Category</dt>
            <dd>{ticket.category}</dd>
          </div>
          <div>
            <dt>Priority</dt>
            <dd>{ticket.priority}</dd>
          </div>
          <div>
            <dt>Requester</dt>
            <dd>{ticket.requester}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{ticket.createdAt}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{ticket.updated}</dd>
          </div>
          <div>
            <dt>Files</dt>
            <dd>{ticket.attachmentsCount}</dd>
          </div>
        </dl>

        <article className="ticket-section">
          <h2>Description</h2>
          <p>{ticket.description}</p>
        </article>

        {isStaff ? (
          <article className="ticket-section">
            <h2>Quick status update</h2>
            <div className="status-toggle-row">
              {statusOptions.map((status) => {
                const isActive = status === ticket.status
                const label = statusLabels[status] ?? status
                return (
                  <button
                    key={status}
                    type="button"
                    className={isActive ? 'status-toggle-btn active' : 'status-toggle-btn'}
                    disabled={isActive}
                    onClick={() =>
                      onChangeStatus({
                        ticketId: ticket.id,
                        status,
                      })
                    }
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </article>
        ) : (
          <article className="ticket-section">
            <h2>Status</h2>
            <p className="muted-text">Only support staff can change ticket status.</p>
          </article>
        )}

        <article className="ticket-section">
          <h2>Attachments</h2>
          {ticket.attachments.length === 0 ? (
            <p className="muted-text">No files attached.</p>
          ) : (
            <ul className="attachment-list">
              {ticket.attachments.map((file) => (
                <li key={`${ticket.id}-${file.name}`}>
                  <span>{file.name}</span>
                  <small>{file.sizeKb} KB</small>
                </li>
              ))}
            </ul>
          )}
        </article>

        <div className="ticket-actions">
          <button type="button" className="secondary-btn" onClick={onBack}>
            Back to dashboard
          </button>
        </div>
      </article>

      <article className="panel-card">
        <h2>History</h2>
        <ul className="history-list">
          {ticket.history.map((event) => (
            <li key={event.id}>
              <div className="history-title-row">
                <strong>{event.action}</strong>
                <small>{event.at}</small>
              </div>
              <p>
                {event.actor}
                {event.note ? ` - ${event.note}` : ''}
              </p>
            </li>
          ))}
        </ul>
      </article>

      <article className="panel-card ticket-chat-card">
        <h2>Comments</h2>
        {ticket.comments.length === 0 ? (
          <p className="muted-text">No messages yet. Start the conversation.</p>
        ) : (
          <ul className="comment-list">
            {ticket.comments.map((comment) => (
              <li
                key={comment.id}
                className={
                  comment.role === 'support'
                    ? 'comment-item comment-support'
                    : 'comment-item comment-user'
                }
              >
                <div className="comment-meta">
                  <strong>{comment.author}</strong>
                  <small>{comment.at}</small>
                </div>
                <p>{comment.message}</p>
              </li>
            ))}
          </ul>
        )}

        <form className="comment-form" noValidate onSubmit={handleCommentSubmit}>
          <div className="comment-role-row">
            <label>
              <input
                type="radio"
                name="commentRole"
                value="user"
                checked={commentRole === 'user'}
                onChange={(event) => setCommentRole(event.target.value)}
              />
              User
            </label>
            <label>
              <input
                type="radio"
                name="commentRole"
                value="support"
                checked={commentRole === 'support'}
                onChange={(event) => setCommentRole(event.target.value)}
              />
              Support
            </label>
          </div>

          <textarea
            value={commentBody}
            onChange={(event) => {
              setCommentBody(event.target.value)
              if (commentError) setCommentError('')
            }}
            rows={3}
            placeholder="Write a message..."
            aria-invalid={Boolean(commentError)}
          />
          {commentError ? <span className="field-error">{commentError}</span> : null}

          <button type="submit" className="primary-btn" disabled={!canSubmitComment}>
            Send message
          </button>
        </form>
      </article>
    </section>
  )
}

function AccountView({ user }) {
  return (
    <div className="account-layout">
      <article className="panel-card account-main">
        <div className="account-head">
          <div className="avatar large">{getInitials(user.fullName)}</div>
          <div>
            <h1>{user.fullName}</h1>
            <p>Support Agent - Support Team 1</p>
          </div>
        </div>

        <div className="form-grid">
          <label>
            Full name
            <input type="text" value={user.fullName} readOnly />
          </label>
          <label>
            Work email
            <input type="email" value={user.email} readOnly />
          </label>
          <label>
            Phone
            <input type="text" value={user.phone} readOnly />
          </label>
          <label>
            Time zone
            <input type="text" value={user.timezone} readOnly />
          </label>
        </div>

        <div className="account-actions">
          <button type="button" className="primary-btn">
            Edit profile
          </button>
          <button type="button" className="secondary-btn">
            Change password
          </button>
        </div>
      </article>

      <article className="panel-card">
        <h2>Account preferences</h2>
        <div className="toggle-list">
          <label>
            <input type="checkbox" defaultChecked />
            Receive email notifications for new tickets
          </label>
          <label>
            <input type="checkbox" defaultChecked />
            Receive push notifications for status updates
          </label>
          <label>
            <input type="checkbox" />
            Enable dark mode placeholder
          </label>
        </div>
      </article>

      <article className="panel-card">
        <h2>Recent activity</h2>
        <ul className="activity-list">
          {profileActivity.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
      </article>
    </div>
  )
}

function AuthPage({
  authMode,
  setAuthMode,
  loginForm,
  registerForm,
  loginErrors,
  registerErrors,
  formMessage,
  onLoginChange,
  onRegisterChange,
  onLoginSubmit,
  onRegisterSubmit,
}) {
  const isLogin = authMode === 'login'

  return (
    <div className="auth-shell">
      <article className="auth-card">
        <p className="eyebrow">HelpDesk Access</p>
        <h1>{isLogin ? 'Вхід' : 'Реєстрація'}</h1>
        <p className="auth-subtitle">
          {isLogin
            ? 'Увійдіть у систему за допомогою email та пароля.'
            : 'Створіть акаунт для доступу до тікетів і профілю.'}
        </p>

        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            className={isLogin ? 'auth-tab active' : 'auth-tab'}
            onClick={() => setAuthMode('login')}
          >
            Вхід
          </button>
          <button
            type="button"
            className={!isLogin ? 'auth-tab active' : 'auth-tab'}
            onClick={() => setAuthMode('register')}
          >
            Реєстрація
          </button>
        </div>

        {isLogin ? (
          <form className="auth-form" noValidate onSubmit={onLoginSubmit}>
            <label className="auth-field">
              Email
              <input
                type="email"
                name="email"
                value={loginForm.email}
                onChange={onLoginChange}
                placeholder="you@company.com"
                aria-invalid={Boolean(loginErrors.email)}
              />
              {loginErrors.email && <span className="field-error">{loginErrors.email}</span>}
            </label>

            <label className="auth-field">
              Password
              <input
                type="password"
                name="password"
                value={loginForm.password}
                onChange={onLoginChange}
                placeholder="Enter password"
                aria-invalid={Boolean(loginErrors.password)}
              />
              {loginErrors.password && <span className="field-error">{loginErrors.password}</span>}
            </label>

            {formMessage ? <p className="form-message">{formMessage}</p> : null}

            <button type="submit" className="primary-btn auth-submit">
              Увійти
            </button>
          </form>
        ) : (
          <form className="auth-form" noValidate onSubmit={onRegisterSubmit}>
            <label className="auth-field">
              Full name
              <input
                type="text"
                name="fullName"
                value={registerForm.fullName}
                onChange={onRegisterChange}
                placeholder="Name Surname"
                aria-invalid={Boolean(registerErrors.fullName)}
              />
              {registerErrors.fullName && <span className="field-error">{registerErrors.fullName}</span>}
            </label>

            <label className="auth-field">
              Email
              <input
                type="email"
                name="email"
                value={registerForm.email}
                onChange={onRegisterChange}
                placeholder="you@company.com"
                aria-invalid={Boolean(registerErrors.email)}
              />
              {registerErrors.email && <span className="field-error">{registerErrors.email}</span>}
            </label>

            <label className="auth-field">
              Password
              <input
                type="password"
                name="password"
                value={registerForm.password}
                onChange={onRegisterChange}
                placeholder="At least 8 chars, letter + digit"
                aria-invalid={Boolean(registerErrors.password)}
              />
              {registerErrors.password && <span className="field-error">{registerErrors.password}</span>}
            </label>

            <label className="auth-field">
              Confirm password
              <input
                type="password"
                name="confirmPassword"
                value={registerForm.confirmPassword}
                onChange={onRegisterChange}
                placeholder="Repeat password"
                aria-invalid={Boolean(registerErrors.confirmPassword)}
              />
              {registerErrors.confirmPassword && (
                <span className="field-error">{registerErrors.confirmPassword}</span>
              )}
            </label>

            {formMessage ? <p className="form-message">{formMessage}</p> : null}

            <button type="submit" className="primary-btn auth-submit">
              Створити акаунт
            </button>
          </form>
        )}
      </article>
    </div>
  )
}

function PrivateRoute() {
  const { isAuthenticated } = useAppState()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

function PublicOnlyRoute() {
  const { isAuthenticated } = useAppState()
  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />
}

function ProtectedLayout({ user, onLogout }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span>HD</span>
          <div>
            <p>HelpDesk</p>
            <small>{user.email}</small>
          </div>
        </div>

        <nav className="top-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => (isActive ? 'nav-btn active' : 'nav-btn')}
            >
              {item.label}
            </NavLink>
          ))}
          <button type="button" className="nav-btn" onClick={onLogout}>
            Вийти
          </button>
        </nav>
      </header>

      <Outlet />
    </div>
  )
}

function TicketDetailPage({ tickets, user, onSendComment, onChangeStatus }) {
  const { ticketId } = useParams()
  const navigate = useNavigate()
  const ticket = tickets.find((item) => item.id === ticketId) ?? null

  return (
    <TicketDetailView
      ticket={ticket}
      currentUser={user}
      onBack={() => navigate('/')}
      onSendComment={onSendComment}
      onChangeStatus={onChangeStatus}
    />
  )
}

function App() {
  const {
    isAuthenticated,
    user,
    tickets,
    login,
    register,
    logout,
    createTicket,
    addTicketComment,
    updateTicketStatus,
  } = useAppState()
  const navigate = useNavigate()
  const location = useLocation()
  const [loginForm, setLoginForm] = useState(initialLoginForm)
  const [registerForm, setRegisterForm] = useState(initialRegisterForm)
  const [loginErrors, setLoginErrors] = useState({})
  const [registerErrors, setRegisterErrors] = useState({})
  const [formMessage, setFormMessage] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [isPremiumUser, setIsPremiumUser] = useState(false)
  const [premiumBusy, setPremiumBusy] = useState(false)
  const [premiumNotice, setPremiumNotice] = useState('')

  const blockchainReady = isWalletAvailable()
  const userTicketCount = useMemo(() => {
    const requesterEmail = String(user?.email ?? '').toLowerCase()
    return tickets.filter((ticket) => String(ticket.requester ?? '').toLowerCase() === requesterEmail).length
  }, [tickets, user?.email])
  const remainingTicketSlots = Math.max(0, FREE_TICKET_LIMIT - userTicketCount)
  const canCreateTicket = isPremiumUser || remainingTicketSlots > 0
  const createBlockedMessage = `Without subscription you can create up to ${FREE_TICKET_LIMIT} tickets. Buy Premium to remove this limit.`

  useEffect(() => {
    let isCancelled = false

    const refreshWalletPremium = async () => {
      if (!isAuthenticated) {
        if (isCancelled) return
        setWalletAddress('')
        setIsPremiumUser(false)
        setPremiumNotice('')
        setPremiumBusy(false)
        return
      }

      if (!blockchainReady) {
        if (isCancelled) return
        setWalletAddress('')
        setIsPremiumUser(false)
        setPremiumNotice('MetaMask was not found. Free plan is limited to 10 tickets.')
        setPremiumBusy(false)
        return
      }

      setPremiumBusy(true)
      const walletResult = await getConnectedWalletAddress()

      if (isCancelled) return

      if (!walletResult.ok) {
        setWalletAddress('')
        setIsPremiumUser(false)
        setPremiumNotice(walletResult.error)
        setPremiumBusy(false)
        return
      }

      if (!walletResult.address) {
        setWalletAddress('')
        setIsPremiumUser(false)
        setPremiumNotice('Connect MetaMask to check subscription status.')
        setPremiumBusy(false)
        return
      }

      setWalletAddress(walletResult.address)

      const premiumResult = await getPremiumStatus(walletResult.address)
      if (isCancelled) return

      if (!premiumResult.ok) {
        setIsPremiumUser(false)
        setPremiumNotice(premiumResult.error)
        setPremiumBusy(false)
        return
      }

      setIsPremiumUser(premiumResult.isPremium)
      setPremiumNotice(
        premiumResult.isPremium
          ? 'Premium is active. Ticket creation limit is removed.'
          : 'Wallet connected. You can buy Premium for unlimited tickets.',
      )
      setPremiumBusy(false)
    }

    refreshWalletPremium()

    return () => {
      isCancelled = true
    }
  }, [blockchainReady, isAuthenticated, user?.email])

  const handleConnectWallet = async () => {
    if (!blockchainReady) {
      setPremiumNotice('MetaMask is not installed.')
      return
    }

    setPremiumBusy(true)
    const walletResult = await connectWallet()

    if (!walletResult.ok) {
      setWalletAddress('')
      setIsPremiumUser(false)
      setPremiumNotice(walletResult.error)
      setPremiumBusy(false)
      return
    }

    setWalletAddress(walletResult.address)

    const premiumResult = await getPremiumStatus(walletResult.address)
    if (!premiumResult.ok) {
      setIsPremiumUser(false)
      setPremiumNotice(premiumResult.error)
      setPremiumBusy(false)
      return
    }

    setIsPremiumUser(premiumResult.isPremium)
    setPremiumNotice(
      premiumResult.isPremium
        ? 'Premium is active. You can create unlimited tickets.'
        : 'Wallet connected. Now you can buy Premium.',
    )
    setPremiumBusy(false)
  }

  const handleBuyPremium = async () => {
    if (!blockchainReady) {
      setPremiumNotice('MetaMask is not installed.')
      return
    }

    setPremiumBusy(true)
    const buyResult = await buyPremiumStatus()

    if (!buyResult.ok) {
      setPremiumNotice(buyResult.error)
      setPremiumBusy(false)
      return
    }

    if (buyResult.address) {
      setWalletAddress(buyResult.address)
    }

    const premiumResult = await getPremiumStatus(buyResult.address)
    if (!premiumResult.ok) {
      setIsPremiumUser(false)
      setPremiumNotice(premiumResult.error)
      setPremiumBusy(false)
      return
    }

    setIsPremiumUser(premiumResult.isPremium)
    setPremiumNotice(
      premiumResult.isPremium
        ? 'Subscription activated. Ticket limit removed.'
        : 'Transaction completed but status has not updated yet. Please check again.',
    )
    setPremiumBusy(false)
  }

  const handleLoginChange = (event) => {
    const { name, value } = event.target
    setLoginForm((prev) => ({ ...prev, [name]: value }))
    setLoginErrors((prev) => ({ ...prev, [name]: '' }))
    setFormMessage('')
  }

  const handleRegisterChange = (event) => {
    const { name, value } = event.target
    setRegisterForm((prev) => ({ ...prev, [name]: value }))
    setRegisterErrors((prev) => ({ ...prev, [name]: '' }))
    setFormMessage('')
  }

  const handleLoginSubmit = (event) => {
    event.preventDefault()
    const errors = validateLoginForm(loginForm)
    setLoginErrors(errors)

    if (Object.keys(errors).length > 0) return

    const email = loginForm.email.trim().toLowerCase()
    const fullName = email
      .split('@')[0]
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())

    login({ email, fullName })
    setLoginForm(initialLoginForm)
    setFormMessage('')

    const fromPath = location.state?.from?.pathname
    const redirectPath =
      fromPath && fromPath !== '/login' && fromPath !== '/register' ? fromPath : '/'
    navigate(redirectPath, { replace: true })
  }

  const handleRegisterSubmit = (event) => {
    event.preventDefault()
    const errors = validateRegisterForm(registerForm)
    setRegisterErrors(errors)

    if (Object.keys(errors).length > 0) return

    register({
      fullName: registerForm.fullName.trim(),
      email: registerForm.email.trim().toLowerCase(),
    })
    setRegisterForm(initialRegisterForm)
    setFormMessage('')
    navigate('/', { replace: true })
  }

  const handleCreateTicket = ({ title, category, description, attachments }) => {
    if (!isPremiumUser && userTicketCount >= FREE_TICKET_LIMIT) {
      return {
        ok: false,
        message: createBlockedMessage,
      }
    }

    createTicket({
      title,
      category,
      description,
      attachments,
      requester: user.email,
    })
    navigate('/', { replace: true })
    return {
      ok: true,
      message: 'Тікет успішно створено.',
    }
  }

  const handleLogout = () => {
    logout()
    setLoginForm(initialLoginForm)
    setRegisterForm(initialRegisterForm)
    setLoginErrors({})
    setRegisterErrors({})
    setFormMessage('You have signed out.')
    setWalletAddress('')
    setIsPremiumUser(false)
    setPremiumBusy(false)
    setPremiumNotice('')
    navigate('/login', { replace: true })
  }

  const handleSendTicketComment = ({ ticketId, author, role, message }) => {
    addTicketComment({ ticketId, author, role, message })
  }

  const handleTicketStatusChange = ({ ticketId, status }) => {
    updateTicketStatus({
      ticketId,
      status,
      actor: user?.fullName?.trim() || user?.email || 'Support Agent',
    })
  }

  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route
          path="/login"
          element={
            <AuthPage
              authMode="login"
              setAuthMode={(mode) => {
                setFormMessage('')
                setLoginErrors({})
                setRegisterErrors({})
                navigate(mode === 'login' ? '/login' : '/register')
              }}
              loginForm={loginForm}
              registerForm={registerForm}
              loginErrors={loginErrors}
              registerErrors={registerErrors}
              formMessage={formMessage}
              onLoginChange={handleLoginChange}
              onRegisterChange={handleRegisterChange}
              onLoginSubmit={handleLoginSubmit}
              onRegisterSubmit={handleRegisterSubmit}
            />
          }
        />
        <Route
          path="/register"
          element={
            <AuthPage
              authMode="register"
              setAuthMode={(mode) => {
                setFormMessage('')
                setLoginErrors({})
                setRegisterErrors({})
                navigate(mode === 'login' ? '/login' : '/register')
              }}
              loginForm={loginForm}
              registerForm={registerForm}
              loginErrors={loginErrors}
              registerErrors={registerErrors}
              formMessage={formMessage}
              onLoginChange={handleLoginChange}
              onRegisterChange={handleRegisterChange}
              onLoginSubmit={handleLoginSubmit}
              onRegisterSubmit={handleRegisterSubmit}
            />
          }
        />
      </Route>

      <Route element={<PrivateRoute />}>
        <Route element={<ProtectedLayout user={user} onLogout={handleLogout} />}>
          <Route
            path="/"
            element={
              <HomeView
                onOpenAccount={() => navigate('/account')}
                onOpenTicketDetails={(ticketId) => navigate(`/tickets/${ticketId}`)}
                tickets={tickets}
                user={user}
                onCreateTicket={handleCreateTicket}
                canCreateTicket={canCreateTicket}
                createBlockedMessage={createBlockedMessage}
                userTicketCount={userTicketCount}
                freeTicketLimit={FREE_TICKET_LIMIT}
                remainingTicketSlots={remainingTicketSlots}
                isPremiumUser={isPremiumUser}
                walletAddress={walletAddress}
                blockchainReady={blockchainReady}
                premiumBusy={premiumBusy}
                premiumNotice={premiumNotice}
                premiumPriceEth={premiumConfig.priceEth}
                onConnectWallet={handleConnectWallet}
                onBuyPremium={handleBuyPremium}
              />
            }
          />
          <Route path="/account" element={<AccountView user={user} />} />
          <Route
            path="/tickets/:ticketId"
            element={
              <TicketDetailPage
                tickets={tickets}
                user={user}
                onSendComment={handleSendTicketComment}
                onChangeStatus={handleTicketStatusChange}
              />
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
    </Routes>
  )
}

export default App



