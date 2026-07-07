const express = require('express')
const cors    = require('cors')

const authRoutes        = require('./routes/auth')
const kycRoutes         = require('./routes/kyc')
const scoringRoutes     = require('./routes/scoring')
const propertyRoutes    = require('./routes/properties')
const applicationRoutes = require('./routes/applications')
const contractRoutes    = require('./routes/contracts')
const paymentRoutes     = require('./routes/payments')
const adminRoutes       = require('./routes/admin')

const app = express()

// ── CORS ──────────────────────────────────────────────────────────────────────
// FRONTEND_URL puede ser una lista separada por comas para soportar
// el dominio de producción + previews de Vercel al mismo tiempo.
const rawOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
const allowedOrigins = new Set([
  ...rawOrigins,
  'http://localhost:5173',   // Vite dev
  'http://localhost:4173',   // Vite preview
])

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true)
    if (allowedOrigins.has(origin)) return callback(null, true)
    callback(new Error(`Origen bloqueado por CORS: ${origin}`))
  },
  credentials: true,
}))

// ── Middlewares globales ──────────────────────────────────────────────────────
app.use(express.json())

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// ── Rutas ─────────────────────────────────────────────────────────────────────
app.use('/auth',         authRoutes)
app.use('/kyc',          kycRoutes)
app.use('/scoring',      scoringRoutes)
app.use('/properties',   propertyRoutes)
app.use('/applications', applicationRoutes)
app.use('/contracts',    contractRoutes)
app.use('/payments',     paymentRoutes)
app.use('/admin',        adminRoutes)

// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }))

module.exports = app
