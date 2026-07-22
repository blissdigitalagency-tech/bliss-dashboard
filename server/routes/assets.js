import { Router } from 'express'
import { readFile } from 'fs/promises'
import { requireAuth } from '../middleware/auth.js'

const ASSETS_DIR = new URL('../assets/', import.meta.url)

const ALLOWED_ASSETS = {
  'bliss_invoice_logo.png': 'image/png',
  'ceo_signature.png': 'image/png',
}

const router = Router()

router.get('/:filename', requireAuth, async (req, res) => {
  const contentType = ALLOWED_ASSETS[req.params.filename]
  if (!contentType) {
    return res.status(404).json({ error: 'Asset not found' })
  }

  try {
    const data = await readFile(new URL(req.params.filename, ASSETS_DIR))
    res.set('Content-Type', contentType)
    res.send(data)
  } catch {
    res.status(404).json({ error: 'Asset not found' })
  }
})

export default router
