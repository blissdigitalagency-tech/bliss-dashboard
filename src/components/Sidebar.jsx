import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { hasRole } from '../lib/roles.js'
import './Sidebar.css'

const links = [
  { to: '/', label: 'Overview', end: true },
  { to: '/clients', label: 'Clients' },
  { to: '/invoices', label: 'Invoice Builder', role: 'Admin' },
  { to: '/tasks', label: 'Tasks (Ads)' },
  { to: '/content', label: 'Tasks (Content)' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/settings', label: 'Settings' },
]

function Sidebar() {
  const { user } = useAuth()

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">Bliss Digital</div>
      <nav className="sidebar-nav">
        {links
          .filter((link) => !link.role || hasRole(user?.role, link.role))
          .map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              isActive ? 'sidebar-link sidebar-link-active' : 'sidebar-link'
            }
          >
            {link.label}
          </NavLink>
        ))}
        {hasRole(user?.role, 'Superadmin') && (
          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              isActive ? 'sidebar-link sidebar-link-active' : 'sidebar-link'
            }
          >
            Admin &middot; Users
          </NavLink>
        )}
      </nav>
    </aside>
  )
}

export default Sidebar
