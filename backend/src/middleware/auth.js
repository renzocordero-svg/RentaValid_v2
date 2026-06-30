const jwt  = require('jsonwebtoken')
const { fail } = require('../lib/response')

// ── authRequired ──────────────────────────────────────────────────────────────
/*
  Verifica que el header Authorization contenga un JWT válido.
  Si pasa, adjunta el payload decodificado en req.user:
    { id: number, roles: string[], iat: number, exp: number }

  Uso:
    router.get('/me', authRequired, meController)
*/
function authRequired(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return fail(res, 401, 'Token requerido')
  }
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET)
    next()
  } catch {
    fail(res, 401, 'Token inválido o expirado')
  }
}

// ── roleRequired ──────────────────────────────────────────────────────────────
/*
  Restringe la ruta a usuarios que tengan AL MENOS UNO de los roles indicados.
  Debe colocarse después de authRequired.

  Uso:
    router.post('/', authRequired, roleRequired('Arrendador'), crearInmueble)
    router.post('/apply', authRequired, roleRequired('Arrendatario'), postular)
    router.get('/admin', authRequired, roleRequired('Admin', 'Arrendador'), verPanel)

  Errores:
    403 — No tienes permiso para esta acción
*/
function roleRequired(...rolesPermitidos) {
  return (req, res, next) => {
    const userRoles = req.user?.roles ?? []
    const tieneAcceso = rolesPermitidos.some((r) => userRoles.includes(r))
    if (!tieneAcceso) {
      return fail(res, 403, 'No tienes permiso para esta acción')
    }
    next()
  }
}

module.exports = { authRequired, roleRequired }
