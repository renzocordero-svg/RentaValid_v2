const express = require('express')
const {
  listar, obtenerPorId, crear, apply, postular, subirFotos,
} = require('../controllers/properties.controller')
const { authRequired, roleRequired } = require('../middleware/auth')
const { handleUpload } = require('../middleware/upload')

const router = express.Router()

// GET  /properties              — Lista pública con filtros
router.get('/', listar)

// GET  /properties/:id          — Detalle público
router.get('/:id', obtenerPorId)

// POST /properties              — Crea inmueble (solo Arrendador)
router.post('/',
  authRequired,
  roleRequired('Arrendador'),
  crear
)

// POST /properties/:id/apply    — Postular (spec oficial, solo Arrendatario)
router.post('/:id/apply',
  authRequired,
  roleRequired('Arrendatario'),
  apply
)

// POST /properties/:id/fotos    — Sube fotos a Cloudinary (solo Arrendador dueño)
router.post('/:id/fotos',
  authRequired,
  roleRequired('Arrendador'),
  handleUpload,
  subirFotos
)

// POST /properties/:id/postular — Backward compat → delega a /apply
router.post('/:id/postular',
  authRequired,
  roleRequired('Arrendatario'),
  postular
)

module.exports = router
