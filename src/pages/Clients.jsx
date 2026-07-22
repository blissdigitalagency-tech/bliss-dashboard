import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { hasRole } from '../lib/roles.js'
import { PACKAGE_OPTIONS } from '../lib/packages.js'
import './Clients.css'

const CLIENT_ID_COLUMN = 'Client-ID'
const PACKAGE_COLUMN = 'Package'
const DATE_COLUMNS = new Set(['Start Date', 'Renewal'])

function ClientField({ column, value, onChange, onTogglePackage }) {
  if (column === PACKAGE_COLUMN) {
    const selected = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    return (
      <div className="client-package-picker">
        <span className="client-package-picker-label">Package</span>
        {PACKAGE_OPTIONS.map((pkg) => (
          <label key={pkg} className="client-package-option">
            <input
              type="checkbox"
              checked={selected.includes(pkg)}
              onChange={() => onTogglePackage(pkg)}
            />
            {pkg}
          </label>
        ))}
      </div>
    )
  }

  if (DATE_COLUMNS.has(column)) {
    return (
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="task-input"
      />
    )
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={column}
      className="task-input"
    />
  )
}

function Clients() {
  const { user } = useAuth()
  const canEdit = hasRole(user?.role, 'Editor')

  const [columns, setColumns] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [formValues, setFormValues] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const [editingId, setEditingId] = useState(null)
  const [editValues, setEditValues] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)

  const [newColumnName, setNewColumnName] = useState('')
  const [addingColumn, setAddingColumn] = useState(false)

  async function loadClients() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/clients', { credentials: 'include' })
      const data = await res.json()
      setColumns(data.columns)
      setRows(data.rows)
    } catch {
      setError('Could not load clients')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClients()
  }, [])

  function updateField(col, value) {
    setFormValues((prev) => ({ ...prev, [col]: value }))
  }

  function togglePackage(pkg) {
    const current = (formValues[PACKAGE_COLUMN] || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const next = current.includes(pkg)
      ? current.filter((p) => p !== pkg)
      : [...current, pkg]
    updateField(PACKAGE_COLUMN, next.join(', '))
  }

  async function handleAddClient(event) {
    event.preventDefault()
    if (!formValues[CLIENT_ID_COLUMN]?.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formValues),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not add client')
      setFormValues({})
      await loadClients()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function startEdit(row) {
    setEditingId(row[CLIENT_ID_COLUMN])
    setEditValues({ ...row })
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValues({})
  }

  function updateEditField(col, value) {
    setEditValues((prev) => ({ ...prev, [col]: value }))
  }

  function toggleEditPackage(pkg) {
    const current = (editValues[PACKAGE_COLUMN] || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const next = current.includes(pkg)
      ? current.filter((p) => p !== pkg)
      : [...current, pkg]
    updateEditField(PACKAGE_COLUMN, next.join(', '))
  }

  async function handleSaveEdit(clientId) {
    setSavingEdit(true)
    setError('')
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editValues),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not update client')
      setRows((prev) => prev.map((row) => (row[CLIENT_ID_COLUMN] === clientId ? data : row)))
      setEditingId(null)
      setEditValues({})
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleRemoveClient(clientId) {
    if (!window.confirm(`Remove ${clientId}?`)) return
    setError('')
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Could not remove client')
      }
      await loadClients()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleAddColumn(event) {
    event.preventDefault()
    if (!newColumnName.trim()) return
    setError('')
    try {
      const res = await fetch('/api/clients/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newColumnName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not add column')
      setNewColumnName('')
      setAddingColumn(false)
      await loadClients()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleRemoveColumn(name) {
    if (!window.confirm(`Remove column "${name}" from every client?`)) return
    setError('')
    try {
      const res = await fetch(`/api/clients/columns/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not remove column')
      await loadClients()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="page">
      <div className="clients-intro-row">
        <p className="page-intro">
          Client list, read from and written to the client database.
        </p>
        <button
          type="button"
          className="btn-plain"
          onClick={loadClients}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {canEdit && (
        <form className="task-form" onSubmit={handleAddClient}>
          {columns.map((col) => (
            <ClientField
              key={col}
              column={col}
              value={formValues[col] || ''}
              onChange={(value) => updateField(col, value)}
              onTogglePackage={togglePackage}
            />
          ))}
          <button type="submit" className="btn-primary" disabled={submitting}>
            Add
          </button>
        </form>
      )}

      {canEdit &&
        (addingColumn ? (
          <form className="task-form" onSubmit={handleAddColumn}>
            <input
              type="text"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              placeholder="New column name"
              className="task-input"
              autoFocus
            />
            <button type="submit" className="btn-primary">
              Add Column
            </button>
            <button
              type="button"
              className="btn-plain"
              onClick={() => {
                setAddingColumn(false)
                setNewColumnName('')
              }}
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            type="button"
            className="invoice-add-row"
            onClick={() => setAddingColumn(true)}
          >
            + Add column
          </button>
        ))}

      {error && <div className="login-error">{error}</div>}

      {loading ? (
        <p className="page-intro">Loading...</p>
      ) : (
        <div className="clients-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col}>
                    {col}
                    {canEdit && col !== CLIENT_ID_COLUMN && (
                      <button
                        type="button"
                        className="row-remove"
                        onClick={() => handleRemoveColumn(col)}
                        aria-label={`Remove column ${col}`}
                      >
                        ×
                      </button>
                    )}
                  </th>
                ))}
                {canEdit && <th></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) =>
                editingId === row[CLIENT_ID_COLUMN] ? (
                  <tr key={row[CLIENT_ID_COLUMN]}>
                    {columns.map((col) =>
                      col === CLIENT_ID_COLUMN ? (
                        <td key={col}>{row[col]}</td>
                      ) : (
                        <td key={col}>
                          <ClientField
                            column={col}
                            value={editValues[col] || ''}
                            onChange={(value) => updateEditField(col, value)}
                            onTogglePackage={toggleEditPackage}
                          />
                        </td>
                      )
                    )}
                    {canEdit && (
                      <td className="data-table-actions">
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => handleSaveEdit(row[CLIENT_ID_COLUMN])}
                          disabled={savingEdit}
                        >
                          Save
                        </button>
                        <button type="button" className="btn-plain" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </td>
                    )}
                  </tr>
                ) : (
                  <tr key={row[CLIENT_ID_COLUMN]}>
                    {columns.map((col) => (
                      <td key={col}>
                        {col === PACKAGE_COLUMN
                          ? (row[col] || '')
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean)
                              .map((tag) => (
                                <span key={tag} className="badge badge-active client-package-tag">
                                  {tag}
                                </span>
                              ))
                          : row[col]}
                      </td>
                    ))}
                    {canEdit && (
                      <td className="data-table-actions">
                        <button type="button" className="btn-plain" onClick={() => startEdit(row)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="row-remove"
                          onClick={() => handleRemoveClient(row[CLIENT_ID_COLUMN])}
                          aria-label={`Remove ${row[CLIENT_ID_COLUMN]}`}
                        >
                          ×
                        </button>
                      </td>
                    )}
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Clients
