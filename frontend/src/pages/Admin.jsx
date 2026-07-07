import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck, Users, Building2, FileText, Wallet,
  Loader2, Power, CheckCircle2, XCircle, AlertCircle,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { adminService } from '../services/admin'
import { useAuthStore } from '../store/authStore'

const ESTADOS_INMUEBLE = ['Disponible', 'Arrendado', 'Inactivo']

const N = (v) => Number(v || 0).toLocaleString('es-PE')

// ─── Tarjeta de métrica ───────────────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="card p-5">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-[#1B2A4A]/6 text-[#1B2A4A]">
        <Icon size={18} />
      </div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-xl font-extrabold text-[#1B2A4A] leading-tight">{value}</p>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Admin() {
  const navigate = useNavigate()
  const { isAuthenticated, hasRole } = useAuthStore()

  const [tab,       setTab]       = useState('usuarios')
  const [stats,     setStats]     = useState(null)
  const [usuarios,  setUsuarios]  = useState([])
  const [inmuebles, setInmuebles] = useState([])
  const [contratos, setContratos] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [busyId,    setBusyId]    = useState(null)

  // Guard: solo Admin autenticado puede ver este panel
  useEffect(() => {
    if (!isAuthenticated())   { navigate('/login?redirect=/admin'); return }
    if (!hasRole('Admin'))    { navigate('/dashboard'); return }
  }, [isAuthenticated, hasRole, navigate])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [st, us, inm, con] = await Promise.all([
        adminService.stats(),
        adminService.listarUsuarios(),
        adminService.listarInmuebles(),
        adminService.listarContratos(),
      ])
      setStats(st)
      setUsuarios(us)
      setInmuebles(inm)
      setContratos(con)
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar el panel de administración')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated() && hasRole('Admin')) load()
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAuthenticated() || !hasRole('Admin')) return null

  const toggleUsuario = async (usuario) => {
    setBusyId(usuario.id)
    try {
      const actualizado = await adminService.actualizarEstadoUsuario(usuario.id, !usuario.activo)
      setUsuarios(list => list.map(u => u.id === actualizado.id ? actualizado : u))
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo actualizar el usuario')
    } finally {
      setBusyId(null)
    }
  }

  const cambiarEstadoInmueble = async (inmueble, estado) => {
    if (estado === inmueble.estado) return
    setBusyId(inmueble.id)
    try {
      const actualizado = await adminService.actualizarEstadoInmueble(inmueble.id, estado)
      setInmuebles(list => list.map(p => p.id === actualizado.id ? { ...p, ...actualizado } : p))
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo actualizar el inmueble')
    } finally {
      setBusyId(null)
    }
  }

  const TABS = [
    { key: 'usuarios',  label: 'Usuarios',  icon: Users,     count: usuarios.length  },
    { key: 'inmuebles', label: 'Inmuebles', icon: Building2, count: inmuebles.length },
    { key: 'contratos', label: 'Contratos', icon: FileText,  count: contratos.length },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* ── Header ── */}
      <div className="bg-[#1B2A4A] pt-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(circle,#C9A84C 1px,transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck size={16} className="text-[#C9A84C]" />
            <span className="text-[10px] font-bold text-[#C9A84C] uppercase tracking-widest">Panel de Super Admin</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Administración de RentaValid</h1>
          <p className="text-white/50 text-sm mt-1">Gestiona usuarios, inmuebles y contratos de la plataforma</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={32} className="animate-spin text-[#1B2A4A]" />
          </div>
        ) : (
          <>
            {error && (
              <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* ── Estadísticas ── */}
            <section>
              <h2 className="text-sm font-bold text-[#1B2A4A] mb-3">Resumen general</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricCard icon={Users}     label="Usuarios"  value={N(stats?.usuarios)} />
                <MetricCard icon={Building2} label="Inmuebles" value={N(stats?.inmuebles)} />
                <MetricCard icon={FileText}  label="Contratos" value={N(stats?.contratos)} />
                <MetricCard icon={Wallet}    label="Pagos"     value={N(stats?.pagos)} />
              </div>
            </section>

            {/* ── Tabs ── */}
            <section>
              <div className="flex items-center gap-2 mb-4 border-b border-gray-200">
                {TABS.map(({ key, label, icon: Icon, count }) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
                      tab === key
                        ? 'border-[#1B2A4A] text-[#1B2A4A]'
                        : 'border-transparent text-gray-400 hover:text-[#1B2A4A]'
                    }`}
                  >
                    <Icon size={15} /> {label}
                    <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{count}</span>
                  </button>
                ))}
              </div>

              {/* ── Tabla: Usuarios ── */}
              {tab === 'usuarios' && (
                <div className="card overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Usuario', 'DNI', 'Roles', 'Identidad', 'Estado', 'Acción'].map(h => (
                          <th key={h} className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {usuarios.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="text-sm font-semibold text-gray-700">{u.nombre} {u.apellidoPaterno}</p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-gray-500">{u.dni}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex flex-wrap gap-1">
                              {u.roles.map(r => (
                                <span key={r} className="badge bg-[#1B2A4A]/6 text-[#1B2A4A] text-[10px]">{r}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            {u.identidadValidada
                              ? <span className="badge bg-green-50 text-green-700 text-[10px]"><CheckCircle2 size={9} /> Verificada</span>
                              : <span className="badge bg-amber-50 text-amber-700 text-[10px]"><AlertCircle size={9} /> Pendiente</span>}
                          </td>
                          <td className="px-5 py-3.5">
                            {u.activo
                              ? <span className="badge bg-green-50 text-green-700 text-[10px]"><CheckCircle2 size={9} /> Activo</span>
                              : <span className="badge bg-red-50 text-red-600 text-[10px]"><XCircle size={9} /> Desactivado</span>}
                          </td>
                          <td className="px-5 py-3.5">
                            <button
                              onClick={() => toggleUsuario(u)}
                              disabled={busyId === u.id}
                              className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-40 ${
                                u.activo ? 'text-red-500 border border-red-200 hover:bg-red-50' : 'text-green-600 border border-green-200 hover:bg-green-50'
                              }`}
                            >
                              <Power size={11} /> {u.activo ? 'Desactivar' : 'Activar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {usuarios.length === 0 && (
                        <tr><td colSpan={6} className="py-10 text-center text-gray-400 text-sm">Sin usuarios registrados</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Tabla: Inmuebles ── */}
              {tab === 'inmuebles' && (
                <div className="card overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Inmueble', 'Arrendador', 'Precio', 'Estado', 'Acción'].map(h => (
                          <th key={h} className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {inmuebles.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="text-sm font-semibold text-gray-700">{p.titulo}</p>
                            <p className="text-xs text-gray-400">{p.distrito}</p>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-gray-500">
                            {p.arrendador?.nombre} {p.arrendador?.apellidoPaterno}
                          </td>
                          <td className="px-5 py-3.5 text-sm font-extrabold text-[#1B2A4A]">S/ {N(p.precio)}</td>
                          <td className="px-5 py-3.5">
                            <span className={`badge text-[10px] ${
                              p.estado === 'Disponible' ? 'bg-green-50 text-green-700'
                              : p.estado === 'Arrendado' ? 'bg-blue-50 text-blue-600'
                              : 'bg-gray-100 text-gray-500'
                            }`}>{p.estado}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <select
                              value={p.estado}
                              disabled={busyId === p.id}
                              onChange={e => cambiarEstadoInmueble(p, e.target.value)}
                              className="text-[11px] font-semibold border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/20 disabled:opacity-40"
                            >
                              {ESTADOS_INMUEBLE.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                      {inmuebles.length === 0 && (
                        <tr><td colSpan={5} className="py-10 text-center text-gray-400 text-sm">Sin inmuebles publicados</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Tabla: Contratos ── */}
              {tab === 'contratos' && (
                <div className="card overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['ID', 'Inmueble', 'Arrendatario', 'Monto', 'Estado'].map(h => (
                          <th key={h} className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {contratos.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3.5 text-xs text-gray-500">#{c.id}</td>
                          <td className="px-5 py-3.5">
                            <p className="text-sm font-semibold text-gray-700">{c.application?.property?.titulo ?? '—'}</p>
                            <p className="text-xs text-gray-400">{c.application?.property?.distrito}</p>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-gray-500">
                            {c.application?.arrendatario?.nombre} {c.application?.arrendatario?.apellidoPaterno}
                          </td>
                          <td className="px-5 py-3.5 text-sm font-extrabold text-[#1B2A4A]">S/ {N(c.monto)}</td>
                          <td className="px-5 py-3.5">
                            <span className={`badge text-[10px] ${
                              c.estado === 'Firmado'   ? 'bg-green-50 text-green-700'
                              : c.estado === 'Activo'  ? 'bg-blue-50 text-blue-600'
                              : c.estado === 'Cancelado' ? 'bg-red-50 text-red-600'
                              : 'bg-amber-50 text-amber-700'
                            }`}>{c.estado}</span>
                          </td>
                        </tr>
                      ))}
                      {contratos.length === 0 && (
                        <tr><td colSpan={5} className="py-10 text-center text-gray-400 text-sm">Sin contratos generados</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}
