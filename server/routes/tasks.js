import { Router } from 'express'
import { readJson, writeJson } from '../utils/jsonStore.js'
import { readUsers } from '../utils/users.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const TASKS_PATH = new URL('../data/tasks.json', import.meta.url)
const USERS_PATH = new URL('../data/users.json', import.meta.url)
const VALID_STAGES = ['todo', 'in_progress', 'review', 'revision', 'done']
const TIME_ZONE = 'Asia/Makassar'

function dateKey(input) {
  const d = input ? new Date(input) : new Date()
  return d.toLocaleDateString('en-CA', { timeZone: TIME_ZONE })
}

// Tasks saved before startDate/completedDate existed get them derived on read.
function withDerivedDates(task) {
  const out = { ...task }
  if (!out.startDate) out.startDate = out.createdAt ? dateKey(out.createdAt) : ''
  if (out.stage === 'done' && !out.completedDate) {
    const doneEntry = [...(out.history || [])].reverse().find((h) => h.stage === 'done')
    out.completedDate = doneEntry ? dateKey(doneEntry.changedAt) : ''
  }
  if (out.stage !== 'done') out.completedDate = ''
  return out
}

const router = Router()

function isFileLockError(err) {
  return err.code === 'EBUSY' || err.code === 'EPERM'
}

function fileLockResponse(res) {
  return res.status(409).json({
    error: 'tasks.json is open in another program — close it and try again',
  })
}

function sanitizeAssignees(assignees) {
  if (!Array.isArray(assignees)) return null
  const validIds = new Set(readUsers(USERS_PATH).map((u) => u.id))
  const cleaned = [...new Set(assignees.map((id) => Number(id)))].filter((id) => validIds.has(id))
  return cleaned
}

router.get('/', requireAuth, (req, res) => {
  res.json(readJson(TASKS_PATH, []).map(withDerivedDates))
})

router.post('/', requireAuth, requireRole('Editor'), (req, res) => {
  const { clientId, title, month, startDate, dueDate, notes, link, category, assignees } = req.body ?? {}
  if (!clientId || !String(title ?? '').trim()) {
    return res.status(400).json({ error: 'clientId and title are required' })
  }

  const tasks = readJson(TASKS_PATH, [])
  const now = new Date().toISOString()
  const newTask = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    clientId: String(clientId),
    title: String(title).trim(),
    month: String(month ?? now.slice(0, 7)),
    stage: 'todo',
    startDate: String(startDate || dateKey()),
    completedDate: '',
    dueDate: String(dueDate ?? ''),
    notes: String(notes ?? ''),
    link: String(link ?? ''),
    category: String(category ?? ''),
    assignees: sanitizeAssignees(assignees) ?? [],
    author: req.user.name,
    createdAt: now,
    history: [{ stage: 'todo', changedBy: req.user.name, changedAt: now }],
  }

  tasks.push(newTask)
  try {
    writeJson(TASKS_PATH, tasks)
  } catch (err) {
    if (isFileLockError(err)) return fileLockResponse(res)
    throw err
  }
  res.status(201).json(newTask)
})

router.put('/:id', requireAuth, requireRole('Editor'), (req, res) => {
  const tasks = readJson(TASKS_PATH, [])
  const index = tasks.findIndex((t) => t.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' })
  }

  const { title, stage, startDate, dueDate, notes, link, category, assignees } = req.body ?? {}
  if (stage !== undefined && !VALID_STAGES.includes(stage)) {
    return res.status(400).json({ error: 'Invalid stage' })
  }

  const updated = withDerivedDates(tasks[index])
  if (title !== undefined) updated.title = String(title).trim()
  if (stage !== undefined && stage !== updated.stage) {
    updated.stage = stage
    updated.completedDate = stage === 'done' ? dateKey() : ''
    updated.history = [
      ...(updated.history || []),
      { stage, changedBy: req.user.name, changedAt: new Date().toISOString() },
    ]
  }
  if (startDate !== undefined && String(startDate)) updated.startDate = String(startDate)
  if (dueDate !== undefined) updated.dueDate = String(dueDate)
  if (notes !== undefined) updated.notes = String(notes)
  if (link !== undefined) updated.link = String(link)
  if (category !== undefined) updated.category = String(category)
  if (assignees !== undefined) updated.assignees = sanitizeAssignees(assignees) ?? updated.assignees ?? []

  tasks[index] = updated
  try {
    writeJson(TASKS_PATH, tasks)
  } catch (err) {
    if (isFileLockError(err)) return fileLockResponse(res)
    throw err
  }
  res.json(updated)
})

router.delete('/:id', requireAuth, requireRole('Editor'), (req, res) => {
  const tasks = readJson(TASKS_PATH, [])
  if (!tasks.some((t) => t.id === req.params.id)) {
    return res.status(404).json({ error: 'Task not found' })
  }

  const remaining = tasks.filter((t) => t.id !== req.params.id)
  try {
    writeJson(TASKS_PATH, remaining)
  } catch (err) {
    if (isFileLockError(err)) return fileLockResponse(res)
    throw err
  }
  res.status(204).end()
})

export default router
