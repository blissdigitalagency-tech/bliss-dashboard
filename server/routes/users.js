import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { readUsers, writeUsers } from '../utils/users.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const USERS_PATH = new URL('../data/users.json', import.meta.url)
const VALID_ROLES = ['Superadmin', 'Admin', 'Editor', 'User']

const router = Router()

router.get('/', requireAuth, requireRole('Superadmin'), (req, res) => {
  const users = readUsers(USERS_PATH).map(({ passwordHash, ...rest }) => rest)
  res.json(users)
})

// Lightweight roster for features like task assignment — any logged-in user
// can see who's on the team, but not their role/username/other admin detail.
router.get('/directory', requireAuth, (req, res) => {
  const directory = readUsers(USERS_PATH).map(({ id, name }) => ({ id, name }))
  res.json(directory)
})

router.post('/', requireAuth, requireRole('Superadmin'), (req, res) => {
  const { username, name, password, role } = req.body ?? {}

  if (!username?.trim() || !password || !VALID_ROLES.includes(role)) {
    return res.status(400).json({
      error: 'username, password, and a valid role (Superadmin/Editor/User) are required',
    })
  }

  const users = readUsers(USERS_PATH)
  if (users.some((u) => u.username === username.trim())) {
    return res.status(409).json({ error: 'That username is already taken' })
  }

  const nextId = users.reduce((max, u) => Math.max(max, Number(u.id) || 0), 0) + 1
  const newUser = {
    id: nextId,
    username: username.trim(),
    name: name?.trim() || username.trim(),
    role,
    passwordHash: bcrypt.hashSync(password, 10),
  }

  users.push(newUser)
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

  const { passwordHash, ...safeUser } = newUser
  res.status(201).json(safeUser)
})

router.patch('/:id', requireAuth, requireRole('Superadmin'), (req, res) => {
  const targetId = Number(req.params.id)
  const { username, name, password, role } = req.body ?? {}

  const users = readUsers(USERS_PATH)
  const target = users.find((u) => u.id === targetId)
  if (!target) {
    return res.status(404).json({ error: 'User not found' })
  }

  if (role && !VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Role must be Superadmin, Editor, or User' })
  }

  if (username?.trim() && users.some((u) => u.id !== targetId && u.username === username.trim())) {
    return res.status(409).json({ error: 'That username is already taken' })
  }

  const superadminCount = users.filter((u) => u.role === 'Superadmin').length
  const losingSuperadmin = target.role === 'Superadmin' && role && role !== 'Superadmin'
  if (losingSuperadmin && superadminCount <= 1) {
    return res.status(400).json({ error: 'There must be at least one Superadmin account' })
  }

  if (username?.trim()) target.username = username.trim()
  if (name?.trim()) target.name = name.trim()
  if (role) target.role = role
  if (password) target.passwordHash = bcrypt.hashSync(password, 10)

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

  const { passwordHash, ...safeUser } = target
  res.json(safeUser)
})

router.delete('/:id', requireAuth, requireRole('Superadmin'), (req, res) => {
  const targetId = Number(req.params.id)

  if (targetId === req.user.id) {
    return res.status(400).json({ error: "You can't delete your own account while logged in" })
  }

  const users = readUsers(USERS_PATH)
  const target = users.find((u) => u.id === targetId)
  if (!target) {
    return res.status(404).json({ error: 'User not found' })
  }

  const superadminCount = users.filter((u) => u.role === 'Superadmin').length
  if (target.role === 'Superadmin' && superadminCount <= 1) {
    return res.status(400).json({ error: 'There must be at least one Superadmin account' })
  }

  const remaining = users.filter((u) => u.id !== targetId)
  try {
    writeUsers(USERS_PATH, remaining)
  } catch (err) {
    if (err.code === 'EBUSY' || err.code === 'EPERM') {
      return res.status(409).json({
        error: 'users.json is open in another program — close it and try again',
      })
    }
    throw err
  }

  res.status(204).end()
})

export default router
