const prisma = require('../lib/prisma')
const { ok, fail } = require('../lib/response')

const TASA_COMISION = 0.05

// Calcula el estado real sin modificar la BD.
// Un pago Pendiente vence el día 5 del mes indicado en "periodo" (formato YYYY-MM).
function estadoEfectivo(payment) {
  if (payment.estado !== 'Pendiente')           return payment.estado
  if (payment.periodo === 'garantia-devolucion') return 'Pendiente'
  const m = payment.periodo.match(/^(\d{4})-(\d{2})$/)
  if (!m) return payment.estado
  const vencimiento = new Date(parseInt(m[1]), parseInt(m[2]) - 1, 5)
  return new Date() > vencimiento ? 'Atrasado' : 'Pendiente'
}

// ── GET /payments?contractId= ──────────────────────────────────────────────────
/*
  Devuelve los pagos donde el usuario autenticado es arrendador o arrendatario.
  Acepta ?contractId= para filtrar por contrato.
  Añade el campo calculado "estadoEfectivo" (Pendiente | Pagado | Atrasado).

  Response:
    { "data": [ { "id": 1, "periodo": "2026-07", "monto": 1800,
                  "comision": 90, "estado": "Pendiente",
                  "estadoEfectivo": "Atrasado",
                  "contract": { "monto": 1800, "garantia": 3600,
                    "application": { "arrendatarioId": 5,
                      "property": { "titulo": "...", "arrendadorId": 3 } } } } ] }
*/
async function listar(req, res) {
  const { contractId } = req.query
  try {
    const where = {
      contract: {
        application: {
          OR: [
            { arrendatarioId: req.user.id },
            { property: { arrendadorId: req.user.id } },
          ],
        },
      },
    }
    if (contractId) where.contractId = parseInt(contractId)

    const payments = await prisma.payment.findMany({
      where,
      include: {
        contract: {
          include: {
            application: {
              select: {
                arrendatarioId: true,
                property: {
                  select: {
                    id: true, titulo: true, distrito: true, arrendadorId: true,
                    fotos: { select: { url: true }, orderBy: { orden: 'asc' }, take: 1 },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    ok(res, payments.map(p => ({ ...p, estadoEfectivo: estadoEfectivo(p) })))
  } catch {
    fail(res, 500, 'Error al listar los pagos')
  }
}

// ── POST /payments ────────────────────────────────────────────────────────────
/*
  Solo Arrendatario del contrato.

  Request:  { "contractId": 1, "monto": 1800, "periodo": "2026-07" }
  Response 201:
    { "data": { "id": 1, "periodo": "2026-07", "monto": 1800,
                "comision": 90, "estado": "Pendiente" } }
  Errores:
    400 — Faltan campos | Contrato no firmado
    403 — Solo el arrendatario puede registrar pagos
    404 — Contrato no encontrado
    409 — Ya existe un pago para este periodo
*/
async function registrar(req, res) {
  const { contractId, monto, periodo } = req.body
  if (!contractId || !monto || !periodo) {
    return fail(res, 400, 'contractId, monto y periodo son requeridos')
  }

  try {
    const contract = await prisma.contract.findUnique({
      where:   { id: parseInt(contractId) },
      include: { application: { select: { arrendatarioId: true } } },
    })
    if (!contract)                       return fail(res, 404, 'Contrato no encontrado')
    if (contract.estado !== 'Firmado')   return fail(res, 400, 'El contrato aún no está firmado')
    if (contract.application.arrendatarioId !== req.user.id) {
      return fail(res, 403, 'Solo el arrendatario puede registrar pagos')
    }

    const existente = await prisma.payment.findFirst({
      where: { contractId: contract.id, periodo },
    })
    if (existente) return fail(res, 409, `Ya existe un pago para el periodo ${periodo}`)

    const montoNum = parseFloat(monto)
    const comision = periodo === 'garantia-devolucion'
      ? 0
      : Math.round(montoNum * TASA_COMISION * 100) / 100

    const payment = await prisma.payment.create({
      data: { contractId: contract.id, periodo, monto: montoNum, comision, estado: 'Pendiente' },
    })
    ok(res, payment, 201)
  } catch {
    fail(res, 500, 'Error al registrar el pago')
  }
}

// ── PATCH /payments/:id/confirm ───────────────────────────────────────────────
/*
  Solo Arrendador del contrato. Confirma la recepción del pago.

  Response: { "data": { "id": 1, "estado": "Pagado", "fechaPago": "..." } }
  Errores:
    400 — El pago ya fue confirmado
    403 — Solo el arrendador puede confirmar
    404 — Pago no encontrado
*/
async function confirmar(req, res) {
  try {
    const payment = await prisma.payment.findUnique({
      where:   { id: parseInt(req.params.id) },
      include: {
        contract: {
          include: {
            application: {
              include: { property: { select: { arrendadorId: true } } },
            },
          },
        },
      },
    })
    if (!payment) return fail(res, 404, 'Pago no encontrado')

    if (payment.contract.application.property.arrendadorId !== req.user.id) {
      return fail(res, 403, 'Solo el arrendador del inmueble puede confirmar la recepción del pago')
    }
    if (payment.estado === 'Pagado') return fail(res, 400, 'El pago ya fue confirmado')

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data:  { estado: 'Pagado', fechaPago: new Date() },
    })
    ok(res, updated)
  } catch {
    fail(res, 500, 'Error al confirmar el pago')
  }
}

// ── POST /payments/garantia ───────────────────────────────────────────────────
/*
  Solo Arrendador. Registra la devolución de la garantía al arrendatario.
  El contrato debe estar Firmado o Finalizado.

  Request:  { "contractId": 3 }
  Response 201:
    { "data": { "id": 7, "periodo": "garantia-devolucion",
                "monto": 3600, "comision": 0, "estado": "Pagado" } }
  Errores:
    400 — contractId requerido | Contrato no firmado
    403 — Solo el arrendador puede devolver la garantía
    404 — Contrato no encontrado
    409 — La garantía ya fue devuelta
*/
async function devolverGarantia(req, res) {
  const { contractId } = req.body
  if (!contractId) return fail(res, 400, 'contractId es requerido')

  try {
    const contract = await prisma.contract.findUnique({
      where:   { id: parseInt(contractId) },
      include: {
        application: { include: { property: { select: { arrendadorId: true } } } },
      },
    })
    if (!contract) return fail(res, 404, 'Contrato no encontrado')

    if (contract.application.property.arrendadorId !== req.user.id) {
      return fail(res, 403, 'Solo el arrendador puede registrar la devolución de garantía')
    }
    if (!['Firmado', 'Finalizado'].includes(contract.estado)) {
      return fail(res, 400, 'Solo se puede devolver la garantía de contratos firmados o finalizados')
    }

    const existente = await prisma.payment.findFirst({
      where: { contractId: parseInt(contractId), periodo: 'garantia-devolucion' },
    })
    if (existente) return fail(res, 409, 'La garantía ya fue registrada como devuelta')

    const payment = await prisma.payment.create({
      data: {
        contractId: parseInt(contractId),
        periodo:    'garantia-devolucion',
        monto:      contract.garantia,
        comision:   0,
        estado:     'Pagado',
        fechaPago:  new Date(),
      },
    })
    ok(res, payment, 201)
  } catch {
    fail(res, 500, 'Error al registrar la devolución de garantía')
  }
}

module.exports = { listar, registrar, confirmar, devolverGarantia }
