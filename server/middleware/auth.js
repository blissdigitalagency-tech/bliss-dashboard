import jwt from 'jsonwebtoken'
import { readUsers } from '../utils/users.js'
import { JWT_SECRET } from '../utils/jwtSecret.js'

const USERS_PATH = new URL('../data/users.json', import.meta.url)
const ROLE_RANK = { User: 1, Editor: 2, Superadmin: 3 }

export function requireAuth(req, res, next) {
  const token = req.cookies?.token
  if (!token) return res.status(401).json({ error: 'Not logged in' })

  let payload
  try {
    payload = jwt.verify(token, JWT_SECRET)
  } catch {
    return res.status(401).json({ error: 'Session expired, please log in again' })
  }

  const user = readUsers(USERS_PATH).find((u) => u.id === payload.id)
  if (!user) {
    return res.status(401).json({ error: 'Account no longer exists, please log in again' })
  }

  req.user = { id: user.id, username: user.username, name: user.name, role: user.role }
  next()
}

export function requireRole(minRole) {
  return (req, res, next) => {
    const userRank = ROLE_RANK[req.user?.role] ?? 0
    if (userRank < ROLE_RANK[minRole]) {
      return res.status(403).json({ error: 'You do not have permission to do that' })
    }
    next()
  }
}
