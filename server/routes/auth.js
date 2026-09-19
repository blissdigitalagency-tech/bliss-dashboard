import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import { readUsers, writeUsers } from '../utils/users.js'
import { requireAuth } from '../middleware/auth.js'
import { JWT_SECRET, isProd } from '../utils/jwtSecret.js'

const USERS_PATH = new URL('../data/users.json', import.meta.url)

const router = Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait a while and try again.' },
})

const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a while and try again.' },
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

router.put('/password', requireAuth, passwordChangeLimiter, (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {}
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' })
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' })
  }

  const users = readUsers(USERS_PATH)
  const user = users.find((u) => u.id === req.user.id)
  if (!user || !bcrypt.compareSync(currentPassword, user.passwordHash)) {
    return res.status(401).json({ error: 'Current password is incorrect' })
  }

  user.passwordHash = bcrypt.hashSync(newPassword, 10)
  try {
    writeUsers(USERS_PATH, users)
  } catch (err) {
    if (err.code === 'EBUSY' || err.code === 'EPERM') {
      return res.status(409).json({
        error: 'users.json is open in another program — close it and try again',
      })
    }
    throw err
  }

  res.json({ ok: true })
})

export default router
