import { Router } from 'express'
import { readJson, writeJson } from '../utils/jsonStore.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { dataPath } from '../utils/dataDir.js'

const TEMPLATES_PATH = dataPath('invoice-templates.json')
const LOG_PATH = dataPath('invoice-log.json')

const router = Router()

router.get('/log', requireAuth, requireRole('Admin'), (req, res) => {
  const log = readJson(LOG_PATH, [])
  res.json({ log: [...log].reverse() })
})

router.post('/log', requireAuth, requireRole('Admin'), (req, res) => {
  const body = req.body ?? {}
  const entry = {
    id: Date.now() + Math.random().toString(36).slice(2, 8),
    clientId: String(body.clientId ?? ''),
    clientName: String(body.clientName ?? ''),
    invoiceNo: String(body.invoiceNo ?? ''),
    invoiceDate: String(body.invoiceDate ?? ''),
    amount: Number(body.amount) || 0,
    language: String(body.language ?? 'en'),
    generatedAt: new Date().toISOString(),
  }

  const log = readJson(LOG_PATH, [])
  log.push(entry)

  try {
    writeJson(LOG_PATH, log)
  } catch (err) {
    if (err.code === 'EBUSY' || err.code === 'EPERM') {
      return res.status(409).json({
        error: 'invoice-log.json is open in another program — close it and try again',
      })
    }
    throw err
  }
  res.status(201).json(entry)
})

router.get('/template/:clientId', requireAuth, requireRole('Admin'), (req, res) => {
  const store = readJson(TEMPLATES_PATH, {})
  const entry = store[req.params.clientId] || {}
  res.json({ items: entry.items || [], lastInvoice: entry.lastInvoice || null })
})

router.put('/template/:clientId', requireAuth, requireRole('Admin'), (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : []
  const lastInvoice = req.body?.lastInvoice ?? null

  const store = readJson(TEMPLATES_PATH, {})
  store[req.params.clientId] = {
    items: items.map((item) => ({
      detail: String(item.detail ?? ''),
      unitPrice: Number(item.unitPrice) || 0,
      qtyCount: Number(item.qtyCount) || 0,
      qtyUnit: String(item.qtyUnit ?? ''),
    })),
    lastInvoice: lastInvoice
      ? {
          serviceCode: String(lastInvoice.serviceCode ?? ''),
          year: Number(lastInvoice.year) || null,
          month: Number(lastInvoice.month) || null,
          seq: String(lastInvoice.seq ?? ''),
          invoiceDate: String(lastInvoice.invoiceDate ?? ''),
          periodStart: String(lastInvoice.periodStart ?? ''),
          periodEnd: String(lastInvoice.periodEnd ?? ''),
        }
      : null,
  }

  try {
    writeJson(TEMPLATES_PATH, store)
  } catch (err) {
    if (err.code === 'EBUSY' || err.code === 'EPERM') {
      return res.status(409).json({
        error: 'invoice-templates.json is open in another program — close it and try again',
      })
    }
    throw err
  }
  res.status(200).json({ ok: true })
})

export default router
