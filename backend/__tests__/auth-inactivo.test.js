'use strict'

const request = require('supertest')

jest.mock('../src/lib/prisma', () => ({
  user: { findUnique: jest.fn() },
}))
jest.mock('bcryptjs', () => ({ compare: jest.fn() }))

const app    = require('../src/app')
const prisma = require('../src/lib/prisma')
const bcrypt = require('bcryptjs')

const baseUser = {
  id: 1, nombre: 'Ana', apellidoPaterno: 'Lopez', apellidoMaterno: 'Diaz',
  dni: '12345678', email: 'ana@test.pe', telefono: '+51 900 000 000',
  fotoUrl: null, identidadValidada: true, createdAt: new Date('2026-01-01T00:00:00Z'),
  roles: [{ role: { nombre: 'Arrendatario' } }],
  passwordHash: '$2b$12$hash',
}

describe('POST /auth/login — cuenta desactivada', () => {
  test('403 cuando el usuario está desactivado', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...baseUser, activo: false })
    bcrypt.compare.mockResolvedValue(true)

    const res = await request(app).post('/auth/login').send({ email: 'ana@test.pe', password: 'x' })

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/desactivada/i)
  })

  test('200 cuando el usuario está activo', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...baseUser, activo: true })
    bcrypt.compare.mockResolvedValue(true)

    const res = await request(app).post('/auth/login').send({ email: 'ana@test.pe', password: 'x' })

    expect(res.status).toBe(200)
    expect(res.body.data.token).toBeDefined()
    expect(res.body.data.user).not.toHaveProperty('activo')
  })
})
