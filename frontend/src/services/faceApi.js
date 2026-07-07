import * as faceapi from 'face-api.js'

let modelosCargados = false

// Carga (una sola vez) los modelos ligeros desde /public/models.
export async function cargarModelos() {
  if (modelosCargados) return
  const url = '/models'
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(url),
    faceapi.nets.faceLandmark68Net.loadFromUri(url),
    faceapi.nets.faceRecognitionNet.loadFromUri(url),
  ])
  modelosCargados = true
}

async function descriptorDe(file) {
  const img = await faceapi.bufferToImage(file)
  const det = await faceapi
    .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor()
  return det?.descriptor ?? null
}

// Devuelve el % de coincidencia (0–100) entre el rostro del DNI y la selfie.
// similitud = null si falta un rostro (caso advisory).
export async function compararRostros(dniFile, selfieFile) {
  let dDni = null
  let dSelfie = null
  try {
    await cargarModelos()
    ;[dDni, dSelfie] = await Promise.all([
      descriptorDe(dniFile),
      descriptorDe(selfieFile),
    ])
  } catch (err) {
    // Advisory: cualquier fallo del facial en el cliente (modelos que no
    // cargaron, imagen corrupta, etc.) no debe bloquear el flujo.
    console.warn('[KYC] Facial no disponible →', err?.message, '— continúa (advisory)')
    return { similitud: null, dniTieneRostro: false, selfieTieneRostro: false }
  }
  const dniTieneRostro = dDni != null
  const selfieTieneRostro = dSelfie != null
  if (!dniTieneRostro || !selfieTieneRostro) {
    return { similitud: null, dniTieneRostro, selfieTieneRostro }
  }
  const dist = faceapi.euclideanDistance(dDni, dSelfie)
  const similitud = Math.max(0, Math.min(100, Math.round((1 - dist) * 100)))
  return { similitud, dniTieneRostro, selfieTieneRostro }
}
