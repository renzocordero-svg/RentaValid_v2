import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search, MapPin, Home, Shield, FileCheck, CreditCard,
  Star, ChevronRight, CheckCircle, ArrowRight, Building2,
  Users, Award, Fingerprint
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { properties, districts } from '../data/mockData'

function PropertyCard({ property }) {
  return (
    <Link to={`/inmuebles/${property.id}`} className="card block group">
      <div className="relative overflow-hidden rounded-t-2xl h-52">
        <img
          src={property.images[0]}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3">
          <span className="badge bg-gold text-navy">Destacado</span>
        </div>
        <div className="absolute top-3 right-3">
          <span className="badge bg-white/90 text-navy">{property.type}</span>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-navy text-base leading-snug group-hover:text-gold transition-colors">
            {property.title}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 mt-2 text-gray-400 text-sm">
          <MapPin size={13} />
          <span>{property.district}</span>
        </div>
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
          <span>{property.rooms} hab.</span>
          <span>·</span>
          <span>{property.baths} baños</span>
          <span>·</span>
          <span>{property.area} m²</span>
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div>
            <span className="text-2xl font-bold text-navy">S/ {property.price.toLocaleString()}</span>
            <span className="text-gray-400 text-sm">/mes</span>
          </div>
          <div className="flex items-center gap-1.5">
            {property.owner.verified && (
              <span className="badge bg-navy/8 text-navy text-[10px]">
                <Shield size={10} className="text-gold" /> Verificado
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

function StepCard({ number, icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center text-center group">
      <div className="relative mb-5">
        <div className="w-16 h-16 rounded-2xl bg-navy/8 flex items-center justify-center group-hover:bg-gold/15 transition-colors duration-300">
          <Icon size={28} className="text-navy group-hover:text-gold transition-colors duration-300" />
        </div>
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gold flex items-center justify-center text-navy text-xs font-bold shadow">
          {number}
        </div>
      </div>
      <h3 className="font-bold text-navy text-base mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </div>
  )
}

function StatCard({ value, label }) {
  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-extrabold text-gold">{value}</div>
      <div className="text-white/70 text-sm mt-1">{label}</div>
    </div>
  )
}

function TestimonialCard({ name, role, district, text, stars = 5 }) {
  return (
    <div className="card p-6 flex flex-col gap-4 hover:shadow-card-hover transition-all duration-300">
      <div className="flex items-center gap-1">
        {Array.from({ length: stars }, (_, i) => (
          <Star key={i} size={13} className="fill-gold text-gold" />
        ))}
      </div>
      <p className="text-gray-500 text-sm leading-relaxed flex-1">"{text}"</p>
      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <div className="w-9 h-9 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
          <span className="text-white font-extrabold text-xs">{name[0]}</span>
        </div>
        <div>
          <p className="font-bold text-navy text-sm">{name}</p>
          <p className="text-gray-400 text-[11px]">{role} · {district}</p>
        </div>
      </div>
    </div>
  )
}

const TESTIMONIALS = [
  {
    name: 'Carlos Mendoza',
    role: 'Arrendador',
    district: 'Miraflores',
    text: 'Publiqué mi departamento y en 48 horas ya tenía un inquilino verificado. La cláusula de allanamiento me da total tranquilidad si algo sale mal.',
  },
  {
    name: 'Sofía Quispe',
    role: 'Arrendataria',
    district: 'San Isidro',
    text: 'Mi scoring aprobado me abrió puertas que antes estaban cerradas. Ahora vivo en el departamento de mis sueños con un contrato totalmente legal.',
  },
  {
    name: 'Rodrigo Alvarado',
    role: 'Arrendador',
    district: 'Surco',
    text: 'Después de un caso de morosidad de 2 años, RentaValid me dio la tranquilidad que necesitaba. Llevo 3 contratos seguidos sin ningún problema.',
  },
  {
    name: 'Lucía Vargas',
    role: 'Arrendataria',
    district: 'Barranco',
    text: 'Firmé mi primer contrato de alquiler completamente desde el celular. Proceso clarísimo, rápido y con todo el respaldo legal que necesitaba.',
  },
]

export default function Landing() {
  const navigate = useNavigate()
  const [search, setSearch] = useState({ district: '', type: '', maxPrice: '' })

  const handleSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (search.district) params.set('district', search.district)
    if (search.type) params.set('type', search.type)
    if (search.maxPrice) params.set('maxPrice', search.maxPrice)
    navigate(`/inmuebles?${params.toString()}`)
  }

  const featured = properties.filter((p) => p.featured)

  return (
    <div className="min-h-screen">
      <Navbar transparent />

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center bg-navy overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0"
            style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}
          />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-navy via-navy/80 to-transparent" />
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-20"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=60)', backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-r from-navy to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="max-w-2xl">
            {/* Trust badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold px-4 py-2 rounded-full mb-6">
              <Shield size={13} className="text-gold" />
              Respaldado por la Ley N° 30933 · Verificado con RENIEC
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
              Alquila con confianza,
              <span className="block text-gold">valida con</span>
              RentaValid.
            </h1>

            <p className="mt-5 text-lg text-white/70 leading-relaxed max-w-xl">
              La plataforma peruana que valida identidad con RENIEC, evalúa solvencia con INFOCORP y firma contratos digitalmente, todo en un solo lugar.
            </p>

            {/* Search box */}
            <form
              onSubmit={handleSearch}
              className="mt-8 bg-white rounded-2xl shadow-2xl p-3 flex flex-col sm:flex-row gap-2"
            >
              <div className="flex-1 relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={search.district}
                  onChange={(e) => setSearch({ ...search, district: e.target.value })}
                  className="w-full pl-9 pr-4 py-3 rounded-xl text-sm text-gray-700 bg-gray-50 border-0 focus:outline-none focus:ring-2 focus:ring-navy/20"
                >
                  <option value="">Todos los distritos</option>
                  {districts.slice(1).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 relative">
                <Home size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={search.type}
                  onChange={(e) => setSearch({ ...search, type: e.target.value })}
                  className="w-full pl-9 pr-4 py-3 rounded-xl text-sm text-gray-700 bg-gray-50 border-0 focus:outline-none focus:ring-2 focus:ring-navy/20"
                >
                  <option value="">Tipo de inmueble</option>
                  <option value="Departamento">Departamento</option>
                  <option value="Casa">Casa</option>
                  <option value="Studio">Studio</option>
                </select>
              </div>
              <button
                type="submit"
                className="bg-navy text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-navy-600 transition-all text-sm whitespace-nowrap"
              >
                <Search size={16} />
                Buscar
              </button>
            </form>

            {/* Quick links */}
            <div className="mt-5 flex flex-wrap gap-2">
              {['Miraflores', 'San Isidro', 'Barranco', 'Surco'].map((d) => (
                <button
                  key={d}
                  onClick={() => navigate(`/inmuebles?district=${d}`)}
                  className="text-white/60 hover:text-gold text-sm flex items-center gap-1 transition-colors"
                >
                  <ChevronRight size={12} /> {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="bg-navy-600 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCard value="2,400+" label="Inmuebles disponibles" />
            <StatCard value="8,700+" label="Contratos firmados" />
            <StatCard value="98%" label="Arrendadores satisfechos" />
            <StatCard value="72h" label="Tiempo promedio de contrato" />
          </div>
        </div>
      </section>

      {/* ── Propiedades destacadas ── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-gold font-semibold text-sm tracking-wide uppercase mb-1">Selección premium</p>
              <h2 className="section-title">Inmuebles destacados</h2>
              <p className="section-subtitle">Propiedades verificadas en los mejores distritos de Lima</p>
            </div>
            <Link
              to="/inmuebles"
              className="flex items-center gap-2 text-navy font-semibold text-sm hover:text-gold transition-colors whitespace-nowrap"
            >
              Ver todos <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Cómo funciona ── */}
      <section id="como-funciona" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-gold font-semibold text-sm tracking-wide uppercase mb-1">Proceso simple y seguro</p>
            <h2 className="section-title">¿Cómo funciona RentaValid?</h2>
            <p className="section-subtitle max-w-xl mx-auto">
              De la búsqueda al contrato firmado en 4 pasos, con respaldo legal en cada etapa.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 relative">
            {/* Connector line */}
            <div className="hidden lg:block absolute top-8 left-[17%] right-[17%] h-0.5 bg-gradient-to-r from-navy/10 via-gold/40 to-navy/10" />
            <StepCard
              number="1"
              icon={Fingerprint}
              title="Valida tu identidad"
              description="Registra tu DNI y huella dactilar. Verificamos tus datos en tiempo real con RENIEC."
            />
            <StepCard
              number="2"
              icon={Award}
              title="Scoring de solvencia"
              description="Evaluamos tus ingresos y tu historial en INFOCORP para generar tu puntuación de inquilino."
            />
            <StepCard
              number="3"
              icon={Search}
              title="Encuentra tu hogar"
              description="Busca entre cientos de propiedades verificadas. Postula con un solo clic."
            />
            <StepCard
              number="4"
              icon={FileCheck}
              title="Firma el contrato"
              description="Firma digitalmente desde tu celular o en notaría asociada. 100% legal y vinculante."
            />
          </div>

          <div className="text-center mt-12">
            <Link to="/registro" className="btn-primary inline-flex items-center gap-2">
              Comenzar ahora <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Testimonios ── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-gold font-semibold text-sm tracking-wide uppercase mb-1">Lo que dicen nuestros usuarios</p>
            <h2 className="section-title">Miles de peruanos ya confían en RentaValid</h2>
            <p className="section-subtitle max-w-xl mx-auto">
              Arrendadores protegidos y arrendatarios verificados que encontraron la solución definitiva al alquiler en Perú.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TESTIMONIALS.map(t => (
              <TestimonialCard key={t.name} {...t} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Garantías / Trust ── */}
      <section className="py-20 bg-navy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <p className="text-gold font-semibold text-sm tracking-wide uppercase mb-3">Tu tranquilidad, nuestra misión</p>
              <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                El alquiler más seguro del Perú
              </h2>
              <p className="text-white/60 mt-4 leading-relaxed">
                Combinamos tecnología de validación biométrica con el marco legal peruano para que arrendadores e inquilinos tengan la máxima protección.
              </p>

              <ul className="mt-8 space-y-4">
                {[
                  { icon: Shield, text: 'Contratos bajo Ley N° 30933 con ejecución garantizada', sub: 'Firmados digitalmente con valor legal pleno' },
                  { icon: Fingerprint, text: 'Verificación biométrica con RENIEC', sub: 'Huella dactilar + DNI para máxima seguridad de identidad' },
                  { icon: Award, text: 'Scoring INFOCORP integrado', sub: 'Evaluamos solvencia antes de aprobar la postulación' },
                  { icon: CreditCard, text: 'Pasarela de pago segura', sub: 'Garantía y mensualidades procesadas en la plataforma' },
                ].map(({ icon: Icon, text, sub }) => (
                  <li key={text} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon size={18} className="text-gold" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{text}</p>
                      <p className="text-white/50 text-xs mt-0.5">{sub}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual card */}
            <div className="relative">
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-gold/20 flex items-center justify-center">
                    <FileCheck size={22} className="text-gold" />
                  </div>
                  <div>
                    <p className="text-white font-bold">Contrato Digital</p>
                    <p className="text-white/50 text-xs">Ley N° 30933 · Firmado y sellado</p>
                  </div>
                  <span className="ml-auto badge bg-green-500/20 text-green-400">Activo</span>
                </div>

                <div className="space-y-3 text-sm">
                  {[
                    { label: 'Arrendador', value: 'Carlos Mendoza Ríos', verified: true },
                    { label: 'Inquilino', value: 'Diego Salinas Vega', verified: true },
                    { label: 'Inmueble', value: 'Av. Larco 820, Miraflores' },
                    { label: 'Alquiler mensual', value: 'S/ 1,800.00' },
                    { label: 'Vigencia', value: '01/02/2024 – 01/02/2025' },
                  ].map(({ label, value, verified }) => (
                    <div key={label} className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-white/40">{label}</span>
                      <span className="text-white font-medium flex items-center gap-1.5">
                        {value}
                        {verified && <CheckCircle size={12} className="text-green-400" />}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-4/5 bg-gold rounded-full" />
                  </div>
                  <span className="text-white/40 text-xs">Firmado digitalmente</span>
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-card px-4 py-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center">
                  <CheckCircle size={16} className="text-green-500" />
                </div>
                <div>
                  <p className="text-navy font-bold text-xs">RENIEC Verificado</p>
                  <p className="text-gray-400 text-[10px]">Identidad confirmada</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 bg-gradient-to-br from-gold/10 to-navy/5">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="section-title">¿Listo para alquilar con seguridad?</h2>
          <p className="section-subtitle">
            Regístrate gratis, valida tu identidad y empieza a postular a los mejores inmuebles de Lima.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/registro" className="btn-primary inline-flex items-center justify-center gap-2">
              Crear cuenta gratis <ArrowRight size={16} />
            </Link>
            <Link to="/inmuebles" className="btn-outline inline-flex items-center justify-center gap-2">
              Explorar inmuebles
            </Link>
          </div>
          <p className="mt-5 text-gray-400 text-sm">Sin costo de registro · Proceso 100% digital · Soporte en español</p>
        </div>
      </section>

      <Footer />
    </div>
  )
}
