import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CreditCard, CheckCircle2, Clock, AlertCircle, Download, ChevronRight,
  DollarSign, Calendar, Shield, Building2, X, Loader2, Check,
  RefreshCw, ArrowRight, FileText, Info, Percent, Wallet,
  TrendingUp, RotateCcw, BadgeCheck, ExternalLink,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { paymentsService } from '../services/payments'
import { useAuthStore } from '../store/authStore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const N       = (v) => Number(v).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

function periodoLabel(periodo) {
  if (periodo === 'garantia-devolucion') return 'Devolución de garantía'
  if (!/^\d{4}-\d{2}$/.test(periodo)) return periodo
  const [y, m] = periodo.split('-')
  const label = new Date(y, m - 1, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function fechaVence(periodo) {
  if (periodo === 'garantia-devolucion' || !/^\d{4}-\d{2}$/.test(periodo)) return null
  const [y, m] = periodo.split('-')
  return new Date(y, m - 1, 5)
}

// Calcula el próximo periodo sin pago para un contrato
function nextPeriodo(contract, payments) {
  const pagados = new Set(
    payments
      .filter(p => p.periodo !== 'garantia-devolucion')
      .map(p => p.periodo)
  )
  const start = new Date(contract.fechaInicio ?? Date.now())
  const end   = new Date(contract.fechaFin   ?? Date.now())
  let d = new Date(start.getFullYear(), start.getMonth(), 1)
  while (d <= end) {
    const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!pagados.has(p)) return p
    d.setMonth(d.getMonth() + 1)
  }
  return null
}

// ─── Badge de estado ──────────────────────────────────────────────────────────

function EstadoBadge({ estado }) {
  const styles = {
    Pagado:   'bg-green-100 text-green-700',
    Pendiente:'bg-amber-100 text-amber-700',
    Atrasado: 'bg-red-100   text-red-700',
  }
  const icons = {
    Pagado:   <CheckCircle2 size={10} />,
    Pendiente:<Clock        size={10} />,
    Atrasado: <AlertCircle  size={10} />,
  }
  return (
    <span className={`badge gap-1 ${styles[estado] || 'bg-gray-100 text-gray-500'}`}>
      {icons[estado]} {estado}
    </span>
  )
}

// ─── Chip de método de pago ───────────────────────────────────────────────────

function MetodoBtn({ id, label, Icon, selected, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-xs font-semibold transition-all flex-1 ${
        selected ? 'border-[#1B2A4A] bg-[#1B2A4A]/5 text-[#1B2A4A]' : 'border-gray-200 text-gray-500 hover:border-gray-300'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  )
}

// ─── Modal de pago ────────────────────────────────────────────────────────────

function PaymentModal({ data, onClose, onDone }) {
  const [method,     setMethod]     = useState('card')
  const [processing, setProcessing] = useState(false)
  const [done,       setDone]       = useState(false)
  const [error,      setError]      = useState('')

  const { contractId, monto, comision, periodo, contractTitle, tipo } = data
  const total = monto + comision

  const handlePay = async () => {
    setProcessing(true)
    setError('')
    try {
      await paymentsService.registrar({ contractId, monto, periodo })
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar el pago. Intenta de nuevo.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1B2A4A]/60 backdrop-blur-md" onClick={!processing ? onClose : undefined} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-[#1B2A4A] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#C9A84C]/20 flex items-center justify-center">
              <Wallet size={17} className="text-[#C9A84C]" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Registrar pago</p>
              <p className="text-white/50 text-xs truncate max-w-[200px]">{contractTitle}</p>
            </div>
          </div>
          {!processing && (
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition">
              <X size={14} className="text-white" />
            </button>
          )}
        </div>

        <div className="p-6">
          {done ? (
            /* ── Éxito ─────────────────────────────────────────────────────── */
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-green-600" />
              </div>
              <h3 className="text-lg font-extrabold text-[#1B2A4A] mb-1">¡Pago registrado!</h3>
              <p className="text-gray-500 text-sm mb-1">{periodoLabel(periodo)}</p>
              <p className="text-[#1B2A4A] font-bold text-xl mb-4">S/ {N(monto)}</p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-left">
                <div className="flex items-start gap-2">
                  <Info size={13} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    El pago queda en estado <strong>Pendiente</strong> hasta que el arrendador confirme la recepción.
                  </p>
                </div>
              </div>
              <button onClick={() => { onDone(); onClose() }} className="btn-primary w-full">Aceptar</button>
            </div>
          ) : (
            /* ── Formulario ─────────────────────────────────────────────────── */
            <>
              {/* Desglose */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-5 space-y-2.5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Desglose del pago</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{periodoLabel(periodo)}</span>
                  <span className="font-semibold text-[#1B2A4A]">S/ {N(monto)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Percent size={11} /> Comisión RentaValid (5%)
                  </span>
                  <span className="font-semibold text-[#C9A84C]">S/ {N(comision)}</span>
                </div>
                <div className="border-t border-dashed border-gray-200 pt-2 flex justify-between">
                  <span className="font-bold text-[#1B2A4A]">Total</span>
                  <span className="font-extrabold text-[#1B2A4A] text-lg">S/ {N(total)}</span>
                </div>
              </div>

              {/* Método */}
              <p className="text-xs font-bold text-[#1B2A4A] mb-3">Método de pago</p>
              <div className="flex gap-2 mb-5">
                <MetodoBtn id="card"     label="Tarjeta"        Icon={CreditCard}   selected={method === 'card'}     onClick={setMethod} />
                <MetodoBtn id="yape"     label="Yape / Plin"    Icon={SmartphoneIcon} selected={method === 'yape'}   onClick={setMethod} />
                <MetodoBtn id="transfer" label="Transferencia"  Icon={Building2}    selected={method === 'transfer'} onClick={setMethod} />
              </div>

              {method === 'card' && (
                <div className="space-y-3 mb-5">
                  <input className="input-field text-sm" placeholder="0000 0000 0000 0000" maxLength={19} />
                  <div className="grid grid-cols-2 gap-3">
                    <input className="input-field text-sm" placeholder="MM / AA" />
                    <input className="input-field text-sm" placeholder="CVV" maxLength={4} />
                  </div>
                  <input className="input-field text-sm" placeholder="Nombre en la tarjeta" />
                </div>
              )}
              {method === 'yape' && (
                <div className="text-center py-4 mb-5">
                  <div className="w-28 h-28 bg-purple-50 border-2 border-purple-200 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <span className="text-5xl">📱</span>
                  </div>
                  <p className="text-sm font-semibold text-[#1B2A4A]">Escanea con Yape o Plin</p>
                  <p className="text-xs text-gray-400 mt-1">O transfiere al número <strong className="text-[#1B2A4A]">987 654 321</strong></p>
                  <p className="text-xs text-gray-400 mt-0.5">Referencia: <strong>RV-{contractId}-{periodo}</strong></p>
                </div>
              )}
              {method === 'transfer' && (
                <div className="bg-gray-50 rounded-2xl p-4 mb-5 space-y-2.5 text-sm">
                  {[
                    ['Banco',     'BCP'],
                    ['CCI',       '002-123-456789012-12'],
                    ['Titular',   'RentaValid S.A.C.'],
                    ['Referencia',`RV-${contractId}-${periodo}`],
                    ['Monto',     `S/ ${N(total)}`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <span className="text-gray-400">{k}</span>
                      <span className="font-semibold text-[#1B2A4A] text-right">{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                  <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              <button
                onClick={handlePay}
                disabled={processing}
                className="w-full btn-primary flex items-center justify-center gap-2 py-4 disabled:opacity-60"
              >
                {processing
                  ? <><Loader2 size={16} className="animate-spin" /> Procesando…</>
                  : <>Registrar pago de S/ {N(total)} <ArrowRight size={15} /></>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Modal de confirmación (arrendador) ──────────────────────────────────────

function ConfirmModal({ payment, onClose, onDone }) {
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState('')

  const handle = async () => {
    setLoading(true)
    try {
      await paymentsService.confirmar(payment.id)
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al confirmar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1B2A4A]/60 backdrop-blur-md" onClick={!loading ? onClose : undefined} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
        {done ? (
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <BadgeCheck size={28} className="text-green-600" />
            </div>
            <h3 className="font-extrabold text-[#1B2A4A] mb-1">¡Pago confirmado!</h3>
            <p className="text-gray-400 text-sm mb-5">{periodoLabel(payment.periodo)} · S/ {N(payment.monto)}</p>
            <button onClick={() => { onDone(); onClose() }} className="btn-primary w-full">Aceptar</button>
          </div>
        ) : (
          <>
            <h3 className="font-extrabold text-[#1B2A4A] mb-1">Confirmar recepción</h3>
            <p className="text-xs text-gray-400 mb-4">Confirma que recibiste el siguiente pago:</p>
            <div className="bg-gray-50 rounded-2xl p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Periodo</span><span className="font-semibold">{periodoLabel(payment.periodo)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Monto</span><span className="font-bold text-[#1B2A4A]">S/ {N(payment.monto)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Tu comisión RentaValid</span><span className="text-[#C9A84C] font-semibold">– S/ {N(payment.comision)}</span></div>
              <div className="border-t border-dashed border-gray-200 pt-2 flex justify-between">
                <span className="font-bold">Recibes</span>
                <span className="font-extrabold text-green-700">S/ {N(payment.monto - payment.comision)}</span>
              </div>
            </div>
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 btn-outline py-3 text-sm">Cancelar</button>
              <button onClick={handle} disabled={loading} className="flex-1 btn-primary py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Confirmar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Icono de smartphone inline ───────────────────────────────────────────────

function SmartphoneIcon({ size = 24, ...p }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  )
}

// ─── Card de estadísticas ─────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = 'navy' }) {
  const colors = {
    navy:  'bg-[#1B2A4A]/6  text-[#1B2A4A]',
    gold:  'bg-[#C9A84C]/10 text-[#C9A84C]',
    green: 'bg-green-50     text-green-700',
    red:   'bg-red-50       text-red-600',
    amber: 'bg-amber-50     text-amber-700',
  }
  return (
    <div className="card p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon size={17} />
      </div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-lg font-extrabold text-[#1B2A4A] leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Sección de garantía ──────────────────────────────────────────────────────

function GarantiaSection({ contract, payments, esArrendador, onDevolver, devolviendo }) {
  const devolucion = payments.find(p => p.periodo === 'garantia-devolucion')

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[#1B2A4A] text-sm flex items-center gap-2">
          <Shield size={15} className="text-[#C9A84C]" /> Depósito en garantía
        </h3>
        {devolucion
          ? <span className="badge bg-green-100 text-green-700 gap-1"><Check size={10} /> Devuelta</span>
          : <span className="badge bg-amber-100 text-amber-700 gap-1"><Clock size={10} /> En custodia</span>}
      </div>

      <div className="flex items-end justify-between mb-4">
        <div>
          <p className="text-[10px] text-gray-400 mb-0.5">Monto</p>
          <p className="text-2xl font-extrabold text-[#1B2A4A]">S/ {N(contract.garantia)}</p>
        </div>
        {devolucion && (
          <div className="text-right">
            <p className="text-[10px] text-gray-400">Devuelta el</p>
            <p className="text-sm font-semibold text-green-700">{fmtDate(devolucion.fechaPago)}</p>
          </div>
        )}
      </div>

      {!devolucion && (
        esArrendador ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 bg-[#1B2A4A]/4 rounded-xl p-3">
              <Info size={13} className="text-[#1B2A4A]/50 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-[#1B2A4A]/60 leading-relaxed">
                Al finalizar el contrato, registra la devolución de la garantía al arrendatario. Se marcará como pagada en el historial.
              </p>
            </div>
            <button
              onClick={onDevolver}
              disabled={devolviendo}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[#1B2A4A] text-[#1B2A4A] font-bold text-sm hover:bg-[#1B2A4A] hover:text-white transition-all disabled:opacity-50"
            >
              {devolviendo
                ? <><Loader2 size={14} className="animate-spin" /> Registrando…</>
                : <><RotateCcw size={14} /> Registrar devolución de garantía</>}
            </button>
          </div>
        ) : (
          <div className="flex items-start gap-2 bg-blue-50 rounded-xl p-3">
            <Info size={13} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-blue-600 leading-relaxed">
              La garantía se devuelve al finalizar el contrato en buen estado, según lo pactado.
            </p>
          </div>
        )
      )}
    </div>
  )
}

// ─── Grupo de un contrato ─────────────────────────────────────────────────────

function ContractGroup({ group, user, onReload }) {
  const { contract, payments } = group
  const property = contract.application?.property

  const esArrendador = property?.arrendadorId === user?.id

  const pagos        = payments.filter(p => p.periodo !== 'garantia-devolucion')
  const pagados      = pagos.filter(p => p.estadoEfectivo === 'Pagado')
  const pendientes   = pagos.filter(p => p.estadoEfectivo === 'Pendiente')
  const atrasados    = pagos.filter(p => p.estadoEfectivo === 'Atrasado')
  const accionables  = [...atrasados, ...pendientes]  // primero los atrasados

  const totalPagado     = pagados.reduce((s, p) => s + p.monto, 0)
  const totalComisiones = pagados.reduce((s, p) => s + p.comision, 0)
  const totalPendiente  = accionables.reduce((s, p) => s + p.monto, 0)
  const proximoPeriodo  = nextPeriodo(contract, pagos)

  const [payModal,   setPayModal]   = useState(null)
  const [confModal,  setConfModal]  = useState(null)
  const [devolviendo,setDevolviendo]= useState(false)
  const [devErr,     setDevErr]     = useState('')

  const handleDevolver = async () => {
    setDevolviendo(true)
    setDevErr('')
    try {
      await paymentsService.devolverGarantia(contract.id)
      onReload()
    } catch (err) {
      setDevErr(err.response?.data?.error || 'Error al registrar la devolución.')
    } finally {
      setDevolviendo(false)
    }
  }

  return (
    <div className="space-y-4 mb-10">
      {/* Modales */}
      {payModal  && <PaymentModal  data={payModal}    onClose={() => setPayModal(null)}  onDone={onReload} />}
      {confModal && <ConfirmModal  payment={confModal} onClose={() => setConfModal(null)} onDone={onReload} />}

      {/* ── Cabecera del contrato ─────────────────────────────────────── */}
      <div className="bg-[#1B2A4A] rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle,#C9A84C 1px,transparent 1px)', backgroundSize: '22px 22px' }} />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/20 flex items-center justify-center flex-shrink-0">
              <Building2 size={18} className="text-[#C9A84C]" />
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-base leading-tight truncate">{property?.titulo ?? `Contrato #${contract.id}`}</p>
              <p className="text-white/50 text-xs mt-0.5">{property?.distrito}</p>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <div className="text-center">
                  <p className="text-[#C9A84C] text-xl font-extrabold">S/ {N(contract.monto)}</p>
                  <p className="text-white/40 text-[10px]">mensual</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <p className="text-sm font-bold">{fmtDate(contract.fechaInicio)}</p>
                  <p className="text-white/40 text-[10px]">inicio</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold">{fmtDate(contract.fechaFin)}</p>
                  <p className="text-white/40 text-[10px]">fin</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`badge text-[10px] ${contract.estado === 'Firmado' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
              {contract.estado}
            </span>
            <Link to={`/contrato/${contract.id}`} className="text-[10px] text-white/40 hover:text-white/70 transition flex items-center gap-1">
              Ver contrato <ExternalLink size={9} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={TrendingUp}  label="Total pagado"      value={`S/ ${N(totalPagado)}`}    sub={`${pagados.length} pagos`}         color="green" />
        <StatCard icon={Clock}       label="Por confirmar"      value={`S/ ${N(totalPendiente)}`}  sub={`${accionables.length} pendientes`} color={atrasados.length ? 'red' : 'amber'} />
        <StatCard icon={Percent}     label="Comisiones (5%)"   value={`S/ ${N(totalComisiones)}`} sub="Plataforma RentaValid"              color="gold"  />
        <StatCard icon={Shield}      label="Garantía"           value={`S/ ${N(contract.garantia)}`} sub={payments.find(p => p.periodo === 'garantia-devolucion') ? 'Devuelta ✓' : 'En custodia'} color="navy" />
      </div>

      {/* ── Pagos por realizar / confirmar ───────────────────────────── */}
      {!esArrendador && proximoPeriodo && accionables.length === 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-[#1B2A4A] text-sm">Próximo vencimiento</h3>
            <span className="badge bg-[#1B2A4A]/8 text-[#1B2A4A] text-[10px]">{periodoLabel(proximoPeriodo)}</span>
          </div>
          <div className="flex items-center justify-between py-3 bg-gray-50 rounded-xl px-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1B2A4A]/8 flex items-center justify-center">
                <Calendar size={15} className="text-[#1B2A4A]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1B2A4A]">{periodoLabel(proximoPeriodo)}</p>
                <p className="text-xs text-gray-400">
                  Vence el {fechaVence(proximoPeriodo)?.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' }) ?? '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-bold text-[#1B2A4A] text-sm">S/ {N(contract.monto)}</p>
                <p className="text-[10px] text-gray-400">+ S/ {N(contract.monto * 0.05)} com.</p>
              </div>
              <button
                onClick={() => setPayModal({
                  contractId: contract.id,
                  monto:      contract.monto,
                  comision:   Math.round(contract.monto * 0.05 * 100) / 100,
                  periodo:    proximoPeriodo,
                  contractTitle: property?.titulo,
                })}
                className="btn-primary text-xs px-4 py-2"
              >
                Pagar
              </button>
            </div>
          </div>
        </div>
      )}

      {accionables.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#1B2A4A] text-sm">
              {esArrendador ? 'Pagos por confirmar' : 'Pagos pendientes / atrasados'}
            </h3>
            {atrasados.length > 0 && (
              <span className="badge bg-red-100 text-red-700 gap-1">
                <AlertCircle size={10} /> {atrasados.length} {atrasados.length === 1 ? 'atrasado' : 'atrasados'}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {accionables.map(p => (
              <div key={p.id} className={`flex items-center justify-between py-3 px-4 rounded-xl border ${
                p.estadoEfectivo === 'Atrasado' ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'
              }`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    p.estadoEfectivo === 'Atrasado' ? 'bg-red-100' : 'bg-amber-100'
                  }`}>
                    {p.estadoEfectivo === 'Atrasado'
                      ? <AlertCircle size={15} className="text-red-600" />
                      : <Clock       size={15} className="text-amber-600" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1B2A4A] truncate">{periodoLabel(p.periodo)}</p>
                    <p className="text-xs text-gray-400">
                      {p.estadoEfectivo === 'Atrasado'
                        ? `Venció el ${fmtDate(fechaVence(p.periodo))}`
                        : `Vence el ${fmtDate(fechaVence(p.periodo))}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="font-bold text-[#1B2A4A] text-sm">S/ {N(p.monto)}</p>
                    <EstadoBadge estado={p.estadoEfectivo} />
                  </div>
                  {esArrendador ? (
                    <button
                      onClick={() => setConfModal(p)}
                      className="text-xs bg-[#1B2A4A] text-white px-3 py-2 rounded-lg font-bold hover:bg-[#243656] transition"
                    >
                      Confirmar
                    </button>
                  ) : (
                    <button
                      onClick={() => setPayModal({
                        contractId:    contract.id,
                        monto:         p.monto,
                        comision:      p.comision,
                        periodo:       p.periodo,
                        contractTitle: property?.titulo,
                      })}
                      className={`text-xs px-3 py-2 rounded-lg font-bold transition ${
                        p.estadoEfectivo === 'Atrasado'
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-[#1B2A4A] text-white hover:bg-[#243656]'
                      }`}
                    >
                      {p.estadoEfectivo === 'Atrasado' ? 'Pagar ahora' : 'Pagar'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Historial de pagos ─────────────────────────────────────────── */}
      {pagados.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#1B2A4A] text-sm">Historial de pagos</h3>
            <span className="text-[10px] text-gray-400">{pagados.length} {pagados.length === 1 ? 'pago' : 'pagos'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 font-bold uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left pb-3">Periodo</th>
                  <th className="text-right pb-3">Monto</th>
                  <th className="text-right pb-3 hidden sm:table-cell">Comisión</th>
                  <th className="text-right pb-3">Fecha pago</th>
                  <th className="text-right pb-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {pagados.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 font-medium text-[#1B2A4A]">{periodoLabel(p.periodo)}</td>
                    <td className="py-3 text-right font-bold text-[#1B2A4A]">S/ {N(p.monto)}</td>
                    <td className="py-3 text-right text-[#C9A84C] hidden sm:table-cell">S/ {N(p.comision)}</td>
                    <td className="py-3 text-right text-gray-500">{fmtDate(p.fechaPago)}</td>
                    <td className="py-3 text-right"><EstadoBadge estado={p.estadoEfectivo} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Garantía ──────────────────────────────────────────────────── */}
      {devErr && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertCircle size={13} className="text-red-500" />
          <p className="text-xs text-red-600">{devErr}</p>
        </div>
      )}
      <GarantiaSection
        contract={contract}
        payments={payments}
        esArrendador={esArrendador}
        onDevolver={handleDevolver}
        devolviendo={devolviendo}
      />
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Payment() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [payments, setPayments] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    paymentsService.listar()
      .then(setPayments)
      .catch(err => setError(err.response?.data?.error || 'Error al cargar los pagos.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // Agrupar pagos por contrato
  const grupos = payments.reduce((acc, p) => {
    const cid = p.contractId
    if (!acc[cid]) acc[cid] = { contract: p.contract, payments: [] }
    acc[cid].payments.push(p)
    return acc
  }, {})
  const contractGroups = Object.values(grupos)

  // Métricas globales
  const totalGlobalPagado = payments
    .filter(p => p.estadoEfectivo === 'Pagado' && p.periodo !== 'garantia-devolucion')
    .reduce((s, p) => s + p.monto, 0)
  const totalAtrasado = payments.filter(p => p.estadoEfectivo === 'Atrasado').length

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-[#1B2A4A]">Panel de pagos</h1>
              <p className="text-gray-400 text-sm mt-0.5">
                Gestiona tus pagos y visualiza el historial de contratos
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {totalAtrasado > 0 && (
                <span className="badge bg-red-100 text-red-700 gap-1">
                  <AlertCircle size={11} /> {totalAtrasado} {totalAtrasado === 1 ? 'atrasado' : 'atrasados'}
                </span>
              )}
              <button
                onClick={load}
                className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"
                title="Recargar"
              >
                <RefreshCw size={14} className="text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={32} className="animate-spin text-[#1B2A4A]" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="card p-6 text-center">
            <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
            <p className="font-bold text-[#1B2A4A] mb-1">No se pudieron cargar los pagos</p>
            <p className="text-sm text-gray-400 mb-4">{error}</p>
            <button onClick={load} className="btn-primary">Reintentar</button>
          </div>
        )}

        {/* Sin contratos */}
        {!loading && !error && contractGroups.length === 0 && (
          <div className="card p-10 text-center max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-[#1B2A4A]/6 flex items-center justify-center mx-auto mb-5">
              <FileText size={28} className="text-[#1B2A4A]/40" />
            </div>
            <h2 className="font-extrabold text-[#1B2A4A] mb-2">Sin pagos registrados</h2>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Aún no tienes pagos registrados. Cuando tengas un contrato firmado podrás registrar tus pagos desde aquí.
            </p>
            <div className="flex flex-col gap-3">
              <Link to="/inmuebles" className="btn-primary flex items-center justify-center gap-2">
                Buscar inmuebles <ChevronRight size={15} />
              </Link>
              <Link to="/perfil" className="btn-outline flex items-center justify-center gap-2">
                Ver mis contratos
              </Link>
            </div>
          </div>
        )}

        {/* Grupos por contrato */}
        {!loading && !error && contractGroups.map(group => (
          <ContractGroup
            key={group.contract.id}
            group={group}
            user={user}
            onReload={load}
          />
        ))}

        {/* Nota de transparencia de comisión */}
        {!loading && contractGroups.length > 0 && (
          <div className="flex items-start gap-3 bg-[#1B2A4A]/4 rounded-2xl p-4 mt-2">
            <Percent size={14} className="text-[#1B2A4A]/50 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-[#1B2A4A]/60 leading-relaxed">
              <strong>Comisión de plataforma:</strong> RentaValid cobra el <strong>5%</strong> sobre cada pago de renta como servicio de intermediación, validación de identidad y gestión contractual bajo la Ley N° 30933. Esta comisión ya está incluida en el total mostrado.
            </p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
