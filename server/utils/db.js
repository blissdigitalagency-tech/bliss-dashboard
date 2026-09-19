import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

export const CLIENT_ID_COLUMN = 'Client-ID'

export const DEFAULT_CLIENT_COLUMNS = [
  'Client-ID',
  'Client PT',
  'Client Business Name',
  'Client PIC',
  'Contact No.',
  'Package',
  'Status',
  'Start Date',
  'Renewal',
  'BillTo_PT',
  'BillTo_Business',
  'BillTo_Name',
  'DocLang',
]

let dbInstance = null

function quoteIdent(name) {
  return '"' + String(name).replace(/"/g, '""') + '"'
}

function toPath(pathOrUrl) {
  return pathOrUrl instanceof URL ? fileURLToPath(pathOrUrl) : pathOrUrl
}

function getDb(pathOrUrl) {
  if (dbInstance) return dbInstance
  dbInstance = new DatabaseSync(toPath(pathOrUrl))

  const existing = dbInstance
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='clients'")
    .get()

  if (!existing) {
    dbInstance.exec(`CREATE TABLE clients (${quoteIdent(CLIENT_ID_COLUMN)} TEXT PRIMARY KEY)`)
    DEFAULT_CLIENT_COLUMNS.filter((col) => col !== CLIENT_ID_COLUMN).forEach((col) => {
      dbInstance.exec(`ALTER TABLE clients ADD COLUMN ${quoteIdent(col)} TEXT DEFAULT ''`)
    })
  }

  return dbInstance
}

function getColumns(db) {
  return db
    .prepare('PRAGMA table_info(clients)')
    .all()
    .map((r) => r.name)
}

export function readClients(pathOrUrl) {
  const db = getDb(pathOrUrl)
  const columns = getColumns(db)
  const rawRows = db.prepare('SELECT * FROM clients').all()
  const rows = rawRows.map((row) => {
    const obj = {}
    columns.forEach((c) => {
      obj[c] = row[c] ?? ''
    })
    return obj
  })
  return { columns, rows }
}

export function clientExists(pathOrUrl, clientId) {
  const db = getDb(pathOrUrl)
  const row = db
    .prepare(`SELECT 1 FROM clients WHERE ${quoteIdent(CLIENT_ID_COLUMN)} = ?`)
    .get(clientId)
  return Boolean(row)
}

export function insertClient(pathOrUrl, values) {
  const db = getDb(pathOrUrl)
  const columns = getColumns(db)
  const colList = columns.map(quoteIdent).join(', ')
  const placeholders = columns.map(() => '?').join(', ')
  db.prepare(`INSERT INTO clients (${colList}) VALUES (${placeholders})`).run(
    ...columns.map((c) => String(values[c] ?? ''))
  )
}

export function updateClient(pathOrUrl, clientId, values) {
  const db = getDb(pathOrUrl)
  const columns = getColumns(db).filter((c) => c !== CLIENT_ID_COLUMN)
  const setClause = columns.map((c) => `${quoteIdent(c)} = ?`).join(', ')
  db.prepare(
    `UPDATE clients SET ${setClause} WHERE ${quoteIdent(CLIENT_ID_COLUMN)} = ?`
  ).run(...columns.map((c) => String(values[c] ?? '')), clientId)
}

export function deleteClient(pathOrUrl, clientId) {
  const db = getDb(pathOrUrl)
  db.prepare(`DELETE FROM clients WHERE ${quoteIdent(CLIENT_ID_COLUMN)} = ?`).run(clientId)
}

export function addColumn(pathOrUrl, name) {
  const db = getDb(pathOrUrl)
  db.exec(`ALTER TABLE clients ADD COLUMN ${quoteIdent(name)} TEXT DEFAULT ''`)
}

export function removeColumn(pathOrUrl, name) {
  const db = getDb(pathOrUrl)
  db.exec(`ALTER TABLE clients DROP COLUMN ${quoteIdent(name)}`)
}
