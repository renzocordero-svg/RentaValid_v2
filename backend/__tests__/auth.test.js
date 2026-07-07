'use strict'

const request = require('supertest')
const jwt     = require('jsonwebtoken')

// ── Mocks (Jest los eleva al principio del archivo automáticamente) ────────────
jest.mock('../src/lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    create:     jest.fn(),
  },
  role: {
    findUnique: jest.fn(),
  },
}))

jest.mock('bcryptjs', () => ({
  hash:    jest.fn().mockResolvedValue('$2b$12$hashed_password_para_tests'),
  compare: jest.fn(),
}))

// ── Importaciones (después de registrar los mocks) ────────────────────────────
const app    = require('../src/app')
const prisma = require('../src/lib/prisma')
const bcrypt = require('bcryptjs')

// ── Fixtures ──────────────────────────────────────────────────────────────────
const mockRole = { id: 2, nombre: 'Arrendatario' }

// Forma que devuelve Prisma con SELECT_USER (sin passwordHash)
const mockUser = {
  id:                1,
  nombre:            'Diego',
  apellidoPaterno:   'Salinas',
  apellidoMaterno:   'Vega',
  dni:               '47382910',
  email:             'diego@test.pe',
  telefono:          '+51 999 000 111',
  fotoUrl:           null,
  identidadValidada: false,
  createdAt:         new Date('2026-01-01T00:00:00Z'),
  roles:             [{ role: { nombre: 'Arrendatario' } }],
  activo:            true,
}

// Cuerpo válido de registro
const registerBody = {
  nombre:          'Diego',
  apellidoPaterno: 'Salinas',
  apellidoMaterno: 'Vega',
  dni:             '47382910',
  email:           'diego@test.pe',
  telefono:        '+51 999 000 111',
  password:        'Test1234!',
  rol:             'Arrendatario',
}

// ══════════════════════════════════════════════════════════════════════════════
// POST /auth/register
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /auth/register', () => {
  test('201 — crea usuario y devuelve token + user sin passwordHash', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(null)   // email no existe
      .mockResolvedValueOnce(null)   // dni no existe
    prisma.role.findUnique.mockResolvedValue(mockRole)
    prisma.user.create.mockResolvedValue(mockUser)

    const res = await request(app).post('/auth/register').send(registerBody)

    expect(res.status).toBe(201)
    expect(res.body.data).toHaveProperty('token')
    expect(res.body.data.user.roles).toEqual(['Arrendatario'])
    expect(res.body.data.user).not.toHaveProperty('passwordHash')
  })

  test('400 — faltan campos requeridos', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'solo@email.com' })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
    expect(res.body.error).toMatch(/requeridos/)
  })

  test('400 — rol inválido (Admin no está permitido)', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ ...registerBody, rol: 'Admin' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Rol inválido/)
  })

  test('409 — email ya está registrado', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 99, email: registerBody.email })  // email existe
      .mockResolvedValueOnce(null)                                     // dni libre

    const res = await request(app).post('/auth/register').send(registerBody)

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/correo ya está registrado/)
  })

  test('409 — DNI ya está registrado', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(null)                                   // email libre
      .mockResolvedValueOnce({ id: 99, dni: registerBody.dni })     // dni existe

    const res = await request(app).post('/auth/register').send(registerBody)

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/DNI ya está registrado/)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// POST /auth/login
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /auth/login', () => {
  const mockUserWithHash = { ...mockUser, passwordHash: '$2b$12$hashed_password_para_tests' }

  test('200 — login exitoso devuelve token y datos del usuario', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUserWithHash)
    bcrypt.compare.mockResolvedValue(true)

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'diego@test.pe', password: 'Test1234!' })

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('token')
    expect(res.body.data.user.email).toBe('diego@test.pe')
    expect(res.body.data.user).not.toHaveProperty('passwordHash')
  })

  test('400 — faltan email o contraseña', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'diego@test.pe' })    // sin password

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/requeridos/)
  })

  test('401 — contraseña incorrecta', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUserWithHash)
    bcrypt.compare.mockResolvedValue(false)

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'diego@test.pe', password: 'ClaveEquivocada!' })

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/Credenciales inválidas/)
  })

  test('401 — usuario no existe', async () => {
    prisma.user.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'noexiste@test.pe', password: 'Test1234!' })

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/Credenciales inválidas/)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// GET /auth/me
// ══════════════════════════════════════════════════════════════════════════════
describe('GET /auth/me', () => {
  // Genera un token válido con el mismo secret que usa el middleware de tests
  const validToken = jwt.sign(
    { id: 1, roles: ['Arrendatario'] },
    process.env.JWT_SECRET
  )

  test('200 — devuelve perfil del usuario autenticado', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser)

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${validToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(1)
    expect(res.body.data.nombre).toBe('Diego')
    expect(res.body.data.roles).toEqual(['Arrendatario'])
  })

  test('401 — sin header Authorization', async () => {
    const res = await request(app).get('/auth/me')

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/Token requerido/)
  })

  test('401 — token manipulado o firmado con secret distinto', async () => {
    const badToken = jwt.sign({ id: 1 }, 'secreto_incorrecto')

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${badToken}`)

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/inválido/)
  })
})
