import { useEffect, useRef, useState } from 'react'
import { Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import './App.css'
import { useAppState } from './context/useAppState.js'

const navItems = [
  { id: 'home', path: '/', label: 'Головна' },
  { id: 'account', path: '/account', label: 'Акаунт' },
]

const statusLabels = {
  new: 'New',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  // legacy
  open: 'Open',
  pending: 'Pending',
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

// ticketCategories тепер завантажуються з API (передаються як prop)

const initialLoginForm = {
  username: '',
  password: '',
}

const initialRegisterForm = {
  username: '',
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

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? '')
    .join('') || 'HD'
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

  if (!form.username.trim()) {
    errors.username = 'Username is required.'
  }

  if (!form.password) {
    errors.password = 'Password is required.'
  }

  return errors
}

function validateRegisterForm(form) {
  const errors = {}

  if (!form.username.trim()) {
    errors.username = 'Username is required.'
  } else if (form.username.trim().length < 3) {
    errors.username = 'Username must be at least 3 characters long.'
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

function TicketCreationForm({ onCreateTicket, categories = [] }) {
  const [form, setForm] = useState(initialTicketForm)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
    setMessage('')
  }

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || [])
    setForm((prev) => ({ ...prev, files }))
    setErrors((prev) => ({ ...prev, files: '' }))
    setMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const validationErrors = validateTicketForm(form)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setUploading(true)
    await onCreateTicket({
      title: form.subject.trim(),
      category: form.category,
      description: form.description.trim(),
      files: form.files,
    })

    setMessage('Ticket was created successfully.')
    setForm(initialTicketForm)
    setErrors({})
    setUploading(false)
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
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
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

        {message ? <p className="form-message">{message}</p> : null}

        <button type="submit" className="primary-btn ticket-submit" disabled={uploading}>
          {uploading ? 'Creating...' : 'Create ticket'}
        </button>
      </form>
    </article>
  )
}

const FILTER_STATUSES = [
  { value: '', label: 'All statuses' },
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const FILTER_PRIORITIES = [
  { value: '', label: 'All priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

const FILTER_ORDERING = [
  { value: '-created_at', label: 'Newest first' },
  { value: 'created_at', label: 'Oldest first' },
  { value: '-priority', label: 'Priority ↓' },
  { value: 'status', label: 'Status' },
  { value: 'title', label: 'Title A–Z' },
]

function HomeView({ onOpenAccount, onOpenTicketDetails, tickets, user, onCreateTicket, onFetchTickets, categories }) {
  const ticketFormRef = useRef(null)
  const [filters, setFilters] = useState({ status: '', priority: '', ordering: '-created_at', search: '', my: false })
  const [search, setSearch] = useState('')
  const searchTimeout = useRef(null)

  // Завантажити заявки при зміні фільтрів
  useEffect(() => {
    const params = {}
    if (filters.status) params.status = filters.status
    if (filters.priority) params.priority = filters.priority
    if (filters.ordering) params.ordering = filters.ordering
    if (filters.search) params.search = filters.search
    if (filters.my) params.my = filters.my
    onFetchTickets(params)
  }, [filters, onFetchTickets])

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearch(value)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: value }))
    }, 400)
  }

  const handleResetFilters = () => {
    setFilters({ status: '', priority: '', ordering: '-created_at', search: '', my: false })
    setSearch('')
  }

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
          <TicketCreationForm onCreateTicket={onCreateTicket} categories={categories} />
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
            <h2>Recent tickets</h2>
            <button type="button" className="link-btn" onClick={handleResetFilters}>
              Reset filters
            </button>
          </div>

          <div className="ticket-filters">
            <input
              type="search"
              placeholder="Search tickets..."
              value={search}
              onChange={handleSearchChange}
              className="filter-search"
            />
            <select name="status" value={filters.status} onChange={handleFilterChange} className="filter-select">
              {FILTER_STATUSES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select name="priority" value={filters.priority} onChange={handleFilterChange} className="filter-select">
              {FILTER_PRIORITIES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select name="ordering" value={filters.ordering} onChange={handleFilterChange} className="filter-select">
              {FILTER_ORDERING.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

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
                {tickets.length === 0 && (
                  <tr>
                    <td className="empty-row" colSpan="6">
                      No tickets yet. New requests will appear here.
                    </td>
                  </tr>
                )}
                {tickets.map((ticket) => {
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
        <article className="panel-card account-preview">
          <div className="profile-row">
            <div className="avatar">{getInitials(user.fullName)}</div>
            <div>
              <p className="name">{user.fullName}</p>
              <p className="role">{user.roleDisplay}</p>
            </div>
          </div>
          <dl className="info-list">
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            {user.department && (
              <div>
                <dt>Department</dt>
                <dd>{user.department}</dd>
              </div>
            )}
            {user.phone && (
              <div>
                <dt>Phone</dt>
                <dd>{user.phone}</dd>
              </div>
            )}
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
            <button type="button" onClick={() => {
              setFilters({ status: '', priority: '', ordering: '-created_at', search: '', my: true })
            }}>
              My tickets
            </button>
            <button type="button" onClick={onOpenAccount}>
              Profile settings
            </button>
            <button type="button" onClick={() => window.open('https://docs.helpdesk.local', '_blank')}>
              Support docs
            </button>
          </div>
        </article>
      </aside>
    </div>
  )
}

function TicketDetailView({ ticket, currentUser, onBack, onSendComment, onChangeStatus, onUploadAttachment, onDeleteAttachment, onDeleteComment }) {
  const [commentBody, setCommentBody] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [commentError, setCommentError] = useState('')
  const [commentSending, setCommentSending] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef(null)

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    setUploadError('')
    for (const file of files) {
      setUploadProgress(0)
      const result = await onUploadAttachment(ticket.id, file, (pct) => setUploadProgress(pct))
      if (!result.ok) {
        setUploadError(result.error)
        break
      }
    }
    setUploadProgress(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

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
  const statusOptions = ['new', 'in_progress', 'resolved', 'closed']
  const isStaff = Boolean(currentUser?.isSupport || currentUser?.isStaff || currentUser?.role === 'admin')

  const handleCommentSubmit = async (event) => {
    event.preventDefault()
    const body = commentBody.trim()
    if (!body) {
      setCommentError('Comment message is required.')
      return
    }
    setCommentSending(true)
    await onSendComment({
      ticketId: ticket.id,
      isInternal,
      message: body,
    })
    setCommentBody('')
    setCommentError('')
    setCommentSending(false)
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
                <li key={file.id ?? `${ticket.id}-${file.original_name}`}>
                  <a href={file.url} target="_blank" rel="noreferrer">
                    {file.original_name ?? file.name}
                  </a>
                  <small>{file.size_kb ?? file.sizeKb} KB</small>
                  {(currentUser?.isSupport || file.uploaded_by?.id === currentUser?.id) && (
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => onDeleteAttachment(ticket.id, file.id)}
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="attachment-upload">
            <label className="secondary-btn" style={{ cursor: 'pointer' }}>
              {uploadProgress !== null ? `Uploading... ${uploadProgress}%` : 'Upload file'}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileUpload}
                disabled={uploadProgress !== null}
              />
            </label>
            {uploadError && <span className="field-error">{uploadError}</span>}
          </div>
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
                className={[
                  'comment-item',
                  comment.isInternal ? 'comment-support' : 'comment-user',
                  comment.isInternal ? 'comment-internal' : '',
                ].join(' ').trim()}
              >
                <div className="comment-meta">
                  <strong>
                    {comment.authorName}
                    {comment.isInternal && (
                      <span className="badge-internal"> [internal]</span>
                    )}
                  </strong>
                  <small>{comment.at}</small>
                  {(currentUser?.isSupport || comment.author?.id === currentUser?.id) && (
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => onDeleteComment(ticket.id, comment.id)}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <p>{comment.body}</p>
              </li>
            ))}
          </ul>
        )}

        <form className="comment-form" noValidate onSubmit={handleCommentSubmit}>
          {currentUser?.isSupport && (
            <div className="comment-role-row">
              <label>
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                />
                Internal note (visible to support only)
              </label>
            </div>
          )}

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

          <button type="submit" className="primary-btn" disabled={!canSubmitComment || commentSending}>
            {commentSending ? 'Sending...' : 'Send message'}
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
            <p>{user.roleDisplay}{user.department ? ` — ${user.department}` : ''}</p>
          </div>
        </div>

        <div className="form-grid">
          <label>
            Username
            <input type="text" value={user.username} readOnly />
          </label>
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
            <input type="text" value={user.phone || '—'} readOnly />
          </label>
          <label>
            Department
            <input type="text" value={user.department || '—'} readOnly />
          </label>
          <label>
            Role
            <input type="text" value={user.roleDisplay} readOnly />
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
            : 'Створіть акаунт для доступу до заявок і профілю.'}
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
              Username
              <input
                type="text"
                name="username"
                value={loginForm.username}
                onChange={onLoginChange}
                placeholder="your_username"
                aria-invalid={Boolean(loginErrors.username)}
              />
              {loginErrors.username && <span className="field-error">{loginErrors.username}</span>}
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
              Username
              <input
                type="text"
                name="username"
                value={registerForm.username}
                onChange={onRegisterChange}
                placeholder="your_username"
                aria-invalid={Boolean(registerErrors.username)}
              />
              {registerErrors.username && <span className="field-error">{registerErrors.username}</span>}
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
  const { isAuthenticated, userLoading } = useAppState()
  const location = useLocation()

  // Чекаємо поки профіль завантажиться з API
  if (userLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ color: '#6b7280', fontSize: '1rem' }}>Loading...</p>
      </div>
    )
  }

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
            <small>{user.roleDisplay}</small>
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

function TicketDetailPage({ tickets, user, onSendComment, onChangeStatus, onUploadAttachment, onDeleteAttachment, onDeleteComment }) {
  const { ticketId } = useParams()
  const navigate = useNavigate()
  // id може бути числом або рядком — порівнюємо як рядки
  const ticket = tickets.find((item) => String(item.id) === String(ticketId)) ?? null

  return (
    <TicketDetailView
      ticket={ticket}
      currentUser={user}
      onBack={() => navigate('/')}
      onSendComment={onSendComment}
      onChangeStatus={onChangeStatus}
      onUploadAttachment={onUploadAttachment}
      onDeleteAttachment={onDeleteAttachment}
      onDeleteComment={onDeleteComment}
    />
  )
}

function App() {
  const {
    isAuthenticated,
    user,
    tickets,
    categories,
    login,
    register,
    logout,
    fetchTickets,
    createTicket,
    updateTicket,
    deleteAttachment,
    uploadAttachment,
    addComment,
    removeComment,
  } = useAppState()
  const navigate = useNavigate()
  const location = useLocation()
  const [loginForm, setLoginForm] = useState(initialLoginForm)
  const [registerForm, setRegisterForm] = useState(initialRegisterForm)
  const [loginErrors, setLoginErrors] = useState({})
  const [registerErrors, setRegisterErrors] = useState({})
  const [formMessage, setFormMessage] = useState('')

  // Завантажити заявки після логіну (початкове завантаження без фільтрів)
  useEffect(() => {
    if (isAuthenticated) {
      fetchTickets()
    }
  }, [isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleLoginSubmit = async (event) => {
    event.preventDefault()
    const errors = validateLoginForm(loginForm)
    setLoginErrors(errors)
    if (Object.keys(errors).length > 0) return

    const result = await login({
      username: loginForm.username.trim(),
      password: loginForm.password,
    })

    if (!result.ok) {
      setFormMessage(result.error)
      return
    }

    setLoginForm(initialLoginForm)
    setFormMessage('')
    const fromPath = location.state?.from?.pathname
    const redirectPath =
      fromPath && fromPath !== '/login' && fromPath !== '/register' ? fromPath : '/'
    navigate(redirectPath, { replace: true })
  }

  const handleRegisterSubmit = async (event) => {
    event.preventDefault()
    const errors = validateRegisterForm(registerForm)
    setRegisterErrors(errors)
    if (Object.keys(errors).length > 0) return

    const result = await register({
      username: registerForm.username.trim(),
      email: registerForm.email.trim().toLowerCase(),
      password: registerForm.password,
      password2: registerForm.confirmPassword,
    })

    if (!result.ok) {
      setFormMessage(result.error)
      return
    }

    setRegisterForm(initialRegisterForm)
    setFormMessage('')
    navigate('/', { replace: true })
  }

  const handleCreateTicket = async ({ title, category, description, files = [] }) => {
    const result = await createTicket({ title, description, category: category || undefined })
    if (!result.ok) {
      setFormMessage(result.error)
      return
    }
    // Завантажити вкладення якщо є
    if (files.length > 0 && result.data?.id) {
      for (const file of files) {
        await uploadAttachment(result.data.id, file)
      }
    }
    navigate('/', { replace: true })
  }

  const handleLogout = async () => {
    await logout()
    setLoginForm(initialLoginForm)
    setRegisterForm(initialRegisterForm)
    setLoginErrors({})
    setRegisterErrors({})
    navigate('/login', { replace: true })
  }

  const handleSendTicketComment = async ({ ticketId, isInternal, message }) => {
    await addComment(ticketId, { body: message, isInternal })
  }

  const handleDeleteComment = async (ticketId, commentId) => {
    await removeComment(ticketId, commentId)
  }

  const handleTicketStatusChange = ({ ticketId, status }) => {
    updateTicket(ticketId, { status })
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
                onFetchTickets={fetchTickets}
                categories={categories}
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
                onUploadAttachment={uploadAttachment}
                onDeleteAttachment={deleteAttachment}
                onDeleteComment={handleDeleteComment}
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