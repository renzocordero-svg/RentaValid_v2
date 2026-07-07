# RentaValid — Guía del proyecto para Claude

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS + React Router v6 + Zustand + Axios |
| Backend | Node.js + Express + Prisma ORM |
| Base de datos | PostgreSQL (Supabase / Neon) |
| Imágenes | Cloudinary |
| Correo | Nodemailer + Gmail |
| IA contratos | Gemini API (`gemini-1.5-flash`) |
| Consulta DNI | JSON.pe (con mock de respaldo) |
| Autenticación | JWT + bcrypt |

## Estructura de carpetas

```
RENTAVALID_V2/
├─ frontend/
│   ├─ src/
│   │   ├─ components/       # Navbar, Footer, Logo
│   │   ├─ pages/            # Una página por ruta
│   │   ├─ data/             # mockData.js (datos de prueba)
│   │   ├─ store/            # Zustand stores (auth, etc.)
│   │   ├─ services/         # Funciones Axios por módulo
│   │   └─ App.jsx
│   ├─ index.html
│   └─ package.json
├─ backend/
│   ├─ src/
│   │   ├─ routes/           # Un archivo por recurso
│   │   ├─ middleware/       # auth.js (authRequired, roleRequired)
│   │   └─ services/         # Lógica de negocio (Gemini, Nodemailer, etc.)
│   ├─ prisma/
│   │   ├─ schema.prisma
│   │   └─ seed.js
│   └─ package.json
├─ .env.example              # Plantilla de variables — SÍ se commitea
├─ .gitignore
└─ CLAUDE.md
```

## Formato de respuesta de la API

Toda respuesta del backend usa **siempre** la misma forma:

```json
// Éxito
{ "data": <payload> }

// Error
{ "error": "Mensaje legible en español" }
```

Nunca devolver el payload directamente en la raíz. Ejemplos:

```js
// ✅ Correcto
res.json({ data: user })
res.status(404).json({ error: 'Inmueble no encontrado' })

// ❌ Incorrecto
res.json(user)
res.json({ message: 'Not found' })
```

En el frontend, leer siempre `response.data.data` (Axios envuelve en `.data`) y manejar `response.data.error`.

## Nombres de rutas (en español)

Las rutas del backend usan sustantivos en español tal como están definidas:

| Recurso | Prefijo |
|---|---|
| Autenticación | `/auth` |
| Validación de identidad | `/kyc` |
| Scoring crediticio | `/scoring` |
| Inmuebles | `/properties` |
| Contratos | `/contracts` |
| Pagos | `/payments` |

Las rutas del frontend (React Router) también van en español:

| Página | Ruta |
|---|---|
| Landing | `/` |
| Registro | `/registro` |
| Scoring | `/scoring` |
| Búsqueda | `/inmuebles` |
| Detalle inmueble | `/inmuebles/:id` |
| Contrato | `/contrato/:id` |
| Pagos | `/pagos` |
| Perfil | `/perfil` |

## Variables de entorno

**Nunca commitear `.env` ni ningún archivo con secretos reales.**

- El archivo `.env.example` (sin valores reales) **sí se commitea** — es la plantilla para el equipo.
- Cada desarrollador crea su propio `backend/.env` y `frontend/.env` a partir de `.env.example`.
- Si agregas una variable nueva, agrégala también a `.env.example` con un valor de ejemplo o en blanco.

```bash
# ✅ Se commitea
.env.example

# ❌ Nunca se commitea
.env
backend/.env
frontend/.env
```

## Colores y diseño

Paleta oficial (definida en `frontend/tailwind.config.js`):

- **Navy** `#0F2D52` — color principal, fondos, texto
- **Gold** `#C9A84C` — acciones, highlights, badges
- Fuente: **Plus Jakarta Sans** (Google Fonts, ya cargada en `index.html`)

Clases utilitarias ya definidas en `frontend/src/index.css`:
`btn-primary`, `btn-secondary`, `btn-outline`, `card`, `input-field`, `section-title`, `badge`

## Reglas generales

- Los modelos de Prisma y los campos de BD van en **inglés** (convención de Prisma).
- Los mensajes de error de la API van en **español**.
- El código (variables, funciones, archivos) va en **inglés** o **camelCase en inglés**.
- No subir `node_modules/` ni `dist/` al repo (ya en `.gitignore`).
- Para arrancar en desarrollo: `npm run dev:frontend` y `npm run dev:backend` desde la raíz.
