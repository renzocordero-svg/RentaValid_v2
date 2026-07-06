const prisma  = require('../lib/prisma')
const { ok, fail } = require('../lib/response')
const { uploadBuffer } = require('../services/cloudinary')

// ── Selección del propietario en respuestas ───────────────────────────────────
const SELECT_OWNER = {
  id: true, nombre: true, apellidoPaterno: true, fotoUrl: true,
}

// ── Tablas de mapeo de estado Application ────────────────────────────────────
// DB guarda en español; API expone en inglés (spec)
const STATUS_TO_DB   = { pending: 'Pendiente', accepted: 'Aceptada', rejected: 'Rechazada' }
const STATUS_FROM_DB = { Pendiente: 'pending',  Aceptada: 'accepted', Rechazada: 'rejected' }

// ── Mapeo de ordenamiento — acepta claves inglés y español ───────────────────
const SORT_MAP = {
  // English (spec)
  price_asc:  { precio:    'asc'  },
  price_desc: { precio:    'desc' },
  area_asc:   { area:      'asc'  },
  area_desc:  { area:      'desc' },
  recent:     { createdAt: 'desc' },
  // Spanish (backward compat)
  precio_asc:  { precio:    'asc'  },
  precio_desc: { precio:    'desc' },
  reciente:    { createdAt: 'desc' },
}

// ── Helpers de mapeo ──────────────────────────────────────────────────────────

/**
 * Convierte un registro Property de Prisma (campos en español)
 * al contrato de API (campos en inglés, según especificación).
 */
function mapProperty(p) {
  return {
    id:            p.id,
    title:         p.titulo,
    description:   p.descripcion,
    address:       p.direccion,
    district:      p.distrito,
    area:          p.area,
    bedrooms:      p.habitaciones,
    bathrooms:     p.banos,
    price:         p.precio,
    guarantee:     p.mesesGarantia,
    hasGarage:     p.cochera,
    isFurnished:   p.amoblado,
    type:          p.tipo,
    status:        p.estado,           // Disponible | Arrendado | Inactivo
    titleDocument: p.titleDocument ?? null,
    images:        p.fotos?.map(f => f.url) ?? [],
    ownerId:       p.arrendadorId,
    owner:         p.arrendador ?? undefined,
    applications:  p.applications?.map(mapApplication),
    _count:        p._count,
    createdAt:     p.createdAt,
  }
}

/**
 * Convierte un registro Application de Prisma al contrato de API en inglés.
 * status: pending | accepted | rejected
 * userId: equivalente a arrendatarioId
 */
function mapApplication(a) {
  return {
    id:         a.id,
    propertyId: a.propertyId,
    userId:     a.arrendatarioId,
    status:     STATUS_FROM_DB[a.estado] ?? 'pending',
    createdAt:  a.createdAt,
    user:       a.arrendatario ?? undefined,
  }
}

// ── GET /properties ───────────────────────────────────────────────────────────
/*
  Acepta query params en inglés (spec) y en español (backward compat).

  Inglés  : district, type, bedrooms, bathrooms, hasGarage, isFurnished,
            minArea, maxArea, minPrice, maxPrice, sort
  Español : distrito, tipo, habitaciones, banos, cochera, amoblado,
            areaMin, areaMax, precioMin, precioMax, orden

  Response 200: { "data": [ { id, title, district, price, images, ... } ] }
*/
async function listar(req, res) {
  try {
    const {
      // English (spec)
      district, type, bedrooms, bathrooms, hasGarage, isFurnished,
      minArea, maxArea, minPrice, maxPrice, sort,
      // Spanish (backward compat)
      distrito, tipo, habitaciones, banos, cochera, amoblado,
      areaMin, areaMax, precioMin, precioMax, orden,
    } = req.query

    // Preferir param en inglés; caer en español si no existe
    const ef = {
      distrito:    district    || distrito,
      tipo:        type        || tipo,
      habitaciones: bedrooms   || habitaciones,
      banos:       bathrooms   || banos,
      cochera:     hasGarage   ?? cochera,
      amoblado:    isFurnished ?? amoblado,
      areaMin:     minArea     || areaMin,
      areaMax:     maxArea     || areaMax,
      precioMin:   minPrice    || precioMin,
      precioMax:   maxPrice    || precioMax,
      orden:       sort        || orden || 'recent',
    }

    const where = { estado: 'Disponible' }
    if (ef.distrito)     where.distrito     = ef.distrito
    if (ef.tipo)         where.tipo         = ef.tipo
    if (ef.habitaciones) where.habitaciones = { gte: parseInt(ef.habitaciones) }
    if (ef.banos)        where.banos        = { gte: parseInt(ef.banos) }

    if (ef.cochera !== undefined && ef.cochera !== null && ef.cochera !== '') {
      where.cochera = ef.cochera === 'true' || ef.cochera === true
    }
    if (ef.amoblado !== undefined && ef.amoblado !== null && ef.amoblado !== '') {
      where.amoblado = ef.amoblado === 'true' || ef.amoblado === true
    }
    if (ef.precioMin || ef.precioMax) {
      where.precio = {}
      if (ef.precioMin) where.precio.gte = parseFloat(ef.precioMin)
      if (ef.precioMax) where.precio.lte = parseFloat(ef.precioMax)
    }
    if (ef.areaMin || ef.areaMax) {
      where.area = {}
      if (ef.areaMin) where.area.gte = parseFloat(ef.areaMin)
      if (ef.areaMax) where.area.lte = parseFloat(ef.areaMax)
    }

    const orderBy = SORT_MAP[ef.orden] ?? SORT_MAP.recent

    const properties = await prisma.property.findMany({
      where,
      orderBy,
      include: {
        arrendador: { select: SELECT_OWNER },
        fotos:      { orderBy: { orden: 'asc' } },
        _count:     { select: { applications: true } },
      },
    })

    ok(res, properties.map(mapProperty))
  } catch (err) {
    fail(res, 500, 'Error al listar inmuebles')
  }
}

// ── GET /properties/:id ───────────────────────────────────────────────────────
/*
  Response 200: { "data": { id, title, district, images[], applications[], ... } }
  Errores: 404
*/
async function obtenerPorId(req, res) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return fail(res, 400, 'ID inválido')

    const property = await prisma.property.findUnique({
      where:   { id },
      include: {
        arrendador:   { select: SELECT_OWNER },
        fotos:        { orderBy: { orden: 'asc' } },
        applications: {
          select: {
            id: true, arrendatarioId: true, estado: true, createdAt: true,
            arrendatario: {
              select: { id: true, nombre: true, apellidoPaterno: true, email: true },
            },
          },
        },
      },
    })
    if (!property) return fail(res, 404, 'Inmueble no encontrado')
    ok(res, mapProperty(property))
  } catch (err) {
    fail(res, 500, 'Error al obtener el inmueble')
  }
}

// ── POST /properties ──────────────────────────────────────────────────────────
/*
  Solo Arrendador. Acepta campos en inglés (spec) y en español (backward compat).

  Inglés  : title, description, address, district, type, area,
            bedrooms, bathrooms, price, guarantee, hasGarage, isFurnished,
            images[], titleDocument
  Español : titulo, descripcion, direccion, distrito, tipo,
            habitaciones, banos, precio, mesesGarantia, cochera, amoblado, fotos[]

  Response 201: { "data": { id, title, images[], ... } }
  Errores: 400 — campos requeridos | tipo inválido
*/
async function crear(req, res) {
  try {
    const {
      // English (spec)
      title, description, address, district, type,
      area, bedrooms, bathrooms, price,
      guarantee, hasGarage, isFurnished,
      images = [], titleDocument,
      // Spanish (backward compat)
      titulo, descripcion, direccion, distrito, tipo,
      habitaciones, banos, precio, mesesGarantia,
      cochera, amoblado, fotos = [],
    } = req.body

    // Resolver campos: inglés tiene precedencia
    const ef = {
      titulo:        title       || titulo,
      descripcion:   description || descripcion,
      direccion:     address     || direccion,
      distrito:      district    || distrito,
      tipo:          type        || tipo,
      area:          area        ?? null,
      habitaciones:  bedrooms    ?? habitaciones ?? null,
      banos:         bathrooms   ?? banos        ?? null,
      precio:        price       ?? precio       ?? null,
      mesesGarantia: guarantee   ?? mesesGarantia ?? 2,
      cochera:       hasGarage   ?? cochera   ?? false,
      amoblado:      isFurnished ?? amoblado  ?? false,
      titleDocument: titleDocument ?? null,
    }

    // Validación campos obligatorios
    const faltantes = []
    if (!ef.titulo?.trim())  faltantes.push('title')
    if (!ef.distrito)        faltantes.push('district')
    if (!ef.precio)          faltantes.push('price')
    if (!ef.descripcion?.trim()) faltantes.push('description')
    if (!ef.direccion?.trim())   faltantes.push('address')
    if (!ef.tipo)                faltantes.push('type')
    if (!ef.area)                faltantes.push('area')
    if (!ef.habitaciones)        faltantes.push('bedrooms')
    if (!ef.banos)               faltantes.push('bathrooms')
    if (faltantes.length) {
      return fail(res, 400, `Faltan campos requeridos: ${faltantes.join(', ')}`)
    }

    const tiposValidos = ['Departamento', 'Casa', 'Studio', 'Oficina']
    if (!tiposValidos.includes(ef.tipo)) {
      return fail(res, 400, `Tipo inválido. Valores permitidos: ${tiposValidos.join(', ')}`)
    }

    // Normalizar imágenes: acepta array de strings (spec) o array de {url} (compat)
    const allImageUrls = [
      ...images.map(i => (typeof i === 'string' ? i : i.url)).filter(Boolean),
      ...fotos.map(f => (typeof f === 'string' ? f : f.url)).filter(Boolean),
    ].slice(0, 10)  // máx 10

    const fotosCreate = allImageUrls.map((url, i) => ({ url, orden: i + 1 }))

    const property = await prisma.property.create({
      data: {
        titulo:        ef.titulo.trim(),
        descripcion:   ef.descripcion.trim(),
        direccion:     ef.direccion.trim(),
        distrito:      ef.distrito,
        tipo:          ef.tipo,
        area:          parseFloat(ef.area),
        habitaciones:  parseInt(ef.habitaciones),
        banos:         parseInt(ef.banos),
        precio:        parseFloat(ef.precio),
        mesesGarantia: parseInt(ef.mesesGarantia),
        cochera:       Boolean(ef.cochera),
        amoblado:      Boolean(ef.amoblado),
        titleDocument: ef.titleDocument,
        arrendadorId:  req.user.id,
        fotos:         fotosCreate.length ? { create: fotosCreate } : undefined,
      },
      include: {
        arrendador: { select: SELECT_OWNER },
        fotos:      { orderBy: { orden: 'asc' } },
      },
    })
    ok(res, mapProperty(property), 201)
  } catch (err) {
    console.error(err)
    fail(res, 500, 'Error al crear el inmueble')
  }
}

// ── POST /properties/:id/apply ────────────────────────────────────────────────
/*
  Solo Arrendatario (JWT requerido). Sin body.
  No permite postulaciones duplicadas.

  Response 201:
    { "data": { id, propertyId, userId, status: "pending", createdAt } }

  Errores:
    400 — Inmueble no disponible
    404 — Inmueble no encontrado
    409 — Ya postulaste
*/
async function apply(req, res) {
  try {
    const propertyId = parseInt(req.params.id)
    if (isNaN(propertyId)) return fail(res, 400, 'ID inválido')

    const property = await prisma.property.findUnique({ where: { id: propertyId } })
    if (!property)                        return fail(res, 404, 'Inmueble no encontrado')
    if (property.estado !== 'Disponible') return fail(res, 400, 'El inmueble no está disponible para postulaciones')

    const duplicate = await prisma.application.findUnique({
      where: { propertyId_arrendatarioId: { propertyId, arrendatarioId: req.user.id } },
    })
    if (duplicate) return fail(res, 409, 'Ya postulaste a este inmueble')

    const application = await prisma.application.create({
      data: { propertyId, arrendatarioId: req.user.id },
      include: {
        property:     { select: { id: true, titulo: true, distrito: true } },
        arrendatario: { select: { id: true, nombre: true, email: true } },
      },
    })
    ok(res, mapApplication(application), 201)
  } catch (err) {
    fail(res, 500, 'Error al registrar la postulación')
  }
}

// ── POST /properties/:id/postular — backward compat → delega a apply ─────────
async function postular(req, res) {
  return apply(req, res)
}

// ── PATCH /applications/:id ───────────────────────────────────────────────────
/*
  Solo Arrendador dueño del inmueble.

  Body acepta inglés o español:
    { status: "accepted" | "rejected" }   ← spec
    { estado: "Aceptada" | "Rechazada" }  ← backward compat

  Al aceptar:
    - Otras postulaciones Pendientes del mismo inmueble → Rechazada
    - Inmueble → estado Arrendado

  Response 200: { "data": { id, propertyId, userId, status, createdAt } }
  Errores: 400 | 403 | 404
*/
async function actualizarPostulacion(req, res) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return fail(res, 400, 'ID inválido')

    // Acepta inglés (spec) y español (compat)
    const rawStatus = req.body.status || req.body.estado
    const estadoDB  = STATUS_TO_DB[rawStatus] || rawStatus  // si ya viene en español

    if (!['Aceptada', 'Rechazada'].includes(estadoDB)) {
      return fail(res, 400, 'Estado inválido. Usa accepted/rejected (o Aceptada/Rechazada)')
    }

    const application = await prisma.application.findUnique({
      where:   { id },
      include: { property: true },
    })
    if (!application) return fail(res, 404, 'Postulación no encontrada')

    if (application.property.arrendadorId !== req.user.id) {
      return fail(res, 403, 'No eres el arrendador de este inmueble')
    }
    if (application.estado !== 'Pendiente') {
      return fail(res, 400, `La postulación ya fue ${application.estado.toLowerCase()}`)
    }

    const [updated] = await prisma.$transaction(async (tx) => {
      const result = await tx.application.update({ where: { id }, data: { estado: estadoDB } })

      if (estadoDB === 'Aceptada') {
        // Rechazar automáticamente las demás postulaciones pendientes
        await tx.application.updateMany({
          where: { propertyId: application.propertyId, id: { not: id }, estado: 'Pendiente' },
          data:  { estado: 'Rechazada' },
        })
        // Marcar inmueble como Arrendado
        await tx.property.update({
          where: { id: application.propertyId },
          data:  { estado: 'Arrendado' },
        })
      }
      return [result]
    })

    ok(res, mapApplication(updated))
  } catch (err) {
    fail(res, 500, 'Error al actualizar la postulación')
  }
}

// ── POST /properties/:id/fotos ────────────────────────────────────────────────
/*
  Solo Arrendador dueño. Multipart/form-data, campo "fotos". Máx 10 imágenes.

  Response 201:
    { "data": { uploaded: N, images: ["url1", "url2"] } }

  Errores: 400 | 403 | 404
*/
async function subirFotos(req, res) {
  try {
    const propertyId = parseInt(req.params.id)
    if (isNaN(propertyId)) return fail(res, 400, 'ID de inmueble inválido')
    if (!req.files || req.files.length === 0) {
      return fail(res, 400, 'No se enviaron archivos. Usa el campo "fotos"')
    }

    const property = await prisma.property.findUnique({
      where:   { id: propertyId },
      include: { _count: { select: { fotos: true } } },
    })
    if (!property)                             return fail(res, 404, 'Inmueble no encontrado')
    if (property.arrendadorId !== req.user.id) return fail(res, 403, 'No eres el arrendador de este inmueble')

    const MAX_FOTOS    = 10
    const fotosActuales = property._count.fotos
    const hueco         = MAX_FOTOS - fotosActuales
    if (hueco <= 0) return fail(res, 400, `El inmueble ya tiene ${MAX_FOTOS} fotos (límite máximo)`)

    const archivos   = req.files.slice(0, hueco)
    const resultados = await Promise.all(
      archivos.map(file =>
        uploadBuffer(file.buffer, {
          folder:          `rentavalid/properties/${propertyId}`,
          resource_type:   'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
          transformation:  [{ quality: 'auto', fetch_format: 'auto' }],
        })
      )
    )

    const nuevasFotos = await prisma.$transaction(
      resultados.map((r, i) =>
        prisma.propertyPhoto.create({
          data: { propertyId, url: r.secure_url, orden: fotosActuales + i + 1 },
        })
      )
    )

    const omitidas = req.files.length - archivos.length
    ok(res, {
      uploaded: nuevasFotos.length,
      images:   nuevasFotos.map(f => f.url),
      ...(omitidas > 0 && { warning: `${omitidas} archivo(s) omitidos por límite de ${MAX_FOTOS} fotos` }),
    }, 201)
  } catch (err) {
    fail(res, 500, 'Error al subir las fotos')
  }
}

module.exports = {
  listar, obtenerPorId, crear,
  apply, postular,
  actualizarPostulacion,
  subirFotos,
}
