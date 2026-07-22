import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'

export function readUsers(usersPath) {
  if (!existsSync(usersPath)) return []
  const raw = readFileSync(usersPath, 'utf-8')
  if (!raw.trim()) return []
  return JSON.parse(raw)
}

export function writeUsers(usersPath, users) {
  writeFileSync(usersPath, JSON.stringify(users, null, 2))
}

export function ensureSeedSuperadmin(usersPath) {
  const users = readUsers(usersPath)
  if (users.length > 0) return

  const tempPassword = randomBytes(6).toString('base64url')
  const passwordHash = bcrypt.hashSync(tempPassword, 10)

  writeUsers(usersPath, [
    {
      id: 1,
      username: 'admin',
      name: 'Admin',
      role: 'Superadmin',
      passwordHash,
    },
  ])

  console.log('\n============================================')
  console.log('No users found — created a starter account:')
  console.log('  username: admin')
  console.log(`  password: ${tempPassword}`)
  console.log('Log in and consider changing this password.')
  console.log('============================================\n')
}
