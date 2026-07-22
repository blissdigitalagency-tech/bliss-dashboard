const LOCALES = { en: 'en-GB', id: 'id-ID' }

export function formatDateLong(isoDate, language = 'en') {
  if (!isoDate) return ''
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(LOCALES[language] ?? LOCALES.en, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatPeriod(startIso, endIso, language = 'en') {
  if (!startIso || !endIso) return ''
  const start = new Date(`${startIso}T00:00:00`)
  const end = new Date(`${endIso}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return ''

  const sameMonthYear =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()

  if (sameMonthYear) {
    const month = end.toLocaleDateString(LOCALES[language] ?? LOCALES.en, { month: 'long' })
    return `${start.getDate()}-${end.getDate()} ${month} ${end.getFullYear()}`
  }

  return `${formatDateLong(startIso, language)} - ${formatDateLong(endIso, language)}`
}

export function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00`)
  date.setDate(date.getDate() + days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addMonthsClamped(isoDate, months) {
  const date = new Date(`${isoDate}T00:00:00`)
  const originalDay = date.getDate()
  date.setDate(1)
  date.setMonth(date.getMonth() + months)
  const daysInTargetMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(originalDay, daysInTargetMonth))
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}