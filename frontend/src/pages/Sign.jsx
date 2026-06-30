import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Shield, Check, AlertCircle, CheckCircle2, Loader2, ChevronRight,
  Mail, Fingerprint, Camera, DollarSign, Calendar, MapPin, Hash,
  RefreshCw, Lock, Eye, Scan, BadgeCheck, FileText, ArrowLeft,
  Copy, ExternalLink,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { contractsService } from '../services/contracts'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'

const N       = (v) => Number(v).toLocaleString('es-PE')
const fmtDate = (d) => new Date(d).toLocaleString('es-PE', {
  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
})
const fmtShort = (d) => new Date(d).toLocaleDateString('es-PE', {
  day: '2-digit', month: 'short', year: 'numeric',
})

// ─── Indicador de progreso ────────────────────────────────────────────────────

function StepBar({ current }) {
  const steps = ['Identidad', 'Rostro', 'Firma']
  return (
    <div className="flex items-center gap-0 w-full max-w-xs mx-auto mb-8">
      {steps.map((label, i) => {
        const n    = i + 1
        const done = current > n
        const act  = current === n
        return (
          <div key={label} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                done ? 'bg-green-500 text-white' : act ? 'bg-[#1B2A4A] text-white ring-4 ring-[#1B2A4A]/20' : 'bg-gray-100 text-gray-400'
              }`}>
                {done ? <Check size={13} /> : n}
              </div>
              <span className={`text-[9px] font-bold mt-1 text-center ${
                done ? 'text-green-600' : act ? 'text-[#1B2A4A]' : 'text-gray-400'
              }`}>{label}</span>
            </div>
            {i < 2 && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 transition-all ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Input OTP (6 dígitos) ────────────────────────────────────────────────────

function OtpInput({ value, onChange, disabled }) {
  const inputs = useRef([])
  const digits = value.split('').concat(Array(6).fill('')).slice(0, 6)

  const handleKey = (e, i) => {
    const ch = e.key
    if (ch === 'Backspace') {
      const next = value.slice(0, i) + value.slice(i + 1)
      onChange(next)
      if (i > 0) inputs.current[i - 1]?.focus()
      return
    }
    if (!/^\d$/.test(ch)) return
    const next = value.slice(0, i) + ch + value.slice(i + 1)
    onChange(next.slice(0, 6))
    if (i < 5) inputs.current[i + 1]?.focus()
  }

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text) { onChange(text); inputs.current[Math.min(text.length, 5)]?.focus() }
    e.preventDefault()
  }

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => inputs.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          readOnly
          disabled={disabled}
          onKeyDown={e => handleKey(e, i)}
          onPaste={handlePaste}
          onFocus={() => inputs.current[i]?.select()}
          className={`w-11 h-13 text-center text-lg font-black rounded-xl border-2 focus:outline-none transition-all
            ${disabled ? 'bg-gray-50 text-gray-300 border-gray-100' : d
              ? 'border-[#1B2A4A] bg-[#1B2A4A]/5 text-[#1B2A4A]'
              : 'border-gray-200 bg-white text-gray-800 focus:border-[#1B2A4A]'}`}
          style={{ height: '3.25rem' }}
        />
      ))}
    </div>
  )
}

// ─── Simulación de cámara facial ──────────────────────────────────────────────

function FaceCapture({ onVerified }) {
  const [state, setState] = useState('idle')    // idle | scanning | verified
  const timerRef = useRef()

  const handleScan = () => {
    if (state !== 'idle') return
    setState('scanning')
    timerRef.current = setTimeout(() => {
      setState('verified')
      setTimeout(onVerified, 700)
    }, 3200)
  }

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const faceColors = {
    idle:     'border-white/25',
    scanning: 'border-[#C9A84C] shadow-[0_0_24px_rgba(201,168,76,0.35)]',
    verified: 'border-green-400 shadow-[0_0_24px_rgba(74,222,128,0.35)]',
  }

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Animación CSS */}
      <style>{`
        @keyframes face-scan {
          0%   { top: 8%;  opacity: 1; }
          44%  { top: 86%; opacity: 1; }
          50%  { top: 86%; opacity: 0; }
          54%  { top: 8%;  opacity: 0; }
          60%  { top: 8%;  opacity: 1; }
          100% { top: 8%;  opacity: 1; }
        }
        .scan-beam { animation: face-scan 2.4s ease-in-out infinite; }
        @keyframes corner-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        .corner-pulse { animation: corner-pulse 1.5s ease-in-out infinite; }
      `}</style>

      {/* Visor de cámara */}
      <div className="relative w-64 h-72 bg-[#0a1525] rounded-2xl overflow-hidden select-none">

        {/* Grid de fondo */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'linear-gradient(rgba(100,200,255,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(100,200,255,0.8) 1px,transparent 1px)', backgroundSize: '18px 18px' }} />

        {/* Viñeta lateral */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />

        {/* Óvalo de cara */}
        <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-44 border-2 rounded-full transition-all duration-700 ${faceColors[state]}`} />

        {/* Marcas de esquina (efecto cámara) */}
        {state === 'scanning' && (
          <div className="corner-pulse">
            {[['top-3 left-3','border-t-2 border-l-2'],['top-3 right-3','border-t-2 border-r-2'],
              ['bottom-3 left-3','border-b-2 border-l-2'],['bottom-3 right-3','border-b-2 border-r-2']
            ].map(([pos, cls]) => (
              <div key={pos} className={`absolute w-4 h-4 border-[#C9A84C] ${pos} ${cls}`} />
            ))}
          </div>
        )}

        {/* Línea de escaneo */}
        {state === 'scanning' && (
          <div className="scan-beam absolute left-1/2 -translate-x-1/2 w-40"
            style={{ height: '2px', background: 'linear-gradient(90deg,transparent,#C9A84C,transparent)' }} />
        )}

        {/* Overlay de éxito */}
        {state === 'verified' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-500/10 backdrop-blur-[1px]">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-2">
              <CheckCircle2 size={36} className="text-green-400" />
            </div>
            <span className="text-green-400 text-xs font-bold">Rostro verificado</span>
          </div>
        )}

        {/* Icono de cara (estado idle) */}
        {state === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <Eye size={48} className="text-white" />
          </div>
        )}

        {/* Etiqueta inferior */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 py-2 text-center">
          <span className="text-xs font-semibold text-white/70">
            {state === 'idle'     && 'Listo para escanear'}
            {state === 'scanning' && 'Escaneando…'}
            {state === 'verified' && '✓ Verificado'}
          </span>
        </div>

        {/* Punto de grabación */}
        {state === 'scanning' && (
          <div className="absolute top-3 right-3 flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[9px] text-white/50 font-bold">REC</span>
          </div>
        )}
      </div>

      {/* Instrucción */}
      <p className={`text-sm text-center transition-colors ${
        state === 'verified' ? 'text-green-600 font-semibold' : 'text-gray-500'
      }`}>
        {state === 'idle'     && 'Centra tu rostro dentro del óvalo y presiona el botón'}
        {state === 'scanning' && 'Mantén el rostro estático mientras escaneamos…'}
        {state === 'verified' && 'Identidad biométrica confirmada'}
      </p>

      <button
        onClick={handleScan}
        disabled={state !== 'idle'}
        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
          state === 'idle'
            ? 'bg-[#1B2A4A] text-white hover:bg-[#243656]'
            : state === 'scanning'
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-green-500 text-white cursor-default'
        }`}
      >
        {state === 'idle'     && <><Camera size={16} /> Validar rostro</>}
        {state === 'scanning' && <><Loader2 size={16} className="animate-spin" /> Procesando…</>}
        {state === 'verified' && <><CheckCircle2 size={16} /> Verificado</>}
      </button>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Sign() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [contract,   setContract]   = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [fetchErr,   setFetchErr]   = useState('')

  const [step, setStep] = useState(1)

  // Step 1 — identidad
  const [dni,         setDni]        = useState(user?.dni || '')
  const [code,        setCode]       = useState('')
  const [codeSent,    setCodeSent]   = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [countdown,   setCountdown]  = useState(0)
  const [step1Err,    setStep1Err]   = useState('')

  // Step 2 — rostro
  const [faceOk, setFaceOk] = useState(false)

  // Step 3 — firma
  const [signing,    setSigning]    = useState(false)
  const [step3Err,   setStep3Err]   = useState('')
  const [signResult, setSignResult] = useState(null)

  // Copiar hash
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    contractsService.obtener(id)
      .then(setContract)
      .catch(err => setFetchErr(err.response?.data?.error || 'No se pudo cargar el contrato.'))
      .finally(() => setLoading(false))
  }, [id])

  // Countdown para reenviar código
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleSendCode = async () => {
    setSendingCode(true)
    setStep1Err('')
    try {
      await api.post('/kyc/send-code', { email: user?.email })
      setCodeSent(true)
      setCountdown(60)
    } catch (err) {
      setStep1Err(err.response?.data?.error || 'Error al enviar el código. Intenta de nuevo.')
    } finally {
      setSendingCode(false)
    }
  }

  const handleSign = async () => {
    setSigning(true)
    setStep3Err('')
    try {
      const result = await contractsService.firmar(id, code, dni)
      setSignResult(result)
    } catch (err) {
      setStep3Err(err.response?.data?.error || 'Error al firmar. Verifica los datos e intenta de nuevo.')
    } finally {
      setSigning(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(signResult?.signature?.hash || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Loading / error inicial ──────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-[#1B2A4A]" />
    </div>
  )

  if (fetchErr) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-28 px-4 max-w-sm mx-auto text-center">
        <div className="card p-8">
          <AlertCircle size={36} className="text-red-400 mx-auto mb-4" />
          <p className="font-bold text-[#1B2A4A] mb-2">No se pudo cargar el contrato</p>
          <p className="text-sm text-gray-400 mb-5">{fetchErr}</p>
          <button onClick={() => navigate(-1)} className="btn-primary w-full">Volver</button>
        </div>
      </div>
    </div>
  )

  const property   = contract?.application?.property
  const totalFirmas = contract?.signatures?.length ?? 0

  // ── Resultado de firma ───────────────────────────────────────────────────────
  if (signResult) {
    const { signature, contratoFirmado } = signResult
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-24 pb-16 px-4 max-w-lg mx-auto">

          {/* Cabecera de éxito */}
          <div className={`rounded-3xl p-8 text-center mb-6 ${contratoFirmado ? 'bg-[#1B2A4A]' : 'bg-white border border-gray-200'}`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 ${contratoFirmado ? 'bg-[#C9A84C]/20' : 'bg-green-100'}`}>
              {contratoFirmado
                ? <BadgeCheck size={40} className="text-[#C9A84C]" />
                : <CheckCircle2 size={40} className="text-green-600" />}
            </div>
            <h1 className={`text-2xl font-extrabold mb-2 ${contratoFirmado ? 'text-white' : 'text-[#1B2A4A]'}`}>
              {contratoFirmado ? '¡Contrato firmado!' : 'Tu firma fue registrada'}
            </h1>
            <p className={`text-sm ${contratoFirmado ? 'text-white/60' : 'text-gray-500'}`}>
              {contratoFirmado
                ? 'Ambas partes han firmado. El contrato está activo con plena validez bajo la Ley N° 30933.'
                : 'Tu firma se registró. El contrato se activará cuando la otra parte también firme.'}
            </p>
            {contratoFirmado && (
              <div className="mt-4 inline-flex items-center gap-2 bg-[#C9A84C]/15 border border-[#C9A84C]/30 rounded-xl px-4 py-2">
                <Shield size={13} className="text-[#C9A84C]" />
                <span className="text-xs text-[#C9A84C] font-semibold">Mérito ejecutivo — Ley N° 30933</span>
              </div>
            )}
          </div>

          {/* Datos de la firma */}
          <div className="card p-6 space-y-4 mb-4">
            <h2 className="font-bold text-[#1B2A4A] text-sm flex items-center gap-2">
              <Lock size={14} className="text-[#C9A84C]" /> Registro de firma digital
            </h2>

            {[
              { label: 'Tipo de firma',  value: signature.tipo                        },
              { label: 'Fecha y hora',   value: fmtDate(signature.createdAt)           },
              { label: 'IP registrada',  value: signature.ip                           },
              { label: 'Contrato',       value: `#${contract.id} — ${property?.titulo ?? '—'}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
                <span className="text-xs text-gray-400">{label}</span>
                <span className="text-xs font-semibold text-[#1B2A4A] text-right">{value}</span>
              </div>
            ))}

            {/* Hash SHA-256 */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <Hash size={10} /> Hash SHA-256
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-[#1B2A4A] transition"
                >
                  <Copy size={10} /> {copied ? '¡Copiado!' : 'Copiar'}
                </button>
              </div>
              <p className="font-mono text-[10px] text-gray-600 break-all leading-relaxed">
                {signature.hash}
              </p>
            </div>
          </div>

          {/* Resumen del contrato firmado */}
          <div className="card p-5 mb-6">
            <h2 className="font-bold text-[#1B2A4A] text-sm mb-4 flex items-center gap-2">
              <FileText size={14} className="text-[#C9A84C]" /> Contrato firmado
            </h2>
            <div className="space-y-2.5 text-xs">
              {[
                { icon: MapPin,      value: property?.titulo ?? '—'              },
                { icon: DollarSign,  value: `S/ ${N(contract.monto)}/mes`        },
                { icon: Calendar,    value: `${fmtShort(contract.fechaInicio)} — ${fmtShort(contract.fechaFin)}` },
              ].map(({ icon: Icon, value }) => (
                <div key={value} className="flex items-center gap-2 text-gray-600">
                  <Icon size={12} className="text-gray-400 flex-shrink-0" />
                  <span>{value}</span>
                </div>
              ))}
            </div>
            {!contratoFirmado && (
              <p className="mt-3 text-[10px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                Falta la firma de la otra parte para que el contrato sea plenamente válido.
              </p>
            )}
          </div>

          {/* Acciones */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to={`/contrato/${contract.id}`} className="flex-1 btn-primary flex items-center justify-center gap-2">
              Ver contrato <ExternalLink size={14} />
            </Link>
            {contratoFirmado
              ? <button onClick={() => navigate('/pagos')} className="flex-1 btn-outline flex items-center justify-center gap-2">
                  Ir a mis pagos <ChevronRight size={14} />
                </button>
              : <button onClick={() => navigate('/')} className="flex-1 btn-outline flex items-center justify-center gap-2">
                  Ir al inicio
                </button>}
          </div>
        </div>
      </div>
    )
  }

  // ── Wizard ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-xl mx-auto px-4 py-5">
          <button onClick={() => navigate(`/contrato/${id}`)} className="flex items-center gap-2 text-xs text-gray-400 hover:text-[#1B2A4A] transition mb-3">
            <ArrowLeft size={13} /> Volver al contrato
          </button>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Lock size={12} className="text-[#C9A84C]" />
                <span className="text-[10px] font-bold text-[#C9A84C] uppercase tracking-wide">Firma digital segura</span>
              </div>
              <h1 className="text-lg font-extrabold text-[#1B2A4A]">
                {property?.titulo || `Contrato #${id}`}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                S/ {N(contract.monto)}/mes · {property?.distrito} · {totalFirmas}/2 firmas
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-[#1B2A4A]/6 px-3 py-2 rounded-xl">
              <Shield size={13} className="text-[#1B2A4A]" />
              <span className="text-[10px] font-bold text-[#1B2A4A]">Ley N° 30933</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8">
        <StepBar current={step} />

        {/* ── PASO 1: Identidad ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="card p-6 space-y-6">
            <div>
              <h2 className="text-base font-extrabold text-[#1B2A4A] mb-1">Verificación de identidad</h2>
              <p className="text-xs text-gray-400">Confirma tu DNI y valida tu correo con un código de 6 dígitos.</p>
            </div>

            {/* Datos del usuario */}
            <div className="bg-[#1B2A4A]/4 rounded-2xl p-4 space-y-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Firmante</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1B2A4A] flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                  {user?.nombre?.[0] ?? '?'}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-[#1B2A4A] text-sm truncate">
                    {[user?.nombre, user?.apellidoPaterno].filter(Boolean).join(' ') || '—'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* DNI */}
            <div>
              <label className="block text-xs font-bold text-[#1B2A4A] mb-2">
                Tu DNI <span className="text-gray-400 font-normal">(del perfil registrado)</span>
              </label>
              <input
                type="text"
                value={dni}
                onChange={e => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="Ingresa tu número de DNI"
                className="input-field font-mono tracking-widest"
              />
              {!user?.dni && (
                <p className="text-[10px] text-amber-600 mt-1.5">
                  No tenemos tu DNI registrado. Ingresa el que usaste en tu documento de identidad.
                </p>
              )}
            </div>

            {/* Enviar código */}
            <div>
              <label className="block text-xs font-bold text-[#1B2A4A] mb-2">
                Código de verificación por correo
              </label>
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 mb-3">
                <Mail size={13} className="text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-600 flex-1 truncate">{user?.email}</span>
                <button
                  onClick={handleSendCode}
                  disabled={sendingCode || countdown > 0}
                  className={`text-xs font-bold flex-shrink-0 flex items-center gap-1 transition-colors ${
                    countdown > 0
                      ? 'text-gray-400 cursor-default'
                      : 'text-[#1B2A4A] hover:text-[#C9A84C]'
                  }`}
                >
                  {sendingCode
                    ? <><Loader2 size={11} className="animate-spin" /> Enviando…</>
                    : countdown > 0
                      ? `Reenviar (${countdown}s)`
                      : <><RefreshCw size={11} /> {codeSent ? 'Reenviar' : 'Enviar código'}</>}
                </button>
              </div>

              {codeSent && (
                <p className="text-[10px] text-green-600 mb-3 flex items-center gap-1">
                  <Check size={10} /> Código enviado · válido 10 min
                </p>
              )}

              <OtpInput value={code} onChange={setCode} disabled={!codeSent} />
            </div>

            {step1Err && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600">{step1Err}</p>
              </div>
            )}

            <button
              onClick={() => setStep(2)}
              disabled={dni.length < 8 || code.length < 6}
              className="w-full btn-primary flex items-center justify-center gap-2 py-4 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continuar a verificación facial <ChevronRight size={15} />
            </button>

            <div className="flex items-start gap-2 bg-blue-50 rounded-xl p-3">
              <Lock size={12} className="text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-blue-600">
                El código de 6 dígitos garantiza que eres el titular del correo. Se usa una sola vez.
              </p>
            </div>
          </div>
        )}

        {/* ── PASO 2: Rostro ────────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="card p-6 space-y-6">
            <div>
              <h2 className="text-base font-extrabold text-[#1B2A4A] mb-1">Reconocimiento facial</h2>
              <p className="text-xs text-gray-400">Verifica tu identidad con tu cámara. Mantén el rostro bien iluminado.</p>
            </div>

            <div className="flex justify-center">
              <FaceCapture onVerified={() => setFaceOk(true)} />
            </div>

            {faceOk && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
                <CheckCircle2 size={13} className="text-green-600" />
                <p className="text-xs text-green-700 font-semibold">Reconocimiento facial completado correctamente.</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-outline px-5 flex items-center gap-1 text-sm">
                <ArrowLeft size={14} /> Atrás
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!faceOk}
                className="flex-1 btn-primary flex items-center justify-center gap-2 py-4 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continuar a la firma <ChevronRight size={15} />
              </button>
            </div>

            <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3">
              <Scan size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-gray-500">
                La verificación facial se realiza localmente. No se almacena ninguna imagen biométrica.
              </p>
            </div>
          </div>
        )}

        {/* ── PASO 3: Firma ─────────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="card p-6 space-y-6">
            <div>
              <h2 className="text-base font-extrabold text-[#1B2A4A] mb-1">Aplicar firma digital</h2>
              <p className="text-xs text-gray-400">Revisa el resumen y aplica tu firma con validez legal.</p>
            </div>

            {/* Resumen del contrato */}
            <div className="bg-[#1B2A4A]/4 rounded-2xl p-5 space-y-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Resumen del acuerdo</p>
              {[
                { icon: MapPin,     label: 'Inmueble', value: property?.titulo ?? '—'                        },
                { icon: MapPin,     label: 'Distrito', value: property?.distrito ?? '—'                      },
                { icon: DollarSign, label: 'Renta',    value: `S/ ${N(contract.monto)}/mes`                  },
                { icon: DollarSign, label: 'Garantía', value: `S/ ${N(contract.garantia)}`                   },
                { icon: Calendar,   label: 'Vigencia', value: `${fmtShort(contract.fechaInicio)} → ${fmtShort(contract.fechaFin)}` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Icon size={11} className="text-gray-400" /> {label}
                  </span>
                  <span className="text-xs font-semibold text-[#1B2A4A] text-right">{value}</span>
                </div>
              ))}
            </div>

            {/* Verificaciones completadas */}
            <div className="space-y-2">
              {[
                { label: 'DNI verificado',             done: true },
                { label: 'Código de correo ingresado', done: true },
                { label: 'Reconocimiento facial',      done: true },
              ].map(({ label, done }) => (
                <div key={label} className="flex items-center gap-2.5 text-xs">
                  <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <Check size={9} className="text-white" />
                  </div>
                  <span className="text-green-700 font-medium">{label}</span>
                </div>
              ))}
            </div>

            {/* Aviso Ley 30933 */}
            <div className="border border-[#C9A84C]/30 bg-[#C9A84C]/5 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={13} className="text-[#C9A84C]" />
                <span className="text-xs font-bold text-[#C9A84C]">Ley N° 30933 — Allanamiento a Futuro</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Al firmar, aceptas irrevocablemente el procedimiento especial de desalojo notarial ante incumplimiento,
                sin necesidad de proceso judicial (Art. 7°). La firma genera mérito ejecutivo inmediato.
              </p>
            </div>

            {step3Err && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600">{step3Err}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} disabled={signing} className="btn-outline px-5 flex items-center gap-1 text-sm disabled:opacity-50">
                <ArrowLeft size={14} /> Atrás
              </button>
              <button
                onClick={handleSign}
                disabled={signing}
                className="flex-1 bg-[#1B2A4A] text-white font-bold py-4 rounded-2xl hover:bg-[#243656] transition-all flex items-center justify-center gap-2 disabled:opacity-60 text-sm"
              >
                {signing
                  ? <><Loader2 size={16} className="animate-spin" /> Firmando…</>
                  : <><Fingerprint size={17} /> Firmar digitalmente</>}
              </button>
            </div>
          </div>
        )}

        {/* Nota de seguridad (global) */}
        <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-gray-400">
          <span className="flex items-center gap-1"><Lock size={9} /> TLS 1.3</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Hash size={9} /> SHA-256</span>
          <span>·</span>
          <span>Ley N° 30933</span>
        </div>
      </div>
    </div>
  )
}
