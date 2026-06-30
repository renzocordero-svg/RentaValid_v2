import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Shield, Check, ChevronRight, Download, Fingerprint, AlertCircle,
  MapPin, Calendar, DollarSign, X, Clock, ArrowRight, Hash,
  Lock, FileText, CheckCircle2, Loader2, Edit3, Save, RotateCcw,
  Building2, User, BadgeCheck, Printer, ChevronDown, ChevronUp,
  PenLine, Info, Sparkles,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { contractsService } from '../services/contracts'
import { useAuthStore } from '../store/authStore'

const N = (v) => Number(v).toLocaleString('es-PE')
const fmtDate = (d) => new Date(d).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })

// ─── Sensor de huella (modal de firma) ───────────────────────────────────────

function FingerprintSensor({ onDone }) {
  const [state, setState] = useState('idle')
  const ref = useRef()

  const handleTouch = () => {
    if (state !== 'idle') return
    setState('reading')
    ref.current = setTimeout(() => {
      setState('verifying')
      ref.current = setTimeout(() => { setState('done'); setTimeout(onDone, 600) }, 1500)
    }, 1800)
  }
  useEffect(() => () => clearTimeout(ref.current), [])

  const ring  = { idle: 'border-gray-200',   reading: 'border-[#C9A84C]', verifying: 'border-blue-400', done: 'border-green-400' }
  const bg    = { idle: 'bg-gray-50',         reading: 'bg-[#C9A84C]/10', verifying: 'bg-blue-50',      done: 'bg-green-50'      }
  const icon  = { idle: 'text-gray-300',      reading: 'text-[#C9A84C]',  verifying: 'text-blue-400',   done: 'text-green-500'   }
  const label = { idle: 'Toca el sensor',     reading: 'Leyendo huella…', verifying: 'Verificando…',    done: '¡Confirmado!'     }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {(state === 'reading' || state === 'verifying') && (
          <div className={`absolute inset-0 rounded-full border-2 animate-ping ${state === 'reading' ? 'border-[#C9A84C]/50' : 'border-blue-300/50'}`} />
        )}
        <button
          onClick={handleTouch}
          disabled={state !== 'idle'}
          className={`w-28 h-28 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${ring[state]} ${bg[state]}`}
        >
          {state === 'done'
            ? <Check size={44} className="text-green-500" />
            : <Fingerprint size={48} className={`${icon[state]} transition-colors duration-500`} />}
        </button>
      </div>
      <p className={`text-sm font-semibold ${state === 'done' ? 'text-green-600' : state === 'idle' ? 'text-gray-400' : 'text-[#1B2A4A]'}`}>
        {label[state]}
      </p>
    </div>
  )
}

// ─── Modal de firma digital ───────────────────────────────────────────────────

function SignModal({ contract, user, onClose, onSigned }) {
  const [step, setStep]         = useState(0)   // 0: confirm | 1: biometric | 2: signing
  const [accepted, setAccepted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [apiError, setApiError] = useState('')

  const nombreCompleto = [user.nombre, user.apellidoPaterno, user.apellidoMaterno].filter(Boolean).join(' ')

  const doSign = useCallback(async () => {
    const start = Date.now()
    const dur   = 2200
    const raf   = (ts) => {
      const pct = Math.min((ts - start) / dur, 1)
      setProgress(Math.round(pct * 100))
      if (pct < 1) requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)

    try {
      const result = await contractsService.firmar(contract.id)
      setTimeout(() => onSigned(result), dur)
    } catch (err) {
      setApiError(err.response?.data?.error || 'Error al firmar. Intenta de nuevo.')
      setStep(0)
    }
  }, [contract.id, onSigned])

  useEffect(() => { if (step === 2) doSign() }, [step, doSign])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1B2A4A]/60 backdrop-blur-md" onClick={step === 0 ? onClose : undefined} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-[#1B2A4A] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#C9A84C]/20 flex items-center justify-center">
              <Lock size={17} className="text-[#C9A84C]" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Firma digital</p>
              <p className="text-white/50 text-xs">
                {step === 0 && 'Confirmar datos'}{step === 1 && 'Verificación biométrica'}{step === 2 && 'Aplicando firma…'}
              </p>
            </div>
          </div>
          {step === 0 && (
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition">
              <X size={14} className="text-white" />
            </button>
          )}
        </div>

        {/* Step pills */}
        <div className="flex items-center px-6 py-3 border-b border-gray-100 gap-2">
          {['Datos', 'Huella', 'Firmando'].map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all ${
                step > i ? 'bg-green-500 text-white' : step === i ? 'bg-[#1B2A4A] text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {step > i ? <Check size={10} /> : i + 1}
              </div>
              <span className={`text-xs font-medium flex-1 ${step === i ? 'text-[#1B2A4A]' : step > i ? 'text-green-600' : 'text-gray-400'}`}>{label}</span>
              {i < 2 && <div className={`h-px flex-1 ${step > i ? 'bg-green-200' : 'bg-gray-100'}`} />}
            </div>
          ))}
        </div>

        <div className="p-6">
          {apiError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
              <AlertCircle size={14} className="text-red-500" />
              <p className="text-xs text-red-600">{apiError}</p>
            </div>
          )}

          {/* Step 0 — confirmar datos */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Datos del firmante</p>
                {[
                  { icon: User,      label: 'Nombre',   value: nombreCompleto                    },
                  { icon: Hash,      label: 'DNI',      value: user.dni || 'No registrado'        },
                  { icon: FileText,  label: 'Inmueble', value: contract.application?.property?.titulo || `Contrato #${contract.id}` },
                  { icon: DollarSign,label: 'Renta',    value: `S/ ${N(contract.monto)}/mes`     },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs text-gray-500">
                      <Icon size={12} className="text-gray-400" /> {label}
                    </span>
                    <span className="text-xs font-semibold text-[#1B2A4A] text-right max-w-[55%] truncate">{value}</span>
                  </div>
                ))}
              </div>

              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div
                  onClick={() => setAccepted(v => !v)}
                  className={`w-5 h-5 rounded flex-shrink-0 mt-0.5 border-2 flex items-center justify-center transition-all cursor-pointer ${accepted ? 'bg-[#1B2A4A] border-[#1B2A4A]' : 'border-gray-300'}`}
                >
                  {accepted && <Check size={11} className="text-white" />}
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  He leído y acepto íntegramente los términos del contrato, incluyendo la <strong className="text-[#1B2A4A]">Cláusula de Allanamiento a Futuro — Ley N° 30933</strong>. Entiendo que la firma digital tiene plena validez legal y mérito ejecutivo.
                </p>
              </label>

              <button
                onClick={() => setStep(1)}
                disabled={!accepted}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continuar a verificación biométrica <ArrowRight size={15} />
              </button>
            </div>
          )}

          {/* Step 1 — huella */}
          {step === 1 && (
            <div className="py-4 flex flex-col items-center gap-5">
              <div className="text-center">
                <p className="text-[#1B2A4A] font-bold mb-1">Coloca tu dedo en el sensor</p>
                <p className="text-gray-400 text-xs">Tu huella confirma tu identidad para la firma</p>
              </div>
              <FingerprintSensor onDone={() => setStep(2)} />
              <div className="flex items-center gap-2 bg-blue-50 rounded-xl p-3 w-full">
                <Shield size={13} className="text-blue-500 flex-shrink-0" />
                <p className="text-xs text-blue-600">Tu huella se verifica localmente y nunca se almacena.</p>
              </div>
            </div>
          )}

          {/* Step 2 — firmando */}
          {step === 2 && (
            <div className="py-8 flex flex-col items-center gap-5">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#1B2A4A" strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${(progress / 100) * 263.9} 263.9`}
                    className="transition-all duration-100" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-extrabold text-[#1B2A4A]">{progress}%</span>
                </div>
              </div>
              <div className="text-center">
                <p className="font-bold text-[#1B2A4A]">Aplicando firma digital</p>
                <p className="text-xs text-gray-400 mt-1">Generando hash SHA-256 y registrando la firma…</p>
              </div>
              <div className="w-full space-y-2">
                {[
                  { label: 'Verificando identidad',       done: progress >= 30  },
                  { label: 'Aplicando firma electrónica', done: progress >= 65  },
                  { label: 'Registrando en la plataforma',done: progress >= 100 },
                ].map(({ label, done }) => (
                  <div key={label} className="flex items-center gap-3 text-xs">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${done ? 'bg-green-500' : 'bg-gray-100'}`}>
                      {done ? <Check size={9} className="text-white" /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                    </div>
                    <span className={done ? 'text-green-600 font-medium' : 'text-gray-400'}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Encabezado del documento ─────────────────────────────────────────────────

function DocHeader({ estado }) {
  const estadoColor = {
    Borrador:   'bg-amber-100 text-amber-700',
    Activo:     'bg-blue-100 text-blue-700',
    Firmado:    'bg-green-100 text-green-700',
    Finalizado: 'bg-gray-100 text-gray-600',
    Cancelado:  'bg-red-100 text-red-700',
  }
  return (
    <div className="bg-[#1B2A4A] px-8 py-6 text-center relative overflow-hidden">
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'radial-gradient(circle,#C9A84C 1px,transparent 1px)', backgroundSize: '24px 24px' }} />
      <div className="relative flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-[#C9A84C]" />
          <span className="text-[#C9A84C] text-xs font-bold tracking-widest uppercase">RentaValid</span>
        </div>
        <h2 className="text-white text-xl font-extrabold tracking-wide">Contrato de Arrendamiento</h2>
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <span className="badge bg-[#C9A84C]/20 text-[#C9A84C] border border-[#C9A84C]/30 text-[10px]">Ley N° 30933</span>
          <span className="badge bg-white/10 text-white/60 text-[10px]">Mérito Ejecutivo</span>
          <span className={`badge text-[10px] ${estadoColor[estado] || 'bg-gray-100 text-gray-500'}`}>{estado}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Sección de partes ────────────────────────────────────────────────────────

function PartiesSection({ contract }) {
  const arrendador   = contract.application?.property?.arrendador
  const arrendatario = contract.application?.arrendatario
  const nombreA = (u) => u ? [u.nombre, u.apellidoPaterno].filter(Boolean).join(' ') : '—'

  return (
    <div>
      <SectionTitle>I. Partes contratantes</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#1B2A4A]/4 rounded-xl p-4 border border-[#1B2A4A]/10">
          <div className="flex items-center gap-2 mb-3">
            <span className="badge bg-[#1B2A4A] text-white text-[10px]">ARRENDADOR</span>
          </div>
          <p className="font-bold text-[#1B2A4A]">{nombreA(arrendador)}</p>
          <p className="text-xs text-gray-400 mt-1">{arrendador?.email || '—'}</p>
        </div>
        <div className="bg-[#C9A84C]/5 rounded-xl p-4 border border-[#C9A84C]/15">
          <div className="flex items-center gap-2 mb-3">
            <span className="badge bg-[#C9A84C] text-[#1B2A4A] text-[10px]">ARRENDATARIO</span>
          </div>
          <p className="font-bold text-[#1B2A4A]">{nombreA(arrendatario)}</p>
          <p className="text-xs text-gray-400 mt-1">{arrendatario?.email || '—'}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Condiciones económicas ───────────────────────────────────────────────────

function TermsSection({ contract }) {
  return (
    <div>
      <SectionTitle>II. Condiciones económicas</SectionTitle>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Renta mensual', value: `S/ ${N(contract.monto)}`,    note: 'Primeros 5 días del mes'  },
          { label: 'Garantía',      value: `S/ ${N(contract.garantia)}`, note: `${contract.mesesGarantia ?? 2} meses · Reembolsable` },
          { label: 'Vigencia',      value: '12 meses',                   note: `${fmtDate(contract.fechaInicio)} — ${fmtDate(contract.fechaFin)}` },
        ].map(({ label, value, note }) => (
          <div key={label} className="text-center bg-[#1B2A4A]/4 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 mb-1">{label}</p>
            <p className="text-base font-extrabold text-[#1B2A4A] leading-none">{value}</p>
            <p className="text-[10px] text-gray-400 mt-1">{note}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Cláusulas ────────────────────────────────────────────────────────────────

function ClausesSection({ clausulas, contenido }) {
  const [expanded, setExpanded] = useState(null)
  const [showRaw, setShowRaw]   = useState(false)

  const hasClausulas = Array.isArray(clausulas) && clausulas.length > 0

  if (!hasClausulas) {
    return (
      <div>
        <SectionTitle>III. Cláusulas del contrato</SectionTitle>
        <pre className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap font-sans bg-gray-50 rounded-xl p-4 border border-gray-100">
          {contenido}
        </pre>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <SectionTitle className="mb-0">III. Cláusulas del contrato</SectionTitle>
        <button
          onClick={() => setShowRaw(v => !v)}
          className="text-xs text-gray-400 hover:text-[#1B2A4A] transition flex items-center gap-1"
        >
          <FileText size={11} /> {showRaw ? 'Vista estructurada' : 'Texto completo'}
        </button>
      </div>

      {showRaw ? (
        <pre className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap font-sans bg-gray-50 rounded-xl p-4 border border-gray-100">
          {contenido}
        </pre>
      ) : (
        <div className="space-y-2">
          {clausulas.map((c) => {
            const isAllanamiento = c.ley === 'N° 30933'
            const isOpen = expanded === c.numero
            return (
              <div
                key={c.numero}
                className={`rounded-xl border overflow-hidden transition-all ${
                  isAllanamiento
                    ? 'border-[#C9A84C]/40 bg-[#C9A84C]/4'
                    : 'border-gray-100 bg-white'
                }`}
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : c.numero)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className={`text-[10px] font-black w-5 flex-shrink-0 ${isAllanamiento ? 'text-[#C9A84C]' : 'text-gray-400'}`}>
                      {c.numero}
                    </span>
                    <p className={`text-xs font-bold truncate ${isAllanamiento ? 'text-[#C9A84C]' : 'text-[#1B2A4A]'}`}>
                      {c.titulo}
                    </p>
                    {isAllanamiento && (
                      <span className="badge bg-[#C9A84C]/20 text-[#C9A84C] text-[9px] flex-shrink-0 border border-[#C9A84C]/30">
                        Ley {c.ley}
                      </span>
                    )}
                  </div>
                  {isOpen
                    ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0 ml-2" />
                    : <ChevronDown size={14} className="text-gray-400 flex-shrink-0 ml-2" />}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4">
                    <div className={`h-px mb-3 ${isAllanamiento ? 'bg-[#C9A84C]/20' : 'bg-gray-100'}`} />
                    <p className="text-xs text-gray-600 leading-relaxed">{c.texto}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Área de firmas ───────────────────────────────────────────────────────────

function SignaturesSection({ contract }) {
  const arrendador   = contract.application?.property?.arrendador
  const arrendatario = contract.application?.arrendatario
  const signatures   = contract.signatures ?? []

  const firmaDe = (userId) => signatures.find(s => s.userId === userId)

  const partes = [
    { rol: 'ARRENDADOR',   user: arrendador   },
    { rol: 'ARRENDATARIO', user: arrendatario },
  ]

  return (
    <div>
      <SectionTitle>IV. Firmas</SectionTitle>
      <div className="grid grid-cols-2 gap-8">
        {partes.map(({ rol, user }) => {
          const firma = user ? firmaDe(user.id) : null
          return (
            <div key={rol} className="text-center">
              <div className={`h-14 border-b-2 flex items-end justify-center pb-1.5 transition-all ${
                firma ? 'border-green-400' : 'border-dashed border-gray-200'
              }`}>
                {firma
                  ? <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-green-500" />
                      <span className="text-[10px] text-green-600 font-semibold">Firmado digitalmente</span>
                    </div>
                  : <span className="text-[9px] text-gray-300 italic">Firma pendiente</span>}
              </div>
              <div className="mt-2 space-y-0.5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">{rol}</p>
                <p className="text-xs font-bold text-[#1B2A4A]">
                  {user ? [user.nombre, user.apellidoPaterno].filter(Boolean).join(' ') : '—'}
                </p>
                {firma && (
                  <p className="text-[9px] text-gray-400 font-mono truncate">
                    SHA: {firma.hash?.slice(0, 16)}…
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-center text-[10px] text-gray-400 mt-4">
        Lima, Perú · {fmtDate(new Date())}
      </p>
    </div>
  )
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function SectionTitle({ children, className = '' }) {
  return (
    <p className={`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ${className}`}>
      {children}
    </p>
  )
}

function Divider() {
  return <div className="border-t border-dashed border-gray-200" />
}

// ─── Documento del contrato ───────────────────────────────────────────────────

function ContractDocument({ contract }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <DocHeader estado={contract.estado} />

      <div className="px-6 sm:px-8 py-6 space-y-6">
        <PartiesSection contract={contract} />
        <Divider />
        <TermsSection contract={contract} />
        <Divider />
        <ClausesSection clausulas={contract.clausulas} contenido={contract.contenido} />
        <Divider />
        <SignaturesSection contract={contract} />
      </div>

      <div className="bg-gray-50 border-t border-gray-200 px-8 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield size={13} className="text-[#1B2A4A] flex-shrink-0" />
          <p className="text-[10px] text-gray-500 leading-relaxed">
            Contrato al amparo de la <strong className="text-[#1B2A4A]">Ley N° 30933</strong> y su Reglamento (D.S. N° 017-2019-VIVIENDA). Mérito ejecutivo según Art. 10°.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => window.print()}
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-[#1B2A4A] transition px-2 py-1 rounded-lg hover:bg-gray-100">
            <Printer size={11} /> Imprimir
          </button>
          <button className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-[#1B2A4A] transition px-2 py-1 rounded-lg hover:bg-gray-100">
            <Download size={11} /> PDF
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Panel de edición ─────────────────────────────────────────────────────────

function EditPanel({ contract, onSaved, onCancel }) {
  const [text, setText]       = useState(contract.contenido)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [saved, setSaved]     = useState(false)

  const handleSave = async () => {
    if (!text.trim()) { setError('El contenido no puede estar vacío'); return }
    setSaving(true)
    setError('')
    try {
      const updated = await contractsService.editar(contract.id, text)
      setSaved(true)
      setTimeout(() => onSaved(updated), 800)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex items-start gap-3">
        <Edit3 size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-bold text-amber-800">Modo edición — Propuesta de cambios</p>
          <p className="text-xs text-amber-600 mt-0.5">
            Los cambios se guardan sobre el texto del contrato. La otra parte podrá revisarlos antes de firmar.
          </p>
        </div>
        <button onClick={onCancel} className="text-amber-500 hover:text-amber-700 transition">
          <X size={16} />
        </button>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
            <AlertCircle size={13} className="text-red-500" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}
        {saved && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
            <CheckCircle2 size={13} className="text-green-500" />
            <p className="text-xs text-green-600 font-semibold">Cambios guardados correctamente</p>
          </div>
        )}

        <textarea
          value={text}
          onChange={e => { setText(e.target.value); setError('') }}
          className="w-full h-[60vh] text-xs font-mono leading-relaxed text-gray-700 bg-gray-50 border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/20 focus:border-[#1B2A4A] resize-none"
          spellCheck={false}
        />

        <div className="flex items-center justify-between mt-1 mb-4">
          <span className="text-[10px] text-gray-400">{text.length} caracteres</span>
          <span className="text-[10px] text-gray-400">Usa saltos de línea para separar cláusulas</span>
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-outline flex-1 py-3 flex items-center justify-center gap-2 text-sm">
            <RotateCcw size={14} /> Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 text-sm disabled:opacity-60"
          >
            {saving
              ? <><Loader2 size={14} className="animate-spin" /> Guardando…</>
              : saved
                ? <><CheckCircle2 size={14} /> Guardado</>
                : <><Save size={14} /> Guardar propuesta</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Estado de éxito post-firma ───────────────────────────────────────────────

function SignedSuccess({ contract, result, navigate }) {
  const ambos = result?.contratoFirmado
  return (
    <div className="card p-8 text-center max-w-lg mx-auto">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 ${ambos ? 'bg-green-100' : 'bg-blue-100'}`}>
        {ambos
          ? <CheckCircle2 size={40} className="text-green-600" />
          : <PenLine size={34} className="text-blue-600" />}
      </div>

      <h2 className="text-xl font-extrabold text-[#1B2A4A] mb-2">
        {ambos ? '¡Contrato firmado!' : 'Tu firma fue registrada'}
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        {ambos
          ? 'Ambas partes han firmado. El contrato está activo y tiene plena validez legal bajo la Ley N° 30933.'
          : 'Tu firma fue registrada exitosamente. El contrato se activará cuando la otra parte también firme.'}
      </p>

      <div className="bg-gray-50 rounded-2xl p-5 mb-5 text-left space-y-2.5">
        {[
          ['Contrato',     `#${contract.id}`],
          ['Estado',       ambos ? 'Firmado · Activo' : 'Firmado parcialmente'],
          ['Tu firma',     'Aplicada ✓'],
          ['Hash SHA-256', result?.signature?.hash?.slice(0, 24) + '…'],
          ['Fecha',        fmtDate(new Date())],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <span className="text-gray-400 text-xs">{k}</span>
            <span className="font-semibold text-[#1B2A4A] text-xs text-right">{v}</span>
          </div>
        ))}
      </div>

      {ambos && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3 mb-5 text-left">
          <Shield size={14} className="text-green-600 flex-shrink-0" />
          <p className="text-xs text-green-700">
            Este contrato tiene mérito ejecutivo. Ante incumplimiento puede accionarse ante notario público sin proceso judicial (Art. 7° Ley N° 30933).
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={() => navigate('/pagos')} className="flex-1 btn-primary flex items-center justify-center gap-2">
          Ir a mis pagos <ChevronRight size={15} />
        </button>
        <button onClick={() => navigate('/inmuebles')} className="flex-1 btn-outline flex items-center justify-center gap-2">
          Explorar inmuebles
        </button>
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Contract() {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const { user }    = useAuthStore()

  const [contract,  setContract]  = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [fetchErr,  setFetchErr]  = useState('')
  const [mode,      setMode]      = useState('view')      // view | edit
  const [showModal, setShowModal] = useState(false)
  const [signResult, setSignResult] = useState(null)      // null | { signature, contratoFirmado }

  useEffect(() => {
    setLoading(true)
    contractsService.obtener(id)
      .then(setContract)
      .catch(err => setFetchErr(err.response?.data?.error || 'No se pudo cargar el contrato.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-[#1B2A4A]" />
    </div>
  )

  if (fetchErr) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-24 px-4 max-w-lg mx-auto text-center">
        <div className="card p-8">
          <AlertCircle size={36} className="text-red-400 mx-auto mb-4" />
          <p className="font-bold text-[#1B2A4A] mb-2">No se pudo cargar el contrato</p>
          <p className="text-sm text-gray-400 mb-5">{fetchErr}</p>
          <button onClick={() => navigate(-1)} className="btn-primary">Volver</button>
        </div>
      </div>
    </div>
  )

  if (signResult) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <SignedSuccess contract={contract} result={signResult} navigate={navigate} />
      </div>
      <Footer />
    </div>
  )

  // ── Calcular estado de firmas ─────────────────────────────────────────────
  const signatures   = contract?.signatures ?? []
  const yaFirme      = signatures.some(s => s.userId === user?.id)
  const totalFirmas  = signatures.length
  const esBorrador   = contract?.estado === 'Borrador'
  const esFirmado    = contract?.estado === 'Firmado'

  const esArrendador   = contract?.application?.property?.arrendadorId    === user?.id
  const esArrendatario = contract?.application?.arrendatarioId === user?.id
  const esParte        = esArrendador || esArrendatario

  const property = contract?.application?.property

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {showModal && (
        <SignModal
          contract={contract}
          user={user}
          onClose={() => setShowModal(false)}
          onSigned={(result) => { setShowModal(false); setSignResult(result) }}
        />
      )}

      {/* Page header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Shield size={13} className="text-[#C9A84C]" />
                <span className="text-xs font-semibold text-[#C9A84C] uppercase tracking-wide">Ley N° 30933</span>
              </div>
              <h1 className="text-lg font-extrabold text-[#1B2A4A]">
                {property?.titulo || `Contrato #${id}`}
              </h1>
              <p className="text-xs text-gray-400">{property?.distrito} · {fmtDate(contract.fechaInicio)}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {esFirmado && <span className="badge bg-green-100 text-green-700"><CheckCircle2 size={10} /> Firmado</span>}
              {esBorrador && <span className="badge bg-amber-100 text-amber-700"><Clock size={10} /> Borrador</span>}
              {yaFirme && !esFirmado && <span className="badge bg-blue-100 text-blue-700"><PenLine size={10} /> Tu firma aplicada</span>}
              <span className="badge bg-[#1B2A4A]/8 text-[#1B2A4A]">
                {totalFirmas}/2 firmas
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── Columna izquierda: documento / editor ── */}
          <div className="flex-1 min-w-0">
            {mode === 'edit' ? (
              <EditPanel
                contract={contract}
                onSaved={(updated) => { setContract(c => ({ ...c, ...updated })); setMode('view') }}
                onCancel={() => setMode('view')}
              />
            ) : (
              <ContractDocument contract={contract} />
            )}
          </div>

          {/* ── Columna derecha: panel de acciones (sticky) ── */}
          {mode === 'view' && (
            <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0 lg:sticky lg:top-20 space-y-4">

              {/* Resumen */}
              <div className="card p-5">
                <h3 className="font-bold text-[#1B2A4A] text-sm mb-4">Resumen del acuerdo</h3>
                <div className="space-y-3 text-xs">
                  {[
                    { icon: DollarSign, label: 'Renta',    value: `S/ ${N(contract.monto)}/mes`    },
                    { icon: DollarSign, label: 'Garantía', value: `S/ ${N(contract.garantia)}`     },
                    { icon: Calendar,   label: 'Inicio',   value: fmtDate(contract.fechaInicio)    },
                    { icon: Calendar,   label: 'Fin',      value: fmtDate(contract.fechaFin)       },
                    { icon: MapPin,     label: 'Inmueble', value: property?.distrito || '—'        },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-gray-400"><Icon size={11} />{label}</span>
                      <span className="font-semibold text-[#1B2A4A] text-right">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Estado de firmas */}
              <div className="card p-5">
                <h3 className="font-bold text-[#1B2A4A] text-sm mb-3">Estado de firmas</h3>
                <div className="space-y-2.5">
                  {[
                    { rol: 'Arrendador',   userId: contract.application?.property?.arrendadorId },
                    { rol: 'Arrendatario', userId: contract.application?.arrendatarioId        },
                  ].map(({ rol, userId }) => {
                    const firmo = signatures.some(s => s.userId === userId)
                    return (
                      <div key={rol} className={`flex items-center justify-between p-2.5 rounded-xl ${firmo ? 'bg-green-50' : 'bg-gray-50'}`}>
                        <span className="text-xs font-medium text-gray-600">{rol}</span>
                        {firmo
                          ? <span className="text-[10px] text-green-600 font-bold flex items-center gap-1"><Check size={10} /> Firmado</span>
                          : <span className="text-[10px] text-gray-400">Pendiente</span>}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Acciones */}
              <div className="card p-5 space-y-3">

                {/* Botón firmar */}
                {esParte && !yaFirme && !esFirmado && (
                  <button
                    onClick={() => navigate(`/firmar/${contract.id}`)}
                    className="w-full bg-[#1B2A4A] text-white font-bold py-4 rounded-2xl hover:bg-[#243656] transition-all flex items-center justify-center gap-2 group"
                  >
                    <PenLine size={17} />
                    Firmar contrato
                    <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}

                {yaFirme && !esFirmado && (
                  <div className="w-full py-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center gap-2 text-sm text-blue-700 font-semibold">
                    <CheckCircle2 size={15} /> Tu firma ya fue registrada
                  </div>
                )}

                {esFirmado && (
                  <div className="w-full py-3.5 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center gap-2 text-sm text-green-700 font-semibold">
                    <BadgeCheck size={15} /> Contrato firmado por ambas partes
                  </div>
                )}

                {/* Botón proponer cambios */}
                {esParte && esBorrador && !esFirmado && (
                  <button
                    onClick={() => setMode('edit')}
                    className="w-full btn-outline flex items-center justify-center gap-2 py-3 text-sm"
                  >
                    <Edit3 size={14} /> Proponer cambios
                  </button>
                )}

                {/* Ir a inmueble */}
                {property && (
                  <Link
                    to={`/inmuebles/${property.id}`}
                    className="w-full flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-[#1B2A4A] transition py-2"
                  >
                    Ver inmueble <ArrowRight size={12} />
                  </Link>
                )}
              </div>

              {/* Aviso legal */}
              <div className="flex items-start gap-2.5 bg-[#1B2A4A]/5 rounded-xl p-4">
                <Info size={14} className="text-[#1B2A4A]/50 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-[#1B2A4A]/60 leading-relaxed">
                  Al firmar, el contrato adquiere <strong>mérito ejecutivo</strong> bajo la Ley N° 30933 y puede accionarse notarialmente sin proceso judicial ante incumplimiento.
                </p>
              </div>

              {/* Allanamiento highlight */}
              {Array.isArray(contract.clausulas) && contract.clausulas.some(c => c.ley === 'N° 30933') && (
                <div className="flex items-start gap-2.5 bg-[#C9A84C]/8 border border-[#C9A84C]/25 rounded-xl p-4">
                  <Sparkles size={14} className="text-[#C9A84C] mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    Este contrato incluye la <strong>Cláusula de Allanamiento a Futuro</strong> (Art. 7°, Ley N° 30933) que permite desalojo notarial exprés.
                  </p>
                </div>
              )}
            </aside>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
