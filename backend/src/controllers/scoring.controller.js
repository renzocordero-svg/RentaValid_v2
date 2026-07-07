const prisma = require('../lib/prisma')
const { ok, fail } = require('../lib/response')

// ─────────────────────────────────────────────────────────────────────────────
// MOTOR DE SCORING — versión reglas de negocio
// ─────────────────────────────────────────────────────────────────────────────
//
// Pesos de cada dimensión:
//   60 % → ingresos (capacidad de pago)
//   25 % → historial crediticio / INFOCORP  (simulado)
//   15 % → documentos verificados (KYC)
//
// Decisión:
//   puntajeTotal >= 65  →  Aprobado
//   puntajeTotal < 65   →  Observado   (nunca bloqueante; el arrendador decide)
//
// ── TODO: reemplazar por modelo scikit-learn ──────────────────────────────────
//
//   En producción, el cálculo de puntuaciones debería hacerse mediante un
//   microservicio Python que exponga un endpoint HTTP.  Esquema sugerido:
//
//   # scoring_model.py  (Flask + joblib)
//   import joblib, numpy as np
//   model = joblib.load('scoring_model.pkl')   # RandomForest / XGBoost entrenado
//
//   @app.route('/predict', methods=['POST'])
//   def predict():
//       data = request.json          # { ingreso, diasMoraPromedio, deudasActivas }
//       X = np.array([[
//           data['ingreso'],
//           data['diasMoraPromedio'],
//           data['deudasActivas'],
//       ]])
//       score = int(model.predict(X)[0])
//       return jsonify({ 'puntajeTotal': score })
//
//   En Node.js, reemplazar `calcularDimensiones(ingreso, user)` por:
//
//   async function calcularConModelo(ingreso, user) {
//     const r = await fetch(process.env.SCORING_MODEL_URL + '/predict', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         ingreso,
//         diasMoraPromedio: 0,   // traer de INFOCORP real
//         deudasActivas:    0,   // traer de INFOCORP real
//       }),
//     })
//     const { puntajeTotal } = await r.json()
//     return puntajeTotal
//   }
//   Variable de entorno a agregar en .env:  SCORING_MODEL_URL=http://localhost:5001
//
// ─────────────────────────────────────────────────────────────────────────────

const TOPE_RATIO         = 0.50   // 50 % del ingreso
const UMBRAL_APROBADO    = 65     // puntaje mínimo para "Aprobado"
const VIGENCIA_MESES     = 6

const PESO_INGRESOS      = 0.60
const PESO_INFOCORP      = 0.25
const PESO_DOCUMENTOS    = 0.15

function calcularDimensiones(ingreso, identidadValidada) {
  // ── Dimensión 1: Ingresos ─────────────────────────────────────────────────
  // Escala logarítmica suavizada: S/ 1,000 → ~40 pts, S/ 5,000 → ~75 pts,
  // S/ 10,000+ → 100 pts.
  const pIngresos = Math.min(100, Math.round(
    40 + 60 * Math.log10(Math.max(1, ingreso / 1000))
  ))
  const topeAlquiler = Math.floor(ingreso * TOPE_RATIO)

  // ── Dimensión 2: Historial crediticio (INFOCORP simulado) ─────────────────
  // En producción: consultar API de INFOCORP / Equifax / Sentinel.
  // Ahora se asume puntaje neutro-bueno sin mora.
  const pInfocorp = 80
  const resumenInfocorp = 'Sin deudas reportadas (simulado)'

  // ── Dimensión 3: Documentos KYC ───────────────────────────────────────────
  const pDocumentos = identidadValidada ? 100 : 40
  const resumenDocumentos = identidadValidada
    ? 'DNI y biometría verificados'
    : 'Identidad aún no verificada'

  // ── Puntaje total ponderado ────────────────────────────────────────────────
  const puntajeTotal = Math.round(
    pIngresos   * PESO_INGRESOS +
    pInfocorp   * PESO_INFOCORP +
    pDocumentos * PESO_DOCUMENTOS
  )

  const decision = puntajeTotal >= UMBRAL_APROBADO ? 'Aprobado' : 'Observado'

  const stars = puntajeTotal >= 90 ? 5
    : puntajeTotal >= 75 ? 4
    : puntajeTotal >= 60 ? 3
    : puntajeTotal >= 45 ? 2
    : 1

  return {
    topeAlquiler,
    decision,
    detalle: {
      puntajeTotal,
      stars,
      vigenciaMeses: VIGENCIA_MESES,
      dimensiones: {
        ingresos: {
          puntuacion: pIngresos,
          resumen:    `S/ ${ingreso.toLocaleString('es-PE')}/mes · Tope S/ ${topeAlquiler.toLocaleString('es-PE')}`,
          peso:       PESO_INGRESOS,
        },
        infocorp: {
          puntuacion: pInfocorp,
          resumen:    resumenInfocorp,
          peso:       PESO_INFOCORP,
        },
        documentos: {
          puntuacion: pDocumentos,
          resumen:    resumenDocumentos,
          peso:       PESO_DOCUMENTOS,
        },
      },
    },
  }
}

// ── POST /scoring ──────────────────────────────────────────────────────────────
/*
  Solo Arrendatario.

  Request:
    POST /scoring
    Authorization: Bearer <token>
    { "ingreso": 4500 }

  Response 200:
    {
      "data": {
        "id": 1,
        "arrendatarioId": 2,
        "ingreso": 4500,
        "topeAlquiler": 2250,
        "decision": "Aprobado",
        "detalle": {
          "puntajeTotal": 77,
          "stars": 4,
          "vigenciaMeses": 6,
          "dimensiones": {
            "ingresos":   { "puntuacion": 75, "resumen": "S/ 4,500/mes · Tope S/ 2,250", "peso": 0.6 },
            "infocorp":   { "puntuacion": 80, "resumen": "Sin deudas reportadas (simulado)", "peso": 0.25 },
            "documentos": { "puntuacion": 100, "resumen": "DNI y biometría verificados", "peso": 0.15 }
          }
        }
      }
    }

  Errores:
    400 — ingreso inválido
    403 — rol incorrecto
*/
async function calcular(req, res) {
  const ingresoRaw = parseFloat(req.body?.ingreso)
  if (!ingresoRaw || ingresoRaw <= 0) {
    return fail(res, 400, 'El ingreso mensual debe ser un número mayor a cero')
  }
  if (ingresoRaw > 9_999_999) {
    return fail(res, 400, 'Ingreso fuera de rango')
  }

  try {
    // Leer si el usuario ya tiene identidad validada
    const user = await prisma.user.findUnique({
      where:  { id: req.user.id },
      select: { identidadValidada: true },
    })

    const { topeAlquiler, decision, detalle } = calcularDimensiones(
      ingresoRaw,
      user?.identidadValidada ?? false
    )

    const scoring = await prisma.score.upsert({
      where:  { arrendatarioId: req.user.id },
      update: { ingreso: ingresoRaw, topeAlquiler, decision, detalle },
      create: { arrendatarioId: req.user.id, ingreso: ingresoRaw, topeAlquiler, decision, detalle },
    })

    return ok(res, scoring)
  } catch (err) {
    console.error('[Scoring] Error:', err)
    return fail(res, 500, 'Error al calcular el scoring')
  }
}

// ── GET /scoring/me ────────────────────────────────────────────────────────────
/*
  Devuelve el scoring existente del arrendatario autenticado.

  Response 200: { "data": { ...score } }
  Errores:      404 — sin scoring registrado
*/
async function obtenerMio(req, res) {
  try {
    const scoring = await prisma.score.findUnique({
      where: { arrendatarioId: req.user.id },
    })
    if (!scoring) {
      return fail(res, 404, 'Aún no tienes un scoring registrado. Completa el cálculo primero.')
    }
    return ok(res, scoring)
  } catch {
    return fail(res, 500, 'Error al obtener el scoring')
  }
}

module.exports = { calcular, obtenerMio }
