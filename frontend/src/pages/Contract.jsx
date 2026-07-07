import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Shield, Check, ChevronRight, Download, AlertCircle,
  MapPin, Calendar, DollarSign, X, Clock, ArrowRight,
  FileText, CheckCircle2, Loader2, Edit3, Save, RotateCcw,
  BadgeCheck, Printer, ChevronDown, ChevronUp,
  PenLine, Info, Sparkles,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { contractsService } from '../services/contracts'
import { useAuthStore } from '../store/authStore'

const N = (v) => Number(v).toLocaleString('es-PE')
const fmtDate = (d) => new Date(d).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })

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

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Contract() {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const { user }    = useAuthStore()

  const [contract,  setContract]  = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [fetchErr,  setFetchErr]  = useState('')
  const [mode,      setMode]      = useState('view')      // view | edit

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
