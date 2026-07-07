const multer = require('multer')
const { fail } = require('../lib/response')

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp']
const MB               = 1024 * 1024

// ── Fábrica interna ───────────────────────────────────────────────────────────

function makeMulter(maxBytes, maxFiles) {
  return multer({
    storage: multer.memoryStorage(),
    limits:  { fileSize: maxBytes, files: maxFiles },
    fileFilter(_req, file, cb) {
      TIPOS_PERMITIDOS.includes(file.mimetype)
        ? cb(null, true)
        : cb(new Error(`Tipo no permitido: ${file.mimetype}. Usa JPG, PNG o WEBP`))
    },
  })
}

function wrapMulter(multerFn) {
  return (req, res, next) => {
    multerFn(req, res, (err) => {
      if (!err) return next()
      if (err.code === 'LIMIT_FILE_SIZE')      return fail(res, 400, `Archivo demasiado grande. Máximo ${err.limit / MB} MB`)
      if (err.code === 'LIMIT_FILE_COUNT')     return fail(res, 400, 'Demasiados archivos en la solicitud')
      if (err.code === 'LIMIT_UNEXPECTED_FILE') return fail(res, 400, `Campo de archivo inesperado: ${err.field}`)
      return fail(res, 400, err.message)
    })
  }
}

// ── Fotos de inmueble: campo "fotos", hasta 10, 5 MB c/u ──────────────────────

const handleUpload = wrapMulter(makeMulter(5 * MB, 10).array('fotos', 10))

// ── KYC: campos "dniFoto" y "selfie", 1 archivo c/u, 8 MB c/u ────────────────

const kycFields = makeMulter(8 * MB, 2).fields([
  { name: 'dniFoto', maxCount: 1 },
  { name: 'selfie',  maxCount: 1 },
])

const handleKycFotos = wrapMulter(kycFields)

module.exports = { handleUpload, handleKycFotos }
