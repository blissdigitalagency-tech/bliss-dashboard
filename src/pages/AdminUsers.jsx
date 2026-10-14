import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

function AdminUsers() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('User')
  const [submitting, setSubmitting] = useState(false)

  const [editingId, setEditingId] = useState(null)
  const [editUsername, setEditUsername] = useState('')
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState('User')
  const [editPassword, setEditPassword] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  function loadUsers() {
    setLoading(true)
    fetch('/api/users', { credentials: 'include' })
      .then((res) => res.json())
      .then(setUsers)
      .catch(() => setError('Could not load users'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function handleAdd(event) {
    event.preventDefault()
    if (!username.trim() || !password) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, name, password, role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not create user')
      setUsers([...users, data])
      setUsername('')
      setName('')
      setPassword('')
      setRole('User')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function startEdit(u) {
    setEditingId(u.id)
    setEditUsername(u.username)
    setEditName(u.name)
    setEditRole(u.role)
    setEditPassword('')
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditPassword('')
  }

  async function handleSaveEdit(id) {
    setSavingEdit(true)
    setError('')
    try {
      const body = { username: editUsername, name: editName, role: editRole }
      if (editPassword) body.password = editPassword

      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not update user')
      setUsers(users.map((u) => (u.id === id ? data : u)))
      setEditingId(null)
      setEditPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDelete(u) {
    if (!window.confirm(`Delete the account "${u.username}"? This can't be undone.`)) return
    setError('')
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Could not delete user')
      }
      setUsers(users.filter((existing) => existing.id !== u.id))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="page">
      <p className="page-intro">
        Superadmin only. Create accounts and assign roles &mdash; Superadmin
        (full access), Admin (Clients, Invoices, Tasks, and scheduling
        calendar events), Editor (Tasks only &mdash; for regular-level
        employees), User (view only).
      </p>

      <div className="backup-row">
        <a href="/api/backup" download className="btn-plain">
          Download backup
        </a>
        <span className="backup-hint">
          Zip of all dashboard data (users, clients, invoice history). Save one
          weekly somewhere off the server.
        </span>
      </div>

      <form className="task-form" onSubmit={handleAdd}>
        <input
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Username"
          className="task-input"
        />
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Display name"
          className="task-input"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className="task-input"
        />
        <select
          value={role}
          onChange={(event) => setRole(event.target.value)}
          className="task-input"
        >
          <option value="User">User</option>
          <option value="Editor">Editor</option>
          <option value="Admin">Admin</option>
          <option value="Superadmin">Superadmin</option>
        </select>
        <button type="submit" className="btn-primary" disabled={submitting}>
          Create
        </button>
      </form>

      {error && <div className="login-error">{error}</div>}

      {loading ? (
        <p className="page-intro">Loading...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Name</th>
              <th>Role</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) =>
              editingId === u.id ? (
                <tr key={u.id}>
                  <td>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="task-input"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="task-input"
                    />
                  </td>
                  <td>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="task-input"
                    >
                      <option value="User">User</option>
                      <option value="Editor">Editor</option>
                      <option value="Admin">Admin</option>
                      <option value="Superadmin">Superadmin</option>
                    </select>
                    <input
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="New password (optional)"
                      className="task-input"
                    />
                  </td>
                  <td className="data-table-actions">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleSaveEdit(u.id)}
                      disabled={savingEdit}
                    >
                      Save
                    </button>
                    <button type="button" className="btn-plain" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.name}</td>
                  <td>{u.role}</td>
                  <td className="data-table-actions">
                    <button type="button" className="btn-plain" onClick={() => startEdit(u)}>
                      Edit
                    </button>
                    {u.id !== currentUser?.id && (
                      <button
                        type="button"
                        className="row-remove"
                        onClick={() => handleDelete(u)}
                        aria-label={`Delete ${u.username}`}
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default AdminUsers
