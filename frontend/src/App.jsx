import { useState } from 'react'
import './App.css'

const navItems = [
  { id: 'home', label: 'Головна' },
  { id: 'account', label: 'Акаунт' },
]

const statusLabels = {
  open: 'Відкрито',
  pending: 'В очікуванні',
  resolved: 'Вирішено',
  closed: 'Закрито',
}

const steps = [
  'Користувач описує проблему і створює заявку (ticket).',
  'Система зберігає заявку та присвоює номер.',
  'Агент підтримки переглядає запит і ставить статус.',
  'Агент відповідає, уточнює деталі та вирішує проблему.',
  'Заявка закривається, користувач бачить результат.',
]

const profileActivity = [
  'Оновлено налаштування email-сповіщень.',
  'Додано коментар до заявки HD-4108.',
  'Змінено роль: Агент підтримки.',
]

function HomeView({ onOpenAccount, tickets }) {
  return (
    <div className="view-grid">
      <section className="main-column">
        <article className="hero-card">
          <p className="eyebrow">Старт HelpDesk</p>
          <h1>Що таке HelpDesk простими словами</h1>
          <p>
            HelpDesk — це система підтримки, де користувачі створюють заявки, а команда підтримки
            переглядає їх, відповідає та закриває.
          </p>
          <div className="hero-actions">
            <button type="button" className="primary-btn">
              Створити заявку
            </button>
            <button type="button" className="secondary-btn">
              Переглянути всі заявки
            </button>
          </div>
        </article>

        <article className="panel-card">
          <h2>Основна ідея ticket-системи</h2>
          <ol className="steps-list">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </article>

        <article className="panel-card">
          <div className="panel-header">
            <h2>Останні заявки</h2>
            <button type="button" className="link-btn">
              Усі заявки
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Предмет</th>
                  <th>Статус</th>
                  <th>Оновлено</th>
                </tr>
              </thead>
              <tbody>
                {tickets.length === 0 && (
                  <tr>
                    <td className="empty-row" colSpan="4">
                      Заявок поки немає. Тут зʼявляться нові tickets, які додасть команда.
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
            <div className="avatar">УЛ</div>
            <div>
              <p className="name">Імʼя Прізвище</p>
              <p className="role">Агент підтримки</p>
            </div>
          </div>
          <dl className="info-list">
            <div>
              <dt>Email</dt>
              <dd>user@helpdesk.app</dd>
            </div>
            <div>
              <dt>Команда</dt>
              <dd>Підтримка 1 лінії</dd>
            </div>
            <div>
              <dt>Часовий пояс</dt>
              <dd>UTC+02:00</dd>
            </div>
          </dl>
          <button type="button" className="primary-btn full" onClick={onOpenAccount}>
            Відкрити акаунт
          </button>
        </article>

        <article className="panel-card">
          <h3>Швидкі дії</h3>
          <div className="quick-actions">
            <button type="button">Нова заявка</button>
            <button type="button">Мої заявки</button>
            <button type="button">Налаштування профілю</button>
            <button type="button">Вийти з системи</button>
          </div>
        </article>
      </aside>
    </div>
  )
}

function AccountView() {
  return (
    <div className="account-layout">
      <article className="panel-card account-main">
        <div className="account-head">
          <div className="avatar large">УЛ</div>
          <div>
            <h1>Імʼя Прізвище</h1>
            <p>Агент підтримки • Команда першої лінії</p>
          </div>
        </div>

        <div className="form-grid">
          <label>
            Повне імʼя
            <input type="text" value="Імʼя Прізвище" readOnly />
          </label>
          <label>
            Робочий email
            <input type="email" value="user@helpdesk.app" readOnly />
          </label>
          <label>
            Телефон
            <input type="text" value="+380 00 000 00 00" readOnly />
          </label>
          <label>
            Часовий пояс
            <input type="text" value="UTC+02:00" readOnly />
          </label>
        </div>

        <div className="account-actions">
          <button type="button" className="primary-btn">
            Редагувати профіль
          </button>
          <button type="button" className="secondary-btn">
            Змінити пароль
          </button>
        </div>
      </article>

      <article className="panel-card">
        <h2>Налаштування акаунта</h2>
        <div className="toggle-list">
          <label>
            <input type="checkbox" defaultChecked />
            Отримувати email-сповіщення про нові заявки
          </label>
          <label>
            <input type="checkbox" defaultChecked />
            Отримувати push-повідомлення про зміну статусу
          </label>
          <label>
            <input type="checkbox" />
            Темна тема (плейсхолдер)
          </label>
        </div>
      </article>

      <article className="panel-card">
        <h2>Остання активність</h2>
        <ul className="activity-list">
          {profileActivity.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
      </article>
    </div>
  )
}

function App() {
  const [activeView, setActiveView] = useState('home')
  const recentTickets = []

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span>HD</span>
          <div>
            <p>HelpDesk</p>
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
        </nav>
      </header>

      {activeView === 'home' ? (
        <HomeView onOpenAccount={() => setActiveView('account')} tickets={recentTickets} />
      ) : (
        <AccountView />
      )}
    </div>
  )
}

export default App
