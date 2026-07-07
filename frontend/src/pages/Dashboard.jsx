import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Search, PlusCircle, CreditCard, Star,
  FileText, TrendingUp, Clock, AlertCircle, Shield, ArrowRight,
  Loader2, CheckCircle2, User, Percent, Wallet,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { paymentsService } from '../services/payments'
import { scoringService } from '../services/scoring'
import { propertiesService } from '../services/properties'
import { useAuthStore } from '../store/authStore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const N = (v) => Number(v || 0).toLocaleString('es-PE')
const fmtShort = (d) => d
  ? new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—'

// ─── Tarjeta de métrica ───────────────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value, sub, color = 'navy' }) {
  const colors = {
    navy:  'bg-[#1B2A4A]/6  text-[#1B2A4A]',
    gold:  'bg-[#C9A84C]/10 text-[#C9A84C]',
    green: 'bg-green-50     text-green-700',
    red:   'bg-red-50       text-red-600',
    amber: 'bg-amber-50     text-amber-700',
  }
  return (
    <div className="card p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-xl font-extrabold text-[#1B2A4A] leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Acción rápida ────────────────────────────────────────────────────────────

function QuickAction({ to, icon: Icon, label, desc }) {
  return (
    <Link
      to={to}
      className="card p-4 flex items-center gap-3 hover:shadow-card-hover hover:border-[#1B2A4A]/20 transition-all group"
    >
      <div className="w-10 h-10 rounded-xl bg-[#1B2A4A]/6 flex items-center justify-center flex-shrink-0 group-hover:bg-[#1B2A4A] transition-colors">
        <Icon size={17} className="text-[#1B2A4A] group-hover:text-[#C9A84C] transition-colors" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-[#1B2A4A] text-sm leading-tight">{label}</p>
        <p className="text-[11px] text-gray-400 truncate">{desc}</p>
      </div>
      <ArrowRight size={15} className="text-gray-300 group-hover:text-[#C9A84C] transition-colors flex-shrink-0" />
    </Link>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, isAuthenticated, hasRole } = useAuthStore()
  const navigate = useNavigate()

  const [payments, setPayments]   = useState([])
  const [score,    setScore]      = useState(null)
  const [myProps,  setMyProps]    = useState([])
  const [loading,  setLoading]    = useState(true)

  const esArrendador   = hasRole('Arrendador')
  const esArrendatario = hasRole('Arrendatario')

  const load = useCallback(async () => {
    setLoading(true)
    // Cada llamada es tolerante a fallos (usuario nuevo sin datos aún)
    const [pay, sco, props] = await Promise.all([
      paymentsService.listar().catch(() => []),
      esArrendatario ? scoringService.obtenerMio().catch(() => null) : Promise.resolve(null),
      esArrendador ? propertiesService.listar().catch(() => []) : Promise.resolve([]),
    ])
    setPayments(pay || [])
    setScore(sco)
    setMyProps((props || []).filter(p => p.ownerId === user?.id))
    setLoading(false)
  }, [esArrendador, esArrendatario, user?.id])

  useEffect(() => {
    if (!isAuthenticated()) { navigate('/login?redirect=/dashboard'); return }
    load()
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derivar contratos únicos desde los pagos ───────────────────────────────
  const contractsMap = payments.reduce((acc, p) => {
    if (p.contract && !acc[p.contractId]) acc[p.contractId] = p.contract
    return acc
  }, {})
  const contracts = Object.values(contractsMap)

  // ── Métricas ────────────────────────────────────────────────────────────────
  const pagosReales   = payments.filter(p => p.periodo !== 'garantia-devolucion')
  const pagados       = pagosReales.filter(p => p.estadoEfectivo === 'Pagado')
  const accionables   = pagosReales.filter(p => ['Pendiente', 'Atrasado'].includes(p.estadoEfectivo))
  const atrasados     = pagosReales.filter(p => p.estadoEfectivo === 'Atrasado')
  const totalPagado   = pagados.reduce((s, p) => s + p.monto, 0)
  const ingresoNeto   = pagados.reduce((s, p) => s + (p.monto - p.comision), 0)
  const comisiones    = pagados.reduce((s, p) => s + p.comision, 0)

  const nombre = user?.nombre || 'Usuario'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[70vh]">
          <Loader2 size={32} className="animate-spin text-[#1B2A4A]" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* ── Header ── */}
      <div className="bg-[#1B2A4A] pt-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(circle,#C9A84C 1px,transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-2 mb-1.5">
            <LayoutDashboard size={16} className="text-[#C9A84C]" />
            <span className="text-[10px] font-bold text-[#C9A84C] uppercase tracking-widest">Panel principal</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Hola, {nombre} 👋</h1>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {(user?.roles ?? []).map(r => (
              <span key={r} className="badge bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/25 text-[10px]">
                {r}
              </span>
            ))}
            {user?.identidadValidada
              ? <span className="badge bg-green-400/15 text-green-300 border border-green-400/25 text-[10px]"><Shield size={9} /> Identidad verificada</span>
              : <Link to="/registro" className="badge bg-white/10 text-white/60 text-[10px] hover:bg-white/20 transition"><AlertCircle size={9} /> Verifica tu identidad</Link>}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Métricas por rol ── */}
        <section>
          <h2 className="text-sm font-bold text-[#1B2A4A] mb-3">Resumen</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {esArrendatario && (
              <MetricCard
                icon={Star}
                label="Mi scoring"
                value={score ? `${score.detalle?.puntajeTotal ?? '—'}/100` : '—'}
                sub={score ? score.decision : 'Sin calcular'}
                color={score?.decision === 'Aprobado' ? 'green' : 'gold'}
              />
            )}
            {esArrendador && (
              <MetricCard
                icon={Building2}
                label="Mis propiedades"
                value={myProps.length}
                sub="Publicadas y disponibles"
                color="navy"
              />
            )}
            <MetricCard
              icon={FileText}
              label="Contratos"
              value={contracts.length}
              sub={`${contracts.filter(c => c.estado === 'Firmado').length} firmados`}
              color="navy"
            />
            {esArrendador ? (
              <MetricCard
                icon={Wallet}
                label="Ingresos netos"
                value={`S/ ${N(ingresoNeto)}`}
                sub={`Comisiones: S/ ${N(comisiones)}`}
                color="green"
              />
            ) : (
              <MetricCard
                icon={TrendingUp}
                label="Total pagado"
                value={`S/ ${N(totalPagado)}`}
                sub={`${pagados.length} pagos`}
                color="green"
              />
            )}
            <MetricCard
              icon={esArrendador ? Clock : CreditCard}
              label={esArrendador ? 'Por confirmar' : 'Pagos pendientes'}
              value={accionables.length}
              sub={atrasados.length ? `${atrasados.length} atrasado(s)` : 'Al día'}
              color={atrasados.length ? 'red' : accionables.length ? 'amber' : 'green'}
            />
          </div>
        </section>

        {/* ── Acciones rápidas ── */}
        <section>
          <h2 className="text-sm font-bold text-[#1B2A4A] mb-3">Accesos rápidos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {esArrendador ? (
              <>
                <QuickAction to="/publicar"  icon={PlusCircle} label="Publicar inmueble" desc="Añade una propiedad" />
                <QuickAction to="/inmuebles" icon={Search}     label="Ver inmuebles"     desc="Explora el catálogo" />
                <QuickAction to="/pagos"     icon={CreditCard} label="Mis ingresos"      desc="Pagos y garantías" />
                <QuickAction to="/perfil"    icon={User}       label="Mi perfil"         desc="Datos y seguridad" />
              </>
            ) : (
              <>
                <QuickAction to="/inmuebles" icon={Search}     label="Buscar inmuebles"  desc="Encuentra tu hogar" />
                <QuickAction to="/scoring"   icon={Star}       label="Mi scoring"        desc="Tu capacidad de alquiler" />
                <QuickAction to="/pagos"     icon={CreditCard} label="Mis pagos"         desc="Historial y pendientes" />
                <QuickAction to="/perfil"    icon={User}       label="Mi perfil"         desc="Datos y seguridad" />
              </>
            )}
          </div>
        </section>

        {/* ── Contratos recientes ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#1B2A4A]">
              {esArrendador ? 'Mis contratos' : 'Mis alquileres'}
            </h2>
            {contracts.length > 0 && (
              <Link to="/pagos" className="text-xs text-[#1B2A4A] font-semibold hover:text-[#C9A84C] transition flex items-center gap-1">
                Ver pagos <ArrowRight size={13} />
              </Link>
            )}
          </div>

          {contracts.length === 0 ? (
            <div className="card p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#1B2A4A]/6 flex items-center justify-center mx-auto mb-4">
                <FileText size={24} className="text-[#1B2A4A]/40" />
              </div>
              <p className="font-bold text-[#1B2A4A] mb-1">Aún no tienes contratos</p>
              <p className="text-sm text-gray-400 mb-5 max-w-sm mx-auto">
                {esArrendador
                  ? 'Cuando aceptes una postulación y firmes el contrato, aparecerá aquí.'
                  : 'Postula a un inmueble y, tras firmar el contrato, lo verás aquí.'}
              </p>
              <Link to={esArrendador ? '/publicar' : '/inmuebles'} className="btn-primary inline-flex items-center gap-2">
                {esArrendador ? <><PlusCircle size={15} /> Publicar inmueble</> : <><Search size={15} /> Buscar inmuebles</>}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {contracts.map(c => (
                <div key={c.id} className="card p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#1B2A4A]/6 flex items-center justify-center flex-shrink-0">
                        <Building2 size={17} className="text-[#1B2A4A]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[#1B2A4A] text-sm truncate">
                          {c.application?.property?.titulo ?? `Contrato #${c.id}`}
                        </p>
                        <p className="text-[11px] text-gray-400">{c.application?.property?.distrito}</p>
                      </div>
                    </div>
                    <span className={`badge text-[10px] ${c.estado === 'Firmado' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {c.estado === 'Firmado' ? <CheckCircle2 size={9} /> : <Clock size={9} />} {c.estado}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-3 border-t border-gray-100">
                    <div>
                      <p className="font-extrabold text-[#1B2A4A]">S/ {N(c.monto)}<span className="text-gray-400 font-normal">/mes</span></p>
                      <p className="text-[10px] text-gray-400">{fmtShort(c.fechaInicio)} — {fmtShort(c.fechaFin)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/contrato/${c.id}`} className="text-[11px] font-semibold text-[#1B2A4A] border border-[#1B2A4A]/20 px-3 py-1.5 rounded-lg hover:bg-[#1B2A4A]/5 transition">
                        Contrato
                      </Link>
                      <Link to="/pagos" className="text-[11px] font-semibold text-white bg-[#1B2A4A] px-3 py-1.5 rounded-lg hover:bg-[#243656] transition">
                        Pagos
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Nota comisión ── */}
        <div className="flex items-start gap-3 bg-[#1B2A4A]/4 rounded-2xl p-4">
          <Percent size={14} className="text-[#1B2A4A]/50 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-[#1B2A4A]/60 leading-relaxed">
            RentaValid aplica una <strong>comisión del 5%</strong> sobre cada pago de renta por el servicio de
            intermediación, validación de identidad y gestión contractual bajo la <strong>Ley N° 30933</strong>.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  )
}
