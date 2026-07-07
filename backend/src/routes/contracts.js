const express = require('express')
const { generar, editar, firmar, obtenerPorId } = require('../controllers/contracts.controller')
const { authRequired } = require('../middleware/auth')

const router = express.Router()

router.post('/generate',  authRequired, generar)
router.get('/:id',        authRequired, obtenerPorId)
router.patch('/:id',      authRequired, editar)
router.post('/:id/sign',  authRequired, firmar)

module.exports = router
