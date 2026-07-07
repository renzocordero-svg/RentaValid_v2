const { v2: cloudinary } = require('cloudinary')

const CLOUDINARY_CONFIGURADO = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
)

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Sube un buffer a Cloudinary y devuelve el resultado completo.
// Modo simulado (sin credenciales Cloudinary): devuelve una imagen placeholder
// estable para que la publicación de inmuebles funcione en la demo offline.
function uploadBuffer(buffer, options = {}) {
  if (!CLOUDINARY_CONFIGURADO) {
    const seed = Math.random().toString(36).slice(2, 10)
    const secure_url = `https://picsum.photos/seed/rv-${seed}/800/600`
    console.warn('[Cloudinary] Sin credenciales — usando imagen placeholder (simulado):', secure_url)
    return Promise.resolve({ secure_url, public_id: `simulado/${seed}`, simulado: true })
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
    stream.end(buffer)
  })
}

module.exports = { cloudinary, uploadBuffer }
