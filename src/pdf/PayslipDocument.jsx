import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { amountInWords } from '../lib/numberToWords.js'
import { amountInWordsID } from '../lib/terbilang.js'
import { formatDateLong } from '../lib/dateFormat.js'

const COMPANY = { name: 'PT Blissindo Kreasi Digital' }

const LABELS = {
  en: {
    title: 'PAYSLIP',
    employee: 'Employee',
    employeeId: 'Employee ID',
    position: 'Position',
    period: 'Pay Period',
    payDate: 'Pay Date',
    earnings: 'Earnings',
    deductions: 'Deductions',
    description: 'Description',
    amount: 'Amount',
    totalEarnings: 'Total Earnings',
    totalDeductions: 'Total Deductions',
    netPay: 'Net Pay',
    amountInWords: 'Amount in Words:',
    notes: 'Notes:',
    none: '-',
    confidential: 'This payslip is confidential and intended for the named employee only.',
    approvedBy: 'Approved by,',
  },
  id: {
    title: 'SLIP GAJI',
    employee: 'Karyawan',
    employeeId: 'ID Karyawan',
    position: 'Jabatan',
    period: 'Periode Gaji',
    payDate: 'Tanggal Pembayaran',
    earnings: 'Pendapatan',
    deductions: 'Potongan',
    description: 'Keterangan',
    amount: 'Jumlah',
    totalEarnings: 'Total Pendapatan',
    totalDeductions: 'Total Potongan',
    netPay: 'Gaji Bersih',
    amountInWords: 'Terbilang:',
    notes: 'Catatan:',
    none: '-',
    confidential: 'Slip gaji ini bersifat rahasia dan hanya ditujukan untuk karyawan yang bersangkutan.',
    approvedBy: 'Disetujui oleh,',
  },
}

const LOCALES = { en: 'en-GB', id: 'id-ID' }

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: 'Helvetica', color: '#111111' },
  logo: { width: 160, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 18 },
  metaRow: { flexDirection: 'row', marginBottom: 3 },
  metaLabel: { width: 110 },
  metaColon: { width: 10 },
  sectionLabel: { fontFamily: 'Helvetica-Bold', marginTop: 16, marginBottom: 4 },
  table: { borderWidth: 1, borderColor: '#000000' },
  row: { flexDirection: 'row' },
  headerCell: {
    padding: 6,
    fontFamily: 'Helvetica-Bold',
    borderBottomWidth: 1,
    borderColor: '#000000',
  },
  cell: { padding: 6, borderBottomWidth: 1, borderColor: '#000000' },
  colDesc: { flexGrow: 1, borderRightWidth: 1, borderColor: '#000000' },
  colAmount: { width: 140, textAlign: 'right' },
  totalRow: { flexDirection: 'row' },
  totalLabel: {
    flexGrow: 1,
    padding: 6,
    fontFamily: 'Helvetica-Bold',
    borderRightWidth: 1,
    borderColor: '#000000',
  },
  totalValue: { width: 140, padding: 6, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  netBox: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#000000',
    flexDirection: 'row',
    backgroundColor: '#f1f1f1',
  },
  netLabel: {
    flexGrow: 1,
    padding: 8,
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    borderRightWidth: 1,
    borderColor: '#000000',
  },
  netValue: { width: 140, padding: 8, fontSize: 11, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  words: { marginTop: 10 },
  wordsValue: { fontFamily: 'Helvetica-Bold' },
  notes: { marginTop: 12, lineHeight: 1.4 },
  signatureBlock: { width: 220, marginLeft: 'auto', alignItems: 'center', marginTop: 28 },
  signatureImage: { width: 140, height: 70, marginTop: 8, marginBottom: 4 },
  signatureName: { fontFamily: 'Helvetica-Bold' },
  footnote: { marginTop: 24, fontSize: 8, color: '#555555', textAlign: 'center' },
})

function formatIDR(value, language) {
  const n = Number(value) || 0
  return language === 'id' ? `Rp${n.toLocaleString('en-US')}` : `IDR ${n.toLocaleString('en-US')}`
}

function formatMonthLong(periodKey, language) {
  const [year, month] = String(periodKey || '').split('-').map(Number)
  if (!year || !month) return ''
  return new Date(year, month - 1, 1).toLocaleDateString(LOCALES[language] ?? LOCALES.en, {
    month: 'long',
    year: 'numeric',
  })
}

export function sumRows(rows) {
  return (rows || []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
}

function RowsTable({ title, rows, totalLabel, language, t }) {
  const visible = rows.filter((row) => row.name || Number(row.amount))
  return (
    <>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.table}>
        <View style={styles.row}>
          <Text style={[styles.headerCell, styles.colDesc]}>{t.description}</Text>
          <Text style={[styles.headerCell, styles.colAmount]}>{t.amount}</Text>
        </View>
        {visible.length === 0 && (
          <View style={styles.row}>
            <Text style={[styles.cell, styles.colDesc]}>{t.none}</Text>
            <Text style={[styles.cell, styles.colAmount]}>{formatIDR(0, language)}</Text>
          </View>
        )}
        {visible.map((row, i) => (
          <View style={styles.row} key={i}>
            <Text style={[styles.cell, styles.colDesc]}>{row.name}</Text>
            <Text style={[styles.cell, styles.colAmount]}>{formatIDR(row.amount, language)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{totalLabel}</Text>
          <Text style={styles.totalValue}>{formatIDR(sumRows(visible), language)}</Text>
        </View>
      </View>
    </>
  )
}

function PayslipDocument({
  employeeName,
  employeeId,
  jobTitle,
  period,
  payDate,
  earnings,
  deductions,
  notes,
  language = 'en',
}) {
  const t = LABELS[language] ?? LABELS.en
  const gross = sumRows(earnings)
  const totalDeductions = sumRows(deductions)
  const net = Math.max(0, gross - totalDeductions)
  const words = language === 'id' ? amountInWordsID(net) : amountInWords(net)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Image src="/api/assets/bliss_invoice_logo.png" style={styles.logo} />
        <Text style={styles.title}>{t.title}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>{t.employee}</Text>
          <Text style={styles.metaColon}>:</Text>
          <Text>{employeeName}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>{t.employeeId}</Text>
          <Text style={styles.metaColon}>:</Text>
          <Text>{employeeId || t.none}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>{t.position}</Text>
          <Text style={styles.metaColon}>:</Text>
          <Text>{jobTitle || t.none}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>{t.period}</Text>
          <Text style={styles.metaColon}>:</Text>
          <Text>{formatMonthLong(period, language)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>{t.payDate}</Text>
          <Text style={styles.metaColon}>:</Text>
          <Text>{formatDateLong(payDate, language)}</Text>
        </View>

        <RowsTable title={t.earnings} rows={earnings} totalLabel={t.totalEarnings} language={language} t={t} />
        <RowsTable
          title={t.deductions}
          rows={deductions}
          totalLabel={t.totalDeductions}
          language={language}
          t={t}
        />

        <View style={styles.netBox}>
          <Text style={styles.netLabel}>{t.netPay}</Text>
          <Text style={styles.netValue}>{formatIDR(net, language)}</Text>
        </View>

        <Text style={styles.words}>
          {t.amountInWords} <Text style={styles.wordsValue}>{words}</Text>
        </Text>

        {notes ? (
          <Text style={styles.notes}>
            {t.notes} {notes}
          </Text>
        ) : null}

        <View style={styles.signatureBlock}>
          <Text>{t.approvedBy}</Text>
          <Image src="/api/assets/ceo_signature.png" style={styles.signatureImage} />
          <Text style={styles.signatureName}>({COMPANY.name})</Text>
        </View>

        <Text style={styles.footnote}>{t.confidential}</Text>
      </Page>
    </Document>
  )
}

export default PayslipDocument
