import { useEffect, useMemo, useState } from 'react'
import { PDFViewer, PDFDownloadLink, pdf } from '@react-pdf/renderer'
import JSZip from 'jszip'
import InvoiceDocument from '../pdf/InvoiceDocument.jsx'
import { formatDateLong, formatPeriod, addDays, addMonthsClamped } from '../lib/dateFormat.js'
import './Invoices.css'

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
const CLIENT_ID_COLUMN = 'Client-ID'

let nextRowId = 1
function makeRow() {
  return { id: nextRowId++, detail: '', unitPrice: '', qtyCount: 1, qtyUnit: 'Month' }
}

const today = new Date().toISOString().slice(0, 10)
const now = new Date()

function nextSequence(seq) {
  if (!/^\d+$/.test(seq || '')) return ''
  return String(Number(seq) + 1).padStart(seq.length, '0')
}

function sanitizeFileName(value) {
  return String(value || '').replace(/[\\/:*?"<>|]/g, '-').trim()
}

function normalizeDocLang(value) {
  const v = String(value || '').trim().toLowerCase()
  return v.startsWith('id') || v.includes('indo') || v.includes('bahasa') ? 'id' : 'en'
}

function computeNextInvoiceFields(last) {
  let serviceCode, invoiceYear, invoiceMonth, invoiceSeq

  if (last?.year && last?.month) {
    let nextMonth = last.month + 1
    let nextYear = last.year
    if (nextMonth > 12) {
      nextMonth = 1
      nextYear += 1
    }
    serviceCode = last.serviceCode || 'DMS'
    invoiceYear = String(nextYear)
    invoiceMonth = ROMAN_MONTHS[nextMonth - 1]
    invoiceSeq = nextSequence(last.seq)
  } else {
    serviceCode = 'DMS'
    invoiceYear = String(now.getFullYear())
    invoiceMonth = ROMAN_MONTHS[now.getMonth()]
    invoiceSeq = ''
  }

  let invoiceDate, paymentDue
  if (last?.invoiceDate) {
    invoiceDate = addMonthsClamped(last.invoiceDate, 1)
    paymentDue = addDays(invoiceDate, 7)
  } else {
    invoiceDate = today
    paymentDue = addDays(today, 7)
  }

  let periodStart = ''
  let periodEnd = ''
  if (last?.periodStart && last?.periodEnd) {
    periodStart = addMonthsClamped(last.periodStart, 1)
    periodEnd = addMonthsClamped(last.periodEnd, 1)
  }

  return { serviceCode, invoiceYear, invoiceMonth, invoiceSeq, invoiceDate, paymentDue, periodStart, periodEnd }
}

function billToFromClient(client) {
  return (
    [client?.['BillTo_PT'], client?.['BillTo_Business'], client?.['BillTo_Name']]
      .filter((line) => line && line.trim())
      .join('\n') || 'Client name'
  )
}

function Invoices() {
  const [clients, setClients] = useState([])
  const [selectedClientId, setSelectedClientId] = useState('')

  const [serviceCode, setServiceCode] = useState('DMS')
  const [clientCode, setClientCode] = useState('')
  const [invoiceYear, setInvoiceYear] = useState(String(now.getFullYear()))
  const [invoiceMonth, setInvoiceMonth] = useState(ROMAN_MONTHS[now.getMonth()])
  const [invoiceSeq, setInvoiceSeq] = useState('')

  const [invoiceDate, setInvoiceDate] = useState(today)
  const [paymentDue, setPaymentDue] = useState(addDays(today, 7))
  const [billToCompany, setBillToCompany] = useState('')
  const [billToBrand, setBillToBrand] = useState('')
  const [billToContact, setBillToContact] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [items, setItems] = useState([makeRow()])
  const [saveStatus, setSaveStatus] = useState('idle')
  const [previousInvoiceRef, setPreviousInvoiceRef] = useState(null)
  const [language, setLanguage] = useState('en')

  const [bulkSelectedIds, setBulkSelectedIds] = useState([])
  const [bulkStatus, setBulkStatus] = useState('idle')
  const [bulkLog, setBulkLog] = useState([])

  const [invoiceLog, setInvoiceLog] = useState([])
  const [logSearch, setLogSearch] = useState('')

  function loadInvoiceLog() {
    fetch('/api/invoices/log', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setInvoiceLog(data.log || []))
      .catch(() => {})
  }

  useEffect(() => {
    fetch('/api/clients', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setClients(data.rows || []))
      .catch(() => {})
    loadInvoiceLog()
  }, [])

  function logInvoice(entry) {
    fetch('/api/invoices/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(entry),
    })
      .then(() => loadInvoiceLog())
      .catch(() => {})
  }

  async function handleSelectClient(clientId) {
    setSelectedClientId(clientId)
    setSaveStatus('idle')
    setPreviousInvoiceRef(null)
    const client = clients.find((c) => c[CLIENT_ID_COLUMN] === clientId)
    if (client) {
      setClientCode(client[CLIENT_ID_COLUMN] || '')
      setBillToCompany(client['BillTo_PT'] || '')
      setBillToBrand(client['BillTo_Business'] || '')
      setBillToContact(client['BillTo_Name'] || '')
      setLanguage(normalizeDocLang(client['DocLang']))
    }

    if (!clientId) {
      setItems([makeRow()])
      setLanguage('en')
      return
    }

    try {
      const res = await fetch(`/api/invoices/template/${encodeURIComponent(clientId)}`, {
        credentials: 'include',
      })
      const data = await res.json()
      setItems(
        data.items?.length ? data.items.map((item) => ({ ...item, id: nextRowId++ })) : [makeRow()]
      )

      const last = data.lastInvoice
      const next = computeNextInvoiceFields(last)

      setServiceCode(next.serviceCode)
      setInvoiceYear(next.invoiceYear)
      setInvoiceMonth(next.invoiceMonth)
      setInvoiceSeq(next.invoiceSeq)
      setInvoiceDate(next.invoiceDate)
      setPaymentDue(next.paymentDue)
      setPeriodStart(next.periodStart)
      setPeriodEnd(next.periodEnd)

      setPreviousInvoiceRef(last || null)
    } catch {
      setItems([makeRow()])
    }
  }

  async function handleSave() {
    if (!selectedClientId) return

    const client = clients.find((c) => c[CLIENT_ID_COLUMN] === selectedClientId)
    const clientDisplayName = client?.['Client Business Name'] || selectedClientId
    const periodText = periodStart && periodEnd ? formatPeriod(periodStart, periodEnd) : '(not set)'
    const confirmMessage =
      `Save this as the latest invoice on record for ${clientDisplayName}?\n\n` +
      `Invoice No: INV/${serviceCode}/${clientCode}/${invoiceYear}/${invoiceMonth}/${invoiceSeq}\n` +
      `Invoice Date: ${formatDateLong(invoiceDate)}\n` +
      `Period: ${periodText}\n\n` +
      `This will overwrite whatever was saved before and become the starting point for their next invoice.`

    if (!window.confirm(confirmMessage)) return

    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/invoices/template/${encodeURIComponent(selectedClientId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          items: items.map(({ detail, unitPrice, qtyCount, qtyUnit }) => ({
            detail,
            unitPrice,
            qtyCount,
            qtyUnit,
          })),
          lastInvoice: {
            serviceCode,
            year: Number(invoiceYear),
            month: ROMAN_MONTHS.indexOf(invoiceMonth) + 1,
            seq: invoiceSeq,
            invoiceDate,
            periodStart,
            periodEnd,
          },
        }),
      })
      setSaveStatus(res.ok ? 'saved' : 'error')
    } catch {
      setSaveStatus('error')
    }
  }

  function toggleBulkClient(clientId) {
    setBulkSelectedIds((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]
    )
  }

  function selectAllBulkClients() {
    setBulkSelectedIds(clients.map((c) => c[CLIENT_ID_COLUMN]))
  }

  function clearBulkSelection() {
    setBulkSelectedIds([])
  }

  async function handleBulkGenerate() {
    if (bulkSelectedIds.length === 0) return

    const names = bulkSelectedIds.map((id) => {
      const client = clients.find((c) => c[CLIENT_ID_COLUMN] === id)
      return client?.['Client Business Name'] ? `${id} — ${client['Client Business Name']}` : id
    })
    const confirmMessage =
      `Generate invoices for ${bulkSelectedIds.length} client(s)?\n\n` +
      names.map((n) => `• ${n}`).join('\n') +
      `\n\nThis will advance each one's saved invoice number and dates to the next period ` +
      `(any client with no saved invoice yet will be skipped instead).`

    if (!window.confirm(confirmMessage)) return

    setBulkStatus('generating')
    setBulkLog([])

    try {
      const zip = new JSZip()

      for (const clientId of bulkSelectedIds) {
        const client = clients.find((c) => c[CLIENT_ID_COLUMN] === clientId)
        if (!client) continue

        const res = await fetch(`/api/invoices/template/${encodeURIComponent(clientId)}`, {
          credentials: 'include',
        })
        const data = await res.json()

        if (!data.items?.length) {
          setBulkLog((log) => [...log, `${clientId}: skipped — no saved line items yet`])
          continue
        }

        const last = data.lastInvoice
        const next = computeNextInvoiceFields(last)
        const lang = normalizeDocLang(client['DocLang'])
        const invoiceNoStr = `INV/${next.serviceCode}/${clientId}/${next.invoiceYear}/${next.invoiceMonth}/${next.invoiceSeq}`

        const clientInvoiceData = {
          invoiceNo: invoiceNoStr,
          invoiceDate: formatDateLong(next.invoiceDate, lang),
          paymentDue: formatDateLong(next.paymentDue, lang),
          billTo: billToFromClient(client),
          period: formatPeriod(next.periodStart, next.periodEnd, lang),
          items: data.items.map((item) => ({
            ...item,
            unitPrice: Number(item.unitPrice) || 0,
            qtyCount: Number(item.qtyCount) || 0,
          })),
          language: lang,
        }

        const blob = await pdf(<InvoiceDocument {...clientInvoiceData} />).toBlob()

        const monthNumber = String(ROMAN_MONTHS.indexOf(next.invoiceMonth) + 1).padStart(2, '0')
        const yyyymm = `${next.invoiceYear}${monthNumber}`
        const clientName = client['Client Business Name'] || clientId
        const pdfFileName = sanitizeFileName(`[INVOICE] ${yyyymm}_Bliss X ${clientName}`) + '.pdf'

        zip.file(pdfFileName, blob)

        const bulkAmount = clientInvoiceData.items.reduce(
          (sum, item) => sum + item.unitPrice * item.qtyCount,
          0
        )
        logInvoice({
          clientId,
          clientName,
          invoiceNo: invoiceNoStr,
          invoiceDate: clientInvoiceData.invoiceDate,
          amount: bulkAmount,
          language: lang,
        })

        await fetch(`/api/invoices/template/${encodeURIComponent(clientId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            items: data.items,
            lastInvoice: {
              serviceCode: next.serviceCode,
              year: Number(next.invoiceYear),
              month: ROMAN_MONTHS.indexOf(next.invoiceMonth) + 1,
              seq: next.invoiceSeq,
              invoiceDate: next.invoiceDate,
              periodStart: next.periodStart,
              periodEnd: next.periodEnd,
            },
          }),
        })

        setBulkLog((log) => [...log, `${clientId}: ${pdfFileName}`])
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Bliss_Invoices_${today.replace(/-/g, '')}.zip`
      link.click()
      URL.revokeObjectURL(url)

      setBulkStatus('done')
    } catch {
      setBulkStatus('error')
    }
  }

  function updateItem(id, field, value) {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  function addItem() {
    setItems([...items, makeRow()])
  }

  function removeItem(id) {
    setItems(items.filter((item) => item.id !== id))
  }

  const invoiceNo = `INV/${serviceCode}/${clientCode}/${invoiceYear}/${invoiceMonth}/${invoiceSeq}`

  const invoiceData = useMemo(
    () => ({
      invoiceNo,
      invoiceDate: formatDateLong(invoiceDate, language),
      paymentDue: formatDateLong(paymentDue, language),
      billTo:
        [billToCompany, billToBrand, billToContact]
          .filter((line) => line.trim())
          .join('\n') || 'Client name',
      period: formatPeriod(periodStart, periodEnd, language),
      items: items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice) || 0,
        qtyCount: Number(item.qtyCount) || 0,
      })),
      language,
    }),
    [
      invoiceNo,
      invoiceDate,
      paymentDue,
      billToCompany,
      billToBrand,
      billToContact,
      periodStart,
      periodEnd,
      items,
      language,
    ]
  )

  const amount = invoiceData.items.reduce(
    (sum, item) => sum + item.unitPrice * item.qtyCount,
    0
  )

  const selectedClient = clients.find((c) => c[CLIENT_ID_COLUMN] === selectedClientId)
  const clientNameForFile = selectedClient?.['Client Business Name'] || clientCode || 'Client'
  const monthNumber = String(ROMAN_MONTHS.indexOf(invoiceMonth) + 1).padStart(2, '0')
  const yyyymm = `${invoiceYear}${monthNumber}`
  const fileName = sanitizeFileName(`[INVOICE] ${yyyymm}_Bliss X ${clientNameForFile}`) + '.pdf'

  return (
    <div className="page invoices-page">
      <p className="page-intro">
        Fill in the details on the left — the preview on the right updates live.
      </p>

      <div className="invoices-layout">
        <div className="invoices-form">
          <label className="invoice-field">
            Select Client (optional — autofills Bill To and Client Code below)
            <select
              value={selectedClientId}
              onChange={(e) => handleSelectClient(e.target.value)}
              className="task-input"
            >
              <option value="">— Manual / no client —</option>
              {clients.map((client) => (
                <option key={client[CLIENT_ID_COLUMN]} value={client[CLIENT_ID_COLUMN]}>
                  {client[CLIENT_ID_COLUMN]}
                  {client['Client Business Name'] ? ` — ${client['Client Business Name']}` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="invoice-field">
            Invoice Language
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="task-input"
            >
              <option value="en">English</option>
              <option value="id">Bahasa Indonesia</option>
            </select>
          </label>

          <div className="invoice-field">
            <span>Invoice No.</span>
            <div className="invoice-number-builder">
              <span className="invoice-number-prefix">INV</span>
              <span className="invoice-number-slash">/</span>
              <input
                type="text"
                value={serviceCode}
                onChange={(e) => setServiceCode(e.target.value)}
                placeholder="DMS"
                className="task-input invoice-number-input"
              />
              <span className="invoice-number-slash">/</span>
              <input
                type="text"
                value={clientCode}
                onChange={(e) => setClientCode(e.target.value)}
                placeholder="CODE"
                className="task-input invoice-number-input"
              />
              <span className="invoice-number-slash">/</span>
              <input
                type="text"
                value={invoiceYear}
                onChange={(e) => setInvoiceYear(e.target.value)}
                placeholder="YYYY"
                className="task-input invoice-number-input"
              />
              <span className="invoice-number-slash">/</span>
              <select
                value={invoiceMonth}
                onChange={(e) => setInvoiceMonth(e.target.value)}
                className="task-input invoice-number-input"
              >
                {ROMAN_MONTHS.map((roman) => (
                  <option key={roman} value={roman}>
                    {roman}
                  </option>
                ))}
              </select>
              <span className="invoice-number-slash">/</span>
              <input
                type="text"
                value={invoiceSeq}
                onChange={(e) => setInvoiceSeq(e.target.value)}
                placeholder="001"
                className="task-input invoice-number-input"
              />
            </div>
          </div>

          {selectedClientId && (
            <div className="invoice-previous-ref">
              {previousInvoiceRef?.invoiceDate || previousInvoiceRef?.periodStart ? (
                <>
                  Previous invoice for this client:{' '}
                  {previousInvoiceRef.invoiceDate && (
                    <>dated {formatDateLong(previousInvoiceRef.invoiceDate)}</>
                  )}
                  {previousInvoiceRef.periodStart && previousInvoiceRef.periodEnd && (
                    <>
                      {' '}
                      · Period{' '}
                      {formatPeriod(previousInvoiceRef.periodStart, previousInvoiceRef.periodEnd)}
                    </>
                  )}
                </>
              ) : (
                'No previous invoice saved for this client yet'
              )}
            </div>
          )}

          <div className="invoice-field-grid invoice-field-grid-2">
            <label className="invoice-field">
              Invoice Date
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => {
                  setInvoiceDate(e.target.value)
                  setPaymentDue(addDays(e.target.value, 7))
                }}
                className="task-input"
              />
            </label>
            <label className="invoice-field">
              Payment Due
              <input
                type="date"
                value={paymentDue}
                onChange={(e) => setPaymentDue(e.target.value)}
                className="task-input"
              />
            </label>
          </div>

          <div className="invoice-field">
            <span>Bill To</span>
            <div className="invoice-billto-group">
              <input
                type="text"
                value={billToCompany}
                onChange={(e) => setBillToCompany(e.target.value)}
                placeholder="PT Client Company"
                className="task-input"
              />
              <input
                type="text"
                value={billToBrand}
                onChange={(e) => setBillToBrand(e.target.value)}
                placeholder="Brand / Entity (optional)"
                className="task-input"
              />
              <input
                type="text"
                value={billToContact}
                onChange={(e) => setBillToContact(e.target.value)}
                placeholder="Contact Person (optional)"
                className="task-input"
              />
            </div>
          </div>

          <div className="invoice-field-grid invoice-field-grid-2">
            <label className="invoice-field">
              Period From
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="task-input"
              />
            </label>
            <label className="invoice-field">
              Period To
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="task-input"
              />
            </label>
          </div>

          <div className="invoice-items">
            <div className="invoice-items-header">
              <span>Line items</span>
            </div>

            {items.map((item) => (
              <div className="invoice-item-row" key={item.id}>
                <textarea
                  type="text"
                  value={item.detail}
                  onChange={(e) => updateItem(item.id, 'detail', e.target.value)}
                  placeholder="Detail"
                  rows="2"
                  resize="vertical"
                  className="task-input invoice-item-detail"
                />
                <input
                  type="number"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)}
                  placeholder="Unit price"
                  className="task-input invoice-item-price"
                />
                <input
                  type="number"
                  value={item.qtyCount}
                  onChange={(e) => updateItem(item.id, 'qtyCount', e.target.value)}
                  placeholder="Qty"
                  className="task-input invoice-item-qty"
                  min="0"
                />
                <input
                  type="text"
                  value={item.qtyUnit}
                  onChange={(e) => updateItem(item.id, 'qtyUnit', e.target.value)}
                  placeholder="Unit"
                  className="task-input invoice-item-unit"
                />
                <span className="invoice-item-total">
                  IDR {(item.unitPrice * item.qtyCount || 0).toLocaleString('en-US')}
                </span>
                <button
                  type="button"
                  className="row-remove"
                  onClick={() => removeItem(item.id)}
                  aria-label="Remove line item"
                  disabled={items.length === 1}
                >
                  ×
                </button>
              </div>
            ))}

            <button type="button" className="btn-primary invoice-add-row" onClick={addItem}>
              + Add line item
            </button>
          </div>

          <div className="invoice-amount-summary">
            Amount: <strong>IDR {amount.toLocaleString('en-US')}</strong>
          </div>

          {selectedClientId && (
            <div className="invoice-save-row">
              <button
                type="button"
                className="btn-plain invoice-save-button"
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
              >
                Save
              </button>
              <span className="invoice-items-hint">
                {saveStatus === 'saving' && 'Saving...'}
                {saveStatus === 'saved' && 'Saved — next invoice for this client will suggest the following month ✓'}
                {saveStatus === 'error' && 'Could not save'}
                {saveStatus === 'idle' &&
                  'Saves line items and remembers this invoice number for next time'}
              </span>
            </div>
          )}

          <PDFDownloadLink
            document={<InvoiceDocument {...invoiceData} />}
            fileName={fileName}
            className="btn-primary invoice-download"
            onClick={() =>
              logInvoice({
                clientId: selectedClientId,
                clientName: clientNameForFile,
                invoiceNo,
                invoiceDate: invoiceData.invoiceDate,
                amount,
                language,
              })
            }
          >
            {({ loading }) => (loading ? 'Preparing...' : 'Download PDF')}
          </PDFDownloadLink>
        </div>

        <div className="invoices-preview">
          <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }}>
            <InvoiceDocument {...invoiceData} />
          </PDFViewer>
        </div>
      </div>

      <div className="bulk-generate">
        <h2 className="bulk-generate-title">Bulk Generate Invoices</h2>
        <p className="page-intro">
          Generates each selected client's next invoice from their saved line items and
          advances their invoice number/dates the same way "Save" does — clients with no saved
          line items yet are skipped. All PDFs download together in one ZIP, each still a
          separate file.
        </p>

        <div className="bulk-generate-actions">
          <button type="button" className="btn-plain" onClick={selectAllBulkClients}>
            Select all
          </button>
          <button type="button" className="btn-plain" onClick={clearBulkSelection}>
            Clear
          </button>
        </div>

        <div className="bulk-generate-list">
          {clients.map((client) => {
            const id = client[CLIENT_ID_COLUMN]
            return (
              <label key={id} className="bulk-generate-item">
                <input
                  type="checkbox"
                  checked={bulkSelectedIds.includes(id)}
                  onChange={() => toggleBulkClient(id)}
                />
                {id}
                {client['Client Business Name'] ? ` — ${client['Client Business Name']}` : ''}
              </label>
            )
          })}
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={handleBulkGenerate}
          disabled={bulkSelectedIds.length === 0 || bulkStatus === 'generating'}
        >
          {bulkStatus === 'generating'
            ? 'Generating...'
            : `Generate ZIP (${bulkSelectedIds.length} selected)`}
        </button>

        {bulkLog.length > 0 && (
          <ul className="bulk-generate-log">
            {bulkLog.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="bulk-generate invoice-log-section">
        <h2 className="bulk-generate-title">Invoice Log</h2>
        <p className="page-intro">
          Every invoice generated (single or bulk) is recorded here — client, invoice number,
          date, and amount — so you can check whether a client's already been billed for a
          given month.
        </p>

        <input
          type="text"
          value={logSearch}
          onChange={(e) => setLogSearch(e.target.value)}
          placeholder="Search by client or invoice no..."
          className="task-input"
        />

        <div className="invoice-log-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Generated</th>
                <th>Client</th>
                <th>Invoice No.</th>
                <th>Invoice Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoiceLog
                .filter((entry) => {
                  const q = logSearch.trim().toLowerCase()
                  if (!q) return true
                  return (
                    entry.clientName.toLowerCase().includes(q) ||
                    entry.clientId.toLowerCase().includes(q) ||
                    entry.invoiceNo.toLowerCase().includes(q)
                  )
                })
                .map((entry) => (
                  <tr key={entry.id}>
                    <td>{new Date(entry.generatedAt).toLocaleString()}</td>
                    <td>
                      {entry.clientId}
                      {entry.clientName ? ` — ${entry.clientName}` : ''}
                    </td>
                    <td>{entry.invoiceNo}</td>
                    <td>{entry.invoiceDate}</td>
                    <td>IDR {entry.amount.toLocaleString('en-US')}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {invoiceLog.length === 0 && (
          <p className="page-intro">No invoices generated yet.</p>
        )}
      </div>
    </div>
  )
}

export default Invoices
