import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Search, MapPin, BedDouble, Bath, Maximize2, Car, Sofa,
  SlidersHorizontal, X, ArrowRight, ChevronDown, ChevronUp,
  LayoutGrid, List, Home, Loader2, AlertCircle, Plus,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { propertiesService } from '../services/properties'
import { useAuthStore } from '../store/authStore'

// ─── Constantes ───────────────────────────────────────────────────────────────

const DISTRITOS = [
  'Miraflores', 'Barranco', 'San Isidro', 'Santiago de Surco',
  'La Molina', 'San Borja', 'Jesús María', 'Lince', 'Pueblo Libre',
]

const PRICE_RANGES = [
  { label: 'Cualquier precio',  min: 0,    max: Infinity },
  { label: 'Hasta S/ 1,000',   min: 0,    max: 1000     },
  { label: 'S/ 1,000 – 1,500', min: 1000, max: 1500     },
  { label: 'S/ 1,500 – 2,500', min: 1500, max: 2500     },
  { label: 'S/ 2,500 – 4,000', min: 2500, max: 4000     },
  { label: 'Más de S/ 4,000',  min: 4000, max: Infinity },
]

const TIPOS = ['Departamento', 'Casa', 'Studio', 'Oficina']

const INIT_FILTERS = {
  distritos: [], priceRange: 0,
  precioMin: '', precioMax: '',
  habitaciones: '', banos: '',
  tipos: [], cochera: false, amoblado: false,
  areaMin: '', areaMax: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function priceLabel(p) {
  return `S/ ${Number(p).toLocaleString('es-PE')}`
}

function useDebounce(value, ms = 400) {
  const [deb, setDeb] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return deb
}

// ─── PropertyCard ─────────────────────────────────────────────────────────────
// La API ahora devuelve campos en inglés: title, district, bedrooms, bathrooms,
// price, hasGarage, isFurnished, type, address, images[] (array de URLs)

function PropertyCard({ property, view }) {
  const foto = property.images?.[0] || 'https://placehold.co/600x400/1B2A4A/C9A84C?text=Sin+foto'

  if (view === 'list') {
    return (
      <Link to={`/inmuebles/${property.id}`} className="card flex group overflow-hidden">
        <div className="relative w-48 sm:w-56 flex-shrink-0 overflow-hidden">
          <img src={foto} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1B2A4A] text-white">
            {property.type}
          </span>
        </div>
        <div className="flex-1 p-4 flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-[#C9A84C] font-semibold mb-1">
            <MapPin size={11} /> {property.district}
          </div>
          <h3 className="font-bold text-[#1B2A4A] text-sm leading-snug line-clamp-2 mb-1 group-hover:text-[#C9A84C] transition-colors">
            {property.title}
          </h3>
          <p className="text-xs text-gray-400 mb-2 truncate">{property.address}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-2">
            <span className="flex items-center gap-1"><BedDouble size={12} className="text-[#1B2A4A]/50" /> <strong>{property.bedrooms}</strong> hab.</span>
            <span className="flex items-center gap-1"><Bath size={12} className="text-[#1B2A4A]/50" /> <strong>{property.bathrooms}</strong> baños</span>
            <span className="flex items-center gap-1"><Maximize2 size={12} className="text-[#1B2A4A]/50" /> <strong>{property.area}</strong> m²</span>
            {property.hasGarage  && <span className="flex items-center gap-1"><Car  size={12} className="text-[#1B2A4A]/50" /> Cochera</span>}
            {property.isFurnished && <span className="flex items-center gap-1"><Sofa size={12} className="text-[#1B2A4A]/50" /> Amoblado</span>}
          </div>
          <div className="mt-auto flex items-center justify-between pt-2 border-t border-gray-100">
            <div>
              <span className="text-xl font-extrabold text-[#1B2A4A]">{priceLabel(property.price)}</span>
              <span className="text-xs text-gray-400">/mes</span>
            </div>
            <span className="inline-flex items-center gap-1.5 bg-[#1B2A4A] text-white text-xs font-semibold px-4 py-2 rounded-xl group-hover:bg-[#C9A84C] group-hover:text-[#1B2A4A] transition-all">
              Ver detalle <ArrowRight size={12} />
            </span>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link to={`/inmuebles/${property.id}`} className="card flex flex-col group overflow-hidden">
      <div className="relative h-48 overflow-hidden flex-shrink-0">
        <img src={foto} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
        <span className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#1B2A4A]/90 text-white">
          {property.type}
        </span>
        <div className="absolute bottom-3 left-3">
          <span className="inline-flex items-center gap-1 text-white text-[10px] font-semibold bg-black/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
            <MapPin size={9} /> {property.district}
          </span>
        </div>
        {(property.hasGarage || property.isFurnished) && (
          <div className="absolute bottom-3 right-3 flex gap-1">
            {property.hasGarage   && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C9A84C]/90 text-[#1B2A4A]"><Car  size={9} className="inline" /></span>}
            {property.isFurnished && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C9A84C]/90 text-[#1B2A4A]"><Sofa size={9} className="inline" /></span>}
          </div>
        )}
      </div>
      <div className="flex-1 p-4 flex flex-col">
        <h3 className="font-bold text-[#1B2A4A] text-sm leading-snug line-clamp-2 mb-2 group-hover:text-[#C9A84C] transition-colors">
          {property.title}
        </h3>
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          <span className="flex items-center gap-1"><BedDouble size={12} className="text-[#1B2A4A]/40" /> <strong className="text-gray-700">{property.bedrooms}</strong></span>
          <span className="text-gray-200">|</span>
          <span className="flex items-center gap-1"><Bath size={12} className="text-[#1B2A4A]/40" /> <strong className="text-gray-700">{property.bathrooms}</strong></span>
          <span className="text-gray-200">|</span>
          <span className="flex items-center gap-1"><Maximize2 size={12} className="text-[#1B2A4A]/40" /> <strong className="text-gray-700">{property.area}</strong> m²</span>
        </div>
        <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-lg font-extrabold text-[#1B2A4A]">{priceLabel(property.price)}</p>
            <p className="text-[10px] text-gray-400">por mes</p>
          </div>
          <span className="inline-flex items-center gap-1.5 bg-[#1B2A4A] text-white text-xs font-semibold px-3.5 py-2 rounded-xl group-hover:bg-[#C9A84C] group-hover:text-[#1B2A4A] transition-all duration-200">
            Ver <ArrowRight size={11} />
          </span>
        </div>
      </div>
    </Link>
  )
}

// ─── FilterSection ────────────────────────────────────────────────────────────

function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-gray-100 pb-4 mb-4 last:border-0 last:mb-0 last:pb-0">
      <button onClick={() => setOpen(v => !v)} className="flex items-center justify-between w-full mb-3 group">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider group-hover:text-[#1B2A4A] transition-colors">
          {title}
        </span>
        {open ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
      </button>
      {open && children}
    </div>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({ filters, setFilters, total, onClose }) {
  const activeCount = [
    filters.distritos.length > 0,
    filters.priceRange > 0 || filters.precioMin || filters.precioMax,
    filters.habitaciones !== '',
    filters.banos !== '',
    filters.tipos.length > 0,
    filters.cochera, filters.amoblado,
    filters.areaMin || filters.areaMax,
  ].filter(Boolean).length

  const clear = () => setFilters(INIT_FILTERS)

  const toggle = (key, val) =>
    setFilters(f => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val],
    }))

  return (
    <div className="bg-white rounded-2xl shadow-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={15} className="text-[#1B2A4A]" />
          <span className="font-bold text-[#1B2A4A] text-sm">Filtros</span>
          {activeCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-[#1B2A4A] text-white text-[10px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button onClick={clear} className="text-xs text-red-500 hover:text-red-700 font-semibold">Limpiar</button>
          )}
          {onClose && (
            <button onClick={onClose} className="lg:hidden p-1 rounded-lg hover:bg-gray-100">
              <X size={16} className="text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Distritos */}
      <FilterSection title="Distrito">
        <div className="space-y-1">
          {DISTRITOS.map(d => {
            const on = filters.distritos.includes(d)
            return (
              <label key={d} className={`flex items-center gap-2.5 py-1.5 px-2.5 rounded-xl cursor-pointer transition-all ${on ? 'bg-[#1B2A4A]/8 text-[#1B2A4A]' : 'hover:bg-gray-50'}`}>
                <div
                  onClick={() => toggle('distritos', d)}
                  className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all cursor-pointer ${on ? 'bg-[#1B2A4A] border-[#1B2A4A]' : 'border-gray-300'}`}
                >
                  {on && <span className="text-white text-[9px] font-black">✓</span>}
                </div>
                <span className={`text-sm ${on ? 'font-semibold text-[#1B2A4A]' : 'text-gray-600'}`}>{d}</span>
              </label>
            )
          })}
        </div>
      </FilterSection>

      {/* Precio */}
      <FilterSection title="Precio mensual (S/)">
        <div className="space-y-1 mb-3">
          {PRICE_RANGES.map((r, i) => (
            <button
              key={i}
              onClick={() => setFilters(f => ({ ...f, priceRange: i, precioMin: '', precioMax: '' }))}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all ${
                filters.priceRange === i && !filters.precioMin && !filters.precioMax
                  ? 'bg-[#1B2A4A] text-white font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">O personalizar</p>
        <div className="flex gap-2">
          <input type="number" placeholder="Mín" value={filters.precioMin}
            onChange={e => setFilters(f => ({ ...f, precioMin: e.target.value, priceRange: -1 }))}
            className="input-field text-xs py-2 text-center" />
          <span className="flex items-center text-gray-300 font-bold">—</span>
          <input type="number" placeholder="Máx" value={filters.precioMax}
            onChange={e => setFilters(f => ({ ...f, precioMax: e.target.value, priceRange: -1 }))}
            className="input-field text-xs py-2 text-center" />
        </div>
      </FilterSection>

      {/* Habitaciones */}
      <FilterSection title="Habitaciones mín.">
        <div className="flex gap-2">
          {['', '1', '2', '3', '4'].map(v => (
            <button key={v}
              onClick={() => setFilters(f => ({ ...f, habitaciones: v }))}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                filters.habitaciones === v ? 'bg-[#1B2A4A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {v === '' ? 'Todos' : v === '4' ? '4+' : v}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Baños */}
      <FilterSection title="Baños mín." defaultOpen={false}>
        <div className="flex gap-2">
          {['', '1', '2', '3'].map(v => (
            <button key={v}
              onClick={() => setFilters(f => ({ ...f, banos: v }))}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                filters.banos === v ? 'bg-[#1B2A4A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {v === '' ? 'Todos' : v}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Área */}
      <FilterSection title="Área (m²)" defaultOpen={false}>
        <div className="flex gap-2">
          <input type="number" placeholder="Mín" value={filters.areaMin}
            onChange={e => setFilters(f => ({ ...f, areaMin: e.target.value }))}
            className="input-field text-xs py-2 text-center" />
          <span className="flex items-center text-gray-300 font-bold">—</span>
          <input type="number" placeholder="Máx" value={filters.areaMax}
            onChange={e => setFilters(f => ({ ...f, areaMax: e.target.value }))}
            className="input-field text-xs py-2 text-center" />
        </div>
      </FilterSection>

      {/* Tipo */}
      <FilterSection title="Tipo de inmueble" defaultOpen={false}>
        <div className="flex flex-wrap gap-2">
          {TIPOS.map(t => (
            <button key={t} onClick={() => toggle('tipos', t)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filters.tipos.includes(t) ? 'bg-[#1B2A4A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Características */}
      <FilterSection title="Características" defaultOpen={false}>
        {[
          { key: 'amoblado', label: 'Amoblado', icon: Sofa },
          { key: 'cochera',  label: 'Cochera',  icon: Car  },
        ].map(({ key, label, icon: Icon }) => (
          <label key={key} className={`flex items-center gap-3 px-2.5 py-2 rounded-xl cursor-pointer transition-all mb-1.5 ${filters[key] ? 'bg-[#1B2A4A]/8' : 'hover:bg-gray-50'}`}>
            <div
              onClick={() => setFilters(f => ({ ...f, [key]: !f[key] }))}
              className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all cursor-pointer ${filters[key] ? 'bg-[#1B2A4A] border-[#1B2A4A]' : 'border-gray-300'}`}
            >
              {filters[key] && <span className="text-white text-[9px] font-black">✓</span>}
            </div>
            <Icon size={13} className={filters[key] ? 'text-[#1B2A4A]' : 'text-gray-400'} />
            <span className={`text-sm ${filters[key] ? 'font-semibold text-[#1B2A4A]' : 'text-gray-600'}`}>{label}</span>
          </label>
        ))}
      </FilterSection>

      {onClose && (
        <button onClick={onClose} className="lg:hidden w-full mt-4 btn-primary flex items-center justify-center gap-2">
          Ver {total} resultado{total !== 1 ? 's' : ''} <ArrowRight size={14} />
        </button>
      )}
    </div>
  )
}

// ─── ActiveChips ─────────────────────────────────────────────────────────────

function ActiveChips({ filters, setFilters }) {
  const chips = []
  const upd = (patch) => setFilters(f => ({ ...f, ...patch }))

  filters.distritos.forEach(d => chips.push({ label: d, remove: () => upd({ distritos: filters.distritos.filter(x => x !== d) }) }))
  filters.tipos.forEach(t => chips.push({ label: t, remove: () => upd({ tipos: filters.tipos.filter(x => x !== t) }) }))
  if (filters.priceRange > 0 && !filters.precioMin && !filters.precioMax)
    chips.push({ label: PRICE_RANGES[filters.priceRange].label, remove: () => upd({ priceRange: 0 }) })
  if (filters.precioMin || filters.precioMax)
    chips.push({ label: `S/ ${filters.precioMin || '0'} – ${filters.precioMax || '∞'}`, remove: () => upd({ precioMin: '', precioMax: '', priceRange: 0 }) })
  if (filters.habitaciones) chips.push({ label: `${filters.habitaciones}+ hab.`, remove: () => upd({ habitaciones: '' }) })
  if (filters.banos)        chips.push({ label: `${filters.banos}+ baños`, remove: () => upd({ banos: '' }) })
  if (filters.areaMin || filters.areaMax)
    chips.push({ label: `${filters.areaMin || '0'} – ${filters.areaMax || '∞'} m²`, remove: () => upd({ areaMin: '', areaMax: '' }) })
  if (filters.amoblado) chips.push({ label: 'Amoblado', remove: () => upd({ amoblado: false }) })
  if (filters.cochera)  chips.push({ label: 'Cochera',  remove: () => upd({ cochera: false }) })

  if (!chips.length) return null

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {chips.map(({ label, remove }) => (
        <span key={label} className="inline-flex items-center gap-1.5 bg-[#1B2A4A]/10 text-[#1B2A4A] text-xs font-semibold px-3 py-1.5 rounded-full">
          {label}
          <button onClick={remove} className="hover:text-red-500 transition-colors"><X size={11} /></button>
        </span>
      ))}
    </div>
  )
}

// ─── Search page ──────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const { hasRole } = useAuthStore()

  const [view, setView]               = useState('grid')
  const [showSidebar, setShowSidebar] = useState(false)
  const [query, setQuery]             = useState('')
  const [orden, setOrden]             = useState('recent')
  const [filters, setFilters]         = useState(() => ({
    ...INIT_FILTERS,
    distritos: searchParams.get('distrito') ? [searchParams.get('distrito')] : [],
  }))

  const [properties, setProperties] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  const debQuery = useDebounce(query)

  // Construye query params en inglés (spec) para la API
  const buildParams = useCallback(() => {
    const params = { sort: orden }
    const range  = PRICE_RANGES[filters.priceRange]

    // district (API acepta uno; multi-distrito se filtra localmente)
    if (filters.distritos.length === 1) params.district   = filters.distritos[0]
    if (filters.tipos.length === 1)     params.type       = filters.tipos[0]
    if (filters.habitaciones)           params.bedrooms   = filters.habitaciones
    if (filters.banos)                  params.bathrooms  = filters.banos
    if (filters.cochera)                params.hasGarage  = 'true'
    if (filters.amoblado)               params.isFurnished = 'true'
    if (filters.areaMin)                params.minArea    = filters.areaMin
    if (filters.areaMax)                params.maxArea    = filters.areaMax
    if (filters.precioMin || (range && range.min > 0))
      params.minPrice = filters.precioMin || range?.min
    if (filters.precioMax || (range && range.max !== Infinity))
      params.maxPrice = filters.precioMax || range?.max

    return params
  }, [filters, orden])

  // Fetch desde la API
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    propertiesService.listar(buildParams())
      .then(data => {
        if (cancelled) return
        // Filtro local por texto
        const q = debQuery.toLowerCase().trim()
        const filtered = q
          ? data.filter(p =>
              p.title?.toLowerCase().includes(q) ||
              p.district?.toLowerCase().includes(q) ||
              p.address?.toLowerCase().includes(q)
            )
          : data
        // Filtro multi-distrito local
        const multiDist = filters.distritos.length > 1
          ? filtered.filter(p => filters.distritos.includes(p.district))
          : filtered
        // Filtro multi-tipo local
        const multiTipo = filters.tipos.length > 1
          ? multiDist.filter(p => filters.tipos.includes(p.type))
          : multiDist
        setProperties(multiTipo)
      })
      .catch(() => { if (!cancelled) setError('No se pudo conectar con el servidor') })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [buildParams, debQuery, filters.distritos, filters.tipos])

  const clearAll = () => { setFilters(INIT_FILTERS); setQuery('') }

  const activeFilterCount = [
    filters.distritos.length > 0,
    filters.priceRange > 0 || filters.precioMin || filters.precioMax,
    filters.habitaciones !== '', filters.banos !== '',
    filters.tipos.length > 0, filters.cochera, filters.amoblado,
    filters.areaMin || filters.areaMax,
  ].filter(Boolean).length

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* ── Hero barra de búsqueda ── */}
      <div className="bg-[#1B2A4A] pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                className="w-full pl-10 pr-9 py-2.5 rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50"
                placeholder="Buscar por nombre, distrito o dirección…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowSidebar(v => !v)}
              className={`lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeFilterCount > 0 ? 'bg-[#C9A84C] text-[#1B2A4A]' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              <SlidersHorizontal size={15} />
              {activeFilterCount > 0 && <span className="w-4 h-4 rounded-full bg-[#1B2A4A] text-white text-[9px] font-bold flex items-center justify-center">{activeFilterCount}</span>}
            </button>
          </div>

          {/* Pills de distritos rápidos */}
          <div className="flex gap-2 overflow-x-auto pb-3 pt-2 scrollbar-hide">
            {DISTRITOS.map(d => {
              const active = filters.distritos.includes(d)
              return (
                <button
                  key={d}
                  onClick={() => setFilters(f => ({
                    ...f,
                    distritos: active ? f.distritos.filter(x => x !== d) : [...f.distritos, d],
                  }))}
                  className={`flex-shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all ${active ? 'bg-[#C9A84C] text-[#1B2A4A]' : 'bg-white/10 text-white/80 hover:bg-white/20'}`}
                >
                  {d}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Mobile sidebar overlay ── */}
      {showSidebar && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSidebar(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-gray-50 overflow-y-auto p-4 shadow-2xl">
            <Sidebar filters={filters} setFilters={setFilters} total={properties.length} onClose={() => setShowSidebar(false)} />
          </div>
        </div>
      )}

      {/* ── Layout principal ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6 items-start">

          {/* Sidebar desktop */}
          <aside className="hidden lg:block w-64 xl:w-72 flex-shrink-0 sticky top-20 self-start max-h-[calc(100vh-5.5rem)] overflow-y-auto">
            <Sidebar filters={filters} setFilters={setFilters} total={properties.length} />
          </aside>

          {/* Resultados */}
          <div className="flex-1 min-w-0">

            {/* Barra superior resultados */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                {loading ? (
                  <p className="text-gray-400 text-sm flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Buscando…</p>
                ) : (
                  <p className="text-gray-600 text-sm">
                    <span className="font-extrabold text-[#1B2A4A] text-base">{properties.length}</span>{' '}
                    inmueble{properties.length !== 1 ? 's' : ''} encontrado{properties.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Publicar (solo arrendador) */}
                {hasRole('Arrendador') && (
                  <Link to="/publicar" className="flex items-center gap-1.5 bg-[#C9A84C] text-[#1B2A4A] text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-[#b8943f] transition-all">
                    <Plus size={13} /> Publicar
                  </Link>
                )}
                {/* Ordenar */}
                <div className="relative">
                  <select value={orden} onChange={e => setOrden(e.target.value)}
                    className="appearance-none pl-3 pr-8 py-2 text-xs border border-gray-200 rounded-xl text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/20 font-medium cursor-pointer">
                    <option value="recent">Más recientes</option>
                    <option value="price_asc">Menor precio</option>
                    <option value="price_desc">Mayor precio</option>
                    <option value="area_desc">Mayor área</option>
                    <option value="area_asc">Menor área</option>
                  </select>
                  <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {/* Vista */}
                <div className="flex bg-white border border-gray-200 rounded-xl p-0.5">
                  {[{ v: 'grid', I: LayoutGrid }, { v: 'list', I: List }].map(({ v, I }) => (
                    <button key={v} onClick={() => setView(v)}
                      className={`p-1.5 rounded-lg transition-all ${view === v ? 'bg-[#1B2A4A] text-white' : 'text-gray-400 hover:text-[#1B2A4A]'}`}>
                      <I size={14} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <ActiveChips filters={filters} setFilters={setFilters} />

            {/* Estados */}
            {error && (
              <div className="card p-10 text-center">
                <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
                <p className="font-semibold text-gray-700 mb-1">Error de conexión</p>
                <p className="text-gray-400 text-sm">{error}</p>
              </div>
            )}

            {!error && loading && (
              <div className={view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5' : 'flex flex-col gap-4'}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="card overflow-hidden animate-pulse">
                    <div className="h-48 bg-gray-200" />
                    <div className="p-4 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                      <div className="h-8 bg-gray-100 rounded mt-4" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!error && !loading && properties.length === 0 && (
              <div className="card p-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Home size={24} className="text-gray-300" />
                </div>
                <h3 className="font-bold text-[#1B2A4A] text-base mb-1">Sin resultados</h3>
                <p className="text-gray-400 text-sm mb-5">No encontramos inmuebles con esos filtros.</p>
                <button onClick={clearAll} className="btn-primary text-sm inline-flex items-center gap-2">
                  <X size={13} /> Limpiar filtros
                </button>
              </div>
            )}

            {!error && !loading && properties.length > 0 && (
              view === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {properties.map(p => <PropertyCard key={p.id} property={p} view="grid" />)}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {properties.map(p => <PropertyCard key={p.id} property={p} view="list" />)}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
