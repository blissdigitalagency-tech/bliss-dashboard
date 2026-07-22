import express from 'express'
import cookieParser from 'cookie-parser'
import { ensureSeedSuperadmin } from './utils/users.js'
import authRoutes from './routes/auth.js'
import clientRoutes from './routes/clients.js'
import userRoutes from './routes/users.js'
import invoiceRoutes from './routes/invoices.js'
import assetRoutes from './routes/assets.js'

const USERS_PATH = new URL('./data/users.json', import.meta.url)
const PORT = process.env.API_PORT || 4000

ensureSeedSuperadmin(USERS_PATH)

const app = express()
app.use(express.json())
app.use(cookieParser())

app.use('/api/auth', authRoutes)
app.use('/api/clients', clientRoutes)
app.use('/api/users', userRoutes)
app.use('/api/invoices', invoiceRoutes)
app.use('/api/assets', assetRoutes)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Something went wrong on the server' })
})

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})
