import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  User, IdCard, Mail, Phone, Lock, Shield, Check, ChevronRight,
  ChevronLeft, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2,
  Upload, X, RefreshCw, BarChart2, DollarSign, Camera, FileText,
  Sparkles, ArrowRight,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'
import { useRegisterStore } from '../store/registerStore'

// ─── Pasos del wizard ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Tus datos',      icon: User,      sublabel: 'Información personal' },
  { id: 2, label: 'Verificar email',icon: Mail,       sublabel: 'Código de 6 dígitos'  },
  { id: 3, label: 'Identidad',      icon: Shield,     sublabel: 'Foto DNI y selfie'    },
  { id: 4, label: 'Scoring',        icon: BarChart2,  sublabel: 'Solo arrendatarios'   },
]

// ─── Barra de progreso ────────────────────────────────────────────────────────

function ProgressBar({ current, rol }) {
  const visibleSteps = rol === 'Arrendador' ? STEPS.slice(0, 3) : STEPS
  const totalVisible = visibleSteps.length
  const currentIdx   = Math.min(current - 1, totalVisible - 1)
  const pct          = totalVisible === 1 ? 100 : (currentIdx / (totalVisible - 1)) * 100

  return (
    <div className="mb-8">
      <div className="relative flex items-start justify-between">
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 z-0" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-[#1B2A4A] to-[#C9A84C] z-0 transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
        {visibleSteps.map((step, i) => {
          const done   = i < currentIdx
          const active = i === currentIdx
          const Icon   = step.icon
          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-2 flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                done   ? 'bg-green-500 border-green-500 text-white shadow-md shadow-green-200' :
                active ? 'bg-[#1B2A4A] border-[#1B2A4A] text-white shadow-lg shadow-[#1B2A4A]/25 scale-110' :
                         'bg-white border-gray-200 text-gray-400'
              }`}>
                {done ? <Check size={15} strokeWidth={3} /> : <Icon size={15} />}
              </div>
              <div className="text-center">
                <p className={`text-xs font-bold leading-tight transition-colors ${active ? 'text-[#1B2A4A]' : done ? 'text-green-600' : 'text-gray-400'}`}>
                  {step.label}
                </p>
                <p className="text-[10px] text-gray-400 hidden sm:block">{step.sublabel}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between mt-4">
        <span className="text-xs text-gray-400">Paso {current} de {totalVisible}</span>
        <span className="text-xs font-bold text-[#1B2A4A]">{Math.round(current === 1 ? 15 : pct)}% completado</span>
      </div>
      <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#1B2A4A] to-[#C9A84C] rounded-full transition-all duration-700"
          style={{ width: `${current === 1 ? 15 : pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Helpers visuales ─────────────────────────────────────────────────────────

function FieldLabel({ children, required }) {
  return (
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  )
}

function FieldErr({ msg }) {
  if (!msg) return null
  return (
    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
      <AlertCircle size={11} /> {msg}
    </p>
  )
}

function pwStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' }
  let s = 0
  if (pw.length >= 8)        s++
  if (/[A-Z]/.test(pw))     s++
  if (/[0-9]/.test(pw))     s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return [
    { label: 'Muy débil',  color: 'bg-red-400'    },
    { label: 'Débil',      color: 'bg-orange-400'  },
    { label: 'Regular',    color: 'bg-amber-400'   },
    { label: 'Fuerte',     color: 'bg-blue-500'    },
    { label: 'Muy fuerte', color: 'bg-green-500'   },
  ][s]
}

// ─── PASO 1: Datos personales ─────────────────────────────────────────────────

function Step1({ store, onNext }) {
  const { dni, nombre, apellidoPaterno, apellidoMaterno, email, telefono, password, rol, dniAutoCompleted, setField } = store

  const [showPw, setShowPw]         = useState(false)
  const [terms, setTerms]           = useState(false)
  const [errs, setErrs]             = useState({})
  const [dniLoading, setDniLoading] = useState(false)
  const [dniError, setDniError]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  const pw = pwStrength(password)

  // Auto-completar nombres cuando el DNI tiene 8 dígitos
  useEffect(() => {
    if (dni.length !== 8 || dniAutoCompleted) return
    let cancelled = false
    setDniLoading(true)
    setDniError('')
    api.post('/kyc/dni', { dni })
      .then(res => {
        if (cancelled) return
        const d = res.data.data
        // La API devuelve { nombres: "DIEGO ANDRÉS", apellidos: "SALINAS VEGA" }
        // o puede devolver campos separados desde RENIEC
        const nombres   = (d.nombres || '').trim()
        const apellidos = (d.apellidos || '').trim().split(' ')
        setField('nombre', nombres)
        setField('apellidoPaterno', apellidos[0] || '')
        setField('apellidoMaterno', apellidos[1] || '')
        setField('dniAutoCompleted', true)
      })
      .catch(() => {
        if (!cancelled) setDniError('No se encontró el DNI en RENIEC (puedes continuar igualmente)')
      })
      .finally(() => { if (!cancelled) setDniLoading(false) })
    return () => { cancelled = true }
  }, [dni])

  const validate = () => {
    const e = {}
    if (!dni || dni.length !== 8)  e.dni      = 'El DNI debe tener 8 dígitos'
    if (!nombre.trim())            e.nombre   = 'Ingresa tu nombre'
    if (!apellidoPaterno.trim())   e.apellidoPaterno = 'Ingresa tu apellido paterno'
    if (!email.trim())             e.email    = 'Ingresa tu correo electrónico'
    if (!telefono.trim())          e.telefono = 'Ingresa tu teléfono'
    if (!password || password.length < 8)
      e.password = 'La contraseña debe tener al menos 8 caracteres'
    if (!rol)                      e.rol      = 'Selecciona tu rol'
    if (!terms)                    e.terms    = 'Debes aceptar los términos'
    return e
  }

  const handleNext = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrs(e); return }

    setSubmitting(true)
    setServerError('')
    try {
      // 1. Crear cuenta
      const regRes = await api.post('/auth/register', {
        nombre, apellidoPaterno, apellidoMaterno: apellidoMaterno || '',
        dni, email, telefono, password, rol,
      })
      const { token, user } = regRes.data.data
      useAuthStore.getState().login(token, user)

      // 2. Enviar código de verificación (usa el token recién obtenido)
      await api.post('/kyc/send-code', { email })

      onNext()
    } catch (err) {
      setServerError(err.response?.data?.error || 'Error al crear la cuenta. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-[#1B2A4A]">Crea tu cuenta</h2>
        <p className="text-gray-400 text-sm mt-1">Completa tus datos para registrarte en RentaValid.</p>
      </div>

      {serverError && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5">
          <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-600 text-sm">{serverError}</p>
        </div>
      )}

      <div className="space-y-4">

        {/* DNI con auto-completado */}
        <div>
          <FieldLabel required>Número de DNI</FieldLabel>
          <div className="relative">
            <IdCard size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              inputMode="numeric"
              maxLength={8}
              placeholder="00000000"
              value={dni}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '')
                setField('dni', v)
                if (v.length < 8) {
                  setField('dniAutoCompleted', false)
                  setField('nombre', '')
                  setField('apellidoPaterno', '')
                  setField('apellidoMaterno', '')
                }
                setDniError('')
                setErrs(p => ({ ...p, dni: undefined }))
              }}
              className={`input-field pl-10 pr-10 text-sm ${errs.dni ? 'border-red-400 focus:ring-red-200' : ''}`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {dniLoading && <Loader2 size={14} className="animate-spin text-gray-400" />}
              {dniAutoCompleted && <CheckCircle2 size={15} className="text-green-500" />}
            </div>
          </div>
          <FieldErr msg={errs.dni} />
          {dniError && <p className="mt-1 text-xs text-amber-600 flex items-center gap-1"><AlertCircle size={11} />{dniError}</p>}
          {dniAutoCompleted && (
            <p className="mt-1 text-xs text-green-600 flex items-center gap-1 font-medium">
              <CheckCircle2 size={11} /> Datos auto-completados desde RENIEC
            </p>
          )}
        </div>

        {/* Nombres */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <FieldLabel required>Nombres</FieldLabel>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className={`input-field pl-9 text-sm ${errs.nombre ? 'border-red-400' : ''}`}
                placeholder="Diego Andrés"
                value={nombre}
                onChange={e => { setField('nombre', e.target.value); setErrs(p => ({ ...p, nombre: undefined })) }}
              />
            </div>
            <FieldErr msg={errs.nombre} />
          </div>
          <div>
            <FieldLabel required>Ap. Paterno</FieldLabel>
            <input
              className={`input-field text-sm ${errs.apellidoPaterno ? 'border-red-400' : ''}`}
              placeholder="Salinas"
              value={apellidoPaterno}
              onChange={e => { setField('apellidoPaterno', e.target.value); setErrs(p => ({ ...p, apellidoPaterno: undefined })) }}
            />
            <FieldErr msg={errs.apellidoPaterno} />
          </div>
          <div>
            <FieldLabel>Ap. Materno</FieldLabel>
            <input
              className="input-field text-sm"
              placeholder="Vega"
              value={apellidoMaterno}
              onChange={e => setField('apellidoMaterno', e.target.value)}
            />
          </div>
        </div>

        {/* Email y teléfono */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <FieldLabel required>Correo electrónico</FieldLabel>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                className={`input-field pl-9 text-sm ${errs.email ? 'border-red-400' : ''}`}
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={e => { setField('email', e.target.value); setErrs(p => ({ ...p, email: undefined })) }}
              />
            </div>
            <FieldErr msg={errs.email} />
          </div>
          <div>
            <FieldLabel required>Teléfono</FieldLabel>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                className={`input-field pl-9 text-sm ${errs.telefono ? 'border-red-400' : ''}`}
                placeholder="+51 987 654 321"
                value={telefono}
                onChange={e => { setField('telefono', e.target.value); setErrs(p => ({ ...p, telefono: undefined })) }}
              />
            </div>
            <FieldErr msg={errs.telefono} />
          </div>
        </div>

        {/* Contraseña */}
        <div>
          <FieldLabel required>Contraseña</FieldLabel>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPw ? 'text' : 'password'}
              className={`input-field pl-9 pr-11 text-sm ${errs.password ? 'border-red-400' : ''}`}
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={e => { setField('password', e.target.value); setErrs(p => ({ ...p, password: undefined })) }}
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1B2A4A]">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {password && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex gap-1 flex-1">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < pw.score ? pw.color : 'bg-gray-200'}`} />
                ))}
              </div>
              <span className={`text-[11px] font-semibold ${pw.color.replace('bg-', 'text-')}`}>{pw.label}</span>
            </div>
          )}
          <FieldErr msg={errs.password} />
        </div>

        {/* Rol */}
        <div>
          <FieldLabel required>¿Cómo usarás la plataforma?</FieldLabel>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'Arrendatario', emoji: '🏠', title: 'Arrendatario', desc: 'Busco un inmueble para alquilar' },
              { value: 'Arrendador',   emoji: '🏛️', title: 'Arrendador',   desc: 'Tengo inmuebles para arrendar' },
            ].map(({ value, emoji, title, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => { setField('rol', value); setErrs(p => ({ ...p, rol: undefined })) }}
                className={`py-4 px-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                  rol === value
                    ? 'border-[#1B2A4A] bg-[#1B2A4A]/5 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">{emoji}</span>
                <p className={`font-bold text-sm mt-1.5 ${rol === value ? 'text-[#1B2A4A]' : 'text-gray-700'}`}>{title}</p>
                <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
          <FieldErr msg={errs.rol} />
        </div>

        {/* Términos */}
        <div className={`flex items-start gap-3 p-4 rounded-xl transition-all ${errs.terms ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
          <button
            type="button"
            onClick={() => { setTerms(v => !v); setErrs(p => ({ ...p, terms: undefined })) }}
            className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all ${terms ? 'bg-[#1B2A4A] border-[#1B2A4A]' : 'border-gray-300 bg-white'}`}
          >
            {terms && <Check size={12} className="text-white" strokeWidth={3} />}
          </button>
          <p className="text-xs text-gray-500 leading-relaxed">
            Acepto los{' '}
            <Link to="/terminos" className="text-[#1B2A4A] font-semibold underline">Términos y Condiciones</Link>
            {' '}y la{' '}
            <Link to="/privacidad" className="text-[#1B2A4A] font-semibold underline">Política de Privacidad</Link>.
            {' '}Autorizo el tratamiento de mis datos personales conforme a la <strong>Ley N° 29733</strong>.
          </p>
        </div>
        {errs.terms && <FieldErr msg={errs.terms} />}
      </div>

      <button
        onClick={handleNext}
        disabled={submitting}
        className="mt-6 w-full btn-primary flex items-center justify-center gap-2 py-3.5 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting
          ? <><Loader2 size={16} className="animate-spin" /> Creando cuenta…</>
          : <>Continuar <ChevronRight size={16} /></>}
      </button>

      <p className="text-center text-gray-400 text-xs mt-5">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="text-[#1B2A4A] font-semibold hover:text-[#C9A84C] transition-colors">
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}

// ─── PASO 2: Verificación de email ────────────────────────────────────────────

function Step2({ store, onNext, onBack }) {
  const { email, setField } = store
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [errs, setErrs]     = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent]  = useState(false)
  const [countdown, setCountdown] = useState(60)
  const refs = useRef([])

  // Cuenta regresiva para reenvío
  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [countdown])

  const code = digits.join('')

  const handleDigit = (i, val) => {
    const v = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = v
    setDigits(next)
    setErrs('')
    if (v && i < 5) refs.current[i + 1]?.focus()
    if (!v && i > 0 && !val) refs.current[i - 1]?.focus()
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setDigits(pasted.split(''))
      refs.current[5]?.focus()
    }
  }

  const handleVerify = async () => {
    if (code.length < 6) { setErrs('Ingresa los 6 dígitos del código'); return }
    setLoading(true)
    setErrs('')
    try {
      await api.post('/kyc/verify-email', { code })
      setField('emailVerified', true)
      onNext()
    } catch (err) {
      setErrs(err.response?.data?.error || 'Código incorrecto o expirado')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    try {
      await api.post('/kyc/send-code', { email })
      setResent(true)
      setCountdown(60)
      setDigits(['', '', '', '', '', ''])
      setTimeout(() => setResent(false), 3000)
    } catch {
      /* silencio */
    } finally {
      setResending(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-[#1B2A4A]">Verifica tu correo</h2>
        <p className="text-gray-400 text-sm mt-1">
          Enviamos un código de 6 dígitos a{' '}
          <span className="font-semibold text-[#1B2A4A]">{email}</span>
        </p>
      </div>

      {/* Cajitas de 6 dígitos */}
      <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={el => (refs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={e => handleDigit(i, e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Backspace' && !digits[i] && i > 0) {
                refs.current[i - 1]?.focus()
              }
            }}
            className={`w-11 h-14 text-center text-xl font-bold rounded-xl border-2 focus:outline-none transition-all ${
              d
                ? 'border-[#1B2A4A] bg-[#1B2A4A]/5 text-[#1B2A4A]'
                : errs
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-200 bg-white focus:border-[#1B2A4A] focus:ring-2 focus:ring-[#1B2A4A]/20'
            }`}
          />
        ))}
      </div>

      {errs && (
        <p className="text-center text-sm text-red-500 flex items-center justify-center gap-1.5 mb-4">
          <AlertCircle size={14} /> {errs}
        </p>
      )}

      {resent && (
        <p className="text-center text-sm text-green-600 flex items-center justify-center gap-1.5 mb-4 font-medium">
          <CheckCircle2 size={14} /> Código reenviado a tu correo
        </p>
      )}

      <button
        onClick={handleVerify}
        disabled={loading || code.length < 6}
        className="w-full btn-primary flex items-center justify-center gap-2 py-3.5 disabled:opacity-60 disabled:cursor-not-allowed mb-4"
      >
        {loading
          ? <><Loader2 size={15} className="animate-spin" /> Verificando…</>
          : <>Verificar código <ChevronRight size={15} /></>}
      </button>

      {/* Reenviar */}
      <div className="text-center mb-6">
        {countdown > 0 ? (
          <p className="text-xs text-gray-400">
            Reenviar en <span className="font-semibold text-[#1B2A4A]">{countdown}s</span>
          </p>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-xs text-[#1B2A4A] font-semibold hover:text-[#C9A84C] transition-colors flex items-center gap-1.5 mx-auto"
          >
            {resending
              ? <><Loader2 size={12} className="animate-spin" /> Enviando…</>
              : <><RefreshCw size={12} /> Reenviar código</>}
          </button>
        )}
      </div>

      {/* Info */}
      <div className="bg-[#1B2A4A]/5 rounded-xl p-4 flex items-start gap-3">
        <Mail size={14} className="text-[#1B2A4A] mt-0.5 flex-shrink-0" />
        <div className="text-xs text-gray-500 leading-relaxed">
          <p className="font-semibold text-[#1B2A4A] mb-0.5">No recibiste el correo?</p>
          Revisa la carpeta de <strong>spam</strong> o <strong>correo no deseado</strong>. El código expira en <strong>10 minutos</strong>.
        </div>
      </div>

      <button onClick={onBack} className="mt-4 w-full flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-[#1B2A4A] transition-colors py-2">
        <ChevronLeft size={14} /> Volver al paso anterior
      </button>
    </div>
  )
}

// ─── PASO 3: Verificación de identidad ───────────────────────────────────────

function DropZone({ label, icon: Icon, accept, preview, onFile, onClear, disabled }) {
  const inputRef = useRef()
  const [drag, setDrag] = useState(false)

  const onDrop = useCallback(e => {
    e.preventDefault()
    setDrag(false)
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('image/')) onFile(f)
  }, [onFile])

  return (
    <div className="flex-1">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      {preview ? (
        <div className="relative rounded-2xl overflow-hidden border-2 border-green-400 aspect-video bg-green-50">
          <img src={preview} alt="" className="w-full h-full object-cover" />
          <button onClick={onClear}
            className="absolute top-2 right-2 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-all">
            <X size={12} className="text-gray-600" />
          </button>
          <div className="absolute bottom-2 left-2">
            <span className="badge bg-green-600 text-white text-[10px]"><Check size={8} /> Cargado</span>
          </div>
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed aspect-video flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
            disabled ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50' :
            drag     ? 'border-[#1B2A4A] bg-[#1B2A4A]/5 scale-[1.01]' :
                       'border-gray-200 hover:border-[#1B2A4A]/40 hover:bg-gray-50'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${drag ? 'bg-[#1B2A4A] text-white' : 'bg-gray-100 text-gray-400'}`}>
            <Icon size={18} />
          </div>
          <p className="text-xs font-semibold text-gray-400 text-center px-2">
            {drag ? 'Suelta aquí' : 'Arrastra o haz clic'}
          </p>
        </div>
      )}
      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
    </div>
  )
}

function Step3({ store, onNext, onBack }) {
  const { setField } = store
  const [dniFront,     setDniFront]     = useState(null)
  const [dniFrontPrev, setDniFrontPrev] = useState(null)
  const [selfie,       setSelfie]       = useState(null)
  const [selfiePrev,   setSelfiePrev]   = useState(null)
  const [verifying,    setVerifying]    = useState(false)
  const [verified,     setVerified]     = useState(false)
  const [error,        setError]        = useState('')

  const handleVerify = async () => {
    setVerifying(true)
    setError('')
    try {
      await api.post('/kyc/face')   // Simulado en MVP
      setVerified(true)
      setField('identidadValidada', true)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al verificar. Intenta de nuevo.')
    } finally {
      setVerifying(false)
    }
  }

  const canVerify = dniFront && selfie && !verifying && !verified

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-[#1B2A4A]">Verificación de identidad</h2>
        <p className="text-gray-400 text-sm mt-1">
          Sube una foto de tu DNI y una selfie para validar tu identidad.
        </p>
      </div>

      <div className="flex gap-3 mb-5">
        <DropZone
          label="📄 Foto de tu DNI"
          icon={FileText}
          accept="image/*"
          preview={dniFrontPrev}
          disabled={verified}
          onFile={f => { setDniFront(f); setDniFrontPrev(URL.createObjectURL(f)); setVerified(false) }}
          onClear={() => { setDniFront(null); setDniFrontPrev(null); setVerified(false) }}
        />
        <DropZone
          label="🤳 Selfie tuya"
          icon={Camera}
          accept="image/*"
          preview={selfiePrev}
          disabled={verified}
          onFile={f => { setSelfie(f); setSelfiePrev(URL.createObjectURL(f)); setVerified(false) }}
          onClear={() => { setSelfie(null); setSelfiePrev(null); setVerified(false) }}
        />
      </div>

      {/* Tips */}
      {(!dniFront || !selfie) && (
        <div className="mb-4 bg-[#1B2A4A]/5 rounded-xl p-3.5 flex items-start gap-2.5">
          <AlertCircle size={13} className="text-[#1B2A4A] mt-0.5 flex-shrink-0" />
          <div className="text-xs text-[#1B2A4A]/80 leading-relaxed">
            <p className="font-semibold mb-1">Consejos:</p>
            <ul className="space-y-0.5 text-gray-500">
              <li>• DNI: foto nítida, sin reflejos, ocupando el 70% del encuadre</li>
              <li>• Selfie: fondo claro, cara centrada, buena iluminación</li>
            </ul>
          </div>
        </div>
      )}

      {/* Verificar */}
      {canVerify && (
        <button
          onClick={handleVerify}
          className="w-full flex items-center justify-center gap-2 bg-[#1B2A4A] text-white font-semibold py-3.5 rounded-xl hover:bg-[#243656] transition-all text-sm mb-4"
        >
          <Shield size={15} />
          Verificar identidad
        </button>
      )}

      {verifying && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 size={14} className="animate-spin text-amber-600" />
            <p className="text-sm font-semibold text-amber-700">Verificando tu identidad…</p>
          </div>
          {['Comparando foto del DNI con selfie', 'Consultando registros RENIEC', 'Validando biometría facial'].map((t, i) => (
            <p key={i} className="text-xs text-gray-400 flex items-center gap-1.5 mb-1">
              <Loader2 size={9} className="animate-spin opacity-60" /> {t}
            </p>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2">
          <AlertCircle size={13} className="text-red-500" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Éxito */}
      {verified && (
        <div className="mb-5 bg-green-50 border border-green-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={20} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-green-700 text-base">Identidad verificada ✔</p>
              <p className="text-green-600 text-xs">Tu identidad fue confirmada exitosamente</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {[
              ['DNI', 'Validado ✓'],
              ['Selfie', 'Coincide ✓'],
              ['Estado', 'Aprobado ✓'],
            ].map(([k, v]) => (
              <div key={k} className="bg-white rounded-lg p-2 text-center">
                <p className="text-gray-400 text-[10px]">{k}</p>
                <p className="font-bold text-green-700 text-[11px]">{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-outline flex-1 py-3 text-sm">
          <ChevronLeft size={14} className="inline mr-1" /> Atrás
        </button>
        <button
          onClick={onNext}
          disabled={!verified}
          className="btn-primary flex-1 py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continuar <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── PASO 4: Scoring (solo Arrendatario) ─────────────────────────────────────

const INCOME_PRESETS = [
  { label: 'S/ 1,500',  value: 1500 },
  { label: 'S/ 2,500',  value: 2500 },
  { label: 'S/ 4,000',  value: 4000 },
  { label: 'S/ 6,000',  value: 6000 },
  { label: 'S/ 10,000', value: 10000 },
]

function ScoreRing({ score }) {
  const r   = 44
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - score / 100)
  const color  = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative w-28 h-28 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f3f4f6" strokeWidth="10" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-[#1B2A4A]">{score}</span>
        <span className="text-[10px] text-gray-400 font-semibold">/ 100</span>
      </div>
    </div>
  )
}

function Step4({ store, onFinish }) {
  const { setField } = store
  const [ingreso, setIngreso] = useState('')
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleCalcular = async () => {
    const val = parseFloat(ingreso)
    if (!val || val <= 0) { setError('Ingresa un ingreso mensual válido'); return }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/scoring', { ingreso: val })
      const data = res.data.data
      setResult(data)
      setField('scoring', data)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al calcular el scoring')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={18} className="text-[#C9A84C]" />
          <h2 className="text-2xl font-extrabold text-[#1B2A4A]">Scoring crediticio</h2>
        </div>
        <p className="text-gray-400 text-sm">
          Calculamos tu capacidad de alquiler para que los arrendadores te consideren con prioridad.
        </p>
      </div>

      {!result ? (
        <>
          <div className="mb-5">
            <FieldLabel required>¿Cuál es tu ingreso mensual?</FieldLabel>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">S/</span>
              <input
                type="number"
                min="500"
                step="100"
                className="input-field pl-9 text-lg font-bold"
                placeholder="Ej: 3500"
                value={ingreso}
                onChange={e => { setIngreso(e.target.value); setError('') }}
              />
            </div>
            {error && <FieldErr msg={error} />}
            {ingreso && Number(ingreso) > 0 && (
              <p className="mt-2 text-xs text-gray-500 flex items-center gap-1.5">
                <DollarSign size={11} className="text-[#C9A84C]" />
                Tope de alquiler estimado:{' '}
                <strong className="text-[#1B2A4A]">
                  S/ {Math.floor(Number(ingreso) * 0.5).toLocaleString('es-PE')}/mes
                </strong>
              </p>
            )}
          </div>

          {/* Presets rápidos */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Ingresos frecuentes</p>
            <div className="flex flex-wrap gap-2">
              {INCOME_PRESETS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setIngreso(String(p.value))}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    ingreso === String(p.value)
                      ? 'bg-[#1B2A4A] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCalcular}
            disabled={loading || !ingreso}
            className="w-full btn-primary flex items-center justify-center gap-2 py-3.5 disabled:opacity-60"
          >
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> Calculando…</>
              : <><BarChart2 size={15} /> Calcular mi scoring</>}
          </button>

          {/* Saltar */}
          <button
            onClick={onFinish}
            className="mt-3 w-full text-xs text-gray-400 hover:text-[#1B2A4A] transition-colors py-2 flex items-center justify-center gap-1"
          >
            Completar más tarde <ArrowRight size={12} />
          </button>
        </>
      ) : (
        <>
          {/* Resultado */}
          <div className="bg-gradient-to-br from-[#1B2A4A] to-[#243656] rounded-2xl p-6 text-white mb-5">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wide text-center mb-4">Tu puntaje crediticio</p>
            <ScoreRing score={result.detalle?.puntajeTotal ?? 0} />
            <p className={`text-center mt-4 text-lg font-extrabold ${result.decision === 'Aprobado' ? 'text-green-400' : 'text-red-400'}`}>
              {result.decision === 'Aprobado' ? '✔ Aprobado' : '✘ Rechazado'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="card p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">Ingreso declarado</p>
              <p className="text-lg font-extrabold text-[#1B2A4A]">S/ {Number(result.ingreso).toLocaleString('es-PE')}</p>
            </div>
            <div className="card p-4 text-center border-2 border-[#C9A84C]/30">
              <p className="text-xs text-gray-400 mb-1">Tope de alquiler</p>
              <p className="text-lg font-extrabold text-[#C9A84C]">S/ {Number(result.topeAlquiler).toLocaleString('es-PE')}</p>
            </div>
          </div>

          <button
            onClick={onFinish}
            className="w-full btn-primary flex items-center justify-center gap-2 py-3.5"
          >
            <CheckCircle2 size={16} /> Finalizar registro
          </button>
        </>
      )}
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/inmuebles'

  const store     = useRegisterStore()
  const authStore = useAuthStore()
  const { step, rol, setStep, reset } = store

  // Si ya está autenticado, saltar paso 1
  useEffect(() => {
    if (authStore.isAuthenticated() && step === 1) setStep(2)
  }, [])

  const handleFinish = () => {
    reset()
    navigate(redirect)
  }

  // Para Arrendador: el paso 4 se salta
  const handleStep3Next = () => {
    if (rol === 'Arrendador') { handleFinish() }
    else setStep(4)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar />
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-lg mx-auto">

          {/* Badge */}
          <div className="text-center mb-8 pt-4">
            <div className="inline-flex items-center gap-2 bg-[#1B2A4A]/8 text-[#1B2A4A] text-xs font-semibold px-4 py-2 rounded-full mb-4">
              <Shield size={12} className="text-[#C9A84C]" />
              Registro seguro · Validado con RENIEC
            </div>
            <h1 className="text-3xl font-extrabold text-[#1B2A4A]">Crear cuenta</h1>
            <p className="text-gray-400 text-sm mt-1">
              Proceso de verificación en {rol === 'Arrendador' ? '3' : '4'} pasos
            </p>
          </div>

          {/* Progreso */}
          <div className="card px-6 pt-6 pb-4 mb-4">
            <ProgressBar current={step} rol={rol} />
          </div>

          {/* Contenido del paso */}
          <div className="card p-6 sm:p-8">
            {step === 1 && <Step1 store={store} onNext={() => setStep(2)} />}
            {step === 2 && <Step2 store={store} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
            {step === 3 && <Step3 store={store} onNext={handleStep3Next} onBack={() => setStep(2)} />}
            {step === 4 && <Step4 store={store} onFinish={handleFinish} />}
          </div>

        </div>
      </div>
    </div>
  )
}
