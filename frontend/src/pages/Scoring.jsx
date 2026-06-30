import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, CreditCard, FileCheck, Shield, CheckCircle, CheckCircle2,
  ArrowRight, Home, AlertCircle, Loader2, Star, BadgeCheck, Eye,
  DollarSign, RefreshCw, Info,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { scoringService } from '../services/scoring'
import { useAuthStore } from '../store/authStore'

// ─── Constantes del loading ───────────────────────────────────────────────────

const DIMS = [
  {
    key: 'ingresos',
    label: 'Ingresos mensuales',
    icon: TrendingUp,
    startAt: 0,
    duration: 2400,
    subSteps: [
      { text: 'Analizando capacidad de pago…',          at: 0    },
      { text: 'Calculando tope de alquiler…',            at: 900  },
      { text: 'Validando estabilidad de ingresos…',     at: 1700 },
    ],
    colors: { bg: 'bg-blue-50', ring: 'ring-blue-200', icon: 'bg-blue-500', bar: 'bg-blue-500', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
  },
  {
    key: 'infocorp',
    label: 'Historial INFOCORP',
    icon: CreditCard,
    startAt: 1200,
    duration: 2600,
    subSteps: [
      { text: 'Conectando con central de riesgo…',      at: 0    },
      { text: 'Consultando 12 entidades financieras…',  at: 1000 },
      { text: 'Verificando clasificación crediticia…',  at: 1900 },
    ],
    colors: { bg: 'bg-emerald-50', ring: 'ring-emerald-200', icon: 'bg-emerald-500', bar: 'bg-emerald-500', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  },
  {
    key: 'documentos',
    label: 'Documentos verificados',
    icon: FileCheck,
    startAt: 2600,
    duration: 1800,
    subSteps: [
      { text: 'Revisando DNI validado con RENIEC…',     at: 0    },
      { text: 'Verificando biometría facial…',          at: 700  },
      { text: 'Cruzando datos personales…',             at: 1300 },
    ],
    colors: { bg: 'bg-violet-50', ring: 'ring-violet-200', icon: 'bg-[#1B2A4A]', bar: 'bg-[#1B2A4A]', text: 'text-[#1B2A4A]', badge: 'bg-[#1B2A4A]/10 text-[#1B2A4A]' },
  },
]

const TOTAL_LOAD = Math.max(...DIMS.map(d => d.startAt + d.duration)) + 600

// ─── Input de ingreso ─────────────────────────────────────────────────────────

const PRESETS = [1500, 2500, 3500, 5000, 8000]

function InputScreen({ onSubmit, loading, error }) {
  const [ingreso, setIngreso] = useState('')

  const tope = ingreso && Number(ingreso) > 0
    ? Math.floor(Number(ingreso) * 0.5)
    : null

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/30 text-xs font-bold px-4 py-2 rounded-full mb-5">
          <Shield size={13} /> Scoring crediticio
        </div>
        <h1 className="text-2xl font-extrabold text-[#1B2A4A] leading-snug">
          Calcula tu capacidad<br />de alquiler
        </h1>
        <p className="text-gray-400 text-sm mt-2">
          Ingresa tu sueldo mensual neto y te diremos a qué inmuebles puedes postular.
        </p>
      </div>

      <div className="card p-6 mb-4">
        {/* Input principal */}
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Ingreso mensual neto (soles)
        </label>
        <div className="relative mb-3">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1B2A4A] font-bold text-lg">S/</span>
          <input
            type="number"
            min="500"
            step="100"
            placeholder="0"
            value={ingreso}
            onChange={e => setIngreso(e.target.value)}
            className="input-field pl-11 text-2xl font-extrabold text-[#1B2A4A] tracking-tight h-16"
          />
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-2 mb-5">
          {PRESETS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setIngreso(String(p))}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                ingreso === String(p)
                  ? 'bg-[#1B2A4A] text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              S/ {p.toLocaleString('es-PE')}
            </button>
          ))}
        </div>

        {/* Preview del tope */}
        {tope !== null && (
          <div className="flex items-center gap-3 p-4 bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-xl mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#C9A84C] flex items-center justify-center flex-shrink-0">
              <DollarSign size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Tope de alquiler estimado</p>
              <p className="text-xl font-extrabold text-[#1B2A4A]">
                S/ {tope.toLocaleString('es-PE')}<span className="text-sm font-normal text-gray-400">/mes</span>
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl mb-4">
            <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={() => onSubmit(Number(ingreso))}
          disabled={!ingreso || Number(ingreso) <= 0 || loading}
          className="w-full btn-primary flex items-center justify-center gap-2 py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? <><Loader2 size={16} className="animate-spin" /> Calculando…</>
            : <>Calcular mi scoring <ArrowRight size={16} /></>}
        </button>
      </div>

      <div className="flex items-start gap-2.5 bg-[#1B2A4A]/5 rounded-xl p-3.5">
        <Info size={14} className="text-[#1B2A4A]/50 mt-0.5 flex-shrink-0" />
        <p className="text-[#1B2A4A]/60 text-[11px] leading-relaxed">
          La consulta a INFOCORP no afecta tu puntaje crediticio. Tus datos se procesan bajo
          la <strong>Ley N° 29733</strong> de Protección de Datos Personales.
        </p>
      </div>
    </div>
  )
}

// ─── Loading (animación con dimensiones) ─────────────────────────────────────

function LoadingOrb({ pct }) {
  const r = 48, C = 2 * Math.PI * r
  return (
    <div className="relative flex items-center justify-center mx-auto w-28 h-28">
      <div className="absolute inset-0 rounded-full border border-[#1B2A4A]/10 animate-ping" style={{ animationDuration: '2.4s' }} />
      <div className="absolute inset-3 rounded-full border border-[#1B2A4A]/10 animate-ping" style={{ animationDuration: '2.4s', animationDelay: '0.6s' }} />
      <svg className="absolute inset-0 w-full h-full -rotate-90">
        <circle cx="56" cy="56" r={r} fill="none" stroke="#e5e7eb" strokeWidth="5" />
        <circle cx="56" cy="56" r={r} fill="none" stroke="#C9A84C" strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct / 100)}
          style={{ transition: 'stroke-dashoffset 0.25s linear' }} />
      </svg>
      <div className="relative z-10 w-16 h-16 rounded-full bg-[#1B2A4A] flex flex-col items-center justify-center shadow-lg shadow-[#1B2A4A]/30">
        <Shield size={22} className="text-[#C9A84C]" />
        <span className="text-[10px] font-bold text-[#C9A84C]/80 mt-0.5 tabular-nums">{Math.round(pct)}%</span>
      </div>
    </div>
  )
}

function DimCard({ dim, elapsed }) {
  const e = Math.max(0, elapsed - dim.startAt)
  const status = elapsed < dim.startAt ? 'pending' : e >= dim.duration ? 'done' : 'active'
  const barPct = status === 'done' ? 100 : status === 'active' ? Math.min(99, (e / dim.duration) * 100) : 0
  const subLabel = status === 'active'
    ? [...dim.subSteps].reverse().find(s => e >= s.at)?.text
    : null
  const Icon = dim.icon
  const c = dim.colors

  return (
    <div className={`rounded-2xl border transition-all duration-500 ${
      status === 'pending' ? 'bg-white border-gray-100 opacity-50'
      : status === 'active' ? `${c.bg} ring-2 ${c.ring} border-transparent shadow-sm`
      : 'bg-white border-gray-100'
    }`}>
      <div className="flex items-start gap-4 p-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${status === 'pending' ? 'bg-gray-100' : c.icon}`}>
          <Icon size={18} className={status === 'pending' ? 'text-gray-400' : 'text-white'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <p className={`text-sm font-bold truncate ${status === 'pending' ? 'text-gray-400' : 'text-[#1B2A4A]'}`}>
              {dim.label}
            </p>
            {status === 'pending' && <span className="badge bg-gray-100 text-gray-400 text-[10px]">Pendiente</span>}
            {status === 'active'  && <span className={`badge ${c.badge} text-[10px] flex items-center gap-1`}><span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />Analizando</span>}
            {status === 'done'    && <span className="badge bg-green-100 text-green-700 text-[10px] flex items-center gap-1"><CheckCircle size={10} />Completado</span>}
          </div>
          <p className="text-xs text-gray-400 mb-2.5 min-h-[16px]">
            {status === 'done' ? '✓ Dimensión evaluada' : status === 'active' ? subLabel : 'Esperando…'}
          </p>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-200 ease-linear ${status === 'done' ? 'bg-green-400' : c.bar}`}
              style={{ width: `${barPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function LoadingScreen({ elapsed }) {
  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/30 text-xs font-bold px-4 py-2 rounded-full mb-5">
          <span className="w-2 h-2 rounded-full bg-[#C9A84C] animate-pulse" />
          Análisis en curso
        </div>
        <h1 className="text-2xl font-extrabold text-[#1B2A4A] leading-snug">
          Evaluando tu perfil<br />crediticio
        </h1>
        <p className="text-gray-400 text-sm mt-2">Consultando fuentes externas. Unos segundos…</p>
      </div>
      <div className="mb-8">
        <LoadingOrb pct={Math.min(100, (elapsed / TOTAL_LOAD) * 100)} />
      </div>
      <div className="space-y-3">
        {DIMS.map(d => <DimCard key={d.key} dim={d} elapsed={elapsed} />)}
      </div>
    </div>
  )
}

// ─── Semigauge de resultado ───────────────────────────────────────────────────

function SemiGauge({ score, animScore }) {
  const r = 72, cx = 100, cy = 100
  const C = 2 * Math.PI * r, half = C / 2
  const fill = (animScore / 100) * half
  const color = score >= 75 ? '#16a34a' : score >= 55 ? '#d97706' : '#dc2626'

  return (
    <svg width="260" height="155" viewBox="-10 20 220 100">
      <defs>
        <filter id="sg-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0f0f0" strokeWidth={16}
        strokeLinecap="round" strokeDasharray={`${half} ${C}`}
        transform={`rotate(180 ${cx} ${cy})`} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={16}
        strokeLinecap="round" strokeDasharray={`${fill} ${C}`}
        transform={`rotate(180 ${cx} ${cy})`}
        filter="url(#sg-glow)"
        style={{ transition: 'stroke-dasharray 1.8s cubic-bezier(0.34,1.2,0.64,1)' }} />
      <text x={cx-r-4} y={cy+20} textAnchor="middle" fontSize="9" fill="#9ca3af" fontFamily="inherit">0</text>
      <text x={cx+r+4} y={cy+20} textAnchor="middle" fontSize="9" fill="#9ca3af" fontFamily="inherit">100</text>
      <text x={cx} y={cy-4} textAnchor="middle" fontSize="44" fontWeight="800" fill={color}
        fontFamily="'Plus Jakarta Sans', sans-serif">{animScore}</text>
      <text x={cx} y={cy+16} textAnchor="middle" fontSize="11" fill="#9ca3af"
        fontFamily="'Plus Jakarta Sans', sans-serif">/ 100</text>
    </svg>
  )
}

// ─── Barra de dimensión en resultado ─────────────────────────────────────────

function DimBar({ dim, data, show }) {
  const Icon = dim.icon
  const c = dim.colors
  const puntuacion = data?.puntuacion ?? 0
  const resumen    = data?.resumen    ?? ''

  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c.icon}`}>
        <Icon size={14} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className="text-xs font-semibold text-gray-700 truncate">{dim.label}</p>
          <span className={`text-xs font-extrabold ml-2 flex-shrink-0 ${c.text}`}>{puntuacion}/100</span>
        </div>
        <p className="text-[11px] text-gray-400 mb-1.5 truncate">{resumen}</p>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${c.bar}`}
            style={{ width: show ? `${puntuacion}%` : '0%', transition: 'width 1.2s cubic-bezier(0.34,1.1,0.64,1)' }} />
        </div>
      </div>
    </div>
  )
}

// ─── Pantalla de resultado ────────────────────────────────────────────────────

function ResultScreen({ scoring, animScore, showBars, onRecalcular }) {
  const navigate = useNavigate()
  const { detalle, decision, topeAlquiler, ingreso } = scoring
  const puntaje = detalle?.puntajeTotal ?? 0
  const stars   = detalle?.stars ?? 3
  const dims    = detalle?.dimensiones ?? {}

  const aprobado = decision === 'Aprobado'
  const accentColor   = aprobado ? '#16a34a' : '#d97706'
  const decisionBg    = aprobado ? 'bg-green-500' : 'bg-amber-500'
  const decisionLabel = aprobado ? 'PERFIL APROBADO' : 'PERFIL OBSERVADO'
  const topStripe     = aprobado
    ? 'from-emerald-400 via-green-500 to-emerald-400'
    : 'from-amber-400 via-yellow-500 to-amber-400'

  const starRating = aprobado
    ? 'Excelente'
    : puntaje >= 55 ? 'Regular' : 'En revisión'

  return (
    <div className="max-w-md mx-auto">

      {/* ── Tarjeta principal ── */}
      <div className="card overflow-hidden mb-4">
        <div className={`h-1.5 bg-gradient-to-r ${topStripe}`} />
        <div className="p-6 pb-4 text-center">

          <div className={`inline-flex items-center gap-2 ${decisionBg} text-white text-xs font-bold px-5 py-2 rounded-full mb-5 shadow-lg`}>
            <BadgeCheck size={15} /> {decisionLabel}
          </div>

          <SemiGauge score={puntaje} animScore={animScore} />

          <div className="mt-1 mb-4">
            <p className="text-lg font-extrabold text-[#1B2A4A]">
              {aprobado ? 'Puede postular a inmuebles' : 'Perfil en revisión — puede postular'}
            </p>
            <p className="text-gray-400 text-sm mt-1">Ingreso declarado: S/ {Number(ingreso).toLocaleString('es-PE')}/mes</p>
          </div>

          <div className="flex items-center justify-center gap-1 mb-2">
            {[1,2,3,4,5].map(i => (
              <Star key={i} size={18}
                className={i <= stars ? 'text-[#C9A84C] fill-[#C9A84C]' : 'text-gray-200 fill-gray-200'} />
            ))}
            <span className="text-xs font-bold text-gray-500 ml-1.5">{starRating}</span>
          </div>
        </div>

        <div className="h-px bg-gray-100 mx-5" />

        {/* Tope destacado */}
        <div className="p-5">
          <div className="flex items-center gap-4 p-4 rounded-2xl border-2 border-[#C9A84C]/40 bg-[#C9A84C]/5">
            <div className="w-12 h-12 rounded-xl bg-[#C9A84C] flex items-center justify-center flex-shrink-0">
              <DollarSign size={22} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400 font-medium">Tope máximo de alquiler</p>
              <p className="text-2xl font-extrabold text-[#1B2A4A]">
                S/ {Number(topeAlquiler).toLocaleString('es-PE')}
                <span className="text-base font-normal text-gray-400">/mes</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                50% de tu ingreso mensual neto · vigente por {detalle?.vigenciaMeses ?? 6} meses
              </p>
            </div>
          </div>
        </div>

        {/* Stats secundarias */}
        <div className="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100 text-center py-4">
          {[
            { label: 'Puntaje global', value: `${puntaje}/100` },
            { label: 'Vigencia',       value: `${detalle?.vigenciaMeses ?? 6} meses` },
          ].map(({ label, value }) => (
            <div key={label} className="px-3">
              <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
              <p className="text-sm font-extrabold text-[#1B2A4A]">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Detalle de dimensiones ── */}
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[#1B2A4A] text-sm">Detalle de evaluación</h2>
          <span className={`badge text-[10px] ${aprobado ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            <CheckCircle size={10} /> 3 dimensiones
          </span>
        </div>

        <div className="space-y-5">
          {DIMS.map(d => (
            <DimBar key={d.key} dim={d} data={dims[d.key]} show={showBars} />
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#1B2A4A]">Puntuación global</span>
            <span className={`text-sm font-extrabold ${aprobado ? 'text-green-600' : 'text-amber-600'}`}>{puntaje}/100</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${aprobado ? 'from-green-400 to-green-600' : 'from-amber-400 to-amber-600'}`}
              style={{ width: showBars ? `${puntaje}%` : '0%', transition: 'width 1.5s cubic-bezier(0.34,1.1,0.64,1) 0.2s' }}
            />
          </div>
        </div>
      </div>

      {/* ── Qué significa ── */}
      <div className={`border rounded-2xl p-4 mb-5 ${aprobado ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${aprobado ? 'bg-green-500' : 'bg-amber-500'}`}>
            {aprobado ? <CheckCircle2 size={18} className="text-white" /> : <Eye size={18} className="text-white" />}
          </div>
          <div>
            <p className={`font-bold text-sm mb-2 ${aprobado ? 'text-green-800' : 'text-amber-800'}`}>
              {aprobado ? '¿Qué significa Aprobado?' : '¿Qué significa Observado?'}
            </p>
            <ul className="space-y-1.5">
              {(aprobado
                ? [
                    `Puedes postular a inmuebles hasta S/ ${Number(topeAlquiler).toLocaleString('es-PE')}/mes`,
                    'Los arrendadores verán tu puntuación verificada',
                    `El scoring es válido por ${detalle?.vigenciaMeses ?? 6} meses`,
                    'Puedes firmar contratos digitales en la plataforma',
                  ]
                : [
                    'Tu perfil está en revisión — no estás bloqueado',
                    'Puedes postular; el arrendador ve tu puntuación completa',
                    'Mejora tu score completando la verificación de identidad',
                    'Puedes recalcular en cualquier momento',
                  ]
              ).map(item => (
                <li key={item} className={`flex items-start gap-2 text-xs ${aprobado ? 'text-green-700' : 'text-amber-700'}`}>
                  <CheckCircle size={11} className={`flex-shrink-0 mt-0.5 ${aprobado ? 'text-green-500' : 'text-amber-500'}`} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── CTAs ── */}
      <div className="flex flex-col gap-3">
        <button onClick={() => navigate('/inmuebles')}
          className="w-full btn-primary flex items-center justify-center gap-2 py-3.5">
          <Home size={16} /> Explorar inmuebles <ArrowRight size={16} />
        </button>
        <button onClick={onRecalcular}
          className="w-full btn-outline flex items-center justify-center gap-2 py-3 text-sm">
          <RefreshCw size={14} /> Recalcular con otro ingreso
        </button>
      </div>
    </div>
  )
}

// ─── Flash de transición ──────────────────────────────────────────────────────

function TransitionFlash() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
          <CheckCircle size={36} className="text-green-500" />
        </div>
        <p className="text-[#1B2A4A] font-bold text-lg">Calculando resultado…</p>
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-[#1B2A4A]/30 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Scoring() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()

  const [phase,     setPhase]     = useState('input')    // input | loading | flash | result
  const [scoring,   setScoring]   = useState(null)
  const [elapsed,   setElapsed]   = useState(0)
  const [animScore, setAnimScore] = useState(0)
  const [showBars,  setShowBars]  = useState(false)
  const [inputErr,  setInputErr]  = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Guardar resultado devuelto por la API antes de iniciar la animación
  const [pendingScoring, setPendingScoring] = useState(null)

  // Redirigir si no autenticado o no es Arrendatario
  useEffect(() => {
    if (!isAuthenticated()) navigate('/registro?redirect=/scoring')
  }, [])

  // Cargar scoring existente al entrar
  useEffect(() => {
    if (!isAuthenticated()) return
    // Si ya tiene score previo, pre-cargar para que pueda verlo o recalcular
    // (no redirigir al resultado automáticamente — el usuario puede querer cambiar el ingreso)
  }, [])

  // Ticker del loading
  useEffect(() => {
    if (phase !== 'loading') return
    const start = Date.now()
    const id = setInterval(() => {
      const t = Date.now() - start
      setElapsed(t)
      if (t >= TOTAL_LOAD) {
        clearInterval(id)
        setPhase('flash')
        setTimeout(() => {
          // Mostrar resultado real cuando termina la animación
          setScoring(pendingScoring)
          setPhase('result')
          const cs = Date.now()
          const dur = 1800
          const puntaje = pendingScoring?.detalle?.puntajeTotal ?? 0
          const counter = setInterval(() => {
            const p = Math.min(1, (Date.now() - cs) / dur)
            const eased = 1 - Math.pow(1 - p, 3)
            setAnimScore(Math.round(eased * puntaje))
            if (p >= 1) { clearInterval(counter); setAnimScore(puntaje) }
          }, 20)
          setTimeout(() => setShowBars(true), 400)
        }, 800)
      }
    }, 40)
    return () => clearInterval(id)
  }, [phase, pendingScoring])

  const handleSubmit = async (ingreso) => {
    if (!ingreso || ingreso <= 0) { setInputErr('Ingresa un ingreso mensual válido'); return }
    setSubmitting(true)
    setInputErr('')
    try {
      const data = await scoringService.calcular(ingreso)
      setPendingScoring(data)
      setElapsed(0)
      setAnimScore(0)
      setShowBars(false)
      setPhase('loading')
    } catch (err) {
      setInputErr(err.response?.data?.error || 'Error al calcular. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRecalcular = () => {
    setScoring(null)
    setPendingScoring(null)
    setPhase('input')
    setAnimScore(0)
    setShowBars(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar />

      {phase === 'flash' && <TransitionFlash />}

      <div className="pt-20 pb-16 px-4">
        <div className="pt-6">
          {phase === 'input'   && <InputScreen   onSubmit={handleSubmit} loading={submitting} error={inputErr} />}
          {phase === 'loading' && <LoadingScreen  elapsed={elapsed} />}
          {phase === 'result'  && scoring && (
            <ResultScreen
              scoring={scoring}
              animScore={animScore}
              showBars={showBars}
              onRecalcular={handleRecalcular}
            />
          )}
        </div>
      </div>
    </div>
  )
}
