import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { hasRole } from '../lib/roles.js'
import { colorForIndex } from '../lib/boardColors.js'
import { addDays } from '../lib/dateFormat.js'
import './Calendar.css'

const CLIENT_ID_COLUMN = 'Client-ID'
const CLIENT_NAME_COLUMN = 'Client Business Name'
const RENEWAL_COLUMN = 'Renewal'
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const SCHEDULE_CATEGORY_OPTIONS = ['Meeting', 'Agenda', 'Reminder', 'Other']

function toISO(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function monthLabel(date) {
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function buildMonthGrid(monthDate) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startOffset = firstOfMonth.getDay()
  const gridStart = new Date(year, month, 1 - startOffset)

  const days = []
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    days.push(d)
  }
  return days
}

function EventDetailModal({ event, clientNameFor, canManageSchedule, onClose, onEditSchedule, onDeleteSchedule }) {
  const navigate = useNavigate()
  return (
    <div className="task-modal-overlay">
      <div className="task-modal" onClick={(e) => e.stopPropagation()}>
        <div className="task-modal-header">
          <h2>{event.title}</h2>
          <button type="button" className="task-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="task-modal-readonly">
          <p>Type: {event.typeLabel}</p>
          {event.clientId && <p>Client: {clientNameFor(event.clientId)}</p>}
          <p>Date: {event.date}</p>
          {event.type === 'schedule' && event.raw.time && <p>Time: {event.raw.time}</p>}
          {event.type === 'schedule' && <p>Added by: {event.raw.createdBy}</p>}
          {event.detail && <p className="task-modal-notes">{event.detail}</p>}
        </div>
        {event.type === 'task' && (
          <div className="task-modal-actions">
            <button type="button" className="btn-plain" onClick={() => navigate('/tasks')}>
              Open in Tasks →
            </button>
          </div>
        )}
        {event.type === 'invoice' && (
          <div className="task-modal-actions">
            <button type="button" className="btn-plain" onClick={() => navigate('/invoices')}>
              Open in Invoices →
            </button>
          </div>
        )}
        {event.type === 'schedule' && canManageSchedule && (
          <div className="task-modal-actions">
            <button
              type="button"
              className="task-modal-delete"
              onClick={() => onDeleteSchedule(event.raw)}
              aria-label="Delete event"
            >
              <Trash2 size={16} />
            </button>
            <div className="task-modal-actions-spacer" />
            <button type="button" className="btn-primary" onClick={() => onEditSchedule(event.raw)}>
              Edit
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ScheduleModal({ initial, onClose, onSaved }) {
  const isEditing = Boolean(initial?.id)
  const [values, setValues] = useState({
    title: initial?.title || '',
    date: initial?.date || '',
    time: initial?.time || '',
    category: initial?.category || '',
    description: initial?.description || '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function update(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!values.title.trim() || !values.date) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(
        isEditing ? `/api/calendar-events/${initial.id}` : '/api/calendar-events',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(values),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save event')
      onSaved(data)
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
          <h2>{isEditing ? 'Edit Event' : 'New Event'}</h2>
          <button type="button" className="task-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {error && <div className="login-error">{error}</div>}
        <label className="task-modal-field">
          Title
          <input
            type="text"
            className="task-input"
            value={values.title}
            onChange={(e) => update('title', e.target.value)}
          />
        </label>
        <label className="task-modal-field">
          Date
          <input
            type="date"
            className="task-input"
            value={values.date}
            onChange={(e) => update('date', e.target.value)}
          />
        </label>
        <label className="task-modal-field">
          Time (optional)
          <input
            type="time"
            className="task-input"
            value={values.time}
            onChange={(e) => update('time', e.target.value)}
          />
        </label>
        <label className="task-modal-field">
          Category
          <input
            type="text"
            className="task-input"
            list="schedule-category-options"
            value={values.category}
            onChange={(e) => update('category', e.target.value)}
          />
          <datalist id="schedule-category-options">
            {SCHEDULE_CATEGORY_OPTIONS.map((opt) => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
        </label>
        <label className="task-modal-field">
          Description
          <textarea
            className="task-input task-textarea"
            value={values.description}
            onChange={(e) => update('description', e.target.value)}
          />
        </label>
        <div className="task-modal-actions">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {isEditing ? 'Save' : 'Add Event'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Calendar() {
  const { user } = useAuth()
  const canViewInvoices = hasRole(user?.role, 'Admin')
  const navigate = useNavigate()

  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [clientRows, setClientRows] = useState([])
  const [tasks, setTasks] = useState([])
  const [invoiceLog, setInvoiceLog] = useState([])
  const [scheduleEvents, setScheduleEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [scheduleModal, setScheduleModal] = useState(null)

  const canManageSchedule = hasRole(user?.role, 'Admin')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const requests = [
          fetch('/api/clients', { credentials: 'include' }),
          fetch('/api/tasks', { credentials: 'include' }),
          fetch('/api/calendar-events', { credentials: 'include' }),
        ]
        if (canViewInvoices) {
          requests.push(fetch('/api/invoices/log', { credentials: 'include' }))
        }
        const [clientsRes, tasksRes, scheduleRes, logRes] = await Promise.all(requests)
        const clientsData = await clientsRes.json()
        const tasksData = await tasksRes.json()
        const scheduleData = await scheduleRes.json()
        setClientRows(clientsData.rows || [])
        setTasks(Array.isArray(tasksData) ? tasksData : [])
        setScheduleEvents(Array.isArray(scheduleData) ? scheduleData : [])
        if (canViewInvoices && logRes) {
          const logData = await logRes.json()
          setInvoiceLog(logData.log || [])
        }
      } catch {
        setError('Could not load calendar data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [canViewInvoices])

  function handleScheduleSaved(saved) {
    setScheduleEvents((prev) => {
      const exists = prev.some((e) => e.id === saved.id)
      return exists ? prev.map((e) => (e.id === saved.id ? saved : e)) : [...prev, saved]
    })
  }

  async function handleScheduleDelete(rawEvent) {
    if (!window.confirm(`Delete event "${rawEvent.title}"?`)) return
    try {
      const res = await fetch(`/api/calendar-events/${rawEvent.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Could not delete event')
      }
      setScheduleEvents((prev) => prev.filter((e) => e.id !== rawEvent.id))
      setSelectedEvent(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const colorFor = useMemo(() => {
    const indexById = new Map(clientRows.map((row, i) => [row[CLIENT_ID_COLUMN], i]))
    return (clientId) => colorForIndex(indexById.get(clientId) ?? 0)
  }, [clientRows])

  const clientNameFor = useMemo(() => {
    const rowById = new Map(clientRows.map((row) => [row[CLIENT_ID_COLUMN], row]))
    return (clientId) => rowById.get(clientId)?.[CLIENT_NAME_COLUMN] || clientId || 'Unknown client'
  }, [clientRows])

  const eventsByDate = useMemo(() => {
    const map = new Map()
    function push(dateStr, event) {
      if (!dateStr) return
      if (!map.has(dateStr)) map.set(dateStr, [])
      map.get(dateStr).push(event)
    }

    tasks.forEach((t) => {
      if (!t.dueDate) return
      push(t.dueDate, {
        id: `task-${t.id}`,
        type: 'task',
        typeLabel: 'Task',
        title: t.title,
        detail: t.notes,
        date: t.dueDate,
        clientId: t.clientId,
        color: colorFor(t.clientId),
        done: t.stage === 'done',
      })
    })

    invoiceLog.forEach((entry) => {
      if (!entry.invoiceDate) return
      push(entry.invoiceDate, {
        id: `invoice-${entry.id}`,
        type: 'invoice',
        typeLabel: 'Invoice Issued',
        title: `Invoice ${entry.invoiceNo}`,
        detail: `Amount: Rp${Number(entry.amount || 0).toLocaleString('id-ID')}`,
        date: entry.invoiceDate,
        clientId: entry.clientId,
        color: colorFor(entry.clientId),
      })
      const dueDate = addDays(entry.invoiceDate, 7)
      push(dueDate, {
        id: `invoice-due-${entry.id}`,
        type: 'invoice',
        typeLabel: 'Payment Due',
        title: `Payment due: ${entry.invoiceNo}`,
        detail: `Amount: Rp${Number(entry.amount || 0).toLocaleString('id-ID')}`,
        date: dueDate,
        clientId: entry.clientId,
        color: colorFor(entry.clientId),
      })
    })

    clientRows.forEach((row) => {
      const renewal = row[RENEWAL_COLUMN]
      if (!renewal) return
      push(renewal, {
        id: `renewal-${row[CLIENT_ID_COLUMN]}`,
        type: 'renewal',
        typeLabel: 'Client Renewal',
        title: `Renewal: ${clientNameFor(row[CLIENT_ID_COLUMN])}`,
        detail: '',
        date: renewal,
        clientId: row[CLIENT_ID_COLUMN],
        color: colorFor(row[CLIENT_ID_COLUMN]),
      })
    })

    scheduleEvents.forEach((e) => {
      if (!e.date) return
      push(e.date, {
        id: `schedule-${e.id}`,
        type: 'schedule',
        typeLabel: e.category || 'Event',
        title: e.time ? `${e.time} ${e.title}` : e.title,
        detail: e.description,
        date: e.date,
        raw: e,
        isSchedule: true,
      })
    })

    return map
  }, [tasks, invoiceLog, clientRows, scheduleEvents, colorFor, clientNameFor])

  const days = useMemo(() => buildMonthGrid(monthDate), [monthDate])
  const todayISO = toISO(new Date())

  function goToPrevMonth() {
    setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  function goToNextMonth() {
    setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  function goToToday() {
    const now = new Date()
    setMonthDate(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  return (
    <div className="page">
      <div className="clients-intro-row">
        <p className="page-intro">
          Task due dates, invoice dates{canViewInvoices ? ' & payment due dates' : ''}, and client
          renewals, all in one view.
        </p>
        <button type="button" className="btn-plain" onClick={() => navigate('/tasks')}>
          Manage Tasks →
        </button>
      </div>

      {error && <div className="login-error">{error}</div>}

      <div className="calendar-toolbar">
        <div className="calendar-nav">
          <button type="button" className="btn-plain" onClick={goToPrevMonth} aria-label="Previous month">
            <ChevronLeft size={16} />
          </button>
          <span className="calendar-month-label">{monthLabel(monthDate)}</span>
          <button type="button" className="btn-plain" onClick={goToNextMonth} aria-label="Next month">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="task-header-actions">
          <button type="button" className="btn-plain" onClick={goToToday}>
            Today
          </button>
          {canManageSchedule && (
            <button type="button" className="btn-primary" onClick={() => setScheduleModal({})}>
              <Plus size={16} /> New Event
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="page-intro">Loading...</p>
      ) : (
        <div className="calendar-grid">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="calendar-weekday">
              {label}
            </div>
          ))}
          {days.map((day) => {
            const dateStr = toISO(day)
            const inMonth = day.getMonth() === monthDate.getMonth()
            const events = eventsByDate.get(dateStr) || []
            return (
              <div
                key={dateStr}
                className={
                  'calendar-day' +
                  (inMonth ? '' : ' calendar-day-outside') +
                  (dateStr === todayISO ? ' calendar-day-today' : '')
                }
              >
                <div className="calendar-day-number">{day.getDate()}</div>
                <div className="calendar-day-events">
                  {events.slice(0, 3).map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      className={
                        'calendar-event' +
                        (event.done ? ' calendar-event-done' : '') +
                        (event.isSchedule ? ' calendar-event-schedule' : '')
                      }
                      style={event.isSchedule ? undefined : { background: event.color }}
                      onClick={() => setSelectedEvent(event)}
                      title={event.title}
                    >
                      {event.title}
                    </button>
                  ))}
                  {events.length > 3 && (
                    <div className="calendar-event-more">+{events.length - 3} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          clientNameFor={clientNameFor}
          canManageSchedule={canManageSchedule}
          onClose={() => setSelectedEvent(null)}
          onEditSchedule={(raw) => {
            setSelectedEvent(null)
            setScheduleModal(raw)
          }}
          onDeleteSchedule={handleScheduleDelete}
        />
      )}

      {scheduleModal && (
        <ScheduleModal
          initial={scheduleModal}
          onClose={() => setScheduleModal(null)}
          onSaved={handleScheduleSaved}
        />
      )}
    </div>
  )
}

export default Calendar
