const SATUAN = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan']
const SCALES = ['', 'Ribu', 'Juta', 'Miliar', 'Triliun']

function threeDigitsToWords(n) {
  const parts = []
  const hundreds = Math.floor(n / 100)
  const remainder = n % 100

  if (hundreds === 1) {
    parts.push('Seratus')
  } else if (hundreds > 1) {
    parts.push(`${SATUAN[hundreds]} Ratus`)
  }

  if (remainder >= 11 && remainder <= 19) {
    parts.push(remainder === 11 ? 'Sebelas' : `${SATUAN[remainder - 10]} Belas`)
  } else if (remainder === 10) {
    parts.push('Sepuluh')
  } else {
    const tens = Math.floor(remainder / 10)
    const ones = remainder % 10
    if (tens > 0) parts.push(`${SATUAN[tens]} Puluh`)
    if (ones > 0) parts.push(SATUAN[ones])
  }

  return parts.join(' ')
}

export function terbilang(value) {
  const n = Math.round(Math.abs(Number(value) || 0))
  if (n === 0) return 'Nol'

  const groups = []
  let remaining = n
  while (remaining > 0) {
    groups.push(remaining % 1000)
    remaining = Math.floor(remaining / 1000)
  }

  const words = []
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) continue
    if (i === 1 && groups[i] === 1) {
      words.push('Seribu')
      continue
    }
    const groupWords = threeDigitsToWords(groups[i])
    words.push(SCALES[i] ? `${groupWords} ${SCALES[i]}` : groupWords)
  }

  return words.join(' ')
}

export function amountInWordsID(value) {
  return `${terbilang(value)} Rupiah`
}
