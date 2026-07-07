const prisma = require('../lib/prisma')

// Registra una acción mutante de un Admin. Llamar SIEMPRE después de aplicar el
// cambio. Las lecturas (GET) no se auditan.
async function logAudit({ adminId, accion, entidad, entidadId = null, detalle = null, ip = null }) {
  return prisma.auditLog.create({
    data: { adminId, accion, entidad, entidadId, detalle, ip },
  })
}

module.exports = { logAudit }
