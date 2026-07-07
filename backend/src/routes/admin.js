const express = require('express')
const {
  stats,
  listarUsuarios,
  listarInmuebles,
  listarContratos,
  actualizarEstadoUsuario,
  actualizarEstadoInmueble,
} = require('../controllers/admin.controller')
const { authRequired, roleRequired } = require('../middleware/auth')

const router = express.Router()

// Todas las rutas del panel requieren estar autenticado y tener el rol Admin
router.use(authRequired, roleRequired('Admin'))

// GET   /admin/stats                    — Totales de usuarios, inmuebles, contratos, pagos
router.get('/stats', stats)

// GET   /admin/usuarios                 — Lista todos los usuarios con sus roles
router.get('/usuarios', listarUsuarios)

// GET   /admin/inmuebles                — Lista todos los inmuebles de todos los arrendadores
router.get('/inmuebles', listarInmuebles)

// GET   /admin/contratos                — Lista todos los contratos
router.get('/contratos', listarContratos)

// PATCH /admin/usuarios/:id/estado      — Activa/desactiva un usuario
router.patch('/usuarios/:id/estado', actualizarEstadoUsuario)

// PATCH /admin/inmuebles/:id/estado     — Cambia el estado de un inmueble
router.patch('/inmuebles/:id/estado', actualizarEstadoInmueble)

module.exports = router
