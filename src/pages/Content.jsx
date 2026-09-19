import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Clapperboard,
  Layers,
  LayoutGrid,
  CircleDot,
  AlertTriangle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { hasRole } from '../lib/roles.js'
import { colorForIndex } from '../lib/boardColors.js'
import './Content.css'

const CLIENT_ID_COLUMN = 'Client-ID'
const CLIENT_NAME_COLUMN = 'Client Business Name'
const PACKAGE_COLUMN = 'Package'
const ELIGIBLE_PACKAGES = ['Content Creation', 'Social Media Management']

function hasEligiblePackage(row) {
  const packages = (row?.[PACKAGE_COLUMN] || '').split(',').map((s) => s.trim())
  return ELIGIBLE_PACKAGES.some((pkg) => packages.includes(pkg))
}

const STAGES = [
  { key: 'planned', label: 'Planned' },
  { key: 'shooting', label: 'Shooting' },
  { key: 'editing', label: 'Editing' },
  { key: 'posted', label: 'Posted' },
]

const CONTENT_TYPES = [
  { key: 'Reels', icon: Clapperboard },
  { key: 'Feed', icon: Layers },
  { key: 'Carousel', icon: LayoutGrid },
  { key: 'Story', icon: CircleDot },
]

const PILLAR_OPTIONS = [
  'Education',
  'Promotion',
  'Engagement',
  'Behind The Scene',
  'Testimonial',
  'Entertainment/Trend',
  'Branding',
  'Product Highlight',
]

// Field required to leave a stage moving forward — mirrors the server's
// STAGE_EXIT_REQUIREMENT so the UI can show the same error instantly.
const STAGE_EXIT_REQUIREMENT = {
  shooting: { field: 'linkMaterial', label: 'Link Material' },
  editing: { field: 'linkResult', label: 'Link Result' },
}

function clientLabel(row) {
  return row?.[CLIENT_NAME_COLUMN] || row?.[CLIENT_ID_COLUMN] || 'Unknown client'
}

function stageIndex(stage) {
  const i = STAGES.findIndex((s) => s.key === stage)
  return i === -1 ? 0 : i
}

function typeIcon(type) {
  return CONTENT_TYPES.find((t) => t.key === type)?.icon
}

function monthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })
}

function currentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function shiftMonthKey(monthKey, delta) {
  const [year, month] = monthKey.split('-').map(Number)
  const d = new Date(year, month - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function missingExitField(item) {
  const req = STAGE_EXIT_REQUIREMENT[item.stage]
  if (!req) return null
  return String(item[req.field] ?? '').trim() ? null : req.label
}

function ContentCard({ item, color, showClientBadge, clientName, onOpen }) {
  const idx = stageIndex(item.stage)
  const Icon = typeIcon(item.type)
  const warning = missingExitField(item)

  return (
    <button type="button" className="task-card" onClick={() => onOpen(item)}>
      {showClientBadge && (
        <span className="task-card-client" style={{ background: color }}>
          {clientName}
        </span>
      )}
      <div className="task-card-title">
        {Icon && <Icon size={14} className="content-card-type-icon" />}
        {item.title}
      </div>
      <div className="task-card-meta">
        {item.pillar && <span className="badge badge-active">{item.pillar}</span>}
        {item.uploadDate && (
          <span className="task-card-due">
            <CalendarIcon size={12} /> {item.uploadDate}
          </span>
        )}
      </div>
      {warning && (
        <div className="content-card-warning">
          <AlertTriangle size={12} /> Needs {warning}
        </div>
      )}
      <div className="task-card-footer">
        <span className="task-card-author">By {item.author || 'Unknown'}</span>
        <span className="task-filmstrip">
          {STAGES.map((s, i) => (
            <span
              key={s.key}
              className="task-filmstrip-seg"
              style={i <= idx ? { background: color } : undefined}
            />
          ))}
        </span>
      </div>
    </button>
  )
}

function ContentKanban({ items, colorFor, showClientBadge, clientNameFor, onOpenItem }) {
  return (
    <div className="task-kanban">
      {STAGES.map((stage) => {
        const columnItems = items.filter((c) => c.stage === stage.key)
        return (
          <div key={stage.key} className="task-column">
            <div className="task-column-header">
              <span>{stage.label}</span>
              <span className="task-column-count">{columnItems.length}</span>
            </div>
            <div className="task-column-body">
              {columnItems.length === 0 && <p className="task-column-empty">No content</p>}
              {columnItems.map((item) => (
                <ContentCard
                  key={item.id}
                  item={item}
                  color={colorFor(item.clientId)}
                  showClientBadge={showClientBadge}
                  clientName={clientNameFor(item.clientId)}
                  onOpen={onOpenItem}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TypePicker({ value, onChange }) {
  return (
    <div className="task-modal-field">
      Type
      <div className="content-type-grid">
        {CONTENT_TYPES.map(({ key, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className={value === key ? 'content-type-option content-type-option-active' : 'content-type-option'}
            onClick={() => onChange(key)}
          >
            <Icon size={18} />
            {key}
          </button>
        ))}
      </div>
    </div>
  )
}

function ContentFormFields({ values, onChange, readOnly }) {
  if (readOnly) {
    return (
      <div className="task-modal-readonly">
        <p>
          <strong>{values.title}</strong>
        </p>
        {values.type && <p>Type: {values.type}</p>}
        {values.pillar && <p>Pillar: {values.pillar}</p>}
        {values.uploadDate && <p>Upload date: {values.uploadDate}</p>}
        {values.script && <p className="task-modal-notes">Script: {values.script}</p>}
        {values.notes && <p className="task-modal-notes">{values.notes}</p>}
      </div>
    )
  }

  return (
    <>
      <label className="task-modal-field">
        Title
        <input
          type="text"
          className="task-input"
          value={values.title}
          onChange={(e) => onChange('title', e.target.value)}
        />
      </label>
      <TypePicker value={values.type} onChange={(v) => onChange('type', v)} />
      <label className="task-modal-field">
        Pillar
        <input
          type="text"
          className="task-input"
          list="content-pillar-options"
          value={values.pillar}
          onChange={(e) => onChange('pillar', e.target.value)}
        />
        <datalist id="content-pillar-options">
          {PILLAR_OPTIONS.map((opt) => (
            <option key={opt} value={opt} />
          ))}
        </datalist>
      </label>
      <label className="task-modal-field">
        Target upload date
        <input
          type="date"
          className="task-input"
          value={values.uploadDate}
          onChange={(e) => onChange('uploadDate', e.target.value)}
        />
      </label>
      <label className="task-modal-field">
        Script
        <textarea
          className="task-input task-textarea"
          value={values.script}
          onChange={(e) => onChange('script', e.target.value)}
        />
      </label>
      <label className="task-modal-field">
        Notes
        <textarea
          className="task-input task-textarea"
          value={values.notes}
          onChange={(e) => onChange('notes', e.target.value)}
        />
      </label>
    </>
  )
}

function AddContentModal({ clientId, month, onClose, onCreated }) {
  const [values, setValues] = useState({
    title: '',
    type: '',
    pillar: '',
    uploadDate: '',
    script: '',
    notes: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function update(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!values.title.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...values, clientId, month }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not create content item')
      onCreated(data)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="task-modal-overlay">
      <form className="task-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="task-modal-header">
          <h2>New Content</h2>
          <button type="button" className="task-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {error && <div className="login-error">{error}</div>}
        <p className="task-modal-stage">
          Month: <strong>{monthLabel(month)}</strong>
        </p>
        <ContentFormFields values={values} onChange={update} />
        <div className="task-modal-actions">
          <button type="submit" className="btn-primary" disabled={submitting}>
            Add Content
          </button>
        </div>
      </form>
    </div>
  )
}

function EditContentModal({ item, canEdit, onClose, onUpdated, onDeleted }) {
  const [values, setValues] = useState({
    title: item.title,
    type: item.type,
    pillar: item.pillar,
    uploadDate: item.uploadDate,
    script: item.script,
    notes: item.notes,
    linkMaterial: item.linkMaterial,
    linkResult: item.linkResult,
    linkUpload: item.linkUpload,
    caption: item.caption,
  })
  const [stage, setStage] = useState(item.stage)
  const [history, setHistory] = useState(item.history || [])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const idx = stageIndex(stage)

  function update(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  async function patch(body) {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/content/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not update content item')
      onUpdated(data)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }

  async function handleSave(event) {
    event.preventDefault()
    try {
      await patch(values)
      onClose()
    } catch {
      // error already shown inline
    }
  }

  async function moveBack() {
    if (idx === 0) return
    try {
      const updated = await patch({ stage: STAGES[idx - 1].key })
      setStage(updated.stage)
      setHistory(updated.history || [])
    } catch {
      // error already shown inline
    }
  }

  async function moveForward() {
    if (idx === STAGES.length - 1) return
    const req = STAGE_EXIT_REQUIREMENT[stage]
    if (req && !String(values[req.field] ?? '').trim()) {
      setError(`Fill in "${req.label}" before advancing past ${STAGES[idx].label}`)
      return
    }
    try {
      const updated = await patch({ ...values, stage: STAGES[idx + 1].key })
      setStage(updated.stage)
      setHistory(updated.history || [])
    } catch {
      // error already shown inline
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete content "${item.title}"?`)) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/content/${item.id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Could not delete content item')
      }
      onDeleted(item.id)
      onClose()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="task-modal-overlay">
      <form className="task-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSave}>
        <div className="task-modal-header">
          <h2>{canEdit ? 'Edit Content' : 'Content Details'}</h2>
          <button type="button" className="task-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {error && <div className="login-error">{error}</div>}
        <p className="task-modal-stage">
          Stage: <strong>{STAGES[idx].label}</strong>
        </p>
        {history.length > 0 && (
          <details className="task-history">
            <summary>History ({history.length})</summary>
            <ul className="task-history-list">
              {history.map((entry, i) => (
                <li key={i}>
                  <strong>{STAGES[stageIndex(entry.stage)].label}</strong> — {entry.changedAt?.slice(0, 10)}
                  {entry.changedBy ? ` by ${entry.changedBy}` : ''}
                </li>
              ))}
            </ul>
          </details>
        )}

        <ContentFormFields values={values} onChange={update} readOnly={!canEdit} />

        {canEdit && idx >= 1 && (
          <label className="task-modal-field">
            Link Material {STAGE_EXIT_REQUIREMENT.shooting && stage === 'shooting' && '(required to advance)'}
            <input
              type="text"
              className="task-input"
              placeholder="https://..."
              value={values.linkMaterial}
              onChange={(e) => update('linkMaterial', e.target.value)}
              disabled={stage !== 'shooting'}
            />
          </label>
        )}
        {canEdit && idx >= 2 && (
          <label className="task-modal-field">
            Link Result {stage === 'editing' && '(required to advance)'}
            <input
              type="text"
              className="task-input"
              placeholder="https://..."
              value={values.linkResult}
              onChange={(e) => update('linkResult', e.target.value)}
              disabled={stage !== 'editing'}
            />
          </label>
        )}
        {canEdit && idx >= 3 && (
          <>
            <label className="task-modal-field">
              Link Upload
              <input
                type="text"
                className="task-input"
                placeholder="https://..."
                value={values.linkUpload}
                onChange={(e) => update('linkUpload', e.target.value)}
              />
            </label>
            <label className="task-modal-field">
              Caption
              <textarea
                className="task-input task-textarea"
                value={values.caption}
                onChange={(e) => update('caption', e.target.value)}
              />
            </label>
          </>
        )}

        {canEdit && (
          <div className="task-modal-actions">
            <button
              type="button"
              className="task-modal-delete"
              onClick={handleDelete}
              disabled={saving}
              aria-label="Delete content"
            >
              <Trash2 size={16} />
            </button>
            <div className="task-modal-actions-spacer" />
            {idx > 0 && (
              <button type="button" className="btn-plain" onClick={moveBack} disabled={saving}>
                ← Back
              </button>
            )}
            <button type="submit" className="btn-plain" disabled={saving}>
              Save
            </button>
            {idx < STAGES.length - 1 && (
              <button type="button" className="btn-primary" onClick={moveForward} disabled={saving}>
                Advance to {STAGES[idx + 1].label} →
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  )
}

function ContentDashboard({ items, clientRows, setView }) {
  const total = items.length
  const posted = items.filter((c) => c.stage === 'posted').length
  const clientsWithContent = new Set(items.map((c) => c.clientId)).size
  const completionRate = total ? Math.round((posted / total) * 100) : 0
  const stageCounts = STAGES.map((s) => items.filter((c) => c.stage === s.key).length)

  return (
    <div className="page">
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-card-label">Clients with content</div>
          <div className="stat-card-value">{clientsWithContent}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total content</div>
          <div className="stat-card-value">{total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Posted</div>
          <div className="stat-card-value">{posted}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Completion rate</div>
          <div className="stat-card-value">{completionRate}%</div>
        </div>
      </div>

      <div className="task-pipeline-bar">
        {total === 0 ? (
          <div className="task-pipeline-empty">No content this month</div>
        ) : (
          STAGES.map((s, i) => {
            const pct = (stageCounts[i] / total) * 100
            if (pct === 0) return null
            return (
              <div
                key={s.key}
                className="task-pipeline-segment"
                style={{ width: `${pct}%`, background: colorForIndex(i) }}
                title={`${s.label}: ${stageCounts[i]}`}
              />
            )
          })
        )}
      </div>

      <div className="task-client-progress">
        {clientRows.map((row, i) => {
          const clientId = row[CLIENT_ID_COLUMN]
          const clientItems = items.filter((c) => c.clientId === clientId)
          const clientPosted = clientItems.filter((c) => c.stage === 'posted').length
          return (
            <button
              key={clientId}
              type="button"
              className="task-client-progress-row"
              onClick={() => setView(clientId)}
            >
              <span className="task-client-dot" style={{ background: colorForIndex(i) }} />
              <span className="task-client-progress-name">{clientLabel(row)}</span>
              <div className="task-client-progress-bar">
                <div
                  className="task-client-progress-fill"
                  style={{
                    width: clientItems.length ? `${(clientPosted / clientItems.length) * 100}%` : '0%',
                    background: colorForIndex(i),
                  }}
                />
              </div>
              <span className="task-client-progress-count">
                {clientPosted}/{clientItems.length}
              </span>
            </button>
          )
        })}
        {clientRows.length === 0 && (
          <p className="page-intro">No clients yet — add one on the Clients page first.</p>
        )}
      </div>
    </div>
  )
}

function AllContentView({ items, clientRows, colorFor, clientNameFor, onOpenItem }) {
  const [filterId, setFilterId] = useState('all')
  const filtered = filterId === 'all' ? items : items.filter((c) => c.clientId === filterId)

  return (
    <div className="page">
      <div className="task-filter-chips">
        <button
          type="button"
          className={filterId === 'all' ? 'task-chip task-chip-active' : 'task-chip'}
          onClick={() => setFilterId('all')}
        >
          All Clients
        </button>
        {clientRows.map((row) => {
          const clientId = row[CLIENT_ID_COLUMN]
          return (
            <button
              key={clientId}
              type="button"
              className={filterId === clientId ? 'task-chip task-chip-active' : 'task-chip'}
              style={filterId === clientId ? { background: colorFor(clientId), color: '#fff' } : undefined}
              onClick={() => setFilterId(clientId)}
            >
              {clientLabel(row)}
            </button>
          )
        })}
      </div>
      <ContentKanban
        items={filtered}
        colorFor={colorFor}
        showClientBadge
        clientNameFor={clientNameFor}
        onOpenItem={onOpenItem}
      />
    </div>
  )
}

function ClientContentBoard({ clientRow, color, items, canEdit, onOpenItem, onAdd }) {
  return (
    <div className="page">
      <div className="clients-intro-row">
        <div className="task-board-header">
          <span className="task-client-dot" style={{ background: color }} />
          <h2 className="task-board-title">{clientLabel(clientRow)}</h2>
          <span className="task-board-count">{items.length} content</span>
        </div>
        {canEdit && (
          <button type="button" className="btn-primary" onClick={onAdd}>
            <Plus size={16} /> New Content
          </button>
        )}
      </div>
      <ContentKanban
        items={items}
        colorFor={() => color}
        showClientBadge={false}
        clientNameFor={() => clientLabel(clientRow)}
        onOpenItem={onOpenItem}
      />
    </div>
  )
}

function Content() {
  const { user } = useAuth()
  const canEdit = hasRole(user?.role, 'Editor')

  const [clientRows, setClientRows] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState('dashboard')
  const [monthKey, setMonthKey] = useState(currentMonthKey())
  const [editingItem, setEditingItem] = useState(null)
  const [addingForClient, setAddingForClient] = useState(null)

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [clientsRes, contentRes] = await Promise.all([
        fetch('/api/clients', { credentials: 'include' }),
        fetch('/api/content', { credentials: 'include' }),
      ])
      const clientsData = await clientsRes.json()
      const contentData = await contentRes.json()
      setClientRows((clientsData.rows || []).filter(hasEligiblePackage))
      setItems(Array.isArray(contentData) ? contentData : [])
    } catch {
      setError('Could not load content')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const colorFor = useMemo(() => {
    const indexById = new Map(clientRows.map((row, i) => [row[CLIENT_ID_COLUMN], i]))
    return (clientId) => colorForIndex(indexById.get(clientId) ?? 0)
  }, [clientRows])

  const clientNameFor = useMemo(() => {
    const rowById = new Map(clientRows.map((row) => [row[CLIENT_ID_COLUMN], row]))
    return (clientId) => clientLabel(rowById.get(clientId))
  }, [clientRows])

  const eligibleClientIds = useMemo(() => new Set(clientRows.map((row) => row[CLIENT_ID_COLUMN])), [clientRows])

  const monthItems = useMemo(
    () => items.filter((c) => c.month === monthKey && eligibleClientIds.has(c.clientId)),
    [items, monthKey, eligibleClientIds],
  )

  function handleCreated(item) {
    setItems((prev) => [...prev, item])
  }

  function handleUpdated(item) {
    setItems((prev) => prev.map((c) => (c.id === item.id ? item : c)))
  }

  function handleDeleted(id) {
    setItems((prev) => prev.filter((c) => c.id !== id))
  }

  const activeClientRow = clientRows.find((row) => row[CLIENT_ID_COLUMN] === view)

  return (
    <div className="page">
      <div className="clients-intro-row">
        <p className="page-intro">
          Content production tracker — planned, shot, edited, and posted, per client per month.
        </p>
        <button type="button" className="btn-plain" onClick={loadAll} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && <div className="login-error">{error}</div>}

      <div className="calendar-toolbar">
        <div className="calendar-nav">
          <button
            type="button"
            className="btn-plain"
            onClick={() => setMonthKey((m) => shiftMonthKey(m, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="calendar-month-label">{monthLabel(monthKey)}</span>
          <button
            type="button"
            className="btn-plain"
            onClick={() => setMonthKey((m) => shiftMonthKey(m, 1))}
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <button type="button" className="btn-plain" onClick={() => setMonthKey(currentMonthKey())}>
          This Month
        </button>
      </div>

      <div className="task-view-tabs">
        <button
          type="button"
          className={view === 'dashboard' ? 'task-tab task-tab-active' : 'task-tab'}
          onClick={() => setView('dashboard')}
        >
          Dashboard
        </button>
        <button
          type="button"
          className={view === 'all' ? 'task-tab task-tab-active' : 'task-tab'}
          onClick={() => setView('all')}
        >
          All Content
        </button>
        <select
          className={activeClientRow ? 'task-client-select task-client-select-active' : 'task-client-select'}
          value={activeClientRow ? view : ''}
          onChange={(e) => {
            if (e.target.value) setView(e.target.value)
          }}
        >
          <option value="" disabled>
            Jump to client…
          </option>
          {clientRows.map((row) => (
            <option key={row[CLIENT_ID_COLUMN]} value={row[CLIENT_ID_COLUMN]}>
              {clientLabel(row)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="page-intro">Loading...</p>
      ) : view === 'dashboard' ? (
        <ContentDashboard items={monthItems} clientRows={clientRows} setView={setView} />
      ) : view === 'all' ? (
        <AllContentView
          items={monthItems}
          clientRows={clientRows}
          colorFor={colorFor}
          clientNameFor={clientNameFor}
          onOpenItem={setEditingItem}
        />
      ) : activeClientRow ? (
        <ClientContentBoard
          clientRow={activeClientRow}
          color={colorFor(view)}
          items={monthItems.filter((c) => c.clientId === view)}
          canEdit={canEdit}
          onOpenItem={setEditingItem}
          onAdd={() => setAddingForClient(view)}
        />
      ) : (
        <p className="page-intro">Client not found.</p>
      )}

      {addingForClient && (
        <AddContentModal
          clientId={addingForClient}
          month={monthKey}
          onClose={() => setAddingForClient(null)}
          onCreated={handleCreated}
        />
      )}

      {editingItem && (
        <EditContentModal
          item={editingItem}
          canEdit={canEdit}
          onClose={() => setEditingItem(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}

export default Content
