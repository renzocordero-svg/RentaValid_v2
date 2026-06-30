const express = require('express')
const { consultarDni, enviarCodigo, verificarEmail, verificarRostro } = require('../controllers/kyc.controller')
const { authRequired } = require('../middleware/auth')
const { handleKycFotos } = require('../middleware/upload')

const router = express.Router()

// Pública — el usuario la llama antes de registrarse, todavía no tiene token
router.post('/dni',          consultarDni)

// Las siguientes tres requieren token (el usuario ya se registró en el paso 1)
router.post('/send-code',    authRequired, enviarCodigo)
router.post('/verify-email', authRequired, verificarEmail)
router.post('/face',         authRequired, handleKycFotos, verificarRostro)

module.exports = router
