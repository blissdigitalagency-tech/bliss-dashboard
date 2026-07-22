import { readFileSync, writeFileSync, existsSync } from 'node:fs'

export function readJson(path, fallback) {
  if (!existsSync(path)) return fallback
  const raw = readFileSync(path, 'utf-8')
  if (!raw.trim()) return fallback
  return JSON.parse(raw)
}

export function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2))
}
