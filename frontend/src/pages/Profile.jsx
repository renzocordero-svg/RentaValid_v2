import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User, Mail, Phone, MapPin, Lock, Eye, EyeOff, Shield,
  Award, CheckCircle, Edit3, Save, Home, Calendar, DollarSign,
  ChevronRight, CreditCard, Download, Bell, Smartphone, Monitor,
  LogOut, FileText, RefreshCw, TrendingUp, ReceiptText, X,
  AlertCircle, Clock, Check, Star, Building2
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { currentUser } from '../data/mockData'
import { useAuthStore } from '../store/authStore'
import { scoringService } from '../services/scoring'

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  const [y, m, d] = iso.split('-')
  const MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${parseInt(d)} ${MONTHS[parseInt(m)-1]} ${y}`
}

function getRentalProgress(startDate, endDate) {
  const start = new Date(startDate).getTime()
  const end   = new Date(endDate).getTime()
  const now   = new Date('2026-06-23').getTime()
  return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)))
}

function getPasswordStrength(pw) {
  if (!pw) return { level: 0, label: '', color: 'bg-gray-100' }
  let s = 0
  if (pw.length >= 8)        s++
  if (/[A-Z]/.test(pw))     s++
  if (/[0-9]/.test(pw))     s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  const MAP = [
    { level:0, label:'',           color:'bg-gray-100'    },
    { level:1, label:'Muy débil',  color:'bg-red-500'     },
    { level:2, label:'Débil',      color:'bg-orange-400'  },
    { level:3, label:'Buena',      color:'bg-yellow-400'  },
    { level:4, label:'Fuerte',     color:'bg-green-500'   },
  ]
  return MAP[s]
}

// ─── Shared UI pieces ─────────────────────────────────────────────────────────

function SectionCard({ children, className = '' }) {
  return <div className={`bg-white rounded-2xl shadow-card border border-gray-100 ${className}`}>{children}</div>
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-gray-50">
      <div>
        <h2 className="font-bold text-navy text-base">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

function StatusBadge({ status, type }) {
  const STYLES = {
    Pagado:    'bg-green-50 text-green-700 border border-green-200',
    Pendiente: 'bg-amber-50 text-amber-700 border border-amber-200',
    Devuelto:  'bg-blue-50 text-blue-700 border border-blue-200',
    Activo:    'bg-green-50 text-green-700 border border-green-200',
    Finalizado:'bg-gray-100 text-gray-500 border border-gray-200',
  }
  const ICONS = {
    Pagado: <Check size={9} />,
    Pendiente: <Clock size={9} />,
    Devuelto: <RefreshCw size={9} />,
    Activo: <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />,
    Finalizado: <X size={9} />,
  }
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${STYLES[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {ICONS[status]} {status}
    </span>
  )
}

function Toggle({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${enabled ? 'bg-green-500' : 'bg-gray-200'}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${enabled ? 'left-5' : 'left-0.5'}`} />
    </button>
  )
}

// ─── TAB: Mis datos ───────────────────────────────────────────────────────────

function MisDatos({ perfil }) {
  const [editing, setEditing]   = useState(false)
  const [saved, setSaved]       = useState(false)
  const [form, setForm]         = useState({
    firstName: perfil.firstName,
    lastName:  perfil.lastName,
    email:     perfil.email,
    phone:     perfil.phone,
    district:  perfil.district,
  })
  const [notifs, setNotifs] = useState({
    email: true,
    sms: false,
    marketing: false,
  })

  const handleSave = () => { setSaved(true); setEditing(false); setTimeout(() => setSaved(false), 3500) }
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-4">
      {/* Toast */}
      {saved && (
        <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm shadow-sm">
          <CheckCircle size={16} className="flex-shrink-0" />
          <span>Cambios guardados correctamente.</span>
        </div>
      )}

      {/* Personal info */}
      <SectionCard>
        <SectionHeader
          title="Información personal"
          subtitle="Actualiza tus datos de contacto"
          action={
            <button
              onClick={() => editing ? handleSave() : setEditing(true)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-all ${
                editing ? 'bg-navy text-white' : 'border border-navy/20 text-navy hover:bg-navy/5'
              }`}
            >
              {editing ? <><Save size={13} /> Guardar cambios</> : <><Edit3 size={13} /> Editar</>}
            </button>
          }
        />
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-6 mb-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3 flex-shrink-0">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-navy to-navy/70 flex items-center justify-center text-gold font-extrabold text-2xl select-none">
                  {(perfil.firstName[0] || '')}{(perfil.lastName[0] || '')}
                </div>
                {perfil.verified && (
                  <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-green-500 border-2 border-white flex items-center justify-center shadow-sm">
                    <Check size={13} className="text-white" />
                  </div>
                )}
              </div>
              {editing && (
                <button className="text-xs text-navy font-semibold border border-navy/20 px-3 py-1.5 rounded-lg hover:bg-navy/5 transition">
                  Cambiar foto
                </button>
              )}
              <div className="text-center">
                <p className="text-xs font-semibold text-gray-700">{perfil.firstName} {perfil.lastName}</p>
                <p className="text-[10px] text-gray-400">{perfil.roleLabel}{perfil.verified ? ' verificado' : ''}</p>
              </div>
            </div>

            {/* Fields */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Nombres',             key: 'firstName', icon: User,  type: 'text'  },
                { label: 'Apellidos',            key: 'lastName',  icon: User,  type: 'text'  },
                { label: 'Correo electrónico',   key: 'email',     icon: Mail,  type: 'email' },
                { label: 'Teléfono',             key: 'phone',     icon: Phone, type: 'tel'   },
              ].map(({ label, key, icon: Icon, type }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{label}</label>
                  <div className="relative">
                    <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type={type}
                      value={form[key]}
                      onChange={e => set(key, e.target.value)}
                      disabled={!editing}
                      className={`input-field pl-9 text-sm w-full transition-all ${!editing ? 'bg-gray-50/80 cursor-default text-gray-600' : ''}`}
                    />
                  </div>
                </div>
              ))}

              {/* District (full row) */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Distrito</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={form.district}
                    onChange={e => set('district', e.target.value)}
                    disabled={!editing}
                    className={`input-field pl-9 text-sm w-full transition-all ${!editing ? 'bg-gray-50/80 cursor-default text-gray-600' : ''}`}
                  />
                </div>
              </div>
            </div>
          </div>

          {editing && (
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button onClick={handleSave} className="btn-primary text-sm flex items-center gap-2">
                <Save size={14} /> Guardar cambios
              </button>
              <button onClick={() => setEditing(false)} className="btn-outline text-sm">
                Cancelar
              </button>
            </div>
          )}
        </div>
      </SectionCard>

      {/* DNI — verified, read-only */}
      <SectionCard>
        <div className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
              <Shield size={22} className="text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">DNI</p>
              <p className="text-xl font-extrabold text-navy tracking-widest mt-0.5">{perfil.dni || '—'}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={`badge border ${perfil.verified ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                <CheckCircle size={10} /> {perfil.verified ? 'RENIEC Verificado' : 'Sin verificar'}
              </span>
              {perfil.scoringScore != null && (
                <span className="badge bg-blue-50 text-blue-600 border border-blue-200">
                  <Award size={10} /> Score {perfil.scoringScore}/100
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3 flex items-center gap-1.5">
            <AlertCircle size={11} /> El DNI no puede modificarse. Contacta soporte si hay un error.
          </p>
        </div>
      </SectionCard>

      {/* Notification preferences */}
      <SectionCard>
        <SectionHeader title="Notificaciones" subtitle="Elige cómo quieres recibir alertas y recordatorios" />
        <div className="p-5 space-y-3">
          {[
            { key: 'email',     icon: Mail,       label: 'Notificaciones por correo',    desc: 'Recibos, contratos y vencimientos' },
            { key: 'sms',       icon: Smartphone, label: 'SMS al celular',               desc: 'Alertas urgentes de pago' },
            { key: 'marketing', icon: Bell,        label: 'Novedades y promociones',      desc: 'Nuevos inmuebles y ofertas' },
          ].map(({ key, icon: Icon, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-navy/6 flex items-center justify-center">
                  <Icon size={16} className="text-navy/60" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
              </div>
              <Toggle enabled={notifs[key]} onToggle={() => setNotifs(n => ({ ...n, [key]: !n[key] }))} />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

// ─── TAB: Seguridad ───────────────────────────────────────────────────────────

function Seguridad() {
  const [show, setShow]   = useState({ current: false, next: false, confirm: false })
  const [pass, setPass]   = useState({ current: '', next: '', confirm: '' })
  const [twoFA, setTwoFA] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const toggle = k => setShow(s => ({ ...s, [k]: !s[k] }))
  const set    = (k, v) => setPass(p => ({ ...p, [k]: v }))

  const strength  = getPasswordStrength(pass.next)
  const match     = pass.next && pass.confirm && pass.next === pass.confirm
  const canSubmit = pass.current && pass.next.length >= 8 && match

  const handleSavePassword = () => {
    setPwSaved(true)
    setPass({ current: '', next: '', confirm: '' })
    setTimeout(() => setPwSaved(false), 3500)
  }

  return (
    <div className="space-y-4">

      {/* Password change */}
      <SectionCard>
        <SectionHeader title="Cambiar contraseña" subtitle="Última actualización: nunca" />
        <div className="p-6 space-y-4">
          {pwSaved && (
            <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
              <CheckCircle size={15} /> Contraseña actualizada correctamente.
            </div>
          )}

          {/* Current */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Contraseña actual</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={show.current ? 'text' : 'password'}
                value={pass.current}
                onChange={e => set('current', e.target.value)}
                placeholder="••••••••"
                className="input-field pl-9 pr-10 text-sm w-full"
              />
              <button onClick={() => toggle('current')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy transition">
                {show.current ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* New password + strength */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Nueva contraseña</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={show.next ? 'text' : 'password'}
                value={pass.next}
                onChange={e => set('next', e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="input-field pl-9 pr-10 text-sm w-full"
              />
              <button onClick={() => toggle('next')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy transition">
                {show.next ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Strength bar */}
            {pass.next && (
              <div className="mt-2 space-y-1.5">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength.level ? strength.color : 'bg-gray-100'}`}
                    />
                  ))}
                </div>
                {strength.label && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Fortaleza:</span>
                    <span className={`font-semibold ${strength.level >= 3 ? 'text-green-600' : strength.level >= 2 ? 'text-yellow-600' : 'text-red-500'}`}>
                      {strength.label}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-1 mt-1">
                  {[
                    { label: '8+ caracteres',  ok: pass.next.length >= 8        },
                    { label: 'Mayúscula',       ok: /[A-Z]/.test(pass.next)     },
                    { label: 'Número',          ok: /[0-9]/.test(pass.next)     },
                    { label: 'Símbolo',         ok: /[^A-Za-z0-9]/.test(pass.next) },
                  ].map(({ label, ok }) => (
                    <div key={label} className={`flex items-center gap-1.5 text-[10px] ${ok ? 'text-green-600' : 'text-gray-400'}`}>
                      {ok ? <Check size={10} /> : <div className="w-2.5 h-2.5 rounded-full border border-gray-300" />}
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Confirmar nueva contraseña</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={show.confirm ? 'text' : 'password'}
                value={pass.confirm}
                onChange={e => set('confirm', e.target.value)}
                placeholder="Repite la contraseña"
                className={`input-field pl-9 pr-10 text-sm w-full transition-all ${
                  pass.confirm && !match ? 'border-red-300 focus:ring-red-200' : pass.confirm && match ? 'border-green-300' : ''
                }`}
              />
              <button onClick={() => toggle('confirm')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy transition">
                {show.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              {pass.confirm && (
                <div className="absolute right-9 top-1/2 -translate-y-1/2">
                  {match ? <Check size={14} className="text-green-500" /> : <X size={14} className="text-red-400" />}
                </div>
              )}
            </div>
            {pass.confirm && !match && (
              <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
            )}
          </div>

          <button
            onClick={handleSavePassword}
            disabled={!canSubmit}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Lock size={14} /> Actualizar contraseña
          </button>
        </div>
      </SectionCard>

      {/* 2FA */}
      <SectionCard>
        <div className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${twoFA ? 'bg-green-50' : 'bg-gray-100'}`}>
                <Smartphone size={20} className={twoFA ? 'text-green-600' : 'text-gray-400'} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-navy text-sm">Verificación en dos pasos</p>
                  <span className="badge bg-amber-50 text-amber-700 text-[10px]">Recomendado</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Autenticación adicional al iniciar sesión</p>
              </div>
            </div>
            <Toggle enabled={twoFA} onToggle={() => setTwoFA(v => !v)} />
          </div>
          {!twoFA && (
            <div className="mt-3 flex items-start gap-2 bg-amber-50 rounded-xl p-3">
              <AlertCircle size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">Tu cuenta está protegida solo con contraseña. Activa 2FA con tu celular para mayor seguridad.</p>
            </div>
          )}
          {twoFA && (
            <div className="mt-3 flex items-start gap-2 bg-green-50 rounded-xl p-3">
              <CheckCircle size={13} className="text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-green-700">2FA activado. Recibirás un código en tu celular cada vez que inicies sesión.</p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Active sessions */}
      <SectionCard>
        <SectionHeader title="Sesiones activas" subtitle="Dispositivos donde has iniciado sesión" />
        <div className="divide-y divide-gray-50">
          {[
            { icon: Monitor,    label: 'Chrome · Windows 10',  loc: 'Lima, Perú',           time: 'Ahora mismo',    current: true  },
            { icon: Smartphone, label: 'Safari · iPhone 15',   loc: 'Miraflores, Lima',     time: 'Hace 2 días',    current: false },
          ].map(({ icon: Icon, label, loc, time, current }) => (
            <div key={label} className="flex items-center gap-3 px-5 py-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${current ? 'bg-navy text-white' : 'bg-gray-100 text-gray-400'}`}>
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-700">{label}</p>
                <p className="text-xs text-gray-400">{loc} · {time}</p>
              </div>
              {current
                ? <span className="badge bg-green-50 text-green-700 text-[10px]"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Esta sesión</span>
                : <button className="text-xs text-red-400 hover:text-red-600 font-semibold transition">Cerrar</button>}
            </div>
          ))}
        </div>
        <div className="px-5 pb-5">
          <button className="w-full text-center text-xs text-red-400 hover:text-red-600 font-semibold border border-red-100 rounded-xl py-2.5 hover:bg-red-50 transition">
            Cerrar todas las otras sesiones
          </button>
        </div>
      </SectionCard>
    </div>
  )
}

// ─── TAB: Mis alquileres ──────────────────────────────────────────────────────

function MisAlquileres() {
  const rentals  = currentUser.activeRentals
  const active   = rentals.filter(r => r.status === 'Activo').length
  const finished = rentals.filter(r => r.status === 'Finalizado').length
  const totalRent = rentals.reduce((s, r) => s + r.price, 0)

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Activos',      value: active,    icon: Home,     color: 'text-green-600 bg-green-50' },
          { label: 'Finalizados',  value: finished,  icon: CheckCircle, color: 'text-gray-500 bg-gray-100' },
          { label: 'Renta total',  value: `S/ ${totalRent.toLocaleString()}`, icon: DollarSign, color: 'text-navy bg-navy/6' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 flex flex-col items-center text-center">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${color}`}>
              <Icon size={17} />
            </div>
            <p className="text-base font-extrabold text-navy">{value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Rental cards */}
      {rentals.map(rental => {
        const progress = rental.status === 'Activo' ? getRentalProgress(rental.startDate, rental.endDate) : 100
        const months   = rental.status === 'Activo'
          ? Math.floor((new Date('2026-06-23') - new Date(rental.startDate)) / (1000 * 60 * 60 * 24 * 30))
          : Math.round((new Date(rental.endDate) - new Date(rental.startDate)) / (1000 * 60 * 60 * 24 * 30))

        return (
          <SectionCard key={rental.id} className="overflow-hidden">
            {/* Image header */}
            <div className="relative h-36 overflow-hidden">
              <img
                src={rental.image}
                alt={rental.property}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-navy/80 via-navy/60 to-navy/30" />
              <div className="absolute inset-0 p-5 flex items-center justify-between">
                <div className="text-white">
                  <StatusBadge status={rental.status} />
                  <h3 className="font-bold text-lg leading-tight mt-1">{rental.property}</h3>
                  <p className="text-white/60 text-xs flex items-center gap-1 mt-0.5">
                    <MapPin size={10} /> {rental.address}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-extrabold text-white">S/ {rental.price.toLocaleString()}</p>
                  <p className="text-white/50 text-xs">/mes</p>
                  <p className="text-white/40 text-[10px] mt-0.5">{rental.contractNum}</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-5">
              {/* Dates + progress */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                  <span>{fmtDate(rental.startDate)}</span>
                  <span className="font-semibold text-navy">{rental.status === 'Activo' ? `${progress}% completado · ${months} meses` : 'Contrato finalizado'}</span>
                  <span>{fmtDate(rental.endDate)}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${rental.status === 'Activo' ? 'bg-gradient-to-r from-navy to-gold' : 'bg-gray-300'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Duración',   value: '12 meses' },
                  { label: 'Meses cur.', value: `${months} meses` },
                  { label: 'Garantía',   value: `S/ ${(rental.price * 2).toLocaleString()}` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-sm font-bold text-navy">{value}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Link
                  to={`/contrato/${rental.propertyId}`}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-xl border border-navy/20 text-navy hover:bg-navy/5 transition"
                >
                  <FileText size={13} /> Ver contrato
                </Link>
                <Link
                  to="/pagos"
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-xl bg-navy text-white hover:bg-navy/90 transition"
                >
                  <CreditCard size={13} /> Ver pagos
                </Link>
              </div>
            </div>
          </SectionCard>
        )
      })}

      {/* Empty CTA */}
      <div className="bg-navy/4 rounded-2xl border border-navy/10 p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-navy">¿Buscas un nuevo inmueble?</p>
          <p className="text-xs text-gray-500 mt-0.5">Tu perfil está aprobado · Score 87/100</p>
        </div>
        <Link to="/inmuebles" className="btn-primary text-xs flex items-center gap-1.5">
          <Home size={13} /> Ver inmuebles
        </Link>
      </div>
    </div>
  )
}

// ─── TAB: Historial de pagos ──────────────────────────────────────────────────

const TYPE_COLORS = {
  rent:    { bg: 'bg-navy/6',    icon: 'text-navy',        label: 'Alquiler'  },
  deposit: { bg: 'bg-amber-50',  icon: 'text-amber-600',   label: 'Depósito'  },
  refund:  { bg: 'bg-blue-50',   icon: 'text-blue-600',    label: 'Devolución'},
}

function HistorialPagos() {
  const [filter, setFilter] = useState('todos')
  const payments = currentUser.paymentHistory

  const paidRent   = payments.filter(p => p.type === 'rent' && p.status === 'Pagado').reduce((s, p) => s + p.amount, 0)
  const pending    = payments.filter(p => p.status === 'Pendiente')
  const nextPayment = pending[0]

  const shown = filter === 'todos'
    ? payments
    : payments.filter(p => p.status.toLowerCase() === filter)

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            label: 'Total en alquileres',
            value: `S/ ${paidRent.toLocaleString()}`,
            sub: `${payments.filter(p => p.type === 'rent' && p.status === 'Pagado').length} pagos completados`,
            icon: TrendingUp,
            color: 'text-navy bg-navy/6',
          },
          {
            label: 'Próximo pago',
            value: nextPayment ? `S/ ${nextPayment.amount.toLocaleString()}` : 'Al día',
            sub: nextPayment ? `Vence: ${fmtDate(nextPayment.date)}` : 'Sin pagos pendientes',
            icon: Calendar,
            color: nextPayment ? 'text-amber-600 bg-amber-50' : 'text-green-600 bg-green-50',
          },
          {
            label: 'Puntualidad',
            value: '100%',
            sub: 'Historial sin moras',
            icon: Star,
            color: 'text-gold bg-gold/10',
          },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-card p-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-lg font-extrabold text-navy leading-tight">{value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <SectionCard>
        <div className="px-5 py-4 border-b border-gray-50 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-navy text-sm">Movimientos</h3>
            <p className="text-xs text-gray-400">{shown.length} registros</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Filter pills */}
            {[
              { key: 'todos',    label: 'Todos' },
              { key: 'pagado',   label: 'Pagados' },
              { key: 'pendiente',label: 'Pendientes' },
              { key: 'devuelto', label: 'Devueltos' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`text-[10px] font-semibold px-3 py-1.5 rounded-full transition-all ${
                  filter === key ? 'bg-navy text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
            <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-navy font-semibold border border-gray-200 px-3 py-1.5 rounded-full hover:border-navy/30 transition">
              <Download size={11} /> Exportar
            </button>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                {['Fecha', 'Concepto', 'Inmueble', 'Monto', 'Estado', ''].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {shown.map(p => {
                const tc = TYPE_COLORS[p.type] ?? TYPE_COLORS.rent
                return (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">{fmtDate(p.date)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${tc.bg}`}>
                          {p.type === 'rent'    && <Home size={13}       className={tc.icon} />}
                          {p.type === 'deposit' && <DollarSign size={13} className={tc.icon} />}
                          {p.type === 'refund'  && <RefreshCw size={13}  className={tc.icon} />}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{p.concept}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <MapPin size={10} /> {p.property}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-sm font-extrabold ${p.type === 'refund' ? 'text-blue-600' : 'text-navy'}`}>
                        {p.type === 'refund' ? '+' : ''}S/ {p.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      {p.status === 'Pagado' && (
                        <button className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1 text-[10px] text-gray-400 hover:text-navy font-semibold">
                          <Download size={11} /> Recibo
                        </button>
                      )}
                      {p.status === 'Pendiente' && (
                        <button className="flex items-center gap-1 text-[10px] font-semibold text-white bg-navy hover:bg-navy/90 px-2.5 py-1 rounded-lg transition">
                          <CreditCard size={10} /> Pagar
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile list */}
        <div className="sm:hidden divide-y divide-gray-50">
          {shown.map(p => {
            const tc = TYPE_COLORS[p.type] ?? TYPE_COLORS.rent
            return (
              <div key={p.id} className="flex items-center gap-3 p-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tc.bg}`}>
                  {p.type === 'rent'    && <Home size={15}       className={tc.icon} />}
                  {p.type === 'deposit' && <DollarSign size={15} className={tc.icon} />}
                  {p.type === 'refund'  && <RefreshCw size={15}  className={tc.icon} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-700 truncate">{p.concept}</p>
                  <p className="text-xs text-gray-400">{fmtDate(p.date)} · {p.property}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-extrabold text-navy">{p.type === 'refund' ? '+' : ''}S/ {p.amount.toLocaleString()}</p>
                  <StatusBadge status={p.status} />
                </div>
              </div>
            )
          })}
        </div>

        {shown.length === 0 && (
          <div className="py-12 text-center text-gray-400 text-sm">Sin movimientos para este filtro</div>
        )}
      </SectionCard>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'datos',      label: 'Mis datos',           icon: User,        desc: 'Información personal' },
  { id: 'seguridad',  label: 'Seguridad',            icon: Lock,        desc: 'Contraseña y acceso' },
  { id: 'alquileres', label: 'Mis alquileres',       icon: Home,        desc: '2 contratos' },
  { id: 'pagos',      label: 'Historial de pagos',   icon: ReceiptText, desc: 'Movimientos' },
]

export default function Profile() {
  const [tab, setTab] = useState('datos')
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [score, setScore] = useState(null)

  const doLogout = () => { logout(); navigate('/') }

  useEffect(() => {
    // El scoring solo existe para arrendatarios; si no hay, se ignora
    scoringService.obtenerMio().then(setScore).catch(() => setScore(null))
  }, [])

  // ── Perfil real (con respaldo al mock si algún campo falta) ────────────────
  const esArrendador = (user?.roles ?? []).includes('Arrendador')
  const perfil = {
    firstName:    user?.nombre ?? currentUser.firstName,
    lastName:     [user?.apellidoPaterno, user?.apellidoMaterno].filter(Boolean).join(' ') || currentUser.lastName,
    email:        user?.email ?? currentUser.email,
    phone:        user?.telefono ?? currentUser.phone,
    district:     currentUser.district,   // no forma parte del modelo de usuario
    dni:          user?.dni ?? currentUser.dni,
    verified:     user?.identidadValidada ?? false,
    scoringScore: score?.detalle?.puntajeTotal ?? null,
    roleLabel:    esArrendador ? 'Arrendador' : 'Inquilino',
  }

  const fullName = [perfil.firstName, perfil.lastName].filter(Boolean).join(' ')
  const initials = `${perfil.firstName?.[0] ?? ''}${perfil.lastName?.[0] ?? ''}`.toUpperCase()

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('es-PE', { month: 'short', year: 'numeric' })
    : '—'

  const STATS = [
    { label: 'Score crediticio', value: perfil.scoringScore != null ? `${perfil.scoringScore}/100` : '—', sub: score?.decision ?? 'Sin calcular', icon: Award,      color: 'text-gold bg-gold/15'      },
    { label: 'Rol',              value: perfil.roleLabel,                     sub: perfil.verified ? 'Verificado' : 'Sin verificar', icon: User,       color: 'text-navy bg-white/15'     },
    { label: 'Tope de alquiler', value: score?.topeAlquiler != null ? `S/ ${Number(score.topeAlquiler).toLocaleString('es-PE')}` : '—', sub: 'Según tu ingreso', icon: TrendingUp, color: 'text-white/80 bg-white/10' },
    { label: 'Miembro desde',    value: memberSince,                          sub: '',                     icon: Calendar,   color: 'text-white/80 bg-white/10' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* ── Hero header ── */}
      <div className="bg-navy pt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Dot grid decoration */}
          <div className="relative py-8">
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}
            />

            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gold via-gold/80 to-gold/50 flex items-center justify-center text-navy font-extrabold text-2xl shadow-lg select-none">
                  {initials}
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-green-400 border-2 border-navy flex items-center justify-center shadow">
                  <Check size={13} className="text-white" />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-white font-extrabold text-xl leading-tight">{fullName || 'Usuario'}</h1>
                <p className="text-white/50 text-sm mt-0.5">{perfil.email}{perfil.phone ? ` · ${perfil.phone}` : ''}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  {perfil.verified
                    ? <span className="badge bg-green-400/20 text-green-300 border border-green-400/30 text-[10px]">
                        <Shield size={9} /> RENIEC Verificado
                      </span>
                    : <span className="badge bg-amber-400/20 text-amber-200 border border-amber-400/30 text-[10px]">
                        <AlertCircle size={9} /> Identidad sin verificar
                      </span>}
                  {perfil.scoringScore != null && (
                    <span className="badge bg-gold/20 text-gold border border-gold/25 text-[10px]">
                      <Award size={9} /> Score {perfil.scoringScore}/100
                    </span>
                  )}
                  <span className="badge bg-white/10 text-white/50 text-[10px]">{perfil.roleLabel}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  to="/scoring"
                  className="text-xs text-white/60 font-semibold border border-white/20 px-3.5 py-2 rounded-xl hover:bg-white/10 transition flex items-center gap-1.5"
                >
                  <TrendingUp size={13} /> Ver scoring
                </Link>
              </div>
            </div>

            {/* Stats bar */}
            <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pb-1">
              {STATS.map(({ label, value, sub, icon: Icon, color }) => (
                <div key={label} className="bg-white/8 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white/40 text-[10px] leading-none">{label}</p>
                    <p className="text-white font-extrabold text-sm leading-tight mt-0.5 truncate">{value}</p>
                    <p className="text-white/30 text-[10px] truncate">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── Desktop sidebar ── */}
          <aside className="hidden lg:block w-56 xl:w-64 flex-shrink-0 sticky top-20">
            <div className="space-y-3">
              <nav className="bg-white rounded-2xl shadow-card border border-gray-100 p-2 space-y-0.5">
                {NAV_ITEMS.map(({ id, label, icon: Icon, desc }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all ${
                      tab === id
                        ? 'bg-navy text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-navy'
                    }`}
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm leading-none">{label}</p>
                      <p className={`text-[10px] mt-0.5 truncate ${tab === id ? 'text-white/50' : 'text-gray-400'}`}>{desc}</p>
                    </div>
                  </button>
                ))}
              </nav>

              <button onClick={doLogout} className="w-full bg-white rounded-2xl shadow-card border border-gray-100 p-3 flex items-center gap-3 text-red-400 hover:text-red-600 hover:bg-red-50 transition text-sm font-semibold">
                <LogOut size={16} /> Cerrar sesión
              </button>
            </div>
          </aside>

          {/* ── Mobile tab bar ── */}
          <div className="lg:hidden w-full">
            <div className="flex gap-2 overflow-x-auto pb-1 bg-white rounded-2xl shadow-card border border-gray-100 p-1.5">
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    tab === id ? 'bg-navy text-white' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Tab content ── */}
          <main className="flex-1 min-w-0 lg:min-h-[60vh]">
            {tab === 'datos'      && <MisDatos perfil={perfil} />}
            {tab === 'seguridad'  && <Seguridad />}
            {tab === 'alquileres' && <MisAlquileres />}
            {tab === 'pagos'      && <HistorialPagos />}
          </main>
        </div>
      </div>

      <Footer />
    </div>
  )
}
