/**
 * Servicio de generación de contratos mediante IA.
 *
 * Proveedor activo : Google Gemini  (gemini-1.5-flash)
 * Variable de env  : GEMINI_API_KEY
 *
 * ── ALTERNATIVA: Claude API (Anthropic) ───────────────────────────────────────
 *
 * Si prefieres usar Claude en lugar de Gemini, sigue estos pasos:
 *
 *   1. npm install @anthropic-ai/sdk
 *   2. Agrega en .env:  ANTHROPIC_API_KEY="sk-ant-..."
 *   3. Comenta el bloque "Gemini" más abajo y descomenta el bloque "Claude".
 *
 * La función `generarContrato(datos)` devuelve exactamente la misma forma
 * { contenido: string, clausulas: Clausula[] } con ambos proveedores.
 *
 * // ── Bloque Claude ──────────────────────────────────────────────────────────
 * // const Anthropic = require('@anthropic-ai/sdk')
 * //
 * // async function generarContrato(datos) {
 * //   const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
 * //
 * //   const message = await client.messages.create({
 * //     model:      'claude-opus-4-8',
 * //     max_tokens: 6000,
 * //     messages:   [{ role: 'user', content: buildPrompt(datos) }],
 * //   })
 * //
 * //   const raw = message.content[0].text.trim()
 * //   // Claude puede devolver el JSON envuelto en ```json ... ``` — lo limpiamos:
 * //   const jsonStr = raw.replace(/^```json\s+/i, '').replace(/```\s*$/, '')
 * //   return JSON.parse(jsonStr)
 * // }
 * // ──────────────────────────────────────────────────────────────────────────
 */

const { GoogleGenerativeAI } = require('@google/generative-ai')

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt(datos) {
  const {
    arrendador, arrendatario,
    direccion, distrito, tipoInmueble,
    monto, garantia, mesesGarantia,
    fechaInicioStr, fechaFinStr,
  } = datos

  return `
Eres un abogado especialista en derecho inmobiliario peruano con 20 años de experiencia.
Redacta un CONTRATO DE ARRENDAMIENTO DE VIVIENDA formal, completo y válido legalmente,
en español jurídico riguroso, de acuerdo con el Código Civil peruano (Arts. 1666-1712)
y la Ley N° 30933 — Ley que Regula el Procedimiento Especial de Desalojo con
Intervención Notarial.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATOS DEL CONTRATO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Arrendador  : ${arrendador.nombreCompleto}  —  DNI: ${arrendador.dni || 'no registrado'}
Arrendatario: ${arrendatario.nombreCompleto}  —  DNI: ${arrendatario.dni || 'no registrado'}
Inmueble    : ${direccion}, ${distrito}, Lima, Perú
Tipo        : ${tipoInmueble}
Renta       : S/ ${monto.toLocaleString('es-PE')}/mes
Garantía    : S/ ${garantia.toLocaleString('es-PE')} (${mesesGarantia} meses)
Vigencia    : Del ${fechaInicioStr} al ${fechaFinStr} (12 meses)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLÁUSULAS OBLIGATORIAS (EN ESTE ORDEN)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRIMERA   — Identificación de las Partes
SEGUNDA   — Objeto del Contrato
TERCERA   — Plazo del Arrendamiento
CUARTA    — Renta Mensual y Forma de Pago
QUINTA    — Depósito en Garantía
SEXTA     — Obligaciones del Arrendador (Arts. 1678-1680 CC)
SÉPTIMA   — Obligaciones del Arrendatario (Arts. 1681-1683 CC)
OCTAVA    — Uso del Bien y Prohibiciones
NOVENA    — ALLANAMIENTO A FUTURO — LEY N° 30933  ← CRÍTICA: incluir íntegramente:
              · Referencia expresa al Art. 7° de la Ley N° 30933
              · Declaración irrevocable de allanamiento anticipado del arrendatario
              · Supuestos de desalojo: (i) vencimiento del plazo, (ii) resolución por
                incumplimiento, (iii) falta de pago de dos o más cuotas consecutivas
              · Mención al Registro Administrativo de Arrendamiento para Vivienda (RAV)
              · Indicar que el procedimiento se inicia ante Notario Público sin juicio
DÉCIMA    — Causales de Resolución Anticipada
UNDÉCIMA  — Notificaciones y Domicilio
DUODÉCIMA — Jurisdicción y Ley Aplicable
DÉCIMO TERCERA — Firmas y Formalización Notarial

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMATO DE RESPUESTA — JSON ESTRICTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Devuelve ÚNICAMENTE el siguiente JSON (sin markdown, sin comentarios):
{
  "contenido": "<texto completo del contrato con \\n para saltos de línea>",
  "clausulas": [
    { "numero": 1, "titulo": "PRIMERA — Identificación de las Partes", "texto": "..." },
    { "numero": 2, "titulo": "SEGUNDA — Objeto del Contrato", "texto": "..." },
    { "numero": 3, "titulo": "TERCERA — Plazo del Arrendamiento", "texto": "..." },
    { "numero": 4, "titulo": "CUARTA — Renta Mensual y Forma de Pago", "texto": "..." },
    { "numero": 5, "titulo": "QUINTA — Depósito en Garantía", "texto": "..." },
    { "numero": 6, "titulo": "SEXTA — Obligaciones del Arrendador", "texto": "..." },
    { "numero": 7, "titulo": "SÉPTIMA — Obligaciones del Arrendatario", "texto": "..." },
    { "numero": 8, "titulo": "OCTAVA — Uso del Bien y Prohibiciones", "texto": "..." },
    { "numero": 9, "titulo": "NOVENA — ALLANAMIENTO A FUTURO", "texto": "...", "ley": "N° 30933" },
    { "numero": 10, "titulo": "DÉCIMA — Causales de Resolución", "texto": "..." },
    { "numero": 11, "titulo": "UNDÉCIMA — Notificaciones", "texto": "..." },
    { "numero": 12, "titulo": "DUODÉCIMA — Jurisdicción", "texto": "..." },
    { "numero": 13, "titulo": "DÉCIMO TERCERA — Firmas", "texto": "..." }
  ]
}
`.trim()
}

// ── Bloque Gemini (activo) ────────────────────────────────────────────────────

async function generarContrato(datos) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno')
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',  // fuerza JSON válido en la respuesta
      temperature:      0.3,                 // baja aleatoriedad en texto legal
      maxOutputTokens:  6000,
    },
  })

  const result   = await model.generateContent(buildPrompt(datos))
  const raw      = result.response.text()

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Si Gemini devuelve JSON envuelto en bloques markdown, los limpiamos
    const clean = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    parsed = JSON.parse(clean)
  }

  if (!parsed.contenido || !Array.isArray(parsed.clausulas)) {
    throw new Error('La IA devolvió una estructura inesperada')
  }

  return parsed   // { contenido: string, clausulas: Clausula[] }
}

module.exports = { generarContrato }
