const express = require('express')
const { listar, registrar, confirmar, devolverGarantia } = require('../controllers/payments.controller')
const { authRequired } = require('../middleware/auth')

const router = express.Router()

router.get('/',              authRequired, listar)
router.post('/',             authRequired, registrar)
router.post('/garantia',     authRequired, devolverGarantia)   // antes de /:id para evitar conflictos
router.patch('/:id/confirm', authRequired, confirmar)

module.exports = router
