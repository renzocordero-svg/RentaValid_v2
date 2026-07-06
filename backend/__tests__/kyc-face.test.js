'use strict'
const request = require('supertest')
const jwt     = require('jsonwebtoken')

jest.mock('../src/lib/prisma', () => ({
  user: { findUnique: jest.fn(), update: jest.fn() },
}))
jest.mock('../src/services/ocr', () => ({
  leerDniDeImagen: jest.fn(),
}))

const app    = require('../src/app')
const prisma = require('../src/lib/prisma')
const { leerDniDeImagen } = require('../src/services/ocr')

const token = jwt.sign({ id: 1, roles: ['Arrendatario'] }, process.env.JWT_SECRET)
const png = Buffer.from('89504e470d0a1a0a', 'hex') // encabezado PNG mínimo

beforeEach(() => {
  prisma.user.findUnique.mockResolvedValue({ dni: '47382910' })
  prisma.user.update.mockResolvedValue({ id: 1 })
})

test('OCR coincide → coincide=true y guarda el resultado', async () => {
  leerDniDeImagen.mockResolvedValue({ dniLeido: '47382910', textoCrudo: 'DNI 47382910' })
  const res = await request(app)
    .post('/kyc/face')
    .set('Authorization', `Bearer ${token}`)
    .field('rostroSimilitud', '87')
    .attach('dniFoto', png, 'dni.png')
    .attach('selfie', png, 'selfie.png')
  expect(res.status).toBe(200)
  expect(res.body.data.ocr).toEqual({ dniLeido: '47382910', coincide: true })
  expect(res.body.data.rostroSimilitud).toBe(87)
  expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ identidadValidada: true, ocrDniCoincide: true, rostroSimilitud: 87 }),
  }))
})

test('OCR no coincide → coincide=false pero NO bloquea (advisory, 200)', async () => {
  leerDniDeImagen.mockResolvedValue({ dniLeido: '11112222', textoCrudo: 'DNI 11112222' })
  const res = await request(app)
    .post('/kyc/face')
    .set('Authorization', `Bearer ${token}`)
    .field('rostroSimilitud', '40')
    .attach('dniFoto', png, 'dni.png')
    .attach('selfie', png, 'selfie.png')
  expect(res.status).toBe(200)
  expect(res.body.data.ocr.coincide).toBe(false)
})

test('OCR lanza excepción → coincide=null, sigue 200 (advisory)', async () => {
  leerDniDeImagen.mockRejectedValue(new Error('tesseract falló'))
  const res = await request(app)
    .post('/kyc/face')
    .set('Authorization', `Bearer ${token}`)
    .attach('dniFoto', png, 'dni.png')
    .attach('selfie', png, 'selfie.png')
  expect(res.status).toBe(200)
  expect(res.body.data.ocr.dniLeido).toBeNull()
  expect(res.body.data.ocr.coincide).toBeNull()
})

test('faltan imágenes → 400', async () => {
  const res = await request(app)
    .post('/kyc/face')
    .set('Authorization', `Bearer ${token}`)
  expect(res.status).toBe(400)
})
