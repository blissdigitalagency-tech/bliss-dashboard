import { useEffect, useMemo, useState } from 'react'
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer'
import PayslipDocument, { sumRows } from '../pdf/PayslipDocument.jsx'
import './Payslips.css'

const PRESETS = {
  en: {
    earnings: ['Basic Salary', 'Allowance', 'Bonus', 'Overtime'],
    deductions: ['Absence', 'Loan Repayment'],
  },
  id: {
    earnings: ['Gaji Pokok', 'Tunjangan', 'Bonus', 'Lembur'],
    deductions: ['Potongan Absensi', 'Cicilan Pinjaman'],
  },
}

let nextRowId = 1
function makeRow(name = '', amount = '') {
  return { id: nextRowId++, name, amount }
}

function rowsFromProfile(rows) {
  return (rows || []).map((row) => makeRow(row.name, row.amount))
}

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function todayIso() {
  const d = new Date()
  return `${currentPeriod()}-${String(d.getDate()).padStart(2, '0')}`
}

function sanitizeFileName(value) {
  return String(value || '').replace(/[\\/:*?"<>|]/g, '-').trim()
}

function formatIDR(value) {
  return `IDR ${(Number(value) || 0).toLocaleString('en-US')}`
}

function RowEditor({ label, rows, presets, onChange, onAdd, onRemove }) {
  return (
    <div className="invoice-items">
      <div className="invoice-items-header">
        <span>{label}</span>
      </div>

      {rows.map((row) => (
        <div className="payslip-row" key={row.id}>
          <input
            type="text"
            className="task-input"
            placeholder="Description"
            value={row.name}
            onChange={(e) => onChange(row.id, 'name', e.target.value)}
          />
          <input
            type="number"
            className="task-input"
            placeholder="Amount (IDR)"
            min="0"
            value={row.amount}
            onChange={(e) => onChange(row.id, 'amount', e.target.value)}
          />
          <button
            type="button"
            className="row-remove"
            aria-label={`Remove ${label} row`}
            onClick={() => onRemove(row.id)}
          >
            ×
          </button>
        </div>
      ))}

      <div className="payslip-preset-row">
        {presets.map((name) => (
          <button
            key={name}
            type="button"
            className="task-chip"
            disabled={rows.some((r) => r.name === name)}
            onClick={() => onAdd(name)}
          >
            + {name}
          </button>
        ))}
        <button type="button" className="task-chip" onClick={() => onAdd('')}>
          + Custom
        </button>
      </div>
    </div>
  )
}

function Payslips() {
  const [directory, setDirectory] = useState([])
  const [profiles, setProfiles] = useState({})
  const [log, setLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [userId, setUserId] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [period, setPeriod] = useState(currentPeriod())
  const [payDate, setPayDate] = useState(todayIso())
  const [language, setLanguage] = useState('id')
  const [earnings, setEarnings] = useState([])
  const [deductions, setDeductions] = useState([])
  const [notes, setNotes] = useState('')
  const [saveStatus, setSaveStatus] = useState('idle')

  async function loadLog() {
    const res = await fetch('/api/payslips/log', { credentials: 'include' })
    const data = await res.json()
    setLog(Array.isArray(data.log) ? data.log : [])
  }

  useEffect(() => {
    async function load() {
      try {
        const [dirRes, profRes] = await Promise.all([
          fetch('/api/users/directory', { credentials: 'include' }),
          fetch('/api/payslips/profiles', { credentials: 'include' }),
        ])
        const dirData = await dirRes.json()
        const profData = await profRes.json()
        setDirectory(Array.isArray(dirData) ? dirData : [])
        setProfiles(profData.profiles || {})
        await loadLog()
      } catch {
        setError('Could not load payslip data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const employee = directory.find((m) => String(m.id) === String(userId))

  function selectEmployee(value) {
    setUserId(value)
    setSaveStatus('idle')
    const profile = profiles[value] || {}
    setJobTitle(profile.jobTitle || '')
    setEmployeeId(profile.employeeId || '')
    setEarnings(rowsFromProfile(profile.earnings))
    setDeductions(rowsFromProfile(profile.deductions))
  }

  function updateRows(setter) {
    return (id, field, value) =>
      setter((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }

  const gross = sumRows(earnings)
  const totalDeductions = sumRows(deductions)
  const net = Math.max(0, gross - totalDeductions)

  const payslipData = useMemo(
    () => ({
      employeeName: employee?.name || 'Select an employee',
      employeeId,
      jobTitle,
      period,
      payDate,
      earnings,
      deductions,
      notes,
      language,
    }),
    [employee, employeeId, jobTitle, period, payDate, earnings, deductions, notes, language],
  )

  async function handleSaveProfile() {
    if (!userId) return
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/payslips/profiles/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          jobTitle,
          employeeId,
          earnings: earnings.map(({ name, amount }) => ({ name, amount })),
          deductions: deductions.map(({ name, amount }) => ({ name, amount })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save')
      setProfiles((prev) => ({ ...prev, [userId]: data }))
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }

  async function logPayslip() {
    try {
      await fetch('/api/payslips/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: Number(userId),
          employeeName: employee?.name,
          period,
          gross,
          deductions: totalDeductions,
          net,
          language,
        }),
      })
      await loadLog()
    } catch {
      // logging is best-effort; the download itself already happened
    }
  }

  const fileName = `Payslip - ${sanitizeFileName(employee?.name)} - ${period}.pdf`

  return (
    <div className="page">
      <p className="page-intro">
        Generate a monthly payslip for a team member. Amounts are typed in manually — nothing is
        calculated for tax or benefits.
      </p>

      {error && <div className="login-error">{error}</div>}

      <div className="invoices-layout">
        <div className="invoices-form">
          <label className="invoice-field">
            Employee
            <select
              className="task-input"
              value={userId}
              onChange={(e) => selectEmployee(e.target.value)}
              disabled={loading}
            >
              <option value="">Select an employee…</option>
              {directory.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>

          <div className="invoice-field-grid invoice-field-grid-2">
            <label className="invoice-field">
              Job title
              <input
                type="text"
                className="task-input"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </label>
            <label className="invoice-field">
              Employee ID
              <input
                type="text"
                className="task-input"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              />
            </label>
          </div>

          <div className="invoice-field-grid">
            <label className="invoice-field">
              Pay period
              <input
                type="month"
                className="task-input"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </label>
            <label className="invoice-field">
              Pay date
              <input
                type="date"
                className="task-input"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
              />
            </label>
            <label className="invoice-field">
              Language
              <select className="task-input" value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="id">Indonesian</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>

          <RowEditor
            label="Earnings"
            rows={earnings}
            presets={PRESETS[language].earnings}
            onChange={updateRows(setEarnings)}
            onAdd={(name) => setEarnings((prev) => [...prev, makeRow(name)])}
            onRemove={(id) => setEarnings((prev) => prev.filter((r) => r.id !== id))}
          />

          <RowEditor
            label="Deductions"
            rows={deductions}
            presets={PRESETS[language].deductions}
            onChange={updateRows(setDeductions)}
            onAdd={(name) => setDeductions((prev) => [...prev, makeRow(name)])}
            onRemove={(id) => setDeductions((prev) => prev.filter((r) => r.id !== id))}
          />

          <label className="invoice-field">
            Notes (optional)
            <textarea
              className="task-input task-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          <div className="payslip-totals">
            <div>
              <span>Total earnings</span>
              <strong>{formatIDR(gross)}</strong>
            </div>
            <div>
              <span>Total deductions</span>
              <strong>{formatIDR(totalDeductions)}</strong>
            </div>
            <div className="payslip-totals-net">
              <span>Net pay</span>
              <strong>{formatIDR(net)}</strong>
            </div>
            {totalDeductions > gross && (
              <p className="payslip-warning">Deductions are larger than earnings — net pay shows as 0.</p>
            )}
          </div>

          {userId && (
            <div className="invoice-save-row">
              <button
                type="button"
                className="btn-plain invoice-save-button"
                onClick={handleSaveProfile}
                disabled={saveStatus === 'saving'}
              >
                Save as employee default
              </button>
              <span className="invoice-items-hint">
                {saveStatus === 'saving' && 'Saving...'}
                {saveStatus === 'saved' && 'Saved — these will pre-fill next month ✓'}
                {saveStatus === 'error' && 'Could not save'}
                {saveStatus === 'idle' && 'Remembers job title, ID and the rows above for next time'}
              </span>
            </div>
          )}

          {userId ? (
            <PDFDownloadLink
              document={<PayslipDocument {...payslipData} />}
              fileName={fileName}
              className="btn-primary invoice-download"
              onClick={logPayslip}
            >
              {({ loading: preparing }) => (preparing ? 'Preparing...' : 'Download PDF')}
            </PDFDownloadLink>
          ) : (
            <button type="button" className="btn-primary invoice-download" disabled>
              Select an employee to download
            </button>
          )}
        </div>

        <div className="invoices-preview">
          <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }}>
            <PayslipDocument {...payslipData} />
          </PDFViewer>
        </div>
      </div>

      <div className="bulk-generate">
        <h2 className="bulk-generate-title">Recent payslips</h2>
        {log.length === 0 ? (
          <p className="page-intro">No payslips generated yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Period</th>
                <th>Net pay</th>
                <th>Generated by</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {log.slice(0, 10).map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.employeeName}</td>
                  <td>{entry.period}</td>
                  <td>{formatIDR(entry.net)}</td>
                  <td>{entry.generatedBy}</td>
                  <td>{entry.generatedAt?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default Payslips
