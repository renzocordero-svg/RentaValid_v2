const crypto = require('crypto')
const prisma = require('../lib/prisma')
const { ok, fail } = require('../lib/response')
const { generarContrato } = require('../services/gemini')

// ── POST /contracts/generate ───────────────────────────────────────────────────
/*
  Solo Arrendador, y únicamente si la postulación fue Aceptada.

  Request:  POST /contracts/generate
            Authorization: Bearer <token_arrendador>
            { "applicationId": 5 }

  Response 201:
    {
      "data": {
        "id": 3,
        "applicationId": 5,
        "estado": "Borrador",
        "monto": 1800,
        "garantia": 3600,
        "fechaInicio": "2026-08-01T00:00:00.000Z",
        "fechaFin":    "2027-08-01T00:00:00.000Z",
        "contenido":   "CONTRATO DE ARRENDAMIENTO...",
        "clausulas": [
          { "numero": 1, "titulo": "PRIMERA — Identificación de las Partes", "texto": "..." },
          ...
          { "numero": 9, "titulo": "NOVENA — ALLANAMIENTO A FUTURO", "texto": "...", "ley": "N° 30933" },
          ...
        ]
      }
    }

  Errores:
    400 — applicationId requerido
    403 — Solo el arrendador del inmueble puede generar el contrato
    404 — Postulación no encontrada
    409 — La postulación debe estar en estado Aceptada | Ya existe un contrato
    502 — Fallo de la API de IA (Gemini / Claude)
*/
async function generar(req, res) {
  const { applicationId } = req.body
  if (!applicationId) return fail(res, 400, 'applicationId es requerido')

  // ── 1. Cargar la postulación con todas las relaciones ───────────────────────
  let application
  try {
    application = await prisma.application.findUnique({
      where:   { id: parseInt(applicationId) },
      include: {
        property: {
          include: {
            arrendador: {
              select: {
                id: true, nombre: true, apellidoPaterno: true,
                apellidoMaterno: true, dni: true, email: true,
              },
            },
          },
        },
        arrendatario: {
          select: {
            id: true, nombre: true, apellidoPaterno: true,
            apellidoMaterno: true, dni: true, email: true,
          },
        },
        contract: { select: { id: true } },
      },
    })
  } catch {
    return fail(res, 500, 'Error al consultar la postulación')
  }

  if (!application) return fail(res, 404, 'Postulación no encontrada')

  // ── 2. Validaciones de negocio ──────────────────────────────────────────────

  // Solo el arrendador del inmueble puede generar el contrato
  if (application.property.arrendadorId !== req.user.id) {
    return fail(res, 403, 'Solo el arrendador del inmueble puede generar el contrato')
  }

  // La postulación debe haber sido aceptada previamente
  if (application.estado !== 'Aceptada') {
    return fail(res, 409, `La postulación debe estar en estado "Aceptada" (estado actual: "${application.estado}")`)
  }

  // Evitar duplicados
  if (application.contract) {
    return fail(res, 409, 'Ya existe un contrato para esta postulación. Usa GET /contracts/:id para verlo.')
  }

  // ── 3. Calcular fechas y montos ─────────────────────────────────────────────
  const { property } = application

  const fechaInicio = new Date()
  fechaInicio.setDate(1)
  fechaInicio.setMonth(fechaInicio.getMonth() + 1)
  fechaInicio.setHours(0, 0, 0, 0)

  const fechaFin = new Date(fechaInicio)
  fechaFin.setFullYear(fechaFin.getFullYear() + 1)

  const garantia = property.precio * (property.mesesGarantia ?? 2)

  const fmt = (d) => d.toLocaleDateString('es-PE', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  // ── 4. Construir nombre completo de cada parte ──────────────────────────────
  const nombreCompleto = (u) =>
    [u.nombre, u.apellidoPaterno, u.apellidoMaterno].filter(Boolean).join(' ')

  const datosContrato = {
    arrendador:    { ...application.property.arrendador, nombreCompleto: nombreCompleto(application.property.arrendador) },
    arrendatario:  { ...application.arrendatario,       nombreCompleto: nombreCompleto(application.arrendatario) },
    direccion:     property.direccion,
    distrito:      property.distrito,
    tipoInmueble:  property.tipo,
    monto:         property.precio,
    garantia,
    mesesGarantia: property.mesesGarantia ?? 2,
    fechaInicioStr: fmt(fechaInicio),
    fechaFinStr:    fmt(fechaFin),
  }

  // ── 5. Generar el contrato con IA ───────────────────────────────────────────
  let contenido, clausulas
  try {
    ;({ contenido, clausulas } = await generarContrato(datosContrato))
  } catch (err) {
    console.error('[Contratos] Error generando con IA:', err.message)
    return fail(res, 502, 'No se pudo generar el contrato con la IA. Verifica GEMINI_API_KEY y reintenta.')
  }

  // ── 6. Guardar en base de datos ─────────────────────────────────────────────
  try {
    const contract = await prisma.contract.create({
      data: {
        applicationId: parseInt(applicationId),
        contenido,
        clausulas,
        monto:      property.precio,
        garantia,
        fechaInicio,
        fechaFin,
        estado:     'Borrador',
      },
    })
    return ok(res, contract, 201)
  } catch (err) {
    console.error('[Contratos] Error guardando en BD:', err.message)
    return fail(res, 500, 'El contrato fue generado pero no pudo guardarse. Reintenta.')
  }
}

// ── GET /contracts/:id ────────────────────────────────────────────────────────
/*
  Accesible por ambas partes del contrato.

  Response 200:
    {
      "data": {
        "id": 3, "estado": "Borrador", "monto": 1800, "garantia": 3600,
        "contenido": "...", "clausulas": [...],
        "application": {
          "property": { "titulo": "...", "arrendador": { "nombre": "..." } },
          "arrendatario": { "nombre": "..." }
        },
        "signatures": [],
        "payments": []
      }
    }
  Errores: 403 — Sin acceso | 404 — No encontrado
*/
async function obtenerPorId(req, res) {
  try {
    const contract = await prisma.contract.findUnique({
      where:   { id: parseInt(req.params.id) },
      include: {
        application: {
          include: {
            property: {
              include: {
                arrendador: { select: { id: true, nombre: true, apellidoPaterno: true, email: true } },
              },
            },
            arrendatario: { select: { id: true, nombre: true, apellidoPaterno: true, email: true } },
          },
        },
        signatures: true,
        payments:   true,
      },
    })

    if (!contract) return fail(res, 404, 'Contrato no encontrado')

    // Solo las partes del contrato pueden verlo
    const esArrendador   = contract.application.property.arrendadorId    === req.user.id
    const esArrendatario = contract.application.arrendatarioId === req.user.id
    if (!esArrendador && !esArrendatario) {
      return fail(res, 403, 'No tienes acceso a este contrato')
    }

    return ok(res, contract)
  } catch {
    return fail(res, 500, 'Error al obtener el contrato')
  }
}

// ── PATCH /contracts/:id ──────────────────────────────────────────────────────
/*
  Ambas partes pueden proponer cambios mientras el contrato sea Borrador.
  El arrendador y el arrendatario pueden sobreescribir el texto para negociar.

  Request:  { "contenido": "nuevo texto..." }
  Response: { "data": { "id": 3, "contenido": "...", "estado": "Borrador" } }
  Errores:
    400 — contenido requerido | El contrato no está en borrador
    403 — No eres parte de este contrato
    404 — No encontrado
*/
async function editar(req, res) {
  const { contenido } = req.body
  if (!contenido) return fail(res, 400, 'El campo contenido es requerido')

  try {
    const contract = await prisma.contract.findUnique({
      where:   { id: parseInt(req.params.id) },
      include: { application: { include: { property: true } } },
    })
    if (!contract) return fail(res, 404, 'Contrato no encontrado')

    const esArrendador   = contract.application.property.arrendadorId    === req.user.id
    const esArrendatario = contract.application.arrendatarioId === req.user.id
    if (!esArrendador && !esArrendatario) {
      return fail(res, 403, 'No eres parte de este contrato')
    }
    if (contract.estado !== 'Borrador') {
      return fail(res, 400, 'Solo se puede editar un contrato en estado "Borrador"')
    }

    const updated = await prisma.contract.update({
      where: { id: contract.id },
      data:  { contenido },
    })
    return ok(res, updated)
  } catch {
    return fail(res, 500, 'Error al editar el contrato')
  }
}

// ── POST /contracts/:id/sign ──────────────────────────────────────────────────
/*
  Cualquier parte del contrato firma con su token.
  Cuando ambas partes firman, el contrato pasa a "Firmado".

  Request:  (sin body — la identidad se deduce del token JWT)
  Response: { "data": { "signature": { "hash": "abc...", "tipo": "Arrendatario" }, "contratoFirmado": false } }
  Errores:
    400 — El contrato ya fue firmado | Ya firmaste este contrato
    403 — No eres parte de este contrato
    404 — Contrato no encontrado
*/
async function firmar(req, res) {
  const { codigo, dni } = req.body
  if (!codigo) return fail(res, 400, 'El código de verificación por correo es requerido')
  if (!dni)    return fail(res, 400, 'El DNI es requerido')

  try {
    const contract = await prisma.contract.findUnique({
      where:   { id: parseInt(req.params.id) },
      include: {
        signatures: true,
        application: {
          include: { property: { select: { arrendadorId: true } } },
        },
      },
    })
    if (!contract) return fail(res, 404, 'Contrato no encontrado')

    const esArrendador   = contract.application.property.arrendadorId === req.user.id
    const esArrendatario = contract.application.arrendatarioId        === req.user.id
    if (!esArrendador && !esArrendatario) return fail(res, 403, 'No eres parte de este contrato')
    if (contract.estado === 'Firmado')    return fail(res, 400, 'El contrato ya fue firmado por ambas partes')

    const yaFirmo = contract.signatures.some((s) => s.userId === req.user.id)
    if (yaFirmo) return fail(res, 400, 'Ya firmaste este contrato')

    // ── Verificar DNI ─────────────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where:  { id: req.user.id },
      select: { dni: true },
    })
    if (!user?.dni || user.dni !== dni.trim()) {
      return fail(res, 400, 'El DNI ingresado no coincide con el registrado en tu perfil')
    }

    // ── Verificar código de correo ────────────────────────────────────────────
    const rec = await prisma.verificationCode.findFirst({ where: { userId: req.user.id } })
    if (!rec)                                      return fail(res, 400, 'Solicita un código de verificación antes de firmar')
    if (rec.code !== codigo.toString().trim())      return fail(res, 400, 'Código incorrecto')
    if (new Date() > new Date(rec.expiresAt))       return fail(res, 400, 'El código ha expirado, solicita uno nuevo')
    await prisma.verificationCode.delete({ where: { id: rec.id } })

    // ── Generar hash SHA-256 y crear la firma ─────────────────────────────────
    const ahora = new Date()
    const ip    = req.ip || req.socket?.remoteAddress || '0.0.0.0'
    const tipo  = esArrendador ? 'Arrendador' : 'Arrendatario'
    const hash  = crypto
      .createHash('sha256')
      .update(`${contract.contenido}|${ahora.toISOString()}|${req.user.id}`)
      .digest('hex')

    const signature = await prisma.signature.create({
      data: { contractId: contract.id, userId: req.user.id, tipo, hash, ip },
    })

    // ── Cerrar contrato cuando ambas partes firman ────────────────────────────
    const totalFirmas = contract.signatures.length + 1
    let contratoFirmado = false

    if (totalFirmas >= 2) {
      const hashFirma = crypto
        .createHash('sha256')
        .update(`${contract.id}|${ahora.toISOString()}`)
        .digest('hex')
      await prisma.contract.update({
        where: { id: contract.id },
        data:  { estado: 'Firmado', hashFirma, firmadoAt: ahora },
      })
      contratoFirmado = true
    }

    return ok(res, { signature, contratoFirmado })
  } catch {
    return fail(res, 500, 'Error al firmar el contrato')
  }
}

module.exports = { generar, obtenerPorId, editar, firmar }
