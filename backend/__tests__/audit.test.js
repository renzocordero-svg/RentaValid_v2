'use strict'

jest.mock('../src/lib/prisma', () => ({
  auditLog: { create: jest.fn() },
}))

const prisma = require('../src/lib/prisma')
const { logAudit } = require('../src/services/audit')
const { parsePagination } = require('../src/lib/pagination')

describe('logAudit', () => {
  test('crea un registro con los campos y valores por defecto', async () => {
    prisma.auditLog.create.mockResolvedValue({ id: 1 })
    await logAudit({ adminId: 7, accion: 'user.deactivate', entidad: 'User', entidadId: 42, ip: '1.2.3.4' })
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: { adminId: 7, accion: 'user.deactivate', entidad: 'User', entidadId: 42, detalle: null, ip: '1.2.3.4' },
    })
  })
})

describe('parsePagination', () => {
  test('valores por defecto cuando faltan o son inválidos', () => {
    expect(parsePagination({})).toEqual({ page: 1, pageSize: 20, skip: 0, take: 20 })
    expect(parsePagination({ page: '0', pageSize: 'x' })).toEqual({ page: 1, pageSize: 20, skip: 0, take: 20 })
  })
  test('calcula skip y respeta el máximo', () => {
    expect(parsePagination({ page: '3', pageSize: '10' })).toEqual({ page: 3, pageSize: 10, skip: 20, take: 10 })
    expect(parsePagination({ pageSize: '500' })).toEqual({ page: 1, pageSize: 100, skip: 0, take: 100 })
  })
})
