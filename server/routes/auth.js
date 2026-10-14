import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import { readUsers } from '../utils/users.js'
import { requireAuth } from '../middleware/auth.js'
import { JWT_SECRET, isProd } from '../utils/jwtSecret.js'
import { dataPath } from '../utils/dataDir.js'

const USERS_PATH = dataPath('users.json')

const router = Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait a while and try again.' },
})

router.post('/login', loginLimiter, (req, res) => {
  const { username, password } = req.body ?? {}
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }

  const users = readUsers(USERS_PATH)
  const user = users.find((u) => u.username === username)
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid username or password' })
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  )

  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })

  res.json({ id: user.id, username: user.username, name: user.name, role: user.role })
})

router.post('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: isProd })
  res.json({ ok: true })
})

router.get('/me', requireAuth, (req, res) => {
  res.json(req.user)
})

export default router
