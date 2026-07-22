const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
]
const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
]
const SCALES = ['', 'Thousand', 'Million', 'Billion', 'Trillion']

function threeDigitsToWords(n) {
  const parts = []
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred`)
    n %= 100
  }
  if (n >= 20) {
    const tens = TENS[Math.floor(n / 10)]
    const ones = ONES[n % 10]
    parts.push(ones ? `${tens} ${ones}` : tens)
  } else if (n > 0) {
    parts.push(ONES[n])
  }
  return parts.join(' ')
}

export function numberToWords(value) {
  const n = Math.round(Math.abs(Number(value) || 0))
  if (n === 0) return 'Zero'

  const groups = []
  let remaining = n
  while (remaining > 0) {
    groups.push(remaining % 1000)
    remaining = Math.floor(remaining / 1000)
  }

  const words = []
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) continue
    const groupWords = threeDigitsToWords(groups[i])
    words.push(SCALES[i] ? `${groupWords} ${SCALES[i]}` : groupWords)
  }

  return words.join(' ')
}

export function amountInWords(value) {
  return `${numberToWords(value)} Rupiah Only`
}
