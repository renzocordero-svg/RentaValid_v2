const express = require('express')
const {
  listar, obtenerPorId, crear, postular, subirFotos,
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

// POST /properties/:id/fotos    — Sube fotos a Cloudinary (solo Arrendador dueño)
router.post('/:id/fotos',
  authRequired,
  roleRequired('Arrendador'),
  handleUpload,          // multer: parsea multipart y valida tipo/tamaño
  subirFotos             // sube a Cloudinary y guarda en PropertyPhoto
)

// POST /properties/:id/postular — Postula al inmueble (solo Arrendatario)
router.post('/:id/postular',
  authRequired,
  roleRequired('Arrendatario'),
  postular
)

module.exports = router
