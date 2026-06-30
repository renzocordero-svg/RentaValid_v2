const { PrismaClient } = require('@prisma/client')

// Singleton: una sola instancia en toda la app
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
})

module.exports = prisma
