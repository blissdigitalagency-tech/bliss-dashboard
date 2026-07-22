import { existsSync } from 'node:fs'
import ExcelJS from 'exceljs'

export const CLIENT_ID_COLUMN = 'Client-ID'

export const DEFAULT_CLIENT_COLUMNS = [
  'Client-ID',
  'Client Name',
  'Brand Group',
  'Client PIC/CP',
  'Package',
  'Start Date',
  'Renewal',
]

export async function readClientsSheet(path) {
  if (!existsSync(path)) {
    return { columns: [...DEFAULT_CLIENT_COLUMNS], rows: [] }
  }

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(path)
  const sheet = workbook.getWorksheet(1)
  if (!sheet || sheet.rowCount === 0) {
    return { columns: [...DEFAULT_CLIENT_COLUMNS], rows: [] }
  }

  const columns = []
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell) => {
    columns.push(String(cell.value ?? '').trim())
  })

  const rows = []
  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i)
    if (row.cellCount === 0) continue

    const rowObj = {}
    let hasValue = false
    columns.forEach((col, idx) => {
      const cell = row.getCell(idx + 1)
      const value = cell.value == null ? '' : String(cell.value)
      rowObj[col] = value
      if (value) hasValue = true
    })
    if (hasValue) rows.push(rowObj)
  }

  return { columns, rows }
}

export async function writeClientsSheet(path, columns, rows) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Clients')
  sheet.addRow(columns)
  rows.forEach((row) => {
    sheet.addRow(columns.map((col) => row[col] ?? ''))
  })
  await workbook.xlsx.writeFile(path)
}
