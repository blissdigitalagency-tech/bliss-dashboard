import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { amountInWords } from '../lib/numberToWords.js'
import { amountInWordsID } from '../lib/terbilang.js'

const COMPANY = {
  name: 'PT Blissindo Kreasi Digital',
  bank: 'Bank Mandiri',
  accountName: 'PT Blissindo Kreasi Digital',
  accountNumber: '1460024347135',
}

const LABELS = {
  en: {
    invoiceNo: 'Invoice No.',
    invoiceDate: 'Invoice Date',
    paymentDue: 'Payment Due',
    billTo: 'Bill To:',
    intro:
      'We hereby submit the invoice for digital marketing services with the following details:',
    period: 'Period',
    detail: 'Detail',
    unitPrice: 'Unit Price',
    qty: 'Qty',
    total: 'Total',
    amountLabel: 'Amount',
    amountInWords: 'Amount in Words:',
    paymentInfo: 'Payment can be transferred to:',
    bank: 'Bank',
    accountName: 'Account Name',
    accountNumber: 'Account Number',
    sincerely: 'Sincerely,',
  },
  id: {
    invoiceNo: 'No. Invoice',
    invoiceDate: 'Tanggal Invoice',
    paymentDue: 'Tenggat Waktu',
    billTo: 'Kepada:',
    intro:
      'Berikut ini kami sampaikan tagihan jasa digital marketing dengan rincian sebagai berikut:',
    period: 'Periode',
    detail: 'Detail',
    unitPrice: 'Harga',
    qty: 'Qty',
    total: 'Total',
    amountLabel: 'Total',
    amountInWords: 'Terbilang:',
    paymentInfo: 'Pembayaran dapat ditransfer ke:',
    bank: 'Bank',
    accountName: 'Account Name',
    accountNumber: 'Account Number',
    sincerely: 'Hormat kami,',
  },
}

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: 'Helvetica', color: '#111111' },
  logo: { width: 160, alignSelf: 'center', marginBottom: 24 },
  metaRow: { flexDirection: 'row', marginBottom: 2 },
  metaLabel: { width: 90 },
  metaColon: { width: 10 },
  billToLabel: { fontFamily: 'Helvetica-Bold', marginTop: 12, marginBottom: 4 },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginVertical: 16 },
  paragraph: { marginBottom: 12, lineHeight: 1.4 },
  table: { borderWidth: 1, borderColor: '#000000', marginTop: 12 },
  tableRow: { flexDirection: 'row' },
  tableHeaderCell: {
    padding: 6,
    fontFamily: 'Helvetica-Bold',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#000000',
  },
  tableCell: {
    padding: 6,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#000000',
  },
  colDetail: { width: 220, textAlign: 'center' },
  colUnitPrice: { width: 110, textAlign: 'center' },
  colQty: { width: 70, textAlign: 'center' },
  colTotal: { width: 99, textAlign: 'center', borderRightWidth: 0 },
  amountRow: { flexDirection: 'row' },
  amountLabelCell: {
    width: 400,
    padding: 6,
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
    borderRightWidth: 1,
    borderColor: '#000000',
  },
  amountValueCell: {
    width: 99,
    padding: 6,
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
  },
  amountWords: { marginTop: 12, marginBottom: 16 },
  amountWordsValue: { fontFamily: 'Helvetica-Bold' },
  bankBlock: { marginBottom: 40 },
  bankRow: { flexDirection: 'row', marginBottom: 2 },
  bankLabel: { width: 110 },
  signatureBlock: { width: 220, marginLeft: 'auto', alignItems: 'center' },
  signatureImage: { width: 140, height: 70, marginTop: 8, marginBottom: 4 },
  signatureName: { fontFamily: 'Helvetica-Bold' },
})

function formatIDR(value) {
  const n = Number(value) || 0
  return `IDR ${n.toLocaleString('en-US')}`
}

function formatTotal(value, language) {
  const n = Number(value) || 0
  return language === 'id' ? `Rp${n.toLocaleString('en-US')}` : `IDR ${n.toLocaleString('en-US')}`
}

function InvoiceDocument({
  invoiceNo,
  invoiceDate,
  paymentDue,
  billTo,
  period,
  items,
  language = 'en',
}) {
  const t = LABELS[language] ?? LABELS.en
  const amount = items.reduce(
    (sum, item) => sum + (Number(item.unitPrice) || 0) * (Number(item.qtyCount) || 0),
    0
  )
  const amountWords = language === 'id' ? amountInWordsID(amount) : amountInWords(amount)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Image src="/api/assets/bliss_invoice_logo.png" style={styles.logo} />

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>{t.invoiceNo}</Text>
          <Text style={styles.metaColon}>:</Text>
          <Text>{invoiceNo}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>{t.invoiceDate}</Text>
          <Text style={styles.metaColon}>:</Text>
          <Text>{invoiceDate}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>{t.paymentDue}</Text>
          <Text style={styles.metaColon}>:</Text>
          <Text>{paymentDue}</Text>
        </View>

        <Text style={styles.billToLabel}>{t.billTo}</Text>
        {billTo.split('\n').filter(Boolean).map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}

        <Text style={styles.title}>INVOICE</Text>

        <Text style={styles.paragraph}>{t.intro}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>{t.period}</Text>
          <Text style={styles.metaColon}>:</Text>
          <Text>{period}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={[styles.tableHeaderCell, styles.colDetail]}>{t.detail}</Text>
            <Text style={[styles.tableHeaderCell, styles.colUnitPrice]}>{t.unitPrice}</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>{t.qty}</Text>
            <Text style={[styles.tableHeaderCell, styles.colTotal, { borderRightWidth: 0 }]}>
              {t.total}
            </Text>
          </View>
          {items.map((item, i) => {
            const total = (Number(item.unitPrice) || 0) * (Number(item.qtyCount) || 0)
            return (
              <View style={styles.tableRow} key={i}>
                <Text style={[styles.tableCell, styles.colDetail]}>{item.detail}</Text>
                <Text style={[styles.tableCell, styles.colUnitPrice]}>
                  {formatIDR(item.unitPrice)}
                </Text>
                <Text style={[styles.tableCell, styles.colQty]}>
                  {item.qtyCount} {item.qtyUnit}
                </Text>
                <Text style={[styles.tableCell, styles.colTotal, { borderRightWidth: 0 }]}>
                  {formatTotal(total, language)}
                </Text>
              </View>
            )
          })}
          <View style={styles.amountRow}>
            <Text style={styles.amountLabelCell}>{t.amountLabel}</Text>
            <Text style={styles.amountValueCell}>{formatTotal(amount, language)}</Text>
          </View>
        </View>

        <Text style={styles.amountWords}>
          {t.amountInWords} <Text style={styles.amountWordsValue}>{amountWords}</Text>
        </Text>

        <Text style={{ marginBottom: 4 }}>{t.paymentInfo}</Text>
        <View style={styles.bankBlock}>
          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>{t.bank}</Text>
            <Text style={styles.metaColon}>:</Text>
            <Text>{COMPANY.bank}</Text>
          </View>
          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>{t.accountName}</Text>
            <Text style={styles.metaColon}>:</Text>
            <Text>{COMPANY.accountName}</Text>
          </View>
          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>{t.accountNumber}</Text>
            <Text style={styles.metaColon}>:</Text>
            <Text>{COMPANY.accountNumber}</Text>
          </View>
        </View>

        <View style={styles.signatureBlock}>
          <Text>{t.sincerely}</Text>
          <Image src="/api/assets/ceo_signature.png" style={styles.signatureImage} />
          <Text style={styles.signatureName}>({COMPANY.name})</Text>
        </View>
      </Page>
    </Document>
  )
}

export default InvoiceDocument
