import { Router } from 'express'
import { readdirSync, readFileSync } from 'node:fs'
import JSZip from 'jszip'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { DATA_DIR, dataPath } from '../utils/dataDir.js'

const router = Router()

router.get('/', requireAuth, requireRole('Superadmin'), async (req, res) => {
  const zip = new JSZip()
  for (const entry of readdirSync(DATA_DIR, { withFileTypes: true })) {
    if (!entry.isFile() || entry.name.startsWith('.')) continue
    zip.file(entry.name, readFileSync(dataPath(entry.name)))
  }

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  const stamp = new Date().toISOString().slice(0, 10)
  res.set('Content-Type', 'application/zip')
  res.set('Content-Disposition', `attachment; filename="bliss-dashboard-backup-${stamp}.zip"`)
  res.send(buffer)
})

export default router
