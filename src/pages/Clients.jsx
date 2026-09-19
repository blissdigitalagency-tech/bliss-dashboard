import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { hasRole } from '../lib/roles.js'
import { PACKAGE_OPTIONS, packageBadgeClass } from '../lib/packages.js'
import './Clients.css'

const CLIENT_ID_COLUMN = 'Client-ID'
const PACKAGE_COLUMN = 'Package'
const STATUS_COLUMN = 'Status'
const STATUS_OPTIONS = ['Active', 'Paused', 'Inactive']
const DOCLANG_COLUMN = 'DocLang'
const DOCLANG_OPTIONS = ['EN', 'ID']
const DATE_COLUMNS = new Set(['Start Date', 'Renewal'])
const DATE_ROW_COLUMNS = ['Start Date', 'Renewal']
const BILLING_COLUMNS = new Set(['BillTo_PT', 'BillTo_Business', 'BillTo_Name', 'DocLang'])
const REQUIRED_COLUMNS = ['Client-ID', 'Client Business Name', 'Client PIC', 'Contact No.']

function isBillingColumn(column) {
  return BILLING_COLUMNS.has(column)
}

function findMissingRequiredFields(columns, values) {
  return REQUIRED_COLUMNS.filter(
    (col) => columns.includes(col) && !String(values[col] ?? '').trim()
  )
}

function statusBadgeClass(status) {
  if (status === 'Active') return 'badge-active'
  if (status === 'Paused') return 'badge-paused'
  if (status === 'Inactive') return 'badge-inactive'
  return ''
}

const MAX_VISIBLE_PACKAGES = 4

function PackageBadges({ value }) {
  const tags = (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const visible = tags.slice(0, MAX_VISIBLE_PACKAGES)
  const hidden = tags.slice(MAX_VISIBLE_PACKAGES)

  return (
    <div className="client-package-tags">
      {visible.map((tag) => (
        <span key={tag} className={`badge ${packageBadgeClass(tag)} client-package-tag`}>
          {tag}
        </span>
      ))}
      {hidden.length > 0 && (
        <span className="badge badge-inactive client-package-more" title={hidden.join(', ')}>
          +{hidden.length} more
        </span>
      )}
    </div>
  )
}

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

  if (column === STATUS_COLUMN) {
    return (
      <label className="client-field">
        <span className="client-field-label">{column}</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="task-input"
        >
          <option value="">— Select status —</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    )
  }

  if (column === DOCLANG_COLUMN) {
    return (
      <label className="client-field">
        <span className="client-field-label">{column}</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="task-input"
        >
          <option value="">— Select language —</option>
          {DOCLANG_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    )
  }

  if (DATE_COLUMNS.has(column)) {
    return (
      <label className="client-field">
        <span className="client-field-label">{column}</span>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="task-input"
        />
      </label>
    )
  }

  return (
    <label className="client-field">
      <span className="client-field-label">{column}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={column}
        className="task-input"
      />
    </label>
  )
}

function ClientFormSections({ columns, values, onChange, onTogglePackage, clientIdReadOnly }) {
  const nonBilling = columns.filter((col) => !isBillingColumn(col))
  const mainColumns = nonBilling.filter(
    (col) => col !== STATUS_COLUMN && !DATE_ROW_COLUMNS.includes(col)
  )
  const dateColumns = DATE_ROW_COLUMNS.filter((col) => nonBilling.includes(col))
  const hasStatus = nonBilling.includes(STATUS_COLUMN)

  function renderField(col) {
    return col === CLIENT_ID_COLUMN && clientIdReadOnly ? (
      <div key={col} className="client-readonly-field">
        <span className="client-field-label">{col}</span>
        <div className="client-readonly-value">{values[col]}</div>
      </div>
    ) : (
      <ClientField
        key={col}
        column={col}
        value={values[col] || ''}
        onChange={(value) => onChange(col, value)}
        onTogglePackage={onTogglePackage}
      />
    )
  }

  return (
    <>
      <div className="client-form-section">
        <h3 className="client-form-section-title">Client Information</h3>
        <div className="task-form">{mainColumns.map(renderField)}</div>
        {hasStatus && <div className="task-form">{renderField(STATUS_COLUMN)}</div>}
        {dateColumns.length > 0 && (
          <div className="task-form">{dateColumns.map(renderField)}</div>
        )}
      </div>

      {columns.some(isBillingColumn) && (
        <div className="client-form-section">
          <h3 className="client-form-section-title">Billing Information</h3>
          <div className="task-form">{columns.filter(isBillingColumn).map(renderField)}</div>
        </div>
      )}
    </>
  )
}

function EditClientModal({ clientId, columns, values, onChange, onTogglePackage, onClose, onSave, saving, error }) {
  return (
    <div className="task-modal-overlay">
      <form className="task-modal client-edit-modal" onClick={(e) => e.stopPropagation()} onSubmit={onSave}>
        <div className="task-modal-header">
          <h2>Edit Client</h2>
          <button type="button" className="task-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {error && <div className="login-error">{error}</div>}

        <ClientFormSections
          columns={columns}
          values={values}
          onChange={onChange}
          onTogglePackage={onTogglePackage}
          clientIdReadOnly
        />

        <div className="task-modal-actions">
          <button type="button" className="btn-plain" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

function AddClientModal({ columns, values, onChange, onTogglePackage, onClose, onSave, saving, error }) {
  return (
    <div className="task-modal-overlay">
      <form className="task-modal client-edit-modal" onClick={(e) => e.stopPropagation()} onSubmit={onSave}>
        <div className="task-modal-header">
          <h2>New Client</h2>
          <button type="button" className="task-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {error && <div className="login-error">{error}</div>}

        <ClientFormSections
          columns={columns}
          values={values}
          onChange={onChange}
          onTogglePackage={onTogglePackage}
        />

        <div className="task-modal-actions">
          <button type="button" className="btn-plain" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Adding...' : 'Add Client'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Clients() {
  const { user } = useAuth()
  const canEdit = hasRole(user?.role, 'Admin')

  const [columns, setColumns] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [formValues, setFormValues] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  const [editingId, setEditingId] = useState(null)
  const [editValues, setEditValues] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)

  const [newColumnName, setNewColumnName] = useState('')
  const [addingColumn, setAddingColumn] = useState(false)

  const [statusFilter, setStatusFilter] = useState('active')
  const [packageFilter, setPackageFilter] = useState('all')

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      const status = row[STATUS_COLUMN] || ''
      if (statusFilter === 'active' && status !== 'Active') return false
      if (statusFilter === 'inactive_paused' && status !== 'Inactive' && status !== 'Paused') {
        return false
      }

      if (packageFilter !== 'all') {
        const packages = (row[PACKAGE_COLUMN] || '').split(',').map((s) => s.trim())
        if (!packages.includes(packageFilter)) return false
      }

      return true
    })
  }, [rows, statusFilter, packageFilter])

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
    const missing = findMissingRequiredFields(columns, formValues)
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.join(', ')}`)
      return
    }
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
      setShowAddModal(false)
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

  async function handleSaveEdit(event) {
    event.preventDefault()
    const clientId = editingId
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
        <div className="task-header-actions">
          <button
            type="button"
            className="btn-plain"
            onClick={loadClients}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          {canEdit && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setError('')
                setShowAddModal(true)
              }}
            >
              + Add Client
            </button>
          )}
          {canEdit &&
            (addingColumn ? (
              <form className="task-header-inline-form" onSubmit={handleAddColumn}>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="New column name"
                  className="task-input"
                  autoFocus
                />
                <button type="submit" className="btn-primary">
                  Add
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
              <button type="button" className="btn-plain" onClick={() => setAddingColumn(true)}>
                + Add column
              </button>
            ))}
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}

      <div className="clients-filter-row">
        <div className="clients-filter-group">
          <span className="client-field-label">Status</span>
          <div className="clients-filter-chips">
            {[
              { key: 'active', label: 'Active Only' },
              { key: 'inactive_paused', label: 'Inactive & Paused' },
              { key: 'all', label: 'All' },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={statusFilter === opt.key ? 'task-chip task-chip-active' : 'task-chip'}
                onClick={() => setStatusFilter(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <label className="clients-filter-group">
          <span className="client-field-label">Package</span>
          <select
            value={packageFilter}
            onChange={(e) => setPackageFilter(e.target.value)}
            className="task-input"
          >
            <option value="all">All Packages</option>
            {PACKAGE_OPTIONS.map((pkg) => (
              <option key={pkg} value={pkg}>
                {pkg}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p className="page-intro">Loading...</p>
      ) : (
        <>
          <p className="clients-filter-count">
            Showing {visibleRows.length} of {rows.length} clients
            {visibleRows.length === 0 && rows.length > 0 && (
              <> — try switching Status to "All" if you expected results here.</>
            )}
          </p>
          <div className="clients-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>{columns[0]}</th>
                {canEdit && <th className="client-actions-col">Actions</th>}
                {columns.slice(1).map((col) => (
                  <th key={col}>
                    {col}
                    {canEdit && (
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
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row[CLIENT_ID_COLUMN]}>
                  <td>{row[columns[0]]}</td>
                  {canEdit && (
                    <td className="data-table-actions client-actions-col">
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
                  {columns.slice(1).map((col) => (
                    <td key={col}>
                      {col === PACKAGE_COLUMN ? (
                        <PackageBadges value={row[col]} />
                      ) : col === STATUS_COLUMN && row[col] ? (
                        <span className={`badge ${statusBadgeClass(row[col])}`}>{row[col]}</span>
                      ) : (
                        row[col]
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}

      {showAddModal && (
        <AddClientModal
          columns={columns}
          values={formValues}
          onChange={updateField}
          onTogglePackage={togglePackage}
          onClose={() => {
            setShowAddModal(false)
            setFormValues({})
          }}
          onSave={handleAddClient}
          saving={submitting}
          error={error}
        />
      )}

      {editingId && (
        <EditClientModal
          clientId={editingId}
          columns={columns}
          values={editValues}
          onChange={updateEditField}
          onTogglePackage={toggleEditPackage}
          onClose={cancelEdit}
          onSave={handleSaveEdit}
          saving={savingEdit}
          error={error}
        />
      )}
    </div>
  )
}

export default Clients
