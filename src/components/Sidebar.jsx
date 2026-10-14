import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { hasRole } from '../lib/roles.js'
import './Sidebar.css'

const topLinks = [
  { to: '/', label: 'Overview', end: true },
  { to: '/calendar', label: 'Calendar' },
]

const groups = [
  {
    label: 'Data',
    links: [
      { to: '/clients', label: 'Clients' },
      { to: '/analytics', label: 'Analytics' },
    ],
  },
  {
    label: 'Features',
    links: [
      { to: '/invoices', label: 'Invoice Builder', role: 'Admin' },
      { to: '/payslips', label: 'Payslip Generator', role: 'Admin' },
    ],
  },
  {
    label: 'Tasks',
    links: [
      { to: '/tasks', label: 'Tasks (Ads)' },
      { to: '/content', label: 'Tasks (Content)' },
    ],
  },
]

const bottomLinks = [{ to: '/settings', label: 'Settings' }]

function NavLinks({ links, user }) {
  return links
    .filter((link) => !link.role || hasRole(user?.role, link.role))
    .map((link) => (
      <NavLink
        key={link.to}
        to={link.to}
        end={link.end}
        className={({ isActive }) => (isActive ? 'sidebar-link sidebar-link-active' : 'sidebar-link')}
      >
        {link.label}
      </NavLink>
    ))
}

function Sidebar() {
  const { user } = useAuth()

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">Bliss Digital</div>
      <nav className="sidebar-nav">
        <NavLinks links={topLinks} user={user} />

        {groups.map((group) => {
          const visibleLinks = group.links.filter((link) => !link.role || hasRole(user?.role, link.role))
          if (visibleLinks.length === 0) return null
          return (
            <div key={group.label} className="sidebar-group">
              <div className="sidebar-group-label">{group.label}</div>
              <NavLinks links={visibleLinks} user={user} />
            </div>
          )
        })}

        <div className="sidebar-group">
          <NavLinks links={bottomLinks} user={user} />
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
        </div>
      </nav>
    </aside>
  )
}

export default Sidebar
