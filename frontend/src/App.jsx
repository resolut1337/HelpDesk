import { useRef, useState } from 'react'
import './App.css'

const navItems = [
  { id: 'home', label: 'Головна' },
  { id: 'account', label: 'Акаунт' },
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

const demoTickets = [
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

function TicketCreationForm({ onCreateTicket }) {
  const [form, setForm] = useState(initialTicketForm)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
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

  const handleSubmit = (event) => {
    event.preventDefault()
    const validationErrors = validateTicketForm(form)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    onCreateTicket({
      title: form.subject.trim(),
      category: form.category,
      attachmentsCount: form.files.length,
    })

    setMessage('Ticket was created successfully.')
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

        {message ? <p className="form-message">{message}</p> : null}

        <button type="submit" className="primary-btn ticket-submit">
          Create ticket
        </button>
      </form>
    </article>
  )
}

function HomeView({ onOpenAccount, onOpenTicketForm, tickets, user, onCreateTicket }) {
  const ticketFormRef = useRef(null)

  const focusTicketForm = () => {
    onOpenTicketForm()
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
          <TicketCreationForm onCreateTicket={onCreateTicket} />
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
            <button type="button" className="link-btn">
              View all
            </button>
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
                      <td>{ticket.id}</td>
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

function App() {
  const [activeView, setActiveView] = useState('home')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [loginForm, setLoginForm] = useState(initialLoginForm)
  const [registerForm, setRegisterForm] = useState(initialRegisterForm)
  const [loginErrors, setLoginErrors] = useState({})
  const [registerErrors, setRegisterErrors] = useState({})
  const [formMessage, setFormMessage] = useState('')
  const [tickets, setTickets] = useState(demoTickets)
  const [user, setUser] = useState({
    fullName: 'Guest User',
    email: 'guest@helpdesk.app',
    phone: '+380 00 000 00 00',
    timezone: 'UTC+02:00',
  })

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
    const fullName = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())

    setUser((prev) => ({ ...prev, fullName, email }))
    setIsAuthenticated(true)
    setActiveView('home')
    setLoginForm(initialLoginForm)
    setFormMessage('')
  }

  const handleRegisterSubmit = (event) => {
    event.preventDefault()
    const errors = validateRegisterForm(registerForm)
    setRegisterErrors(errors)

    if (Object.keys(errors).length > 0) return

    setUser((prev) => ({
      ...prev,
      fullName: registerForm.fullName.trim(),
      email: registerForm.email.trim().toLowerCase(),
    }))
    setIsAuthenticated(true)
    setActiveView('home')
    setRegisterForm(initialRegisterForm)
    setFormMessage('')
  }

  const handleCreateTicket = ({ title, category, attachmentsCount }) => {
    const nextNumber = 4109 + tickets.length
    const newTicket = {
      id: `HD-${nextNumber}`,
      title,
      category,
      attachmentsCount,
      status: 'open',
      updated: 'just now',
    }

    setTickets((prev) => [newTicket, ...prev])
    setActiveView('home')
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setAuthMode('login')
    setLoginErrors({})
    setRegisterErrors({})
    setFormMessage('You have signed out.')
  }

  if (!isAuthenticated) {
    return (
      <AuthPage
        authMode={authMode}
        setAuthMode={(mode) => {
          setAuthMode(mode)
          setFormMessage('')
          setLoginErrors({})
          setRegisterErrors({})
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
    )
  }

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
            <button
              key={item.id}
              type="button"
              className={activeView === item.id ? 'nav-btn active' : 'nav-btn'}
              onClick={() => setActiveView(item.id)}
            >
              {item.label}
            </button>
          ))}
          <button type="button" className="nav-btn" onClick={handleLogout}>
            Вийти
          </button>
        </nav>
      </header>

      {activeView === 'home' ? (
        <HomeView
          onOpenAccount={() => setActiveView('account')}
          onOpenTicketForm={() => setActiveView('home')}
          tickets={tickets}
          user={user}
          onCreateTicket={handleCreateTicket}
        />
      ) : (
        <AccountView user={user} />
      )}
    </div>
  )
}

export default App
