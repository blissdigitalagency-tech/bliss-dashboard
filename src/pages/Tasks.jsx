import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Calendar, FileSpreadsheet, RefreshCw, X, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { hasRole } from '../lib/roles.js'
import { colorForIndex } from '../lib/boardColors.js'
import './Tasks.css'

const CLIENT_ID_COLUMN = 'Client-ID'
const CLIENT_NAME_COLUMN = 'Client Business Name'

const STAGES = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
]

const CATEGORY_OPTIONS = [
  'Client Work',
  'Content',
  'Admin',
  'Internal',
  'Ops',
  'Meeting',
  'Reporting',
  'Proposal',
]

const CATEGORY_BADGE_CLASS = {
  'Client Work': 'badge-blue',
  Content: 'badge-purple',
  Admin: 'badge-inactive',
  Internal: 'badge-teal',
  Ops: 'badge-indigo',
  Meeting: 'badge-warning',
  Reporting: 'badge-success',
  Proposal: 'badge-pink',
}

function categoryBadgeClass(category) {
  return CATEGORY_BADGE_CLASS[category] || 'badge-inactive'
}

function clientLabel(row) {
  return row?.[CLIENT_NAME_COLUMN] || row?.[CLIENT_ID_COLUMN] || 'Unknown client'
}

function stageIndex(stage) {
  const i = STAGES.findIndex((s) => s.key === stage)
  return i === -1 ? 0 : i
}

function stageLabel(stage) {
  return STAGES[stageIndex(stage)].label
}

function formatHistoryDate(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function TaskCard({ task, color, showClientBadge, clientName, assigneeNames, onOpen, draggable }) {
  const idx = stageIndex(task.stage)
  return (
    <button
      type="button"
      className="task-card"
      onClick={() => onOpen(task)}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', task.id)
        e.currentTarget.classList.add('task-card-dragging')
      }}
      onDragEnd={(e) => {
        e.currentTarget.classList.remove('task-card-dragging')
      }}
    >
      {showClientBadge && (
        <span className="task-card-client" style={{ background: color }}>
          {clientName}
        </span>
      )}
      <div className="task-card-title">{task.title}</div>
      <div className="task-card-meta">
        {task.category && (
          <span className={`badge ${categoryBadgeClass(task.category)}`}>{task.category}</span>
        )}
        {task.dueDate && (
          <span className="task-card-due">
            <Calendar size={12} /> {task.dueDate}
          </span>
        )}
      </div>
      {assigneeNames.length > 0 && (
        <div className="task-card-assignees">
          {assigneeNames.map((name) => (
            <span key={name} className="task-assignee-pill">
              {name}
            </span>
          ))}
        </div>
      )}
      <div className="task-card-footer">
        <span className="task-card-author">By {task.author || 'Unknown'}</span>
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

function Kanban({
  tasks,
  colorFor,
  showClientBadge,
  clientNameFor,
  assigneeNamesFor,
  onOpenTask,
  canDrag,
  onDropTask,
}) {
  const [dragOverStage, setDragOverStage] = useState(null)

  return (
    <div className="task-kanban">
      {STAGES.map((stage) => {
        const columnTasks = tasks.filter((t) => t.stage === stage.key)
        return (
          <div
            key={stage.key}
            className={
              dragOverStage === stage.key ? 'task-column task-column-drag-over' : 'task-column'
            }
            onDragOver={(e) => {
              if (!canDrag) return
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
            }}
            onDragEnter={() => canDrag && setDragOverStage(stage.key)}
            onDragLeave={(e) => {
              if (!canDrag) return
              if (!e.currentTarget.contains(e.relatedTarget)) setDragOverStage(null)
            }}
            onDrop={(e) => {
              if (!canDrag) return
              e.preventDefault()
              setDragOverStage(null)
              const taskId = e.dataTransfer.getData('text/plain')
              if (taskId) onDropTask(taskId, stage.key)
            }}
          >
            <div className="task-column-header">
              <span>{stage.label}</span>
              <span className="task-column-count">{columnTasks.length}</span>
            </div>
            <div className="task-column-body">
              {columnTasks.length === 0 && <p className="task-column-empty">No tasks</p>}
              {columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  color={colorFor(task.clientId)}
                  showClientBadge={showClientBadge}
                  clientName={clientNameFor(task.clientId)}
                  assigneeNames={assigneeNamesFor(task.assignees)}
                  onOpen={onOpenTask}
                  draggable={canDrag}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TaskFormFields({ values, onChange, readOnly, directory, assigneeNames }) {
  if (readOnly) {
    return (
      <div className="task-modal-readonly">
        <p>
          <strong>{values.title}</strong>
        </p>
        {values.category && (
          <p>
            Category: <span className={`badge ${categoryBadgeClass(values.category)}`}>{values.category}</span>
          </p>
        )}
        {values.dueDate && <p>Due: {values.dueDate}</p>}
        {assigneeNames.length > 0 && <p>Assigned to: {assigneeNames.join(', ')}</p>}
        {values.link && (
          <p>
            Link:{' '}
            <a href={values.link} target="_blank" rel="noreferrer">
              {values.link}
            </a>
          </p>
        )}
        {values.notes && <p className="task-modal-notes">{values.notes}</p>}
      </div>
    )
  }

  function toggleAssignee(userId) {
    const current = values.assignees || []
    const next = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId]
    onChange('assignees', next)
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
      <label className="task-modal-field">
        Category
        <input
          type="text"
          className="task-input"
          list="task-category-options"
          value={values.category}
          onChange={(e) => onChange('category', e.target.value)}
        />
        <datalist id="task-category-options">
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt} value={opt} />
          ))}
        </datalist>
      </label>
      <label className="task-modal-field">
        Due date
        <input
          type="date"
          className="task-input"
          value={values.dueDate}
          onChange={(e) => onChange('dueDate', e.target.value)}
        />
      </label>
      <div className="task-modal-field">
        Assignees
        <div className="task-assignee-picker">
          {directory.map((member) => (
            <label key={member.id} className="task-assignee-option">
              <input
                type="checkbox"
                checked={(values.assignees || []).includes(member.id)}
                onChange={() => toggleAssignee(member.id)}
              />
              {member.name}
            </label>
          ))}
          {directory.length === 0 && <span>No team members yet.</span>}
        </div>
      </div>
      <label className="task-modal-field">
        Link (optional)
        <input
          type="text"
          className="task-input"
          placeholder="https://..."
          value={values.link}
          onChange={(e) => onChange('link', e.target.value)}
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

function AddTaskModal({ clientId, directory, onClose, onCreated }) {
  const [values, setValues] = useState({
    title: '',
    category: '',
    dueDate: '',
    link: '',
    notes: '',
    assignees: [],
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
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...values, clientId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not create task')
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
          <h2>New Task</h2>
          <button type="button" className="task-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {error && <div className="login-error">{error}</div>}
        <TaskFormFields values={values} onChange={update} directory={directory} />
        <div className="task-modal-actions">
          <button type="submit" className="btn-primary" disabled={submitting}>
            Add Task
          </button>
        </div>
      </form>
    </div>
  )
}

function EditTaskModal({ task, canEdit, directory, assigneeNamesFor, onClose, onUpdated, onDeleted }) {
  const [values, setValues] = useState({
    title: task.title,
    category: task.category,
    dueDate: task.dueDate,
    link: task.link,
    notes: task.notes,
    assignees: task.assignees || [],
  })
  const [stage, setStage] = useState(task.stage)
  const [history, setHistory] = useState(task.history || [])
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
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not update task')
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

  async function moveStage(direction) {
    const nextIdx = idx + direction
    if (nextIdx < 0 || nextIdx >= STAGES.length) return
    try {
      const updated = await patch({ stage: STAGES[nextIdx].key })
      setStage(updated.stage)
      setHistory(updated.history || [])
    } catch {
      // error already shown inline
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete task "${task.title}"?`)) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Could not delete task')
      }
      onDeleted(task.id)
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
          <h2>{canEdit ? 'Edit Task' : 'Task Details'}</h2>
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
                  <strong>{stageLabel(entry.stage)}</strong> — {formatHistoryDate(entry.changedAt)}
                  {entry.changedBy ? ` by ${entry.changedBy}` : ''}
                </li>
              ))}
            </ul>
          </details>
        )}
        <TaskFormFields
          values={values}
          onChange={update}
          readOnly={!canEdit}
          directory={directory}
          assigneeNames={assigneeNamesFor(values.assignees)}
        />
        {canEdit && (
          <div className="task-modal-actions">
            <button
              type="button"
              className="task-modal-delete"
              onClick={handleDelete}
              disabled={saving}
              aria-label="Delete task"
            >
              <Trash2 size={16} />
            </button>
            <div className="task-modal-actions-spacer" />
            {idx > 0 && (
              <button type="button" className="btn-plain" onClick={() => moveStage(-1)} disabled={saving}>
                ← Back
              </button>
            )}
            <button type="submit" className="btn-plain" disabled={saving}>
              Save
            </button>
            {idx < STAGES.length - 1 && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => moveStage(1)}
                disabled={saving}
              >
                Advance to {STAGES[idx + 1].label} →
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  )
}

function TasksDashboard({ tasks, clientRows, setView }) {
  const total = tasks.length
  const done = tasks.filter((t) => t.stage === 'done').length
  const clientsWithTasks = new Set(tasks.map((t) => t.clientId)).size
  const completionRate = total ? Math.round((done / total) * 100) : 0
  const stageCounts = STAGES.map((s) => tasks.filter((t) => t.stage === s.key).length)

  return (
    <div className="page">
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-card-label">Clients with tasks</div>
          <div className="stat-card-value">{clientsWithTasks}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total tasks</div>
          <div className="stat-card-value">{total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Done</div>
          <div className="stat-card-value">{done}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Completion rate</div>
          <div className="stat-card-value">{completionRate}%</div>
        </div>
      </div>

      <div className="task-pipeline-bar">
        {total === 0 ? (
          <div className="task-pipeline-empty">No tasks yet</div>
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
          const clientTasks = tasks.filter((t) => t.clientId === clientId)
          const clientDone = clientTasks.filter((t) => t.stage === 'done').length
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
                    width: clientTasks.length ? `${(clientDone / clientTasks.length) * 100}%` : '0%',
                    background: colorForIndex(i),
                  }}
                />
              </div>
              <span className="task-client-progress-count">
                {clientDone}/{clientTasks.length}
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

function AllTasksView({
  tasks,
  clientRows,
  colorFor,
  clientNameFor,
  assigneeNamesFor,
  onOpenTask,
  canDrag,
  onDropTask,
}) {
  const [filterId, setFilterId] = useState('all')
  const filtered = filterId === 'all' ? tasks : tasks.filter((t) => t.clientId === filterId)

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
      <Kanban
        tasks={filtered}
        colorFor={colorFor}
        showClientBadge
        clientNameFor={clientNameFor}
        assigneeNamesFor={assigneeNamesFor}
        onOpenTask={onOpenTask}
        canDrag={canDrag}
        onDropTask={onDropTask}
      />
    </div>
  )
}

function ClientBoard({
  clientRow,
  color,
  tasks,
  canEdit,
  assigneeNamesFor,
  onOpenTask,
  onAdd,
  onDropTask,
}) {
  return (
    <div className="page">
      <div className="clients-intro-row">
        <div className="task-board-header">
          <span className="task-client-dot" style={{ background: color }} />
          <h2 className="task-board-title">{clientLabel(clientRow)}</h2>
          <span className="task-board-count">{tasks.length} tasks</span>
        </div>
        {canEdit && (
          <button type="button" className="btn-primary" onClick={onAdd}>
            <Plus size={16} /> New Task
          </button>
        )}
      </div>
      <Kanban
        tasks={tasks}
        colorFor={() => color}
        showClientBadge={false}
        clientNameFor={() => clientLabel(clientRow)}
        assigneeNamesFor={assigneeNamesFor}
        onOpenTask={onOpenTask}
        canDrag={canEdit}
        onDropTask={onDropTask}
      />
    </div>
  )
}

function TeamView({
  tasks,
  directory,
  colorFor,
  clientNameFor,
  assigneeNamesFor,
  onOpenTask,
  canDrag,
  onDropTask,
}) {
  const [selectedId, setSelectedId] = useState(null)

  const tasksFor = (memberId) => tasks.filter((t) => (t.assignees || []).includes(memberId))

  if (directory.length === 0) {
    return <p className="page-intro">No team accounts found.</p>
  }

  if (selectedId === null) {
    return (
      <div className="task-client-progress">
        {directory.map((member, i) => {
          const memberTasks = tasksFor(member.id)
          const memberDone = memberTasks.filter((t) => t.stage === 'done').length
          return (
            <button
              key={member.id}
              type="button"
              className="task-client-progress-row"
              onClick={() => setSelectedId(member.id)}
            >
              <span className="task-client-dot" style={{ background: colorForIndex(i) }} />
              <span className="task-client-progress-name">{member.name}</span>
              <div className="task-client-progress-bar">
                <div
                  className="task-client-progress-fill"
                  style={{
                    width: memberTasks.length ? `${(memberDone / memberTasks.length) * 100}%` : '0%',
                    background: colorForIndex(i),
                  }}
                />
              </div>
              <span className="task-client-progress-count">
                {memberDone}/{memberTasks.length}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  const activeMember = directory.find((m) => m.id === selectedId)

  return (
    <div className="page">
      <div className="task-filter-chips">
        <button type="button" className="task-chip" onClick={() => setSelectedId(null)}>
          ← All Team
        </button>
        {directory.map((member) => (
          <button
            key={member.id}
            type="button"
            className={member.id === selectedId ? 'task-chip task-chip-active' : 'task-chip'}
            onClick={() => setSelectedId(member.id)}
          >
            {member.name}
          </button>
        ))}
      </div>
      <p className="page-intro">Tasks currently assigned to {activeMember?.name}.</p>
      <Kanban
        tasks={tasksFor(selectedId)}
        colorFor={colorFor}
        showClientBadge
        clientNameFor={clientNameFor}
        assigneeNamesFor={assigneeNamesFor}
        onOpenTask={onOpenTask}
        canDrag={canDrag}
        onDropTask={onDropTask}
      />
    </div>
  )
}

function MyTasksView({
  tasks,
  currentUserId,
  colorFor,
  clientNameFor,
  assigneeNamesFor,
  onOpenTask,
  canDrag,
  onDropTask,
}) {
  const myTasks = tasks.filter((t) => (t.assignees || []).includes(currentUserId))

  return (
    <div className="page">
      <p className="page-intro">Tasks assigned to you, across every client.</p>
      {myTasks.length === 0 ? (
        <p className="page-intro">Nothing assigned to you right now.</p>
      ) : (
        <Kanban
          tasks={myTasks}
          colorFor={colorFor}
          showClientBadge
          clientNameFor={clientNameFor}
          assigneeNamesFor={assigneeNamesFor}
          onOpenTask={onOpenTask}
          canDrag={canDrag}
          onDropTask={onDropTask}
        />
      )}
    </div>
  )
}

function Tasks() {
  const { user } = useAuth()
  const canEdit = hasRole(user?.role, 'Editor')

  const [clientRows, setClientRows] = useState([])
  const [tasks, setTasks] = useState([])
  const [directory, setDirectory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState('dashboard')
  const [editingTask, setEditingTask] = useState(null)
  const [addingForClient, setAddingForClient] = useState(null)
  const [exporting, setExporting] = useState(false)

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [clientsRes, tasksRes, directoryRes] = await Promise.all([
        fetch('/api/clients', { credentials: 'include' }),
        fetch('/api/tasks', { credentials: 'include' }),
        fetch('/api/users/directory', { credentials: 'include' }),
      ])
      const clientsData = await clientsRes.json()
      const tasksData = await tasksRes.json()
      const directoryData = await directoryRes.json()
      setClientRows(clientsData.rows || [])
      setTasks(Array.isArray(tasksData) ? tasksData : [])
      setDirectory(Array.isArray(directoryData) ? directoryData : [])
    } catch {
      setError('Could not load tasks')
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

  const assigneeNamesFor = useMemo(() => {
    const nameById = new Map(directory.map((m) => [m.id, m.name]))
    return (assigneeIds) => (assigneeIds || []).map((id) => nameById.get(id) || 'Unknown').filter(Boolean)
  }, [directory])

  function handleTaskCreated(task) {
    setTasks((prev) => [...prev, task])
  }

  function handleTaskUpdated(task) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)))
  }

  function handleTaskDeleted(id) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  async function handleDropTask(taskId, newStage) {
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.stage === newStage) return
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ stage: newStage }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not move task')
      handleTaskUpdated(data)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const ExcelJS = (await import('exceljs')).default
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('Tasks')
      sheet.columns = [
        { header: 'Client', key: 'client', width: 24 },
        { header: 'Title', key: 'title', width: 32 },
        { header: 'Stage', key: 'stage', width: 14 },
        { header: 'Category', key: 'category', width: 16 },
        { header: 'Due Date', key: 'dueDate', width: 14 },
        { header: 'Assignees', key: 'assignees', width: 24 },
        { header: 'Assigned By', key: 'author', width: 16 },
        { header: 'Link', key: 'link', width: 30 },
        { header: 'Notes', key: 'notes', width: 40 },
        { header: 'Created At', key: 'createdAt', width: 22 },
      ]
      tasks.forEach((t) => {
        sheet.addRow({
          client: clientNameFor(t.clientId),
          title: t.title,
          stage: STAGES[stageIndex(t.stage)].label,
          category: t.category,
          dueDate: t.dueDate,
          assignees: assigneeNamesFor(t.assignees).join(', '),
          author: t.author,
          link: t.link,
          notes: t.notes,
          createdAt: t.createdAt,
        })
      })
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Tasks_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError('Could not export tasks')
    } finally {
      setExporting(false)
    }
  }

  const activeClientRow = clientRows.find((row) => row[CLIENT_ID_COLUMN] === view)

  return (
    <div className="page">
      <div className="clients-intro-row">
        <p className="page-intro">
          Task tracker shared across the team, organized by client and pipeline stage.
        </p>
        <div className="task-header-actions">
          <button type="button" className="btn-plain" onClick={loadAll} disabled={loading}>
            <RefreshCw size={14} /> {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button type="button" className="btn-plain" onClick={handleExport} disabled={exporting}>
            <FileSpreadsheet size={14} /> {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}

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
          className={view === 'my' ? 'task-tab task-tab-active' : 'task-tab'}
          onClick={() => setView('my')}
        >
          My Tasks
        </button>
        <button
          type="button"
          className={view === 'all' ? 'task-tab task-tab-active' : 'task-tab'}
          onClick={() => setView('all')}
        >
          All Tasks
        </button>
        <button
          type="button"
          className={view === 'team' ? 'task-tab task-tab-active' : 'task-tab'}
          onClick={() => setView('team')}
        >
          <Users size={13} style={{ marginRight: 4, verticalAlign: -2 }} />
          Team
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
        <TasksDashboard tasks={tasks} clientRows={clientRows} setView={setView} />
      ) : view === 'my' ? (
        <MyTasksView
          tasks={tasks}
          currentUserId={user?.id}
          colorFor={colorFor}
          clientNameFor={clientNameFor}
          assigneeNamesFor={assigneeNamesFor}
          onOpenTask={setEditingTask}
          canDrag={canEdit}
          onDropTask={handleDropTask}
        />
      ) : view === 'all' ? (
        <AllTasksView
          tasks={tasks}
          clientRows={clientRows}
          colorFor={colorFor}
          clientNameFor={clientNameFor}
          assigneeNamesFor={assigneeNamesFor}
          onOpenTask={setEditingTask}
          canDrag={canEdit}
          onDropTask={handleDropTask}
        />
      ) : view === 'team' ? (
        <TeamView
          tasks={tasks}
          directory={directory}
          colorFor={colorFor}
          clientNameFor={clientNameFor}
          assigneeNamesFor={assigneeNamesFor}
          onOpenTask={setEditingTask}
          canDrag={canEdit}
          onDropTask={handleDropTask}
        />
      ) : activeClientRow ? (
        <ClientBoard
          clientRow={activeClientRow}
          color={colorFor(view)}
          tasks={tasks.filter((t) => t.clientId === view)}
          canEdit={canEdit}
          assigneeNamesFor={assigneeNamesFor}
          onOpenTask={setEditingTask}
          onAdd={() => setAddingForClient(view)}
          onDropTask={handleDropTask}
        />
      ) : (
        <p className="page-intro">Client not found.</p>
      )}

      {addingForClient && (
        <AddTaskModal
          clientId={addingForClient}
          directory={directory}
          onClose={() => setAddingForClient(null)}
          onCreated={handleTaskCreated}
        />
      )}

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          canEdit={canEdit}
          directory={directory}
          assigneeNamesFor={assigneeNamesFor}
          onClose={() => setEditingTask(null)}
          onUpdated={handleTaskUpdated}
          onDeleted={handleTaskDeleted}
        />
      )}
    </div>
  )
}

export default Tasks
