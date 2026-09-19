export const BOARD_PALETTE = [
  '#0E9594',
  '#D9631E',
  '#C9A200',
  '#C9407D',
  '#004023',
  '#3F5EAE',
  '#8A4FB8',
  '#B23A3A',
]

export function colorForIndex(index) {
  return BOARD_PALETTE[index % BOARD_PALETTE.length]
}
