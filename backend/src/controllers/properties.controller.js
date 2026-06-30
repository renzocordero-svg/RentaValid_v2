const prisma = require('../lib/prisma')
const { ok, fail } = require('../lib/response')
const { uploadBuffer } = require('../services/cloudinary')

const SELECT_ARRENDADOR = {
  id: true, nombre: true, apellidoPaterno: true, fotoUrl: true,
}

// ── Mapeo de orden ────────────────────────────────────────────────────────────
const ORDEN_MAP = {
  precio_asc:  { precio:    'asc'  },
  precio_desc: { precio:    'desc' },
  area_asc:    { area:      'asc'  },
  area_desc:   { area:      'desc' },
  reciente:    { createdAt: 'desc' },
}

// ── GET /properties ───────────────────────────────────────────────────────────
/*
  Todos los query params son opcionales.

  GET /properties?distrito=Miraflores&precioMin=500&precioMax=2000
                 &habitaciones=2&banos=1&cochera=true&amoblado=true
                 &areaMin=40&areaMax=100&tipo=Departamento&orden=precio_asc

  Valores de tipo  : Departamento | Casa | Studio | Oficina
  Valores de orden : precio_asc | precio_desc | area_asc | area_desc | reciente (default)

  Response 200:
    { "data": [ { "id":1, "titulo":"...", "precio":1800, "fotos":[...], "arrendador":{...} } ] }
*/
async function listar(req, res) {
  try {
    const {
      distrito, tipo,
      precioMin, precioMax,
      habitaciones, banos,
      cochera, amoblado,
      areaMin, areaMax,
      orden = 'reciente',
    } = req.query

    const where = { estado: 'Disponible' }

    if (distrito)              where.distrito     = distrito
    if (tipo)                  where.tipo         = tipo
    if (habitaciones)          where.habitaciones = { gte: parseInt(habitaciones) }
    if (banos)                 where.banos        = { gte: parseInt(banos) }
    if (cochera  !== undefined) where.cochera     = cochera  === 'true'
    if (amoblado !== undefined) where.amoblado    = amoblado === 'true'

    if (precioMin || precioMax) {
      where.precio = {}
      if (precioMin) where.precio.gte = parseFloat(precioMin)
      if (precioMax) where.precio.lte = parseFloat(precioMax)
    }

    if (areaMin || areaMax) {
      where.area = {}
      if (areaMin) where.area.gte = parseFloat(areaMin)
      if (areaMax) where.area.lte = parseFloat(areaMax)
    }

    const orderBy = ORDEN_MAP[orden] ?? ORDEN_MAP.reciente

    const properties = await prisma.property.findMany({
      where,
      orderBy,
      include: {
        arrendador: { select: SELECT_ARRENDADOR },
        fotos:      { orderBy: { orden: 'asc' } },
        _count:     { select: { applications: true } },
      },
    })
    ok(res, properties)
  } catch (err) {
    fail(res, 500, 'Error al listar inmuebles')
  }
}

// ── GET /properties/:id ───────────────────────────────────────────────────────
/*
  Response 200:
    {
      "data": {
        "id": 1, "titulo": "...", "descripcion": "...",
        "arrendador": { "id":1, "nombre":"Carlos", ... },
        "fotos": [ { "url":"...", "orden":1 } ],
        "applications": [ { "id":1, "arrendatarioId":2, "estado":"Pendiente" } ]
      }
    }
  Errores: 404 — Inmueble no encontrado
*/
async function obtenerPorId(req, res) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return fail(res, 400, 'ID inválido')

    const property = await prisma.property.findUnique({
      where:   { id },
      include: {
        arrendador:   { select: SELECT_ARRENDADOR },
        fotos:        { orderBy: { orden: 'asc' } },
        applications: {
          select: {
            id: true, arrendatarioId: true, estado: true, createdAt: true,
            arrendatario: { select: { id: true, nombre: true, apellidoPaterno: true, email: true } },
          },
        },
      },
    })
    if (!property) return fail(res, 404, 'Inmueble no encontrado')
    ok(res, property)
  } catch (err) {
    fail(res, 500, 'Error al obtener el inmueble')
  }
}

// ── POST /properties ──────────────────────────────────────────────────────────
/*
  Solo Arrendador (token requerido).

  Request:
    {
      "titulo":        "Depto en Miraflores",
      "descripcion":   "Descripción detallada del inmueble...",
      "direccion":     "Av. Larco 820, Piso 8",
      "distrito":      "Miraflores",
      "tipo":          "Departamento",
      "area":          75,
      "habitaciones":  2,
      "banos":         2,
      "precio":        1800,
      "mesesGarantia": 2,
      "cochera":       true,
      "amoblado":      true,
      "fotos": [
        { "url": "https://cloudinary.com/foto1.jpg", "orden": 1 },
        { "url": "https://cloudinary.com/foto2.jpg", "orden": 2 }
      ]
    }

  Response 201:
    { "data": { "id": 6, "titulo": "...", "fotos": [...], "arrendador": {...} } }

  Errores:
    400 — Faltan campos requeridos
    400 — Tipo de inmueble inválido
*/
async function crear(req, res) {
  try {
    const {
      titulo, descripcion, direccion, distrito, tipo,
      area, habitaciones, banos, precio,
      cochera = false, amoblado = false, mesesGarantia = 2,
      fotos = [],
    } = req.body

    // Validación de campos requeridos
    const faltantes = []
    if (!titulo)       faltantes.push('titulo')
    if (!descripcion)  faltantes.push('descripcion')
    if (!direccion)    faltantes.push('direccion')
    if (!distrito)     faltantes.push('distrito')
    if (!tipo)         faltantes.push('tipo')
    if (!area)         faltantes.push('area')
    if (!habitaciones) faltantes.push('habitaciones')
    if (!banos)        faltantes.push('banos')
    if (!precio)       faltantes.push('precio')
    if (faltantes.length) {
      return fail(res, 400, `Faltan campos requeridos: ${faltantes.join(', ')}`)
    }

    const tiposValidos = ['Departamento', 'Casa', 'Studio', 'Oficina']
    if (!tiposValidos.includes(tipo)) {
      return fail(res, 400, `Tipo inválido. Valores permitidos: ${tiposValidos.join(', ')}`)
    }

    // Normalizar fotos: asignar orden automático si no viene
    const fotosNormalizadas = fotos.map((f, i) => ({
      url:   f.url,
      orden: f.orden ?? i + 1,
    }))

    const property = await prisma.property.create({
      data: {
        titulo,
        descripcion,
        direccion,
        distrito,
        tipo,
        area:          parseFloat(area),
        habitaciones:  parseInt(habitaciones),
        banos:         parseInt(banos),
        precio:        parseFloat(precio),
        mesesGarantia: parseInt(mesesGarantia),
        cochera:       Boolean(cochera),
        amoblado:      Boolean(amoblado),
        arrendadorId:  req.user.id,
        fotos:         { create: fotosNormalizadas },
      },
      include: {
        arrendador: { select: SELECT_ARRENDADOR },
        fotos:      { orderBy: { orden: 'asc' } },
      },
    })
    ok(res, property, 201)
  } catch (err) {
    fail(res, 500, 'Error al crear el inmueble')
  }
}

// ── POST /properties/:id/postular ─────────────────────────────────────────────
/*
  Solo Arrendatario (token requerido). No requiere body.

  Response 201:
    { "data": { "id": 1, "propertyId": 1, "arrendatarioId": 2, "estado": "Pendiente" } }

  Errores:
    404 — Inmueble no encontrado
    400 — El inmueble no está disponible
    409 — Ya postulaste a este inmueble
*/
async function postular(req, res) {
  try {
    const propertyId = parseInt(req.params.id)
    if (isNaN(propertyId)) return fail(res, 400, 'ID inválido')

    const property = await prisma.property.findUnique({ where: { id: propertyId } })
    if (!property)                       return fail(res, 404, 'Inmueble no encontrado')
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
    ok(res, application, 201)
  } catch (err) {
    fail(res, 500, 'Error al registrar la postulación')
  }
}

// ── PATCH /applications/:id ───────────────────────────────────────────────────
/*
  Solo Arrendador que sea dueño del inmueble asociado.
  Request: { "estado": "Aceptada" | "Rechazada" }

  Al aceptar: las otras postulaciones Pendientes del mismo inmueble
              quedan automáticamente en Rechazada.

  Response:
    { "data": { "id": 1, "estado": "Aceptada", "propertyId": 1, ... } }

  Errores:
    400 — estado inválido
    404 — Postulación no encontrada
    403 — No eres el arrendador de este inmueble
*/
async function actualizarPostulacion(req, res) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return fail(res, 400, 'ID inválido')

    const { estado } = req.body
    if (!['Aceptada', 'Rechazada'].includes(estado)) {
      return fail(res, 400, 'Estado inválido. Debe ser Aceptada o Rechazada')
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

    // Transacción: actualizar esta postulación y, si se acepta, rechazar las demás
    const [updated] = await prisma.$transaction(async (tx) => {
      const result = await tx.application.update({
        where: { id },
        data:  { estado },
      })

      if (estado === 'Aceptada') {
        await tx.application.updateMany({
          where: {
            propertyId: application.propertyId,
            id:         { not: id },
            estado:     'Pendiente',
          },
          data: { estado: 'Rechazada' },
        })
        // Marcar el inmueble como Arrendado
        await tx.property.update({
          where: { id: application.propertyId },
          data:  { estado: 'Arrendado' },
        })
      }

      return [result]
    })

    ok(res, updated)
  } catch (err) {
    fail(res, 500, 'Error al actualizar la postulación')
  }
}

// ── POST /properties/:id/fotos ────────────────────────────────────────────────
/*
  Solo Arrendador dueño del inmueble. Multipart/form-data, campo "fotos".
  Sube hasta 10 imágenes (JPG/PNG/WEBP, máx. 5 MB c/u) a Cloudinary y
  guarda las URLs en PropertyPhoto.

  Request (multipart/form-data):
    Campo "fotos": [archivo1.jpg, archivo2.jpg, ...]

  Response 201:
    {
      "data": {
        "subidas": 2,
        "fotos": [
          { "id": 7, "url": "https://res.cloudinary.com/...", "orden": 3 },
          { "id": 8, "url": "https://res.cloudinary.com/...", "orden": 4 }
        ]
      }
    }

  Errores:
    400 — No se enviaron archivos
    400 — El inmueble ya tiene 10 fotos (límite máximo)
    403 — No eres el arrendador de este inmueble
    404 — Inmueble no encontrado
*/
async function subirFotos(req, res) {
  try {
    const propertyId = parseInt(req.params.id)
    if (isNaN(propertyId)) return fail(res, 400, 'ID de inmueble inválido')

    if (!req.files || req.files.length === 0) {
      return fail(res, 400, 'No se enviaron archivos. Usa el campo "fotos"')
    }

    // Verificar que el inmueble existe y pertenece al arrendador del token
    const property = await prisma.property.findUnique({
      where:   { id: propertyId },
      include: { _count: { select: { fotos: true } } },
    })
    if (!property)                           return fail(res, 404, 'Inmueble no encontrado')
    if (property.arrendadorId !== req.user.id) return fail(res, 403, 'No eres el arrendador de este inmueble')

    const MAX_FOTOS = 10
    const fotosActuales = property._count.fotos
    const hueco         = MAX_FOTOS - fotosActuales

    if (hueco <= 0) {
      return fail(res, 400, `El inmueble ya tiene ${MAX_FOTOS} fotos (límite máximo)`)
    }

    // Recortar si el arrendador envía más de las que caben
    const archivos = req.files.slice(0, hueco)

    // Subir todos a Cloudinary en paralelo
    const resultados = await Promise.all(
      archivos.map((file) =>
        uploadBuffer(file.buffer, {
          folder:         `rentavalid/properties/${propertyId}`,
          resource_type:  'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        })
      )
    )

    // Determinar el próximo número de orden
    const ultimoOrden = fotosActuales  // fotos existentes ya ocupan orden 1..N

    // Guardar URLs en PropertyPhoto dentro de una transacción
    const nuevasFotos = await prisma.$transaction(
      resultados.map((r, i) =>
        prisma.propertyPhoto.create({
          data: {
            propertyId,
            url:   r.secure_url,
            orden: ultimoOrden + i + 1,
          },
        })
      )
    )

    // Si la subida fue parcial por límite, avisar cuántas se omitieron
    const omitidas = req.files.length - archivos.length
    ok(res, {
      subidas:  nuevasFotos.length,
      fotos:    nuevasFotos,
      ...(omitidas > 0 && { aviso: `${omitidas} archivo(s) omitido(s) por límite de ${MAX_FOTOS} fotos` }),
    }, 201)
  } catch (err) {
    fail(res, 500, 'Error al subir las fotos')
  }
}

module.exports = { listar, obtenerPorId, crear, postular, actualizarPostulacion, subirFotos }
