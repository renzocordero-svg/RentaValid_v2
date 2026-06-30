import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  MapPin, BedDouble, Bath, Maximize2, Car, Sofa, Shield,
  ChevronLeft, ChevronRight, Check, Phone, MessageSquare,
  Share2, Heart, Building2, Calendar, Loader2, AlertCircle,
  X, ZoomIn,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { propertiesService } from '../services/properties'
import { useAuthStore } from '../store/authStore'

// ─── Galería de fotos ─────────────────────────────────────────────────────────

function Gallery({ fotos }) {
  const [idx, setIdx]     = useState(0)
  const [lightbox, setLightbox] = useState(false)

  const imgs = fotos?.length
    ? fotos.map(f => f.url)
    : ['https://placehold.co/900x600/1B2A4A/C9A84C?text=Sin+fotos']

  const prev = () => setIdx(i => (i - 1 + imgs.length) % imgs.length)
  const next = () => setIdx(i => (i + 1) % imgs.length)

  return (
    <>
      {/* Imagen principal */}
      <div className="relative rounded-2xl overflow-hidden h-72 sm:h-96 bg-gray-100 mb-3">
        <img
          src={imgs[idx]}
          alt={`Foto ${idx + 1}`}
          className="w-full h-full object-cover transition-all duration-400"
        />

        {imgs.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-all">
              <ChevronLeft size={18} className="text-[#1B2A4A]" />
            </button>
            <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-all">
              <ChevronRight size={18} className="text-[#1B2A4A]" />
            </button>
            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {imgs.map((_, i) => (
                <button key={i} onClick={() => setIdx(i)}
                  className={`rounded-full transition-all ${i === idx ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/50 hover:bg-white/80'}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Zoom icon */}
        <button
          onClick={() => setLightbox(true)}
          className="absolute top-3 right-3 w-8 h-8 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-sm"
        >
          <ZoomIn size={14} />
        </button>

        {/* Contador */}
        <span className="absolute bottom-3 right-3 text-[11px] text-white font-semibold bg-black/30 px-2.5 py-1 rounded-full backdrop-blur-sm">
          {idx + 1} / {imgs.length}
        </span>
      </div>

      {/* Miniaturas */}
      {imgs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {imgs.map((src, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`flex-shrink-0 w-16 h-12 rounded-xl overflow-hidden border-2 transition-all ${i === idx ? 'border-[#C9A84C] scale-105' : 'border-transparent opacity-60 hover:opacity-90'}`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightbox(false)}>
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
            <X size={20} />
          </button>
          <button onClick={e => { e.stopPropagation(); prev() }} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
            <ChevronLeft size={22} />
          </button>
          <img src={imgs[idx]} alt="" className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl" onClick={e => e.stopPropagation()} />
          <button onClick={e => { e.stopPropagation(); next() }} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
            <ChevronRight size={22} />
          </button>
        </div>
      )}
    </>
  )
}

// ─── StatBox ─────────────────────────────────────────────────────────────────

function StatBox({ icon: Icon, label, value }) {
  return (
    <div className="card p-3 text-center">
      <Icon size={17} className="text-[#1B2A4A] mx-auto mb-1" />
      <div className="font-bold text-[#1B2A4A] text-sm">{value}</div>
      <div className="text-gray-400 text-[11px]">{label}</div>
    </div>
  )
}

// ─── PropertyDetail ───────────────────────────────────────────────────────────

export default function PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated, hasRole } = useAuthStore()

  const [property, setProperty] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const [saved, setSaved]         = useState(false)
  const [applying, setApplying]   = useState(false)
  const [applied, setApplied]     = useState(false)
  const [applyError, setApplyError] = useState(null)

  useEffect(() => {
    setLoading(true)
    propertiesService.obtenerPorId(id)
      .then(data => {
        setProperty(data)
        // Verificar si el usuario ya postuló
        if (user && data.applications) {
          const yaPostulo = data.applications.some(a => a.arrendatarioId === user.id)
          setApplied(yaPostulo)
        }
      })
      .catch(() => setError('No se pudo cargar el inmueble'))
      .finally(() => setLoading(false))
  }, [id, user])

  const handlePostular = async () => {
    if (!isAuthenticated()) {
      navigate('/registro?redirect=' + encodeURIComponent(`/inmuebles/${id}`))
      return
    }
    setApplying(true)
    setApplyError(null)
    try {
      await propertiesService.postular(id)
      setApplied(true)
    } catch (err) {
      setApplyError(err.response?.data?.error || 'Error al postular. Intenta de nuevo.')
    } finally {
      setApplying(false)
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[70vh]">
          <div className="text-center">
            <Loader2 size={36} className="animate-spin text-[#1B2A4A] mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Cargando inmueble…</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // ── Error ──
  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[70vh]">
          <div className="text-center">
            <AlertCircle size={36} className="text-red-400 mx-auto mb-3" />
            <h2 className="font-bold text-[#1B2A4A] mb-1">{error || 'Inmueble no encontrado'}</h2>
            <Link to="/inmuebles" className="text-sm text-[#C9A84C] font-semibold hover:underline">
              ← Volver al buscador
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const esArrendador = property.arrendadorId === user?.id
  const puedePostular = !esArrendador && hasRole('Arrendatario')
  const garantiaTotal = property.precio * property.mesesGarantia
  const totalInicial  = garantiaTotal + property.precio

  const arrendadorNombre = property.arrendador
    ? `${property.arrendador.nombre} ${property.arrendador.apellidoPaterno}`
    : 'Propietario'

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-16">

        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-2">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Link to="/inmuebles" className="hover:text-[#1B2A4A] transition-colors flex items-center gap-1">
              <ChevronLeft size={14} /> Inmuebles
            </Link>
            <span>/</span>
            <span className="text-gray-500">{property.distrito}</span>
            <span>/</span>
            <span className="text-[#1B2A4A] font-medium truncate max-w-xs">{property.titulo}</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="lg:grid lg:grid-cols-3 lg:gap-8">

            {/* ── Columna izquierda ── */}
            <div className="lg:col-span-2">

              {/* Galería */}
              <Gallery fotos={property.fotos} />

              {/* Título y badges */}
              <div className="flex flex-wrap items-start justify-between gap-4 mt-5 mb-4">
                <div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="badge bg-[#1B2A4A]/10 text-[#1B2A4A]">{property.tipo}</span>
                    {property.amoblado && <span className="badge bg-[#C9A84C]/15 text-[#b8943f]">Amoblado</span>}
                    {property.cochera  && <span className="badge bg-gray-100 text-gray-600">Cochera</span>}
                    <span className={`badge ${property.estado === 'Disponible' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {property.estado}
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-[#1B2A4A]">{property.titulo}</h1>
                  <div className="flex items-center gap-1.5 mt-1.5 text-gray-500 text-sm">
                    <MapPin size={14} className="text-[#C9A84C]" />
                    {property.direccion}, {property.distrito}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSaved(!saved)}
                    className={`p-2 rounded-lg border transition-all ${saved ? 'border-red-300 bg-red-50 text-red-500' : 'border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-400'}`}
                  >
                    <Heart size={17} fill={saved ? 'currentColor' : 'none'} />
                  </button>
                  <button className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:border-[#1B2A4A] hover:text-[#1B2A4A] transition-all">
                    <Share2 size={17} />
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <StatBox icon={BedDouble}  label="Habitaciones" value={property.habitaciones} />
                <StatBox icon={Bath}       label="Baños"        value={property.banos} />
                <StatBox icon={Maximize2}  label="Área"         value={`${property.area} m²`} />
                <StatBox icon={Building2}  label="Tipo"         value={property.tipo} />
              </div>

              {/* Descripción */}
              <div className="card p-5 mb-4">
                <h2 className="font-bold text-[#1B2A4A] mb-3">Descripción</h2>
                <p className="text-gray-600 text-sm leading-relaxed">{property.descripcion}</p>
              </div>

              {/* Características adicionales */}
              {(property.cochera || property.amoblado) && (
                <div className="card p-5 mb-4">
                  <h2 className="font-bold text-[#1B2A4A] mb-3">Características</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {property.cochera  && <div className="flex items-center gap-2 text-sm text-gray-600"><Car  size={15} className="text-[#C9A84C]" /> Cochera incluida</div>}
                    {property.amoblado && <div className="flex items-center gap-2 text-sm text-gray-600"><Sofa size={15} className="text-[#C9A84C]" /> Totalmente amoblado</div>}
                  </div>
                </div>
              )}

              {/* Postulaciones (solo si es el arrendador) */}
              {esArrendador && property.applications?.length > 0 && (
                <div className="card p-5 mb-4">
                  <h2 className="font-bold text-[#1B2A4A] mb-3">
                    Postulaciones recibidas
                    <span className="ml-2 text-sm font-normal text-gray-400">({property.applications.length})</span>
                  </h2>
                  <div className="space-y-2">
                    {property.applications.map(app => (
                      <div key={app.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50">
                        <div>
                          <p className="text-sm font-semibold text-[#1B2A4A]">
                            {app.arrendatario?.nombre} {app.arrendatario?.apellidoPaterno}
                          </p>
                          <p className="text-xs text-gray-400">{app.arrendatario?.email}</p>
                        </div>
                        <span className={`badge text-[11px] ${
                          app.estado === 'Aceptada'  ? 'bg-green-50 text-green-700' :
                          app.estado === 'Rechazada' ? 'bg-red-50 text-red-600'    :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {app.estado}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Columna derecha (precio + CTA) ── */}
            <div className="mt-6 lg:mt-0">
              <div className="card p-6 sticky top-24">

                {/* Precio */}
                <div className="mb-5">
                  <div className="flex items-end gap-2 mb-1">
                    <span className="text-3xl font-extrabold text-[#1B2A4A]">
                      S/ {Number(property.precio).toLocaleString('es-PE')}
                    </span>
                    <span className="text-gray-400 text-sm mb-1">/mes</span>
                  </div>
                  <div className="h-0.5 w-10 bg-[#C9A84C] rounded-full" />
                </div>

                {/* Resumen financiero */}
                <div className="space-y-2.5 text-sm mb-5 bg-gray-50 rounded-xl p-4">
                  <div className="flex justify-between text-gray-600">
                    <span>Garantía ({property.mesesGarantia} meses)</span>
                    <span className="font-semibold text-[#1B2A4A]">S/ {garantiaTotal.toLocaleString('es-PE')}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Mes de adelanto</span>
                    <span className="font-semibold text-[#1B2A4A]">S/ {Number(property.precio).toLocaleString('es-PE')}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2.5 flex justify-between font-bold text-[#1B2A4A]">
                    <span>Total inicial</span>
                    <span>S/ {totalInicial.toLocaleString('es-PE')}</span>
                  </div>
                </div>

                {/* Arrendador */}
                <div className="flex items-center gap-3 py-4 border-t border-b border-gray-100 mb-5">
                  {property.arrendador?.fotoUrl ? (
                    <img src={property.arrendador.fotoUrl} alt="" className="w-11 h-11 rounded-full object-cover" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-[#1B2A4A]/10 flex items-center justify-center text-[#1B2A4A] font-bold text-sm">
                      {arrendadorNombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1B2A4A] text-sm">{arrendadorNombre}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                      <Shield size={10} className="text-green-500" />
                      <span>Identidad verificada</span>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                {esArrendador ? (
                  <div className="text-center py-2 text-sm text-gray-400 bg-gray-50 rounded-xl">
                    Este es tu inmueble publicado
                  </div>
                ) : applied ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <Check size={20} className="text-green-600 mx-auto mb-1.5" />
                    <p className="font-semibold text-green-700 text-sm">¡Postulación enviada!</p>
                    <p className="text-green-600 text-xs mt-0.5">El arrendador revisará tu perfil pronto</p>
                  </div>
                ) : (
                  <>
                    {applyError && (
                      <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-start gap-2">
                        <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                        {applyError}
                      </div>
                    )}
                    {puedePostular ? (
                      <button
                        onClick={handlePostular}
                        disabled={applying || property.estado !== 'Disponible'}
                        className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {applying
                          ? <><Loader2 size={15} className="animate-spin" /> Enviando…</>
                          : property.estado !== 'Disponible'
                            ? 'Inmueble no disponible'
                            : 'Postular a este inmueble'}
                      </button>
                    ) : !isAuthenticated() ? (
                      <Link
                        to={`/registro?redirect=${encodeURIComponent(`/inmuebles/${id}`)}`}
                        className="w-full btn-primary text-center block"
                      >
                        Inicia sesión para postular
                      </Link>
                    ) : (
                      <div className="text-center py-2 text-xs text-gray-400">
                        Solo arrendatarios pueden postular
                      </div>
                    )}
                  </>
                )}

                {/* Contacto */}
                <div className="flex gap-2 mt-3">
                  <button className="flex-1 flex items-center justify-center gap-1.5 text-xs text-[#1B2A4A] border border-[#1B2A4A]/20 py-2 rounded-lg hover:bg-[#1B2A4A]/5 transition-all font-medium">
                    <Phone size={12} /> Llamar
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1.5 text-xs text-[#1B2A4A] border border-[#1B2A4A]/20 py-2 rounded-lg hover:bg-[#1B2A4A]/5 transition-all font-medium">
                    <MessageSquare size={12} /> Mensaje
                  </button>
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                  <Calendar size={12} />
                  <span>Disponible desde {new Date(property.createdAt).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
