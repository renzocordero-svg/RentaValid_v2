const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')
const prisma = require('../lib/prisma')
const { ok, fail } = require('../lib/response')

// Roles que un usuario puede elegir al registrarse (Admin se crea internamente)
const ROLES_PERMITIDOS = ['Arrendador', 'Arrendatario']

// Campos públicos del usuario — nunca incluir passwordHash
const SELECT_USER = {
  id:                true,
  nombre:            true,
  apellidoPaterno:   true,
  apellidoMaterno:   true,
  dni:               true,
  email:             true,
  telefono:          true,
  fotoUrl:           true,
  identidadValidada: true,
  createdAt:         true,
  roles: { select: { role: { select: { nombre: true } } } },
}

function buildToken(user, roles) {
  return jwt.sign(
    { id: user.id, roles },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

function formatUser(user) {
  const { roles, ...rest } = user
  return {
    ...rest,
    roles: roles.map((ur) => ur.role.nombre),
  }
}

// ── POST /auth/register ───────────────────────────────────────────────────────
/*
  Request:
    POST /auth/register
    Content-Type: application/json
    {
      "nombre":          "Diego",
      "apellidoPaterno": "Salinas",
      "apellidoMaterno": "Vega",
      "dni":             "47382910",
      "email":           "diego@gmail.com",
      "telefono":        "+51 987 654 321",
      "password":        "MiClave123!",
      "rol":             "Arrendatario"   ← "Arrendador" | "Arrendatario"
    }

  Response 201:
    { "data": { "token": "eyJ...", "user": { "id": 2, "nombre": "Diego", "roles": ["Arrendatario"], ... } } }

  Errores:
    400 — Todos los campos son requeridos
    400 — Rol inválido. Debe ser Arrendador o Arrendatario
    409 — El correo ya está registrado
    409 — El DNI ya está registrado
*/
async function register(req, res) {
  try {
    const { nombre, apellidoPaterno, apellidoMaterno, dni, email, telefono, password, rol } = req.body

    if (!nombre || !apellidoPaterno || !apellidoMaterno || !dni || !email || !telefono || !password || !rol) {
      return fail(res, 400, 'Todos los campos son requeridos')
    }
    if (!ROLES_PERMITIDOS.includes(rol)) {
      return fail(res, 400, `Rol inválido. Debe ser: ${ROLES_PERMITIDOS.join(' o ')}`)
    }

    const [emailExiste, dniExiste] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.user.findUnique({ where: { dni }   }),
    ])
    if (emailExiste) return fail(res, 409, 'El correo ya está registrado')
    if (dniExiste)   return fail(res, 409, 'El DNI ya está registrado')

    const roleRecord = await prisma.role.findUnique({ where: { nombre: rol } })
    if (!roleRecord) return fail(res, 400, 'Rol no encontrado en la base de datos')

    const passwordHash = await bcrypt.hash(password, 12)

    const created = await prisma.user.create({
      data: {
        nombre,
        apellidoPaterno,
        apellidoMaterno,
        dni,
        email,
        telefono,
        passwordHash,
        roles: { create: { roleId: roleRecord.id } },
      },
      select: SELECT_USER,
    })

    const user  = formatUser(created)
    const token = buildToken(user, user.roles)
    ok(res, { token, user }, 201)
  } catch (err) {
    fail(res, 500, 'Error al registrar usuario')
  }
}

// ── POST /auth/login ──────────────────────────────────────────────────────────
/*
  Request:
    POST /auth/login
    Content-Type: application/json
    {
      "email":    "diego@gmail.com",
      "password": "MiClave123!"
    }

  Response 200:
    { "data": { "token": "eyJ...", "user": { "id": 2, "nombre": "Diego", "roles": ["Arrendatario"], ... } } }

  Errores:
    400 — Correo y contraseña requeridos
    401 — Credenciales inválidas
*/
async function login(req, res) {
  try {
    const { email, password } = req.body
    if (!email || !password) return fail(res, 400, 'Correo y contraseña requeridos')

    const found = await prisma.user.findUnique({
      where:  { email },
      select: { ...SELECT_USER, passwordHash: true, activo: true },
    })

    if (!found || !(await bcrypt.compare(password, found.passwordHash))) {
      return fail(res, 401, 'Credenciales inválidas')
    }
    if (!found.activo) {
      return fail(res, 403, 'Tu cuenta está desactivada. Contacta al administrador.')
    }

    const { passwordHash: _p, activo: _a, ...withoutHash } = found
    const user  = formatUser(withoutHash)
    const token = buildToken(user, user.roles)
    ok(res, { token, user })
  } catch (err) {
    fail(res, 500, 'Error al iniciar sesión')
  }
}

// ── GET /auth/me ──────────────────────────────────────────────────────────────
/*
  Request:
    GET /auth/me
    Authorization: Bearer eyJ...

  Response 200:
    {
      "data": {
        "id": 2,
        "nombre": "Diego",
        "apellidoPaterno": "Salinas",
        "apellidoMaterno": "Vega",
        "dni": "47382910",
        "email": "diego@gmail.com",
        "telefono": "+51 987 654 321",
        "fotoUrl": null,
        "identidadValidada": false,
        "roles": ["Arrendatario"],
        "createdAt": "2026-06-29T00:00:00.000Z"
      }
    }

  Errores:
    401 — Token requerido          (sin header)
    401 — Token inválido o expirado
*/
async function me(req, res) {
  try {
    const found = await prisma.user.findUnique({
      where:  { id: req.user.id },
      select: SELECT_USER,
    })
    if (!found) return fail(res, 404, 'Usuario no encontrado')
    ok(res, formatUser(found))
  } catch (err) {
    fail(res, 500, 'Error al obtener el perfil')
  }
}

module.exports = { register, login, me }
