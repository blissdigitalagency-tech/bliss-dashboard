import { Router } from 'express'
import {
  readClients,
  clientExists,
  insertClient,
  updateClient,
  deleteClient,
  addColumn,
  removeColumn,
  CLIENT_ID_COLUMN,
} from '../utils/db.js'
import { readJson } from '../utils/jsonStore.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const CLIENTS_PATH = new URL('../data/clients.db', import.meta.url)
const TASKS_PATH = new URL('../data/tasks.json', import.meta.url)
const REQUIRED_COLUMNS = ['Client-ID', 'Client Business Name', 'Client PIC', 'Contact No.']

const router = Router()

function findMissingRequiredFields(columns, values) {
  return REQUIRED_COLUMNS.filter(
    (col) => columns.includes(col) && !String(values[col] ?? '').trim()
  )
}

function isDbBusyError(err) {
  return err?.code === 'ERR_SQLITE_ERROR' && /locked|busy/i.test(err.message)
}

function dbBusyResponse(res) {
  return res.status(409).json({
    error: 'The client database is busy — please try again in a moment',
  })
}

router.get('/', requireAuth, (req, res) => {
  const { columns, rows } = readClients(CLIENTS_PATH)
  res.json({ columns, rows })
})

router.post('/', requireAuth, requireRole('Admin'), (req, res) => {
  const values = req.body ?? {}
  const { columns } = readClients(CLIENTS_PATH)

  const missing = findMissingRequiredFields(columns, values)
  if (missing.length > 0) {
    return res.status(400).json({ error: `Required field(s) missing: ${missing.join(', ')}` })
  }

  const clientId = String(values[CLIENT_ID_COLUMN] ?? '').trim()
  if (clientExists(CLIENTS_PATH, clientId)) {
    return res.status(409).json({ error: `${CLIENT_ID_COLUMN} "${clientId}" already exists` })
  }

  const newRow = {}
  columns.forEach((col) => {
    newRow[col] = col === CLIENT_ID_COLUMN ? clientId : String(values[col] ?? '').trim()
  })

  try {
    insertClient(CLIENTS_PATH, newRow)
  } catch (err) {
    if (isDbBusyError(err)) return dbBusyResponse(res)
    throw err
  }
  res.status(201).json(newRow)
})

router.put('/:clientId', requireAuth, requireRole('Admin'), (req, res) => {
  if (!clientExists(CLIENTS_PATH, req.params.clientId)) {
    return res.status(404).json({ error: 'Client not found' })
  }

  const { columns, rows } = readClients(CLIENTS_PATH)
  const existingRow = rows.find((row) => row[CLIENT_ID_COLUMN] === req.params.clientId)
  const values = req.body ?? {}
  const updatedRow = { ...existingRow }
  columns.forEach((col) => {
    if (col === CLIENT_ID_COLUMN) return
    if (col in values) updatedRow[col] = String(values[col] ?? '').trim()
  })

  try {
    updateClient(CLIENTS_PATH, req.params.clientId, updatedRow)
  } catch (err) {
    if (isDbBusyError(err)) return dbBusyResponse(res)
    throw err
  }
  res.json(updatedRow)
})

router.delete('/:clientId', requireAuth, requireRole('Admin'), (req, res) => {
  if (!clientExists(CLIENTS_PATH, req.params.clientId)) {
    return res.status(404).json({ error: 'Client not found' })
  }

  const tasks = readJson(TASKS_PATH, [])
  const linkedTaskCount = tasks.filter((t) => t.clientId === req.params.clientId).length
  if (linkedTaskCount > 0) {
    return res.status(409).json({
      error: `Cannot delete: ${linkedTaskCount} task(s) on the Tasks board still reference this client. Delete or reassign them first.`,
    })
  }

  try {
    deleteClient(CLIENTS_PATH, req.params.clientId)
  } catch (err) {
    if (isDbBusyError(err)) return dbBusyResponse(res)
    throw err
  }
  res.status(204).end()
})

router.post('/columns', requireAuth, requireRole('Admin'), (req, res) => {
  const name = String(req.body?.name ?? '').trim()
  if (!name) {
    return res.status(400).json({ error: 'Column name is required' })
  }

  const { columns } = readClients(CLIENTS_PATH)
  if (columns.includes(name)) {
    return res.status(409).json({ error: `Column "${name}" already exists` })
  }

  try {
    addColumn(CLIENTS_PATH, name)
  } catch (err) {
    if (isDbBusyError(err)) return dbBusyResponse(res)
    throw err
  }
  res.status(201).json({ columns: [...columns, name] })
})

router.delete('/columns/:name', requireAuth, requireRole('Admin'), (req, res) => {
  const name = req.params.name
  if (name === CLIENT_ID_COLUMN) {
    return res.status(400).json({ error: `${CLIENT_ID_COLUMN} can't be removed` })
  }

  const { columns } = readClients(CLIENTS_PATH)
  if (!columns.includes(name)) {
    return res.status(404).json({ error: 'Column not found' })
  }

  try {
    removeColumn(CLIENTS_PATH, name)
  } catch (err) {
    if (isDbBusyError(err)) return dbBusyResponse(res)
    throw err
  }
  res.status(200).json({ columns: columns.filter((col) => col !== name) })
})

export default router
