/**
 * Servicio de generación de contratos mediante IA.
 *
 * Proveedor activo : Google Gemini  (gemini-2.5-flash)
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

async function generarConGemini(datos) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',  // fuerza JSON válido en la respuesta
      temperature:      0.3,                 // baja aleatoriedad en texto legal
      maxOutputTokens:  24000,
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

// ── Generador local (modo demo / sin GEMINI_API_KEY) ──────────────────────────
/**
 * Construye un contrato de arrendamiento completo con las 13 cláusulas exigidas,
 * incluida la NOVENA (Allanamiento a futuro — Ley N° 30933), sin llamar a ninguna
 * IA externa. Devuelve la misma forma { contenido, clausulas } que Gemini.
 */
function generarContratoSimulado(datos) {
  const {
    arrendador, arrendatario,
    direccion, distrito, tipoInmueble,
    monto, garantia, mesesGarantia,
    fechaInicioStr, fechaFinStr,
  } = datos

  const S = (n) => Number(n).toLocaleString('es-PE')
  const A  = arrendador.nombreCompleto
  const Ad = arrendatario.nombreCompleto
  const dniA  = arrendador.dni   || 'no registrado'
  const dniAd = arrendatario.dni || 'no registrado'

  const clausulas = [
    { numero: 1, titulo: 'PRIMERA — Identificación de las Partes',
      texto: `Celebran el presente contrato, de una parte EL ARRENDADOR, ${A}, identificado con DNI N° ${dniA}; y de la otra parte EL ARRENDATARIO, ${Ad}, identificado con DNI N° ${dniAd}. Ambas partes declaran obrar con plena capacidad legal.` },
    { numero: 2, titulo: 'SEGUNDA — Objeto del Contrato',
      texto: `EL ARRENDADOR cede en arrendamiento a EL ARRENDATARIO el inmueble tipo ${tipoInmueble} ubicado en ${direccion}, distrito de ${distrito}, provincia y departamento de Lima, Perú, destinado exclusivamente a uso de casa-habitación.` },
    { numero: 3, titulo: 'TERCERA — Plazo del Arrendamiento',
      texto: `El plazo de arrendamiento es de doce (12) meses, iniciando el ${fechaInicioStr} y culminando el ${fechaFinStr}, fecha en que EL ARRENDATARIO deberá restituir el bien, salvo renovación expresa y escrita.` },
    { numero: 4, titulo: 'CUARTA — Renta Mensual y Forma de Pago',
      texto: `La renta mensual asciende a S/ ${S(monto)} (soles), pagadera por adelantado dentro de los primeros cinco (5) días de cada mes, a través de la plataforma RentaValid. La comisión de intermediación del 5% se aplica conforme a los términos del servicio.` },
    { numero: 5, titulo: 'QUINTA — Depósito en Garantía',
      texto: `EL ARRENDATARIO entrega en calidad de garantía la suma de S/ ${S(garantia)} (soles), equivalente a ${mesesGarantia} mensualidad(es), que será devuelta al término del contrato previa verificación del buen estado del inmueble y la inexistencia de deudas pendientes.` },
    { numero: 6, titulo: 'SEXTA — Obligaciones del Arrendador',
      texto: `EL ARRENDADOR se obliga a entregar el bien en buen estado de conservación, a mantener a EL ARRENDATARIO en el uso pacífico del inmueble y a efectuar las reparaciones necesarias no imputables al arrendatario, conforme a los artículos 1678° a 1680° del Código Civil.` },
    { numero: 7, titulo: 'SÉPTIMA — Obligaciones del Arrendatario',
      texto: `EL ARRENDATARIO se obliga a pagar puntualmente la renta, a usar el bien con la diligencia debida según su destino, a no subarrendar sin autorización escrita y a devolver el inmueble en el estado en que lo recibió, salvo el desgaste normal, conforme a los artículos 1681° a 1683° del Código Civil.` },
    { numero: 8, titulo: 'OCTAVA — Uso del Bien y Prohibiciones',
      texto: `Queda prohibido destinar el inmueble a fines distintos de vivienda, realizar modificaciones estructurales sin consentimiento escrito, así como cualquier actividad ilícita o que perturbe la tranquilidad de los vecinos.` },
    { numero: 9, titulo: 'NOVENA — ALLANAMIENTO A FUTURO', ley: 'N° 30933',
      texto: `De conformidad con el artículo 7° de la Ley N° 30933 — Ley que regula el procedimiento especial de desalojo con intervención notarial —, EL ARRENDATARIO declara de manera expresa e irrevocable su ALLANAMIENTO ANTICIPADO a la desocupación y entrega del inmueble en los siguientes supuestos: (i) vencimiento del plazo del contrato; (ii) resolución del contrato por incumplimiento; y (iii) falta de pago de dos (2) o más cuotas consecutivas de la renta. Las partes acuerdan inscribir el presente contrato en el Registro Administrativo de Arrendamiento para Vivienda (RAV). El procedimiento de desalojo se iniciará ante Notario Público, sin necesidad de proceso judicial, en aplicación de la citada ley.` },
    { numero: 10, titulo: 'DÉCIMA — Causales de Resolución Anticipada',
      texto: `Son causales de resolución de pleno derecho: el incumplimiento en el pago de la renta, el uso indebido del bien, el subarrendamiento no autorizado y el incumplimiento de cualquier obligación esencial pactada, operando la resolución conforme al artículo 1697° del Código Civil.` },
    { numero: 11, titulo: 'UNDÉCIMA — Notificaciones y Domicilio',
      texto: `Las partes señalan como domicilio el indicado en la cláusula primera y, para efectos de notificaciones electrónicas, los correos registrados en la plataforma RentaValid: ${arrendador.email || 'correo del arrendador'} y ${arrendatario.email || 'correo del arrendatario'}.` },
    { numero: 12, titulo: 'DUODÉCIMA — Jurisdicción y Ley Aplicable',
      texto: `El presente contrato se rige por las leyes de la República del Perú. Para cualquier controversia, las partes se someten a la competencia de los jueces y tribunales del distrito judicial de Lima, renunciando a cualquier otro fuero.` },
    { numero: 13, titulo: 'DÉCIMO TERCERA — Firmas y Formalización Notarial',
      texto: `En señal de conformidad, las partes suscriben el presente contrato de manera digital a través de la plataforma RentaValid, con firma electrónica validada mediante DNI y código de verificación, generándose un sello de tiempo y un hash de integridad, todo con pleno valor legal.` },
  ]

  const contenido = [
    'CONTRATO DE ARRENDAMIENTO DE VIVIENDA',
    'Al amparo del Código Civil peruano (Arts. 1666° a 1712°) y de la Ley N° 30933',
    '',
    `Entre ${A} (EL ARRENDADOR) y ${Ad} (EL ARRENDATARIO), respecto del inmueble ubicado en ${direccion}, ${distrito}, Lima, Perú, por una renta mensual de S/ ${S(monto)} y con vigencia del ${fechaInicioStr} al ${fechaFinStr}.`,
    '',
    ...clausulas.map(c => `${c.titulo}\n${c.texto}`),
  ].join('\n')

  return { contenido, clausulas }
}

/**
 * Punto de entrada. Usa Gemini si hay GEMINI_API_KEY; si no está configurada
 * o la API falla, cae a un generador local determinístico (modo demo/simulado)
 * para que el flujo de contrato funcione sin depender de servicios externos.
 */
async function generarContrato(datos) {
  if (process.env.GEMINI_API_KEY) {
    try {
      return await generarConGemini(datos)
    } catch (err) {
      console.warn('[Contratos] Gemini no disponible →', err.message, '— usando generador local (simulado)')
    }
  } else {
    console.warn('[Contratos] GEMINI_API_KEY no configurada — usando generador local (simulado)')
  }
  return generarContratoSimulado(datos)
}

module.exports = { generarContrato, generarContratoSimulado }
