import { Router } from 'express'
import { readJson, writeJson } from '../utils/jsonStore.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const CONTENT_PATH = new URL('../data/content.json', import.meta.url)
const VALID_STAGES = ['planned', 'shooting', 'editing', 'posted']
const STAGE_TYPES = ['Reels', 'Feed', 'Carousel', 'Story']

// Field required to LEAVE a stage moving forward — matches the original
// content-tracker spec's validation table. Moving backward is never gated.
const STAGE_EXIT_REQUIREMENT = {
  shooting: 'linkMaterial',
  editing: 'linkResult',
}

const router = Router()

function isFileLockError(err) {
  return err.code === 'EBUSY' || err.code === 'EPERM'
}

function fileLockResponse(res) {
  return res.status(409).json({
    error: 'content.json is open in another program — close it and try again',
  })
}

router.get('/', requireAuth, (req, res) => {
  res.json(readJson(CONTENT_PATH, []))
})

router.post('/', requireAuth, requireRole('Editor'), (req, res) => {
  const { clientId, title, month, type, pillar, uploadDate, script, notes } = req.body ?? {}
  if (!clientId || !String(title ?? '').trim() || !String(month ?? '').trim()) {
    return res.status(400).json({ error: 'clientId, title, and month are required' })
  }

  const items = readJson(CONTENT_PATH, [])
  const now = new Date().toISOString()
  const newItem = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    clientId: String(clientId),
    title: String(title).trim(),
    month: String(month),
    stage: 'planned',
    type: STAGE_TYPES.includes(type) ? type : '',
    pillar: String(pillar ?? ''),
    uploadDate: String(uploadDate ?? ''),
    script: String(script ?? ''),
    notes: String(notes ?? ''),
    linkMaterial: '',
    linkResult: '',
    linkUpload: '',
    caption: '',
    author: req.user.name,
    createdAt: now,
    history: [{ stage: 'planned', changedBy: req.user.name, changedAt: now }],
  }

  items.push(newItem)
  try {
    writeJson(CONTENT_PATH, items)
  } catch (err) {
    if (isFileLockError(err)) return fileLockResponse(res)
    throw err
  }
  res.status(201).json(newItem)
})

router.put('/:id', requireAuth, requireRole('Editor'), (req, res) => {
  const items = readJson(CONTENT_PATH, [])
  const index = items.findIndex((c) => c.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: 'Content item not found' })
  }

  const existing = items[index]
  const { title, stage, type, pillar, uploadDate, script, notes, linkMaterial, linkResult, linkUpload, caption } =
    req.body ?? {}

  if (stage !== undefined && !VALID_STAGES.includes(stage)) {
    return res.status(400).json({ error: 'Invalid stage' })
  }

  const updated = { ...existing }
  if (title !== undefined) updated.title = String(title).trim()
  if (type !== undefined) updated.type = STAGE_TYPES.includes(type) ? type : ''
  if (pillar !== undefined) updated.pillar = String(pillar)
  if (uploadDate !== undefined) updated.uploadDate = String(uploadDate)
  if (script !== undefined) updated.script = String(script)
  if (notes !== undefined) updated.notes = String(notes)
  if (linkMaterial !== undefined) updated.linkMaterial = String(linkMaterial)
  if (linkResult !== undefined) updated.linkResult = String(linkResult)
  if (linkUpload !== undefined) updated.linkUpload = String(linkUpload)
  if (caption !== undefined) updated.caption = String(caption)

  if (stage !== undefined && stage !== existing.stage) {
    const oldIndex = VALID_STAGES.indexOf(existing.stage)
    const newIndex = VALID_STAGES.indexOf(stage)
    if (newIndex > oldIndex) {
      // Check every stage boundary being crossed, not just the starting
      // stage — otherwise skipping multiple stages in one request (e.g.
      // planned -> editing) would bypass the gate on the stage in between.
      for (let i = oldIndex; i < newIndex; i += 1) {
        const stageKey = VALID_STAGES[i]
        const requiredField = STAGE_EXIT_REQUIREMENT[stageKey]
        if (requiredField && !String(updated[requiredField] ?? '').trim()) {
          return res.status(400).json({
            error: `Fill in "${requiredField === 'linkMaterial' ? 'Link Material' : 'Link Result'}" before advancing past ${stageKey}`,
          })
        }
      }
    }
    updated.stage = stage
    updated.history = [
      ...(updated.history || []),
      { stage, changedBy: req.user.name, changedAt: new Date().toISOString() },
    ]
  }

  items[index] = updated
  try {
    writeJson(CONTENT_PATH, items)
  } catch (err) {
    if (isFileLockError(err)) return fileLockResponse(res)
    throw err
  }
  res.json(updated)
})

router.delete('/:id', requireAuth, requireRole('Editor'), (req, res) => {
  const items = readJson(CONTENT_PATH, [])
  if (!items.some((c) => c.id === req.params.id)) {
    return res.status(404).json({ error: 'Content item not found' })
  }

  const remaining = items.filter((c) => c.id !== req.params.id)
  try {
    writeJson(CONTENT_PATH, remaining)
  } catch (err) {
    if (isFileLockError(err)) return fileLockResponse(res)
    throw err
  }
  res.status(204).end()
})

export default router
