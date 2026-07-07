const prisma = require('../lib/prisma')
const { ok, fail } = require('../lib/response')

const ESTADOS_PROPERTY = ['Disponible', 'Arrendado', 'Inactivo']

// Campos de usuario expuestos al panel de Admin — nunca incluir passwordHash
const SELECT_ADMIN_USER = {
  id:                true,
  nombre:            true,
  apellidoPaterno:   true,
  apellidoMaterno:   true,
  dni:               true,
  email:             true,
  telefono:          true,
  fotoUrl:           true,
  identidadValidada: true,
  activo:            true,
  createdAt:         true,
  roles: { select: { role: { select: { nombre: true } } } },
}

function formatUser(user) {
  const { roles, ...rest } = user
  return { ...rest, roles: roles.map((ur) => ur.role.nombre) }
}

// ── GET /admin/stats ──────────────────────────────────────────────────────────
/*
  Response 200:
    { "data": { "usuarios": 12, "inmuebles": 5, "contratos": 3, "pagos": 9 } }
*/
async function stats(req, res) {
  try {
    const [usuarios, inmuebles, contratos, pagos] = await Promise.all([
      prisma.user.count(),
      prisma.property.count(),
      prisma.contract.count(),
      prisma.payment.count(),
    ])
    ok(res, { usuarios, inmuebles, contratos, pagos })
  } catch (err) {
    fail(res, 500, 'Error al obtener las estadísticas')
  }
}

// ── GET /admin/usuarios ────────────────────────────────────────────────────────
/*
  Response 200: { "data": [ { id, nombre, email, activo, roles: ["Arrendador"], ... } ] }
*/
async function listarUsuarios(req, res) {
  try {
    const usuarios = await prisma.user.findMany({
      select:  SELECT_ADMIN_USER,
      orderBy: { createdAt: 'desc' },
    })
    ok(res, usuarios.map(formatUser))
  } catch (err) {
    fail(res, 500, 'Error al listar usuarios')
  }
}

// ── GET /admin/inmuebles ───────────────────────────────────────────────────────
/*
  Todos los inmuebles, de todos los arrendadores (sin filtrar por estado).
  Response 200: { "data": [ { id, titulo, estado, arrendador: { nombre, email }, ... } ] }
*/
async function listarInmuebles(req, res) {
  try {
    const inmuebles = await prisma.property.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        arrendador: { select: { id: true, nombre: true, apellidoPaterno: true, email: true } },
        fotos:      { orderBy: { orden: 'asc' } },
        _count:     { select: { applications: true } },
      },
    })
    ok(res, inmuebles)
  } catch (err) {
    fail(res, 500, 'Error al listar inmuebles')
  }
}

// ── GET /admin/contratos ───────────────────────────────────────────────────────
/*
  Todos los contratos de la plataforma.
  Response 200: { "data": [ { id, estado, monto, application: { property, arrendatario }, ... } ] }
*/
async function listarContratos(req, res) {
  try {
    const contratos = await prisma.contract.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        application: {
          include: {
            property: {
              select: {
                id: true, titulo: true, distrito: true,
                arrendador: { select: { id: true, nombre: true, apellidoPaterno: true, email: true } },
              },
            },
            arrendatario: { select: { id: true, nombre: true, apellidoPaterno: true, email: true } },
          },
        },
        _count: { select: { payments: true, signatures: true } },
      },
    })
    ok(res, contratos)
  } catch (err) {
    fail(res, 500, 'Error al listar contratos')
  }
}

// ── PATCH /admin/usuarios/:id/estado ──────────────────────────────────────────
/*
  Activa o desactiva un usuario. Un usuario desactivado no puede iniciar sesión.
  Un admin no puede desactivarse a sí mismo.

  Request:  { "activo": false }
  Response 200: { "data": { id, nombre, email, activo, roles: [...], ... } }
  Errores:
    400 — El campo activo (boolean) es requerido | No puedes desactivar tu propia cuenta
    404 — Usuario no encontrado
*/
async function actualizarEstadoUsuario(req, res) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return fail(res, 400, 'ID inválido')

    const { activo } = req.body
    if (typeof activo !== 'boolean') {
      return fail(res, 400, 'El campo activo (boolean) es requerido')
    }
    if (id === req.user.id && !activo) {
      return fail(res, 400, 'No puedes desactivar tu propia cuenta')
    }

    const existe = await prisma.user.findUnique({ where: { id } })
    if (!existe) return fail(res, 404, 'Usuario no encontrado')

    const updated = await prisma.user.update({
      where: { id },
      data:  { activo },
      select: SELECT_ADMIN_USER,
    })
    ok(res, formatUser(updated))
  } catch (err) {
    fail(res, 500, 'Error al actualizar el estado del usuario')
  }
}

// ── PATCH /admin/inmuebles/:id/estado ─────────────────────────────────────────
/*
  Cambia el estado de un inmueble (moderación desde el panel de Admin).

  Request:  { "estado": "Disponible" | "Arrendado" | "Inactivo" }
  Response 200: { "data": { id, titulo, estado, ... } }
  Errores:
    400 — Estado inválido
    404 — Inmueble no encontrado
*/
async function actualizarEstadoInmueble(req, res) {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return fail(res, 400, 'ID inválido')

    const { estado } = req.body
    if (!ESTADOS_PROPERTY.includes(estado)) {
      return fail(res, 400, `Estado inválido. Valores permitidos: ${ESTADOS_PROPERTY.join(', ')}`)
    }

    const existe = await prisma.property.findUnique({ where: { id } })
    if (!existe) return fail(res, 404, 'Inmueble no encontrado')

    const updated = await prisma.property.update({ where: { id }, data: { estado } })
    ok(res, updated)
  } catch (err) {
    fail(res, 500, 'Error al actualizar el estado del inmueble')
  }
}

module.exports = {
  stats,
  listarUsuarios,
  listarInmuebles,
  listarContratos,
  actualizarEstadoUsuario,
  actualizarEstadoInmueble,
}
