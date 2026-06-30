const express = require('express')
const { calcular, obtenerMio } = require('../controllers/scoring.controller')
const { authRequired, roleRequired } = require('../middleware/auth')

const router = express.Router()

router.post('/',    authRequired, roleRequired('Arrendatario'), calcular)
router.get('/me',   authRequired, obtenerMio)

module.exports = router
