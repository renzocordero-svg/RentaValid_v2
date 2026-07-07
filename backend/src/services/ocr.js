const path = require('path')
const { createWorker } = require('tesseract.js')

const TESSDATA_DIR = path.join(__dirname, '..', '..', 'assets', 'tessdata')

/**
 * Extrae el primer número de DNI (exactamente 8 dígitos) de un texto.
 * Usa \d{8} con límites para no capturar bloques más largos.
 */
function extraerDni(texto) {
  if (!texto) return null
  const m = String(texto).match(/(?<!\d)\d{8}(?!\d)/)
  return m ? m[0] : null
}

// Worker singleton perezoso: se crea una sola vez y se reutiliza en todas
// las llamadas siguientes. Crear/terminar un worker por request recarga
// ~8.4MB del modelo de entrenamiento en cada llamada, lo que puede exceder
// los timeouts de la plataforma (p.ej. Render) bajo carga.
let workerPromise = null
function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker('spa', 1, {
      langPath: TESSDATA_DIR,
      gzip: true,
      cacheMethod: 'none',
    })
  }
  return workerPromise
}

/**
 * Corre OCR (español) sobre el buffer de una imagen y extrae el DNI.
 * Usa el .traineddata empaquetado localmente (sin CDN en runtime).
 * Reutiliza un worker singleton (no lo termina por request).
 */
async function leerDniDeImagen(buffer) {
  const worker = await getWorker()
  const { data } = await worker.recognize(buffer)
  const textoCrudo = data?.text || ''
  return { dniLeido: extraerDni(textoCrudo), textoCrudo }
}

module.exports = { extraerDni, leerDniDeImagen }
