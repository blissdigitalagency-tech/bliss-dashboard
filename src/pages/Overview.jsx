import { useEffect, useMemo, useState } from 'react'
import StatCard from '../components/StatCard.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { hasRole } from '../lib/roles.js'
import './Overview.css'

const CLIENT_ID_COLUMN = 'Client-ID'
const CLIENT_NAME_COLUMN = 'Client Business Name'
const DUE_SOON_WINDOW_DAYS = 7

function formatIDR(amount) {
  return `Rp${Number(amount || 0).toLocaleString('id-ID')}`
}

function daysUntil(dateStr) {
  const due = new Date(`${dateStr}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((due - today) / (1000 * 60 * 60 * 24))
}

function Overview() {
  const { user } = useAuth()
  const canViewRevenue = hasRole(user?.role, 'Admin')

  const [clientRows, setClientRows] = useState([])
  const [tasks, setTasks] = useState([])
  const [revenueThisMonth, setRevenueThisMonth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const requests = [
          fetch('/api/clients', { credentials: 'include' }),
          fetch('/api/tasks', { credentials: 'include' }),
        ]
        if (canViewRevenue) {
          requests.push(fetch('/api/invoices/log', { credentials: 'include' }))
        }
        const [clientsRes, tasksRes, logRes] = await Promise.all(requests)
        const clientsData = await clientsRes.json()
        const tasksData = await tasksRes.json()
        setClientRows(clientsData.rows || [])
        setTasks(Array.isArray(tasksData) ? tasksData : [])

        if (canViewRevenue && logRes) {
          const logData = await logRes.json()
          const now = new Date()
          const total = (logData.log || [])
            .filter((entry) => {
              const d = new Date(entry.generatedAt)
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
            })
            .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0)
          setRevenueThisMonth(total)
        }
      } catch {
        setError('Could not load overview data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [canViewRevenue])

  const clientNameFor = useMemo(() => {
    const rowById = new Map(clientRows.map((row) => [row[CLIENT_ID_COLUMN], row]))
    return (clientId) => {
      const row = rowById.get(clientId)
      return row?.[CLIENT_NAME_COLUMN] || row?.[CLIENT_ID_COLUMN] || 'Unknown client'
    }
  }, [clientRows])

  const openTasks = tasks.filter((t) => t.stage !== 'done')
  const myOpenTasks = openTasks.filter((t) => (t.assignees || []).includes(user?.id))

  const dueSoon = openTasks
    .filter((t) => t.dueDate)
    .map((t) => ({ ...t, daysLeft: daysUntil(t.dueDate) }))
    .filter((t) => t.daysLeft <= DUE_SOON_WINDOW_DAYS)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 8)

  return (
    <div className="page">
      <p className="page-intro">
        Welcome back, {user?.name}. Here's what's happening across Bliss Digital right now.
      </p>

      {error && <div className="login-error">{error}</div>}

      <div className="stat-row">
        <StatCard label="Total Clients" value={loading ? '...' : clientRows.length} />
        <StatCard label="Open Tasks" value={loading ? '...' : openTasks.length} />
        <StatCard label="My Open Tasks" value={loading ? '...' : myOpenTasks.length} />
        {canViewRevenue && (
          <StatCard
            label="This Month's Revenue"
            value={loading || revenueThisMonth === null ? '...' : formatIDR(revenueThisMonth)}
            hint="From generated invoices"
          />
        )}
      </div>

      <div className="overview-due-soon">
        <h2 className="overview-section-title">Due Soon</h2>
        {loading ? (
          <p className="page-intro">Loading...</p>
        ) : dueSoon.length === 0 ? (
          <p className="page-intro">Nothing due in the next {DUE_SOON_WINDOW_DAYS} days.</p>
        ) : (
          <ul className="overview-due-list">
            {dueSoon.map((task) => (
              <li key={task.id} className="overview-due-item">
                <div>
                  <div className="overview-due-title">{task.title}</div>
                  <div className="overview-due-meta">{clientNameFor(task.clientId)}</div>
                </div>
                <span
                  className={
                    task.daysLeft < 0
                      ? 'badge badge-paused'
                      : task.daysLeft <= 2
                        ? 'badge badge-paused'
                        : 'badge badge-active'
                  }
                >
                  {task.daysLeft < 0
                    ? `${Math.abs(task.daysLeft)}d overdue`
                    : task.daysLeft === 0
                      ? 'Due today'
                      : `${task.daysLeft}d left`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default Overview
