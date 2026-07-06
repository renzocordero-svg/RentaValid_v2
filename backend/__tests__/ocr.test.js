'use strict'
const { extraerDni } = require('../src/services/ocr')

describe('extraerDni', () => {
  test('extrae 8 dígitos consecutivos de un texto de OCR', () => {
    expect(extraerDni('REPUBLICA DEL PERU\nDNI 47382910\nSALINAS')).toBe('47382910')
  })
  test('ignora números de menos de 8 dígitos', () => {
    expect(extraerDni('Lima 15001 telefono 999')).toBeNull()
  })
  test('devuelve null si no hay texto', () => {
    expect(extraerDni('')).toBeNull()
  })
  test('toma el primer bloque de exactamente 8 dígitos', () => {
    expect(extraerDni('cod 123456789 dni 47382910')).toBe('47382910')
  })
})
