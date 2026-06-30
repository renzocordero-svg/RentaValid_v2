const express = require('express')
const { actualizarPostulacion } = require('../controllers/properties.controller')
const { authRequired, roleRequired } = require('../middleware/auth')

const router = express.Router()

// PATCH /applications/:id — Arrendador acepta o rechaza una postulación
router.patch('/:id',
  authRequired,
  roleRequired('Arrendador'),
  actualizarPostulacion
)

module.exports = router
