import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Upload, X, ImagePlus, ChevronLeft, Loader2, AlertCircle,
  CheckCircle2, Home, BedDouble, Bath, Maximize2, DollarSign,
  MapPin, Car, Sofa, FileText, Info,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { propertiesService } from '../services/properties'
import { useAuthStore } from '../store/authStore'

// ─── Constantes ───────────────────────────────────────────────────────────────

const DISTRITOS = [
  'Miraflores', 'Barranco', 'San Isidro', 'Santiago de Surco',
  'La Molina', 'San Borja', 'Jesús María', 'Lince', 'Pueblo Libre',
  'Magdalena del Mar', 'San Miguel', 'Surquillo', 'Chorrillos', 'Otro',
]
const TIPOS = ['Departamento', 'Casa', 'Studio', 'Oficina']
const MAX_FOTOS = 10
const MAX_MB    = 5

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Label({ children, required }) {
  return (
    <label className="block text-sm font-semibold text-[#1B2A4A] mb-1.5">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  )
}

function FieldError({ msg }) {
  if (!msg) return null
  return <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} />{msg}</p>
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
      <div className="w-7 h-7 rounded-lg bg-[#1B2A4A]/10 flex items-center justify-center">
        <Icon size={14} className="text-[#1B2A4A]" />
      </div>
      <h2 className="font-bold text-[#1B2A4A]">{children}</h2>
    </div>
  )
}

// ─── Photo uploader ───────────────────────────────────────────────────────────

function PhotoUploader({ files, setFiles }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  const addFiles = useCallback((incoming) => {
    const filtered = [...incoming].filter(f => {
      if (!f.type.startsWith('image/')) return false
      if (f.size > MAX_MB * 1024 * 1024) return false
      return true
    })
    setFiles(prev => {
      const combined = [...prev, ...filtered]
      return combined.slice(0, MAX_FOTOS)
    })
  }, [setFiles])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }, [addFiles])

  const remove = (i) => setFiles(prev => prev.filter((_, idx) => idx !== i))

  const previews = files.map(f => URL.createObjectURL(f))

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-[#C9A84C] bg-[#C9A84C]/5'
            : 'border-gray-200 hover:border-[#1B2A4A]/40 hover:bg-gray-50'
        }`}
      >
        <ImagePlus size={28} className={`mx-auto mb-2 ${dragOver ? 'text-[#C9A84C]' : 'text-gray-300'}`} />
        <p className="text-sm font-semibold text-gray-500">
          Arrastra fotos aquí o <span className="text-[#1B2A4A] underline">elige archivos</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          JPG, PNG o WEBP · máx. {MAX_MB} MB por foto · hasta {MAX_FOTOS} fotos
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => addFiles(e.target.files)}
        />
      </div>

      {/* Previews */}
      {files.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
          {previews.map((src, i) => (
            <div key={i} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100">
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"
              >
                <X size={10} />
              </button>
              {i === 0 && (
                <span className="absolute bottom-1 left-1 text-[9px] font-bold bg-[#C9A84C] text-[#1B2A4A] px-1.5 py-0.5 rounded-full">
                  Portada
                </span>
              )}
            </div>
          ))}

          {/* Add more slot */}
          {files.length < MAX_FOTOS && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-[#1B2A4A]/40 flex flex-col items-center justify-center gap-1 text-gray-300 hover:text-[#1B2A4A]/50 transition-all"
            >
              <Upload size={16} />
              <span className="text-[9px] font-semibold">Agregar</span>
            </button>
          )}
        </div>
      )}

      {files.length > 0 && (
        <p className="text-xs text-gray-400 mt-2">
          {files.length}/{MAX_FOTOS} foto{files.length !== 1 ? 's' : ''} seleccionada{files.length !== 1 ? 's' : ''} · La primera foto será la portada
        </p>
      )}
    </div>
  )
}

// ─── NewProperty page ─────────────────────────────────────────────────────────

const EMPTY = {
  titulo: '', descripcion: '', tipo: '',
  distrito: '', direccion: '',
  area: '', habitaciones: '', banos: '',
  precio: '', mesesGarantia: '2',
  cochera: false, amoblado: false,
}

export default function NewProperty() {
  const navigate  = useNavigate()
  const { isAuthenticated, hasRole } = useAuthStore()

  const [form, setForm]     = useState(EMPTY)
  const [files, setFiles]   = useState([])
  const [errors, setErrors] = useState({})
  const [step, setStep]     = useState('form')   // form | uploading | done | error
  const [serverMsg, setServerMsg] = useState('')

  // Guard: redirigir si no es arrendador
  useEffect(() => {
    if (!isAuthenticated()) navigate('/registro?redirect=/publicar')
    else if (!hasRole('Arrendador')) navigate('/inmuebles')
  }, [isAuthenticated, hasRole, navigate])

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: undefined }))
  }

  // Validación
  const validate = () => {
    const e = {}
    if (!form.titulo.trim())       e.titulo       = 'El título es requerido'
    if (!form.descripcion.trim())  e.descripcion  = 'La descripción es requerida'
    if (!form.tipo)                e.tipo         = 'Selecciona un tipo'
    if (!form.distrito)            e.distrito     = 'Selecciona un distrito'
    if (!form.direccion.trim())    e.direccion    = 'La dirección es requerida'
    if (!form.area || isNaN(form.area) || Number(form.area) <= 0)
      e.area = 'Ingresa el área en m²'
    if (!form.habitaciones || isNaN(form.habitaciones) || Number(form.habitaciones) < 1)
      e.habitaciones = 'Al menos 1 habitación'
    if (!form.banos || isNaN(form.banos) || Number(form.banos) < 1)
      e.banos = 'Al menos 1 baño'
    if (!form.precio || isNaN(form.precio) || Number(form.precio) <= 0)
      e.precio = 'Ingresa el precio mensual'
    if (files.length === 0)
      e.fotos = 'Agrega al menos 1 foto'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setStep('uploading')
    setServerMsg('')
    try {
      // 1. Crear el inmueble
      const property = await propertiesService.crear({
        titulo:        form.titulo.trim(),
        descripcion:   form.descripcion.trim(),
        tipo:          form.tipo,
        distrito:      form.distrito,
        direccion:     form.direccion.trim(),
        area:          Number(form.area),
        habitaciones:  Number(form.habitaciones),
        banos:         Number(form.banos),
        precio:        Number(form.precio),
        mesesGarantia: Number(form.mesesGarantia),
        cochera:       form.cochera,
        amoblado:      form.amoblado,
      })

      // 2. Subir fotos a Cloudinary
      await propertiesService.subirFotos(property.id, files)

      setStep('done')
      setTimeout(() => navigate(`/inmuebles/${property.id}`), 2000)
    } catch (err) {
      setServerMsg(err.response?.data?.error || 'Ocurrió un error. Intenta de nuevo.')
      setStep('error')
    }
  }

  // ── Pantallas de estado ──
  if (step === 'uploading') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center max-w-xs">
            <div className="w-16 h-16 rounded-2xl bg-[#1B2A4A]/10 flex items-center justify-center mx-auto mb-4">
              <Loader2 size={28} className="animate-spin text-[#1B2A4A]" />
            </div>
            <h2 className="font-bold text-[#1B2A4A] text-lg mb-1">Publicando tu inmueble</h2>
            <p className="text-gray-400 text-sm">Subiendo fotos y guardando información…</p>
            <div className="mt-4 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#C9A84C] rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center max-w-xs">
            <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <h2 className="font-bold text-[#1B2A4A] text-lg mb-1">¡Publicado con éxito!</h2>
            <p className="text-gray-400 text-sm">Redirigiendo al detalle de tu inmueble…</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Formulario ──
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <div className="mb-6">
            <Link to="/inmuebles" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#1B2A4A] transition-colors mb-3">
              <ChevronLeft size={14} /> Volver al buscador
            </Link>
            <h1 className="text-2xl font-extrabold text-[#1B2A4A]">Publicar inmueble</h1>
            <p className="text-gray-400 text-sm mt-1">Completa los datos para que los arrendatarios encuentren tu propiedad</p>
          </div>

          {/* Error servidor */}
          {step === 'error' && (
            <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
              <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-700 text-sm">Error al publicar</p>
                <p className="text-red-600 text-xs mt-0.5">{serverMsg}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ── Información básica ── */}
            <div className="card p-6">
              <SectionTitle icon={FileText}>Información básica</SectionTitle>

              <div className="space-y-4">
                <div>
                  <Label required>Título del anuncio</Label>
                  <input
                    className="input-field"
                    placeholder="Ej: Departamento moderno con vista al parque"
                    value={form.titulo}
                    onChange={e => set('titulo', e.target.value)}
                    maxLength={120}
                  />
                  <FieldError msg={errors.titulo} />
                </div>

                <div>
                  <Label required>Descripción</Label>
                  <textarea
                    rows={4}
                    className="input-field resize-none"
                    placeholder="Describe el inmueble: ubicación, comodidades, accesos, puntos de interés cercanos…"
                    value={form.descripcion}
                    onChange={e => set('descripcion', e.target.value)}
                  />
                  <FieldError msg={errors.descripcion} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label required>Tipo de inmueble</Label>
                    <div className="relative">
                      <select
                        className="input-field appearance-none pr-8"
                        value={form.tipo}
                        onChange={e => set('tipo', e.target.value)}
                      >
                        <option value="">Seleccionar…</option>
                        {TIPOS.map(t => <option key={t}>{t}</option>)}
                      </select>
                      <Home size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                    <FieldError msg={errors.tipo} />
                  </div>

                  <div>
                    <Label required>Distrito</Label>
                    <div className="relative">
                      <select
                        className="input-field appearance-none pr-8"
                        value={form.distrito}
                        onChange={e => set('distrito', e.target.value)}
                      >
                        <option value="">Seleccionar…</option>
                        {DISTRITOS.map(d => <option key={d}>{d}</option>)}
                      </select>
                      <MapPin size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                    <FieldError msg={errors.distrito} />
                  </div>
                </div>

                <div>
                  <Label required>Dirección</Label>
                  <input
                    className="input-field"
                    placeholder="Ej: Av. Larco 820, Piso 8"
                    value={form.direccion}
                    onChange={e => set('direccion', e.target.value)}
                  />
                  <FieldError msg={errors.direccion} />
                </div>
              </div>
            </div>

            {/* ── Características ── */}
            <div className="card p-6">
              <SectionTitle icon={BedDouble}>Características</SectionTitle>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <Label required>Área (m²)</Label>
                  <div className="relative">
                    <input
                      type="number" min="10" step="0.5"
                      className="input-field pr-10"
                      placeholder="Ej: 75"
                      value={form.area}
                      onChange={e => set('area', e.target.value)}
                    />
                    <Maximize2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <FieldError msg={errors.area} />
                </div>

                <div>
                  <Label required>Habitaciones</Label>
                  <div className="relative">
                    <input
                      type="number" min="1" max="20"
                      className="input-field pr-10"
                      placeholder="Ej: 2"
                      value={form.habitaciones}
                      onChange={e => set('habitaciones', e.target.value)}
                    />
                    <BedDouble size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <FieldError msg={errors.habitaciones} />
                </div>

                <div>
                  <Label required>Baños</Label>
                  <div className="relative">
                    <input
                      type="number" min="1" max="10"
                      className="input-field pr-10"
                      placeholder="Ej: 2"
                      value={form.banos}
                      onChange={e => set('banos', e.target.value)}
                    />
                    <Bath size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <FieldError msg={errors.banos} />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="flex gap-4 mt-4">
                {[
                  { key: 'cochera',  icon: Car,  label: 'Incluye cochera' },
                  { key: 'amoblado', icon: Sofa, label: 'Totalmente amoblado' },
                ].map(({ key, icon: Icon, label }) => (
                  <label key={key} className={`flex items-center gap-2.5 flex-1 p-3 rounded-xl cursor-pointer border-2 transition-all ${form[key] ? 'border-[#1B2A4A] bg-[#1B2A4A]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div
                      className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all ${form[key] ? 'bg-[#1B2A4A] border-[#1B2A4A]' : 'border-gray-300'}`}
                      onClick={() => set(key, !form[key])}
                    >
                      {form[key] && <span className="text-white text-[9px] font-black">✓</span>}
                    </div>
                    <Icon size={14} className={form[key] ? 'text-[#1B2A4A]' : 'text-gray-400'} />
                    <span className={`text-sm ${form[key] ? 'font-semibold text-[#1B2A4A]' : 'text-gray-500'}`}>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* ── Precio ── */}
            <div className="card p-6">
              <SectionTitle icon={DollarSign}>Precio y garantía</SectionTitle>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label required>Alquiler mensual (S/)</Label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">S/</span>
                    <input
                      type="number" min="1"
                      className="input-field pl-9"
                      placeholder="Ej: 1800"
                      value={form.precio}
                      onChange={e => set('precio', e.target.value)}
                    />
                  </div>
                  <FieldError msg={errors.precio} />
                </div>

                <div>
                  <Label>Meses de garantía</Label>
                  <div className="flex gap-2">
                    {['1', '2', '3'].map(m => (
                      <button
                        key={m} type="button"
                        onClick={() => set('mesesGarantia', m)}
                        className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all border-2 ${form.mesesGarantia === m ? 'border-[#1B2A4A] bg-[#1B2A4A] text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                      >
                        {m} {m === '1' ? 'mes' : 'meses'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {form.precio && (
                <div className="mt-4 p-3 rounded-xl bg-[#1B2A4A]/5 flex items-center gap-2 text-sm">
                  <Info size={14} className="text-[#1B2A4A] flex-shrink-0" />
                  <span className="text-gray-600">
                    Garantía estimada:{' '}
                    <strong className="text-[#1B2A4A]">
                      S/ {(Number(form.precio) * Number(form.mesesGarantia)).toLocaleString('es-PE')}
                    </strong>
                    {' '}· Total inicial:{' '}
                    <strong className="text-[#1B2A4A]">
                      S/ {(Number(form.precio) * (Number(form.mesesGarantia) + 1)).toLocaleString('es-PE')}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            {/* ── Fotos ── */}
            <div className="card p-6">
              <SectionTitle icon={ImagePlus}>Fotos del inmueble</SectionTitle>
              <PhotoUploader files={files} setFiles={setFiles} />
              <FieldError msg={errors.fotos} />
            </div>

            {/* ── Submit ── */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/inmuebles" className="btn-outline flex-1 text-center py-3">
                Cancelar
              </Link>
              <button
                type="submit"
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Upload size={15} />
                Publicar inmueble
              </button>
            </div>

          </form>
        </div>
      </div>
      <Footer />
    </div>
  )
}
