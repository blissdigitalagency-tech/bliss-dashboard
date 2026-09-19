import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import './Analytics.css'

const CLIENT_ID_COLUMN = 'Client-ID'
const CLIENT_NAME_COLUMN = 'Client Business Name'
const STATUS_COLUMN = 'Status'
const PACKAGE_COLUMN = 'Package'
const RENEWAL_COLUMN = 'Renewal'
const RENEWAL_WINDOW_DAYS = 90

const STATUS_COLORS = {
  Active: '#1c8a4a',
  Paused: '#b3690a',
  Inactive: '#55565f',
  'Not set': '#9a9ba3',
}

const PACKAGE_COLORS = {
  'DMS Google Ads': '#1c8a4a',
  'DMS Meta Ads': '#2456c9',
  'DMS TikTok': '#55565f',
  'DMS Pinterest': '#b3261e',
  'Content Creation': '#7a3fc4',
  'Social Media Management': '#128a83',
  'Website Creation': '#4638c4',
  'KOL Management': '#c22a82',
  Branding: '#b3690a',
}

function daysUntil(dateStr) {
  const target = new Date(`${dateStr}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target - today) / (1000 * 60 * 60 * 24))
}

function tooltipStyle() {
  return {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    color: 'var(--color-text)',
    fontSize: '0.85rem',
  }
}

function Analytics() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const res = await fetch('/api/clients', { credentials: 'include' })
        const data = await res.json()
        setRows(data.rows || [])
      } catch {
        setError('Could not load analytics data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const statusData = useMemo(() => {
    const counts = {}
    rows.forEach((row) => {
      const status = row[STATUS_COLUMN] || 'Not set'
      counts[status] = (counts[status] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [rows])

  const packageData = useMemo(() => {
    const counts = {}
    rows.forEach((row) => {
      const packages = (row[PACKAGE_COLUMN] || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      packages.forEach((pkg) => {
        counts[pkg] = (counts[pkg] || 0) + 1
      })
    })
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [rows])

  const upcomingRenewals = useMemo(() => {
    return rows
      .filter((row) => row[RENEWAL_COLUMN])
      .map((row) => ({
        clientId: row[CLIENT_ID_COLUMN],
        name: row[CLIENT_NAME_COLUMN] || row[CLIENT_ID_COLUMN],
        date: row[RENEWAL_COLUMN],
        daysLeft: daysUntil(row[RENEWAL_COLUMN]),
      }))
      .filter((r) => r.daysLeft <= RENEWAL_WINDOW_DAYS)
      .sort((a, b) => a.daysLeft - b.daysLeft)
  }, [rows])

  if (loading) {
    return (
      <div className="page">
        <p className="page-intro">Loading analytics...</p>
      </div>
    )
  }

  return (
    <div className="page">
      <p className="page-intro">
        Client health at a glance &mdash; status breakdown, package distribution, and upcoming
        renewals, pulled live from your Clients data.
      </p>

      {error && <div className="login-error">{error}</div>}

      <div className="analytics-grid">
        <div className="analytics-card">
          <h2 className="analytics-card-title">Clients by Status</h2>
          {rows.length === 0 ? (
            <p className="page-intro">No clients yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {statusData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={STATUS_COLORS[entry.name] || STATUS_COLORS['Not set']}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle()} />
                <Legend wrapperStyle={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="analytics-card">
          <h2 className="analytics-card-title">Package Distribution</h2>
          {packageData.length === 0 ? (
            <p className="page-intro">No packages assigned yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={packageData} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                />
                <Tooltip contentStyle={tooltipStyle()} cursor={{ fill: 'var(--color-surface-hover)' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {packageData.map((entry) => (
                    <Cell key={entry.name} fill={PACKAGE_COLORS[entry.name] || '#9a9ba3'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="analytics-card analytics-renewals">
        <h2 className="analytics-card-title">Upcoming Renewals (next {RENEWAL_WINDOW_DAYS} days)</h2>
        {upcomingRenewals.length === 0 ? (
          <p className="page-intro">Nothing coming up in this window.</p>
        ) : (
          <ul className="analytics-renewal-list">
            {upcomingRenewals.map((r) => (
              <li key={r.clientId} className="analytics-renewal-item">
                <div>
                  <div className="analytics-renewal-name">{r.name}</div>
                  <div className="analytics-renewal-meta">{r.date}</div>
                </div>
                <span
                  className={
                    r.daysLeft < 0
                      ? 'badge badge-error'
                      : r.daysLeft <= 14
                        ? 'badge badge-warning'
                        : 'badge badge-success'
                  }
                >
                  {r.daysLeft < 0
                    ? `${Math.abs(r.daysLeft)}d overdue`
                    : r.daysLeft === 0
                      ? 'Today'
                      : `${r.daysLeft}d left`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default Analytics
