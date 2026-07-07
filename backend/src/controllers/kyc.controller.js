const nodemailer = require('nodemailer')
const prisma = require('../lib/prisma')
const { ok, fail } = require('../lib/response')
const { leerDniDeImagen } = require('../services/ocr')

// ── POST /kyc/dni ─────────────────────────────────────────────────────────────
/*
  Pública — se llama antes de que el usuario tenga token.

  Request:  POST /kyc/dni
            { "dni": "47382910" }

  Response exitosa:
    { "data": { "nombres": "DIEGO ANDRÉS", "apellidos": "SALINAS VEGA", "mock": false } }

  Respaldo (cuando JSON.pe falla o no hay créditos):
    { "data": { "nombres": "DEMO USUARIO", "apellidos": "RENIEC MOCK", "mock": true } }

  Errores:
    400 — "dni debe ser un número de 8 dígitos"
*/
async function consultarDni(req, res) {
  const { dni } = req.body
  if (!dni || !/^\d{8}$/.test(String(dni))) {
    return fail(res, 400, 'El DNI debe ser un número de 8 dígitos')
  }

  // ── JSON.pe ───────────────────────────────────────────────────────────────
  try {
    if (!process.env.JSONPE_TOKEN) throw new Error('Sin token JSON.pe')

    const r = await fetch(`https://api.json.pe/reniec/${dni}`, {
      headers: { Authorization: `Bearer ${process.env.JSONPE_TOKEN}` },
      signal: AbortSignal.timeout(6000),   // 6 s de timeout
    })

    if (!r.ok) {
      // 402 = sin créditos, 404 = DNI no encontrado — ambos caen al mock
      throw new Error(`JSON.pe devolvió ${r.status}`)
    }

    const d = await r.json()

    // JSON.pe devuelve: { nombre, apellidoPaterno, apellidoMaterno, ... }
    const nombres   = (d.nombre || '').trim()
    const apellidos = `${d.apellidoPaterno || ''} ${d.apellidoMaterno || ''}`.trim()

    if (!nombres) throw new Error('Respuesta vacía de JSON.pe')

    return ok(res, { nombres, apellidos, mock: false })
  } catch (err) {
    // ── Respaldo simulado ─────────────────────────────────────────────────
    console.warn('[KYC] JSON.pe no disponible →', err.message, '— usando mock')
    return ok(res, {
      nombres:   'DEMO USUARIO',
      apellidos: 'RENIEC MOCK',
      mock:       true,
    })
  }
}

// ── POST /kyc/send-code ───────────────────────────────────────────────────────
/*
  Genera un código de 6 dígitos, lo guarda en BD y lo envía por correo.
  Se llama justo después de crear la cuenta (paso 1 del wizard de registro).

  Requiere: authRequired

  Request:  POST /kyc/send-code
            { "email": "diego@gmail.com" }

  Response: { "data": { "enviado": true } }

  Errores:
    400 — correo requerido
    500 — error de Nodemailer (Gmail mal configurado)
*/
async function enviarCodigo(req, res) {
  const { email } = req.body
  if (!email) return fail(res, 400, 'El correo electrónico es requerido')

  const code      = String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)   // 10 minutos

  try {
    await prisma.verificationCode.upsert({
      where:  { userId: req.user.id },
      update: { code, expiresAt },
      create: { userId: req.user.id, code, expiresAt },
    })
  } catch {
    return fail(res, 500, 'Error al guardar el código de verificación')
  }

  // ── Nodemailer (Gmail) ────────────────────────────────────────────────────
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,   // Contraseña de aplicación de Google
      },
    })

    await transporter.sendMail({
      from:    `"RentaValid" <${process.env.MAIL_USER}>`,
      to:      email,
      subject: 'Tu código de verificación — RentaValid',
      text:    `Tu código es: ${code}. Válido durante 10 minutos.`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <div style="background:#1B2A4A;padding:28px 32px;border-radius:12px 12px 0 0">
            <h1 style="color:#C9A84C;margin:0;font-size:22px">RentaValid</h1>
          </div>
          <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb">
            <p style="color:#374151;margin:0 0 24px">
              Usa este código para verificar tu correo electrónico:
            </p>
            <div style="background:#fff;border:2px solid #1B2A4A;border-radius:12px;
                        padding:24px;text-align:center;margin:0 0 24px">
              <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#1B2A4A">
                ${code}
              </span>
            </div>
            <p style="color:#6b7280;font-size:13px;margin:0">
              Este código expira en <strong>10 minutos</strong>.<br>
              Si no solicitaste esto, ignora este mensaje.
            </p>
          </div>
        </div>
      `,
    })

    return ok(res, { enviado: true })
  } catch (err) {
    console.error('[KYC] Error Nodemailer:', err.message)
    return fail(res, 500, 'Error al enviar el correo. Verifica la configuración de Gmail.')
  }
}

// ── POST /kyc/verify-email ────────────────────────────────────────────────────
/*
  Valida el código de 6 dígitos enviado por email.
  Si es correcto: marca identidadValidada = true y elimina el código de la BD.

  Requiere: authRequired

  Request:  POST /kyc/verify-email
            { "code": "123456" }

  Response: { "data": { "verificado": true } }

  Errores:
    400 — código requerido | código inválido o expirado
*/
async function verificarEmail(req, res) {
  const { code } = req.body
  if (!code) return fail(res, 400, 'El código es requerido')

  try {
    const record = await prisma.verificationCode.findUnique({
      where: { userId: req.user.id },
    })

    if (!record) {
      return fail(res, 400, 'No hay código pendiente para este usuario. Solicita uno nuevo.')
    }
    if (record.code !== String(code)) {
      return fail(res, 400, 'Código incorrecto')
    }
    if (record.expiresAt < new Date()) {
      return fail(res, 400, 'El código expiró. Solicita uno nuevo.')
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: req.user.id },
        data:  { identidadValidada: true },
      }),
      prisma.verificationCode.delete({ where: { userId: req.user.id } }),
    ])

    return ok(res, { verificado: true })
  } catch {
    return fail(res, 500, 'Error al verificar el código')
  }
}

// ── POST /kyc/face ────────────────────────────────────────────────────────────
/*
  Recibe la foto del DNI y la selfie del usuario, y persiste el resultado de
  la verificación de identidad.

  - OCR real (tesseract.js, servidor) sobre la foto del DNI: extrae el
    número de 8 dígitos y lo compara contra el DNI registrado del usuario.
  - Similitud facial: la calcula el cliente (face-api.js) y la reporta aquí
    tal cual (0–100 o null).
  - Advisory: ni un OCR lento/fallido ni una similitud facial baja o nula
    bloquean al usuario — identidadValidada siempre se marca en true. Solo
    un error real de persistencia en BD (prisma.user.update) responde 500.

  Requiere: authRequired + handleKycFotos (multer)
  Campos multipart: "dniFoto" (1 imagen), "selfie" (1 imagen),
                     "rostroSimilitud" (opcional, número 0–100)

  Request:  POST /kyc/face  (multipart/form-data)
            dniFoto: <archivo>
            selfie:  <archivo>
            rostroSimilitud: "87"

  Response: { "data": { "match": true, "ocr": { "dniLeido": "47382910", "coincide": true }, "rostroSimilitud": 87 } }

  Errores:
    400 — faltan imágenes (dniFoto y selfie son requeridas)
    500 — error al persistir la verificación en BD
*/
async function verificarRostro(req, res) {
  // Multer coloca los archivos en req.files cuando se usa .fields()
  const dniFoto = req.files?.dniFoto?.[0]
  const selfie  = req.files?.selfie?.[0]
  if (!dniFoto || !selfie) {
    return fail(res, 400, 'Se requieren las dos imágenes: dniFoto y selfie')
  }

  // Similitud facial: la calcula el cliente (face-api.js) y la reporta (advisory).
  const simRaw = parseFloat(req.body?.rostroSimilitud)
  const rostroSimilitud = Number.isFinite(simRaw) ? Math.round(simRaw) : null

  // Se busca el usuario fuera del try/catch del OCR para que un error de BD
  // no se enmascare como "OCR no disponible" en los logs.
  let user = null
  try {
    user = await prisma.user.findUnique({
      where: { id: req.user.id }, select: { dni: true },
    })
  } catch (err) {
    console.warn('[KYC] No se pudo leer el usuario para comparar DNI →', err.message, '— continúa (advisory)')
  }

  // OCR del DNI en el servidor (fuente de verdad). Advisory: si falla, no rompe.
  let ocr = { dniLeido: null, coincide: null }
  try {
    const { dniLeido } = await leerDniDeImagen(dniFoto.buffer)
    ocr = {
      dniLeido,
      coincide: dniLeido == null ? null : dniLeido === (user?.dni || '').trim(),
    }
  } catch (err) {
    console.warn('[KYC] OCR no disponible →', err.message, '— continúa (advisory)')
  }

  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        identidadValidada: true,          // advisory: nunca rechaza
        ocrDniCoincide:    ocr.coincide,
        rostroSimilitud,
      },
    })
    return ok(res, { match: true, ocr, rostroSimilitud })
  } catch {
    return fail(res, 500, 'Error al registrar la verificación de identidad')
  }
}

module.exports = { consultarDni, enviarCodigo, verificarEmail, verificarRostro }
