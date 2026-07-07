const express = require('express')
const { register, login, me } = require('../controllers/auth.controller')
const { authRequired } = require('../middleware/auth')

const router = express.Router()

// POST /auth/register  — Crea cuenta + devuelve token (201)
router.post('/register', register)

// POST /auth/login     — Autentica y devuelve token (200)
router.post('/login',    login)

// GET  /auth/me        — Perfil del usuario autenticado (requiere Bearer token)
router.get('/me',        authRequired, me)

module.exports = router
