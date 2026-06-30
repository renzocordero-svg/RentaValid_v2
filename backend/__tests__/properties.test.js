'use strict'

const request = require('supertest')
const jwt     = require('jsonwebtoken')

// ── Mocks ─────────────────────────────────────────────────────────────────────
jest.mock('../src/lib/prisma', () => ({
  property: {
    findMany:   jest.fn(),
    findUnique: jest.fn(),
    create:     jest.fn(),
  },
  application: {
    findUnique: jest.fn(),
    create:     jest.fn(),
  },
}))

// Cloudinary no debe hacer llamadas reales en tests
jest.mock('../src/services/cloudinary', () => ({
  uploadBuffer: jest.fn().mockResolvedValue({
    secure_url: 'https://res.cloudinary.com/test/test.jpg',
  }),
}))

// ── Importaciones ─────────────────────────────────────────────────────────────
const app    = require('../src/app')
const prisma = require('../src/lib/prisma')

// ── Tokens de prueba ──────────────────────────────────────────────────────────
const SECRET           = process.env.JWT_SECRET
const arrendadorToken  = jwt.sign({ id: 1, roles: ['Arrendador']   }, SECRET)
const arrendatarioToken = jwt.sign({ id: 2, roles: ['Arrendatario'] }, SECRET)

// ── Fixtures ──────────────────────────────────────────────────────────────────
const mockProperty = {
  id:            1,
  titulo:        'Departamento de prueba',
  descripcion:   'Descripción del inmueble para tests',
  direccion:     'Av. Test 123',
  distrito:      'Miraflores',
  tipo:          'Departamento',
  area:          75,
  habitaciones:  2,
  banos:         2,
  cochera:       true,
  amoblado:      true,
  precio:        1800,
  mesesGarantia: 2,
  estado:        'Disponible',
  arrendadorId:  1,
  createdAt:     new Date('2026-01-01T00:00:00Z'),
  arrendador:    { id: 1, nombre: 'Carlos', apellidoPaterno: 'Mendoza', fotoUrl: null },
  fotos:         [],
  _count:        { applications: 0 },
}

// Cuerpo válido para crear un inmueble
const newPropertyBody = {
  titulo:       'Nuevo departamento',
  descripcion:  'Descripción completa del inmueble disponible para alquiler',
  direccion:    'Av. Arequipa 1000',
  distrito:     'San Isidro',
  tipo:         'Departamento',
  area:         60,
  habitaciones: 2,
  banos:        1,
  precio:       1500,
}

// ══════════════════════════════════════════════════════════════════════════════
// GET /properties
// ══════════════════════════════════════════════════════════════════════════════
describe('GET /properties', () => {
  test('200 — devuelve lista de inmuebles disponibles', async () => {
    prisma.property.findMany.mockResolvedValue([mockProperty])

    const res = await request(app).get('/properties')

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].id).toBe(1)
  })

  test('200 — devuelve array vacío cuando no hay resultados', async () => {
    prisma.property.findMany.mockResolvedValue([])

    const res = await request(app).get('/properties')

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })

  test('200 — filtra por distrito pasando el where correcto a Prisma', async () => {
    prisma.property.findMany.mockResolvedValue([mockProperty])

    const res = await request(app).get('/properties?distrito=Miraflores')

    expect(res.status).toBe(200)
    expect(prisma.property.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ distrito: 'Miraflores' }),
      })
    )
  })

  test('200 — filtra por rango de precio (precioMin y precioMax)', async () => {
    prisma.property.findMany.mockResolvedValue([mockProperty])

    const res = await request(app).get('/properties?precioMin=1000&precioMax=2000')

    expect(res.status).toBe(200)
    expect(prisma.property.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          precio: { gte: 1000, lte: 2000 },
        }),
      })
    )
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// GET /properties/:id
// ══════════════════════════════════════════════════════════════════════════════
describe('GET /properties/:id', () => {
  test('200 — devuelve el inmueble con su detalle completo', async () => {
    prisma.property.findUnique.mockResolvedValue({
      ...mockProperty,
      applications: [],
    })

    const res = await request(app).get('/properties/1')

    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(1)
    expect(res.body.data.titulo).toBe('Departamento de prueba')
    expect(res.body.data.distrito).toBe('Miraflores')
  })

  test('404 — inmueble no encontrado', async () => {
    prisma.property.findUnique.mockResolvedValue(null)

    const res = await request(app).get('/properties/9999')

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/no encontrado/)
  })

  test('400 — id no es un número', async () => {
    const res = await request(app).get('/properties/no-es-numero')

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/ID inválido/)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// POST /properties (solo Arrendador)
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /properties', () => {
  test('201 — Arrendador crea un inmueble exitosamente', async () => {
    prisma.property.create.mockResolvedValue({
      ...mockProperty,
      titulo: newPropertyBody.titulo,
    })

    const res = await request(app)
      .post('/properties')
      .set('Authorization', `Bearer ${arrendadorToken}`)
      .send(newPropertyBody)

    expect(res.status).toBe(201)
    expect(res.body.data).toHaveProperty('id')
    expect(res.body.data.titulo).toBe(newPropertyBody.titulo)
  })

  test('400 — faltan campos requeridos', async () => {
    const res = await request(app)
      .post('/properties')
      .set('Authorization', `Bearer ${arrendadorToken}`)
      .send({ titulo: 'Solo título, sin más campos' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Faltan campos/)
  })

  test('400 — tipo de inmueble no existe', async () => {
    const res = await request(app)
      .post('/properties')
      .set('Authorization', `Bearer ${arrendadorToken}`)
      .send({ ...newPropertyBody, tipo: 'Garaje' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Tipo inválido/)
  })

  test('401 — sin token de autenticación', async () => {
    const res = await request(app)
      .post('/properties')
      .send(newPropertyBody)

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/Token requerido/)
  })

  test('403 — Arrendatario no puede crear inmuebles', async () => {
    const res = await request(app)
      .post('/properties')
      .set('Authorization', `Bearer ${arrendatarioToken}`)
      .send(newPropertyBody)

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/No tienes permiso/)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// POST /properties/:id/postular (solo Arrendatario)
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /properties/:id/postular', () => {
  test('201 — Arrendatario postula a inmueble disponible', async () => {
    prisma.property.findUnique.mockResolvedValue(mockProperty)
    prisma.application.findUnique.mockResolvedValue(null)     // sin postulación previa
    prisma.application.create.mockResolvedValue({
      id:            1,
      propertyId:    1,
      arrendatarioId: 2,
      estado:        'Pendiente',
      property:      { id: 1, titulo: 'Departamento de prueba', distrito: 'Miraflores' },
      arrendatario:  { id: 2, nombre: 'Diego', email: 'diego@test.pe' },
    })

    const res = await request(app)
      .post('/properties/1/postular')
      .set('Authorization', `Bearer ${arrendatarioToken}`)

    expect(res.status).toBe(201)
    expect(res.body.data.estado).toBe('Pendiente')
    expect(res.body.data.propertyId).toBe(1)
  })

  test('404 — inmueble no existe', async () => {
    prisma.property.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .post('/properties/9999/postular')
      .set('Authorization', `Bearer ${arrendatarioToken}`)

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/no encontrado/)
  })

  test('400 — inmueble no está disponible (ya arrendado)', async () => {
    prisma.property.findUnique.mockResolvedValue({
      ...mockProperty,
      estado: 'Arrendado',
    })

    const res = await request(app)
      .post('/properties/1/postular')
      .set('Authorization', `Bearer ${arrendatarioToken}`)

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/no está disponible/)
  })

  test('409 — el usuario ya postuló a este inmueble', async () => {
    prisma.property.findUnique.mockResolvedValue(mockProperty)
    prisma.application.findUnique.mockResolvedValue({ id: 5 })   // postulación duplicada

    const res = await request(app)
      .post('/properties/1/postular')
      .set('Authorization', `Bearer ${arrendatarioToken}`)

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/Ya postulaste/)
  })

  test('401 — sin token', async () => {
    const res = await request(app).post('/properties/1/postular')

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/Token requerido/)
  })

  test('403 — Arrendador no puede postular a sus propios inmuebles', async () => {
    const res = await request(app)
      .post('/properties/1/postular')
      .set('Authorization', `Bearer ${arrendadorToken}`)

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/No tienes permiso/)
  })
})
