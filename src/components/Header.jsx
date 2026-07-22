import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import './Header.css'

const titles = {
  '/': 'Overview',
  '/clients': 'Clients',
  '/invoices': 'Invoice Builder',
  '/tasks': 'Tasks',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
  '/admin/users': 'Admin · Users',
}

function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const title = titles[location.pathname] ?? 'Dashboard'

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="header">
      <h1 className="header-title">{title}</h1>
      {user && (
        <div className="header-user">
          <span className="header-user-name">
            {user.name} <span className="header-user-role">({user.role})</span>
          </span>
          <button type="button" className="header-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      )}
    </header>
  )
}

export default Header
