import { useState, useMemo, useCallback } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import {
  Search, MapPin, BedDouble, Bath, Maximize2, Shield,
  SlidersHorizontal, X, ArrowRight, Heart, Car, Sofa,
  ChevronDown, ChevronUp, Home, LayoutGrid, List, Star
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { properties, districts, PRICE_RANGES } from '../data/mockData'

// ─── Property card ────────────────────────────────────────────────────────────

const TAG_STYLES = {
  Destacado: 'bg-gold text-navy',
  Nuevo:     'bg-blue-500 text-white',
  Oferta:    'bg-green-500 text-white',
  Exclusivo: 'bg-purple-600 text-white',
  Premium:   'bg-navy text-gold border border-gold/30',
}

function PropertyCard({ property, view }) {
  const [saved, setSaved] = useState(false)
  const navigate = useNavigate()

  const handleSave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setSaved(v => !v)
  }, [])

  if (view === 'list') {
    return (
      <Link
        to={`/inmuebles/${property.id}`}
        className="card flex group overflow-hidden"
      >
        {/* Image */}
        <div className="relative w-52 flex-shrink-0 overflow-hidden">
          <img
            src={property.images[0]}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {property.tag && (
            <span className={`absolute top-2 left-2 badge text-[10px] ${TAG_STYLES[property.tag] ?? 'bg-gray-200 text-gray-700'}`}>
              {property.tag}
            </span>
          )}
          <button onClick={handleSave} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-all shadow">
            <Heart size={13} className={saved ? 'text-red-500 fill-red-500' : 'text-gray-400'} />
          </button>
        </div>
        {/* Info */}
        <div className="flex-1 p-5 flex flex-col min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 text-xs text-gold font-semibold">
              <MapPin size={11} />
              {property.district}
              <span className="text-gray-300">·</span>
              <span className="text-gray-400 font-normal">{property.type}</span>
            </div>
            {property.owner.verified && (
              <span className="badge bg-green-50 text-green-700 text-[10px] flex-shrink-0">
                <Shield size={9} /> Verificado
              </span>
            )}
          </div>
          <h3 className="font-bold text-navy text-base leading-snug group-hover:text-gold transition-colors line-clamp-2 mb-2">
            {property.title}
          </h3>
          <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
            <MapPin size={10} /> {property.address}
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
            <span className="flex items-center gap-1.5"><BedDouble size={13} className="text-navy/50" /> {property.rooms} hab.</span>
            <span className="flex items-center gap-1.5"><Bath size={13} className="text-navy/50" /> {property.baths} baños</span>
            <span className="flex items-center gap-1.5"><Maximize2 size={13} className="text-navy/50" /> {property.area} m²</span>
            {property.parking && <span className="flex items-center gap-1.5"><Car size={13} className="text-navy/50" /> Cochera</span>}
            {property.furnished && <span className="flex items-center gap-1.5"><Sofa size={13} className="text-navy/50" /> Amoblado</span>}
          </div>
          <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-100">
            <div>
              <span className="text-2xl font-extrabold text-navy">S/ {property.price.toLocaleString()}</span>
              <span className="text-xs text-gray-400">/mes</span>
            </div>
            <span className="inline-flex items-center gap-1.5 bg-navy text-white text-xs font-semibold px-4 py-2 rounded-xl group-hover:bg-gold group-hover:text-navy transition-all">
              Ver detalle <ArrowRight size={13} />
            </span>
          </div>
        </div>
      </Link>
    )
  }

  // Grid card
  return (
    <Link to={`/inmuebles/${property.id}`} className="card flex flex-col group overflow-hidden">
      {/* ── Photo ── */}
      <div className="relative h-52 overflow-hidden flex-shrink-0">
        <img
          src={property.images[0]}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Top-left: tag */}
        {property.tag && (
          <span className={`absolute top-3 left-3 badge text-[10px] ${TAG_STYLES[property.tag] ?? 'bg-gray-200 text-gray-700'}`}>
            {property.tag}
          </span>
        )}

        {/* Top-right: save heart */}
        <button
          onClick={handleSave}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white hover:scale-110 transition-all shadow"
        >
          <Heart size={14} className={saved ? 'text-red-500 fill-red-500' : 'text-gray-400'} />
        </button>

        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />

        {/* Bottom-left: district */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-white text-[10px] font-semibold bg-black/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
            <MapPin size={9} /> {property.district}
          </span>
          {property.owner.verified && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-gold/90 text-navy px-2.5 py-1 rounded-full">
              <Shield size={9} /> Verificado
            </span>
          )}
        </div>
      </div>

      {/* ── Info ── */}
      <div className="flex flex-col flex-1 p-4">
        {/* Type chip */}
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{property.type}</span>

        {/* Title */}
        <h3 className="font-bold text-navy text-sm leading-snug group-hover:text-gold transition-colors line-clamp-2 mb-3">
          {property.title}
        </h3>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-1">
          <span className="flex items-center gap-1">
            <BedDouble size={12} className="text-navy/40" />
            <strong className="text-gray-700">{property.rooms}</strong> hab.
          </span>
          <span className="text-gray-200">|</span>
          <span className="flex items-center gap-1">
            <Bath size={12} className="text-navy/40" />
            <strong className="text-gray-700">{property.baths}</strong> baños
          </span>
          <span className="text-gray-200">|</span>
          <span className="flex items-center gap-1">
            <Maximize2 size={12} className="text-navy/40" />
            <strong className="text-gray-700">{property.area}</strong> m²
          </span>
        </div>

        {/* Extra tags */}
        {(property.furnished || property.parking) && (
          <div className="flex gap-1.5 mt-2">
            {property.furnished && (
              <span className="badge bg-amber-50 text-amber-700 text-[10px]"><Sofa size={9} /> Amoblado</span>
            )}
            {property.parking && (
              <span className="badge bg-gray-100 text-gray-600 text-[10px]"><Car size={9} /> Cochera</span>
            )}
          </div>
        )}

        {/* Price + CTA */}
        <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
          <div className="leading-none">
            <p className="text-xl font-extrabold text-navy">S/ {property.price.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">por mes</p>
          </div>
          <span className="inline-flex items-center gap-1.5 bg-navy text-white text-xs font-semibold px-3.5 py-2 rounded-xl group-hover:bg-gold group-hover:text-navy transition-all duration-200">
            Ver detalle <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  )
}

// ─── Sidebar filter section wrapper ──────────────────────────────────────────

function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-gray-100 pb-4 mb-4 last:border-0 last:mb-0 last:pb-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full mb-3 group"
      >
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider group-hover:text-navy transition-colors">
          {title}
        </span>
        {open
          ? <ChevronUp size={14} className="text-gray-400" />
          : <ChevronDown size={14} className="text-gray-400" />}
      </button>
      {open && children}
    </div>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({ filters, setFilters, counts, resultCount, onClose }) {
  const ROOM_OPTIONS = [
    { label: 'Cualquiera', value: '' },
    { label: '1',  value: '1' },
    { label: '2',  value: '2' },
    { label: '3',  value: '3' },
    { label: '4+', value: '4' },
  ]
  const TYPE_OPTIONS = ['Departamento', 'Casa', 'Studio']

  const clearAll = () => setFilters({
    district: [],
    priceRange: 0,
    minPrice: '', maxPrice: '',
    rooms: '',
    types: [],
    furnished: false,
    parking: false,
  })

  const activeCount = [
    filters.district.length > 0,
    filters.priceRange > 0 || filters.minPrice || filters.maxPrice,
    filters.rooms !== '',
    filters.types.length > 0,
    filters.furnished,
    filters.parking,
  ].filter(Boolean).length

  const toggleDistrict = (d) =>
    setFilters(f => ({
      ...f,
      district: f.district.includes(d)
        ? f.district.filter(x => x !== d)
        : [...f.district, d],
    }))

  const toggleType = (t) =>
    setFilters(f => ({
      ...f,
      types: f.types.includes(t) ? f.types.filter(x => x !== t) : [...f.types, t],
    }))

  return (
    <div className="bg-white rounded-2xl shadow-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-navy" />
          <h3 className="font-bold text-navy">Filtros</h3>
          {activeCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {activeCount > 0 && (
            <button onClick={clearAll} className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors">
              Limpiar todo
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="lg:hidden p-1 rounded-lg hover:bg-gray-100">
              <X size={18} className="text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* ── Distrito ── */}
      <FilterSection title="Distrito">
        <div className="space-y-1.5">
          {districts.slice(1).map(d => {
            const count = counts[d] || 0
            const checked = filters.district.includes(d)
            return (
              <label
                key={d}
                className={`flex items-center justify-between py-1.5 px-2.5 rounded-xl cursor-pointer transition-all ${
                  checked ? 'bg-navy/8 text-navy' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    onClick={() => toggleDistrict(d)}
                    className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all cursor-pointer ${
                      checked ? 'bg-navy border-navy' : 'border-gray-300 bg-white'
                    }`}
                  >
                    {checked && <span className="text-white text-[9px] font-black">✓</span>}
                  </div>
                  <span className={`text-sm transition-colors ${checked ? 'font-semibold text-navy' : 'text-gray-600'}`}>
                    {d}
                  </span>
                </div>
                <span className={`text-xs font-medium tabular-nums ${checked ? 'text-navy/70' : 'text-gray-400'}`}>
                  {count}
                </span>
              </label>
            )
          })}
        </div>
      </FilterSection>

      {/* ── Precio ── */}
      <FilterSection title="Precio mensual (S/)">
        <div className="space-y-1.5 mb-3">
          {PRICE_RANGES.map((range, i) => (
            <button
              key={i}
              onClick={() => setFilters(f => ({ ...f, priceRange: i, minPrice: '', maxPrice: '' }))}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all ${
                filters.priceRange === i && !filters.minPrice && !filters.maxPrice
                  ? 'bg-navy text-white font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{range.label}</span>
              {filters.priceRange === i && !filters.minPrice && !filters.maxPrice && (
                <span className="text-white/70 text-xs">✓</span>
              )}
            </button>
          ))}
        </div>
        {/* Custom range */}
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">O personalizar</p>
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="number"
              placeholder="Mín"
              value={filters.minPrice}
              onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value, priceRange: -1 }))}
              className="input-field text-xs py-2 text-center"
            />
          </div>
          <div className="flex items-center text-gray-300 font-bold">—</div>
          <div className="flex-1">
            <input
              type="number"
              placeholder="Máx"
              value={filters.maxPrice}
              onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value, priceRange: -1 }))}
              className="input-field text-xs py-2 text-center"
            />
          </div>
        </div>
      </FilterSection>

      {/* ── Habitaciones ── */}
      <FilterSection title="Habitaciones mín.">
        <div className="flex gap-2">
          {ROOM_OPTIONS.map(({ label, value }) => (
            <button
              key={label}
              onClick={() => setFilters(f => ({ ...f, rooms: value }))}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                filters.rooms === value
                  ? 'bg-navy text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* ── Tipo ── */}
      <FilterSection title="Tipo de inmueble">
        <div className="flex flex-wrap gap-2">
          {TYPE_OPTIONS.map(t => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filters.types.includes(t)
                  ? 'bg-navy text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* ── Características ── */}
      <FilterSection title="Características" defaultOpen={false}>
        <div className="space-y-2">
          {[
            { key: 'furnished', label: 'Amoblado',  icon: Sofa },
            { key: 'parking',   label: 'Cochera',   icon: Car  },
          ].map(({ key, label, icon: Icon }) => (
            <label key={key} className={`flex items-center gap-3 px-2.5 py-2 rounded-xl cursor-pointer transition-all ${
              filters[key] ? 'bg-navy/8' : 'hover:bg-gray-50'
            }`}>
              <div
                className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all ${
                  filters[key] ? 'bg-navy border-navy' : 'border-gray-300 bg-white'
                }`}
                onClick={() => setFilters(f => ({ ...f, [key]: !f[key] }))}
              >
                {filters[key] && <span className="text-white text-[9px] font-black">✓</span>}
              </div>
              <Icon size={13} className={filters[key] ? 'text-navy' : 'text-gray-400'} />
              <span className={`text-sm ${filters[key] ? 'font-semibold text-navy' : 'text-gray-600'}`}>{label}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* ── Mobile apply button ── */}
      {onClose && (
        <button
          onClick={onClose}
          className="lg:hidden w-full mt-4 btn-primary flex items-center justify-center gap-2"
        >
          Ver {resultCount} resultado{resultCount !== 1 ? 's' : ''}
          <ArrowRight size={15} />
        </button>
      )}
    </div>
  )
}

// ─── Active filter chips ──────────────────────────────────────────────────────

function ActiveChips({ filters, setFilters }) {
  const chips = []
  const clear = (update) => setFilters(f => ({ ...f, ...update }))

  filters.district.forEach(d =>
    chips.push({ label: d, onRemove: () => clear({ district: filters.district.filter(x => x !== d) }) })
  )
  filters.types.forEach(t =>
    chips.push({ label: t, onRemove: () => clear({ types: filters.types.filter(x => x !== t) }) })
  )
  if (filters.priceRange > 0 && !filters.minPrice && !filters.maxPrice)
    chips.push({ label: PRICE_RANGES[filters.priceRange].label, onRemove: () => clear({ priceRange: 0 }) })
  if (filters.minPrice || filters.maxPrice)
    chips.push({ label: `S/ ${filters.minPrice || '0'} – ${filters.maxPrice || '∞'}`, onRemove: () => clear({ minPrice: '', maxPrice: '', priceRange: 0 }) })
  if (filters.rooms)
    chips.push({ label: `${filters.rooms}+ hab.`, onRemove: () => clear({ rooms: '' }) })
  if (filters.furnished)
    chips.push({ label: 'Amoblado', onRemove: () => clear({ furnished: false }) })
  if (filters.parking)
    chips.push({ label: 'Cochera', onRemove: () => clear({ parking: false }) })

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {chips.map(({ label, onRemove }) => (
        <span key={label} className="inline-flex items-center gap-1.5 bg-navy/10 text-navy text-xs font-semibold px-3 py-1.5 rounded-full">
          {label}
          <button onClick={onRemove} className="hover:text-red-600 transition-colors ml-0.5">
            <X size={11} />
          </button>
        </span>
      ))}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onClear }) {
  return (
    <div className="card p-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
        <Home size={28} className="text-gray-300" />
      </div>
      <h3 className="font-bold text-navy text-base mb-1">Sin resultados</h3>
      <p className="text-gray-400 text-sm mb-5">
        No encontramos inmuebles con esos filtros. Prueba ampliando la búsqueda.
      </p>
      <button onClick={onClear} className="btn-primary text-sm inline-flex items-center gap-2">
        <X size={14} /> Limpiar filtros
      </button>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

const INIT_FILTERS = {
  district: [],
  priceRange: 0,
  minPrice: '',
  maxPrice: '',
  rooms: '',
  types: [],
  furnished: false,
  parking: false,
}

export default function Listings() {
  const [searchParams] = useSearchParams()
  const [view, setView]           = useState('grid')           // grid | list
  const [showSidebar, setShowSidebar] = useState(false)
  const [search, setSearch]       = useState('')
  const [sortBy, setSortBy]       = useState('relevancia')
  const [filters, setFilters]     = useState(() => ({
    ...INIT_FILTERS,
    district: searchParams.get('district')
      ? [searchParams.get('district')]
      : [],
  }))

  // District counts (total, ignoring current district filter for UX)
  const counts = useMemo(() => {
    const c = {}
    properties.forEach(p => { c[p.district] = (c[p.district] || 0) + 1 })
    return c
  }, [])

  // Apply all filters
  const filtered = useMemo(() => {
    const range = PRICE_RANGES[filters.priceRange] ?? { min: 0, max: Infinity }
    const minP  = filters.minPrice  ? Number(filters.minPrice)  : range.min
    const maxP  = filters.maxPrice  ? Number(filters.maxPrice)  : range.max

    let result = properties.filter(p => {
      if (filters.district.length > 0 && !filters.district.includes(p.district)) return false
      if (filters.types.length > 0    && !filters.types.includes(p.type))        return false
      if (p.price < minP || p.price > maxP)                                       return false
      if (filters.rooms && p.rooms < Number(filters.rooms))                       return false
      if (filters.furnished && !p.furnished)                                      return false
      if (filters.parking   && !p.parking)                                        return false
      if (search) {
        const q = search.toLowerCase()
        if (!p.title.toLowerCase().includes(q) && !p.district.toLowerCase().includes(q) && !p.address.toLowerCase().includes(q)) return false
      }
      return true
    })

    if (sortBy === 'precio-asc')  result = [...result].sort((a, b) => a.price - b.price)
    if (sortBy === 'precio-desc') result = [...result].sort((a, b) => b.price - a.price)
    if (sortBy === 'area')        result = [...result].sort((a, b) => b.area - a.area)
    if (sortBy === 'habitaciones')result = [...result].sort((a, b) => b.rooms - a.rooms)

    return result
  }, [filters, search, sortBy])

  const clearAll = useCallback(() => {
    setFilters(INIT_FILTERS)
    setSearch('')
  }, [])

  const activeFilterCount = [
    filters.district.length > 0,
    filters.priceRange > 0 || filters.minPrice || filters.maxPrice,
    filters.rooms !== '',
    filters.types.length > 0,
    filters.furnished,
    filters.parking,
  ].filter(Boolean).length

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* ── Search bar ── */}
      <div className="bg-navy pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-gold/50"
                placeholder="Buscar por nombre, distrito o dirección…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowSidebar(v => !v)}
              className={`lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeFilterCount > 0 ? 'bg-gold text-navy' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <SlidersHorizontal size={15} />
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Quick district pills */}
          <div className="flex gap-2 overflow-x-auto pb-3 pt-2 scrollbar-hide">
            {['Miraflores', 'Barranco', 'San Isidro', 'Santiago de Surco', 'La Molina', 'San Borja', 'Jesús María'].map(d => {
              const active = filters.district.includes(d)
              return (
                <button
                  key={d}
                  onClick={() => setFilters(f => ({
                    ...f,
                    district: active ? f.district.filter(x => x !== d) : [...f.district, d],
                  }))}
                  className={`flex-shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all ${
                    active
                      ? 'bg-gold text-navy'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
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
            <Sidebar
              filters={filters}
              setFilters={setFilters}
              counts={counts}
              resultCount={filtered.length}
              onClose={() => setShowSidebar(false)}
            />
          </div>
        </div>
      )}

      {/* ── Main layout ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6 items-start">

          {/* ── Desktop sidebar (sticky) ── */}
          <aside className="hidden lg:block w-64 xl:w-72 flex-shrink-0 sticky top-20 self-start max-h-[calc(100vh-5.5rem)] overflow-y-auto">
            <Sidebar
              filters={filters}
              setFilters={setFilters}
              counts={counts}
              resultCount={filtered.length}
            />
          </aside>

          {/* ── Results ── */}
          <div className="flex-1 min-w-0">

            {/* Results header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-gray-600 text-sm">
                  <span className="font-extrabold text-navy text-base">{filtered.length}</span>{' '}
                  inmueble{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
                  {activeFilterCount > 0 && <span className="text-gray-400"> con filtros activos</span>}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Sort */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="appearance-none pl-3 pr-8 py-2 text-xs border border-gray-200 rounded-xl text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 font-medium cursor-pointer"
                  >
                    <option value="relevancia">Relevancia</option>
                    <option value="precio-asc">Menor precio</option>
                    <option value="precio-desc">Mayor precio</option>
                    <option value="area">Mayor área</option>
                    <option value="habitaciones">Más habitaciones</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                {/* View toggle */}
                <div className="flex bg-white border border-gray-200 rounded-xl p-0.5">
                  <button
                    onClick={() => setView('grid')}
                    className={`p-1.5 rounded-lg transition-all ${view === 'grid' ? 'bg-navy text-white' : 'text-gray-400 hover:text-navy'}`}
                  >
                    <LayoutGrid size={15} />
                  </button>
                  <button
                    onClick={() => setView('list')}
                    className={`p-1.5 rounded-lg transition-all ${view === 'list' ? 'bg-navy text-white' : 'text-gray-400 hover:text-navy'}`}
                  >
                    <List size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* Active filter chips */}
            <ActiveChips filters={filters} setFilters={setFilters} />

            {/* Cards */}
            {filtered.length === 0 ? (
              <EmptyState onClear={clearAll} />
            ) : view === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map(p => (
                  <PropertyCard key={p.id} property={p} view="grid" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {filtered.map(p => (
                  <PropertyCard key={p.id} property={p} view="list" />
                ))}
              </div>
            )}

            {/* Bottom hint */}
            {filtered.length > 0 && (
              <p className="text-center text-gray-300 text-xs mt-8">
                Mostrando {filtered.length} de {properties.length} propiedades disponibles
              </p>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
