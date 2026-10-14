import path from 'node:path'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Where runtime data (users, clients, invoice history) lives. Defaults to
// server/data; set DATA_DIR to point at a mounted volume in production.
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : fileURLToPath(new URL('../data/', import.meta.url))

mkdirSync(DATA_DIR, { recursive: true })

export function dataPath(filename) {
  return path.join(DATA_DIR, filename)
}
