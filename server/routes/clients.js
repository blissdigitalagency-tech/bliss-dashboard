import { Router } from 'express'
import {
  readClientsSheet,
  writeClientsSheet,
  CLIENT_ID_COLUMN,
} from '../utils/xlsx.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { dataPath } from '../utils/dataDir.js'

const CLIENTS_PATH = dataPath('clients.xlsx')

const router = Router()

function isFileLockError(err) {
  return err.code === 'EBUSY' || err.code === 'EPERM'
}

function fileLockResponse(res) {
  return res.status(409).json({
    error: 'clients.xlsx is open in another program (e.g. Excel) — close it and try again',
  })
}

router.get('/', requireAuth, async (req, res) => {
  const { columns, rows } = await readClientsSheet(CLIENTS_PATH)
  res.json({ columns, rows })
})

router.post('/', requireAuth, requireRole('Editor'), async (req, res) => {
  const { columns, rows } = await readClientsSheet(CLIENTS_PATH)
  const values = req.body ?? {}

  const clientId = String(values[CLIENT_ID_COLUMN] ?? '').trim()
  if (!clientId) {
    return res.status(400).json({ error: `${CLIENT_ID_COLUMN} is required` })
  }
  if (rows.some((row) => row[CLIENT_ID_COLUMN] === clientId)) {
    return res.status(409).json({ error: `${CLIENT_ID_COLUMN} "${clientId}" already exists` })
  }

  const newRow = {}
  columns.forEach((col) => {
    newRow[col] = col === CLIENT_ID_COLUMN ? clientId : String(values[col] ?? '').trim()
  })

  rows.push(newRow)
  try {
    await writeClientsSheet(CLIENTS_PATH, columns, rows)
  } catch (err) {
    if (isFileLockError(err)) return fileLockResponse(res)
    throw err
  }
  res.status(201).json(newRow)
})

router.put('/:clientId', requireAuth, requireRole('Editor'), async (req, res) => {
  const { columns, rows } = await readClientsSheet(CLIENTS_PATH)
  const index = rows.findIndex((row) => row[CLIENT_ID_COLUMN] === req.params.clientId)
  if (index === -1) {
    return res.status(404).json({ error: 'Client not found' })
  }

  const values = req.body ?? {}
  const updatedRow = { ...rows[index] }
  columns.forEach((col) => {
    if (col === CLIENT_ID_COLUMN) return
    if (col in values) updatedRow[col] = String(values[col] ?? '').trim()
  })

  const newRows = [...rows]
  newRows[index] = updatedRow
  try {
    await writeClientsSheet(CLIENTS_PATH, columns, newRows)
  } catch (err) {
    if (isFileLockError(err)) return fileLockResponse(res)
    throw err
  }
  res.json(updatedRow)
})

router.delete('/:clientId', requireAuth, requireRole('Editor'), async (req, res) => {
  const { columns, rows } = await readClientsSheet(CLIENTS_PATH)
  const exists = rows.some((row) => row[CLIENT_ID_COLUMN] === req.params.clientId)
  if (!exists) {
    return res.status(404).json({ error: 'Client not found' })
  }

  const remaining = rows.filter((row) => row[CLIENT_ID_COLUMN] !== req.params.clientId)
  try {
    await writeClientsSheet(CLIENTS_PATH, columns, remaining)
  } catch (err) {
    if (isFileLockError(err)) return fileLockResponse(res)
    throw err
  }
  res.status(204).end()
})

router.post('/columns', requireAuth, requireRole('Editor'), async (req, res) => {
  const name = String(req.body?.name ?? '').trim()
  if (!name) {
    return res.status(400).json({ error: 'Column name is required' })
  }

  const { columns, rows } = await readClientsSheet(CLIENTS_PATH)
  if (columns.includes(name)) {
    return res.status(409).json({ error: `Column "${name}" already exists` })
  }

  const newColumns = [...columns, name]
  const newRows = rows.map((row) => ({ ...row, [name]: '' }))

  try {
    await writeClientsSheet(CLIENTS_PATH, newColumns, newRows)
  } catch (err) {
    if (isFileLockError(err)) return fileLockResponse(res)
    throw err
  }
  res.status(201).json({ columns: newColumns })
})

router.delete('/columns/:name', requireAuth, requireRole('Editor'), async (req, res) => {
  const name = req.params.name
  if (name === CLIENT_ID_COLUMN) {
    return res.status(400).json({ error: `${CLIENT_ID_COLUMN} can't be removed` })
  }

  const { columns, rows } = await readClientsSheet(CLIENTS_PATH)
  if (!columns.includes(name)) {
    return res.status(404).json({ error: 'Column not found' })
  }

  const newColumns = columns.filter((col) => col !== name)
  const newRows = rows.map((row) => {
    const { [name]: _removed, ...rest } = row
    return rest
  })

  try {
    await writeClientsSheet(CLIENTS_PATH, newColumns, newRows)
  } catch (err) {
    if (isFileLockError(err)) return fileLockResponse(res)
    throw err
  }
  res.status(200).json({ columns: newColumns })
})

export default router
