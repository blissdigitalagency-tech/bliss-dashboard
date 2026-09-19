import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import './Settings.css'

function AccountSection({ user }) {
  return (
    <section className="settings-section">
      <h2 className="settings-section-title">Account</h2>
      <p className="page-intro">Your account details. Contact a Superadmin to change these.</p>
      <div className="settings-info-grid">
        <div>
          <div className="settings-info-label">Name</div>
          <div className="settings-info-value">{user?.name}</div>
        </div>
        <div>
          <div className="settings-info-label">Username</div>
          <div className="settings-info-value">{user?.username}</div>
        </div>
        <div>
          <div className="settings-info-label">Role</div>
          <div className="settings-info-value">{user?.role}</div>
        </div>
      </div>
    </section>
  )
}

function SecuritySection() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not change password')
      setSuccess('Password changed successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="settings-section">
      <h2 className="settings-section-title">Security</h2>
      <p className="page-intro">Change your own password.</p>

      {error && <div className="login-error">{error}</div>}
      {success && <div className="settings-success">{success}</div>}

      <form className="settings-form" onSubmit={handleSubmit}>
        <label className="task-modal-field">
          Current password
          <input
            type="password"
            className="task-input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        <label className="task-modal-field">
          New password
          <input
            type="password"
            className="task-input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <label className="task-modal-field">
          Confirm new password
          <input
            type="password"
            className="task-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Changing...' : 'Change Password'}
        </button>
      </form>
    </section>
  )
}

function DisplaySection() {
  const { theme, setTheme } = useTheme()
  const options = [
    { key: 'light', label: 'Light' },
    { key: 'dark', label: 'Dark' },
    { key: 'system', label: 'System' },
  ]

  return (
    <section className="settings-section">
      <h2 className="settings-section-title">Display</h2>
      <p className="page-intro">Choose how the dashboard looks on this device.</p>
      <div className="settings-theme-options">
        {options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            className={theme === opt.key ? 'task-chip task-chip-active' : 'task-chip'}
            onClick={() => setTheme(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </section>
  )
}

const PERMISSION_MATRIX = [
  { action: 'View Clients', User: true, Editor: true, Admin: true, Superadmin: true },
  { action: 'Add / edit / delete Clients', User: false, Editor: false, Admin: true, Superadmin: true },
  { action: 'View Invoices', User: false, Editor: false, Admin: true, Superadmin: true },
  { action: 'Create / manage Invoices', User: false, Editor: false, Admin: true, Superadmin: true },
  { action: 'View Tasks', User: true, Editor: true, Admin: true, Superadmin: true },
  { action: 'Create / edit / delete Tasks', User: false, Editor: true, Admin: true, Superadmin: true },
  { action: 'View Calendar', User: true, Editor: true, Admin: true, Superadmin: true },
  { action: 'Create / edit / delete Calendar events', User: false, Editor: false, Admin: true, Superadmin: true },
  { action: 'Change own password', User: true, Editor: true, Admin: true, Superadmin: true },
  { action: 'Create / edit / delete user accounts', User: false, Editor: false, Admin: false, Superadmin: true },
]

const ROLE_COLUMNS = ['User', 'Editor', 'Admin', 'Superadmin']

function RolesPermissionsSection() {
  return (
    <section className="settings-section settings-section-wide">
      <h2 className="settings-section-title">Roles &amp; Permissions</h2>
      <p className="page-intro">
        Reference only &mdash; these rules are enforced in the backend and can't be changed from
        here. Ask a developer to adjust a route's permission if one of these needs to change.
      </p>
      <div className="settings-table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Action</th>
              {ROLE_COLUMNS.map((role) => (
                <th key={role}>{role}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_MATRIX.map((row) => (
              <tr key={row.action}>
                <td>{row.action}</td>
                {ROLE_COLUMNS.map((role) => (
                  <td key={role} className="settings-permission-cell">
                    {row[role] ? (
                      <span className="badge badge-active">Yes</span>
                    ) : (
                      <span className="settings-permission-no">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Settings() {
  const { user } = useAuth()

  return (
    <div className="page">
      <p className="page-intro">Manage your account, security, and display preferences.</p>
      <AccountSection user={user} />
      <SecuritySection />
      <DisplaySection />
      {user?.role === 'Superadmin' && <RolesPermissionsSection />}
    </div>
  )
}

export default Settings
