import { Router } from 'express'
import { readJson, writeJson } from '../utils/jsonStore.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const EVENTS_PATH = new URL('../data/calendar-events.json', import.meta.url)

const router = Router()

function isFileLockError(err) {
  return err.code === 'EBUSY' || err.code === 'EPERM'
}

function fileLockResponse(res) {
  return res.status(409).json({
    error: 'calendar-events.json is open in another program — close it and try again',
  })
}

router.get('/', requireAuth, (req, res) => {
  res.json(readJson(EVENTS_PATH, []))
})

router.post('/', requireAuth, requireRole('Admin'), (req, res) => {
  const { title, date, time, category, description } = req.body ?? {}
  if (!String(title ?? '').trim() || !String(date ?? '').trim()) {
    return res.status(400).json({ error: 'Title and date are required' })
  }

  const events = readJson(EVENTS_PATH, [])
  const newEvent = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    title: String(title).trim(),
    date: String(date),
    time: String(time ?? ''),
    category: String(category ?? ''),
    description: String(description ?? ''),
    createdBy: req.user.name,
    createdAt: new Date().toISOString(),
  }

  events.push(newEvent)
  try {
    writeJson(EVENTS_PATH, events)
  } catch (err) {
    if (isFileLockError(err)) return fileLockResponse(res)
    throw err
  }
  res.status(201).json(newEvent)
})

router.put('/:id', requireAuth, requireRole('Admin'), (req, res) => {
  const events = readJson(EVENTS_PATH, [])
  const index = events.findIndex((e) => e.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: 'Event not found' })
  }

  const { title, date, time, category, description } = req.body ?? {}
  const updated = { ...events[index] }
  if (title !== undefined) updated.title = String(title).trim()
  if (date !== undefined) updated.date = String(date)
  if (time !== undefined) updated.time = String(time)
  if (category !== undefined) updated.category = String(category)
  if (description !== undefined) updated.description = String(description)

  events[index] = updated
  try {
    writeJson(EVENTS_PATH, events)
  } catch (err) {
    if (isFileLockError(err)) return fileLockResponse(res)
    throw err
  }
  res.json(updated)
})

router.delete('/:id', requireAuth, requireRole('Admin'), (req, res) => {
  const events = readJson(EVENTS_PATH, [])
  if (!events.some((e) => e.id === req.params.id)) {
    return res.status(404).json({ error: 'Event not found' })
  }

  const remaining = events.filter((e) => e.id !== req.params.id)
  try {
    writeJson(EVENTS_PATH, remaining)
  } catch (err) {
    if (isFileLockError(err)) return fileLockResponse(res)
    throw err
  }
  res.status(204).end()
})

export default router
