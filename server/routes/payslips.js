import { Router } from 'express'
import { readJson, writeJson } from '../utils/jsonStore.js'
import { readUsers } from '../utils/users.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const PROFILES_PATH = new URL('../data/payroll-profiles.json', import.meta.url)
const LOG_PATH = new URL('../data/payslip-log.json', import.meta.url)
const USERS_PATH = new URL('../data/users.json', import.meta.url)

const router = Router()

function isFileLockError(err) {
  return err.code === 'EBUSY' || err.code === 'EPERM'
}

function fileLockResponse(res, file) {
  return res.status(409).json({ error: `${file} is open in another program — close it and try again` })
}

function sanitizeRows(rows) {
  if (!Array.isArray(rows)) return []
  return rows
    .map((row) => ({
      name: String(row?.name ?? '').trim(),
      amount: Math.max(0, Number(row?.amount) || 0),
    }))
    .filter((row) => row.name || row.amount)
}

router.get('/profiles', requireAuth, requireRole('Admin'), (req, res) => {
  res.json({ profiles: readJson(PROFILES_PATH, {}) })
})

router.put('/profiles/:userId', requireAuth, requireRole('Admin'), (req, res) => {
  const userId = Number(req.params.userId)
  if (!readUsers(USERS_PATH).some((u) => u.id === userId)) {
    return res.status(404).json({ error: 'User not found' })
  }

  const body = req.body ?? {}
  const profiles = readJson(PROFILES_PATH, {})
  profiles[userId] = {
    fullName: String(body.fullName ?? '').trim(),
    jobTitle: String(body.jobTitle ?? '').trim(),
    employeeId: String(body.employeeId ?? '').trim(),
    earnings: sanitizeRows(body.earnings),
    deductions: sanitizeRows(body.deductions),
  }

  try {
    writeJson(PROFILES_PATH, profiles)
  } catch (err) {
    if (isFileLockError(err)) return fileLockResponse(res, 'payroll-profiles.json')
    throw err
  }
  res.json(profiles[userId])
})

router.get('/log', requireAuth, requireRole('Admin'), (req, res) => {
  res.json({ log: [...readJson(LOG_PATH, [])].reverse() })
})

router.post('/log', requireAuth, requireRole('Admin'), (req, res) => {
  const body = req.body ?? {}
  const entry = {
    id: Date.now() + Math.random().toString(36).slice(2, 8),
    userId: Number(body.userId) || null,
    employeeName: String(body.employeeName ?? ''),
    period: String(body.period ?? ''),
    gross: Number(body.gross) || 0,
    deductions: Number(body.deductions) || 0,
    net: Number(body.net) || 0,
    language: String(body.language ?? 'en'),
    generatedBy: req.user.name,
    generatedAt: new Date().toISOString(),
  }

  const log = readJson(LOG_PATH, [])
  log.push(entry)
  try {
    writeJson(LOG_PATH, log)
  } catch (err) {
    if (isFileLockError(err)) return fileLockResponse(res, 'payslip-log.json')
    throw err
  }
  res.status(201).json(entry)
})

export default router
