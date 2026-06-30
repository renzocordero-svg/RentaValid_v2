# RentaValid

Plataforma peruana de alquiler residencial con validación de identidad (RENIEC), scoring crediticio (INFOCORP), firma digital de contratos bajo la **Ley N° 30933** y gestión de pagos con garantías.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 · Vite · Tailwind CSS · React Router v6 · Zustand · Axios |
| Backend | Node.js · Express · Prisma ORM |
| Base de datos | PostgreSQL (Supabase / Neon) |
| Imágenes | Cloudinary |
| Correo | Nodemailer + Gmail |
| IA contratos | Google Gemini (`gemini-1.5-flash`) |
| Consulta DNI | JSON.pe |
| Autenticación | JWT + bcrypt |
| Tests | Jest · Supertest |
| Deploy | Vercel (frontend) · Render (backend) · Supabase (DB) |

---

## Requisitos previos

- **Node.js** 18 o superior — [nodejs.org](https://nodejs.org)
- **npm** 9 o superior (incluido con Node)
- **PostgreSQL** 15+ local **o** cuenta gratuita en [Supabase](https://supabase.com)
- Cuenta gratuita en [Cloudinary](https://cloudinary.com) (subida de imágenes)
- Cuenta de Gmail con **Contraseña de aplicación** activada (Nodemailer)
- Clave de API de [Google AI Studio](https://aistudio.google.com/app/apikey) (Gemini)
- Token de [JSON.pe](https://json.pe) (consulta de DNI — 100 créditos gratis/mes)

---

## Estructura del proyecto

```
RENTAVALID_V2/
├─ frontend/                 # React + Vite
│   ├─ src/
│   │   ├─ components/       # Navbar, Sidebar, Footer, Logo
│   │   ├─ pages/            # Una página por ruta
│   │   ├─ services/         # Funciones Axios por módulo
│   │   ├─ store/            # Zustand (authStore, registerStore)
│   │   └─ data/             # mockData.js (propiedades de prueba)
│   ├─ vercel.json           # Configuración de rutas para Vercel
│   └─ package.json
├─ backend/
│   ├─ src/
│   │   ├─ app.js            # Express app (sin listen — para tests)
│   │   ├─ index.js          # Punto de entrada (dotenv + listen)
│   │   ├─ routes/           # Un archivo por recurso
│   │   ├─ controllers/      # Lógica de negocio por módulo
│   │   ├─ middleware/        # auth.js, upload.js
│   │   ├─ services/         # Gemini, Cloudinary, Nodemailer
│   │   └─ lib/              # prisma.js, response.js
│   ├─ prisma/
│   │   ├─ schema.prisma     # Modelos de base de datos
│   │   └─ seed.js           # Datos de prueba
│   ├─ __tests__/            # Jest — tests de endpoints
│   ├─ jest.setup.js         # Env vars para tests
│   └─ package.json
├─ render.yaml               # Blueprint de deploy en Render
├─ .env.example              # Plantilla de variables (raíz)
└─ README.md
```

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/rentavalid-v2.git
cd rentavalid-v2
```

### 2. Backend

```bash
cd backend

# Instalar dependencias
npm install

# Crear archivo de entorno a partir de la plantilla
cp .env.example .env
# → Edita backend/.env con tus valores reales (ver sección Variables de entorno)

# Aplicar el schema en la base de datos
npx prisma db push

# Cargar datos de prueba (usuarios + 5 inmuebles)
npm run db:seed

# Arrancar en modo desarrollo (nodemon, puerto 4000)
npm run dev
```

### 3. Frontend

```bash
cd ../frontend

# Instalar dependencias
npm install

# Crear archivo de entorno
cp .env.example .env
# → Edita frontend/.env (ver sección Variables de entorno)

# Arrancar en modo desarrollo (Vite, puerto 5173)
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en el navegador.

---

## Variables de entorno

### Backend — `backend/.env`

Copia `backend/.env.example` y rellena cada valor:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `JWT_SECRET` | Secreto para firmar tokens (mín. 64 caracteres) | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `MAIL_USER` | Correo Gmail del sistema | `noreply@rentavalid.pe` |
| `MAIL_PASS` | Contraseña de aplicación Gmail | `xxxx xxxx xxxx xxxx` |
| `GEMINI_API_KEY` | Clave de Google AI Studio | `AIzaSy...` |
| `JSONPE_TOKEN` | Token de json.pe | `tu_token_aqui` |
| `CLOUDINARY_CLOUD_NAME` | Cloud name de Cloudinary | `mi-cloud` |
| `CLOUDINARY_API_KEY` | API key de Cloudinary | `123456789012345` |
| `CLOUDINARY_API_SECRET` | API secret de Cloudinary | `abc123...` |
| `PORT` | Puerto del servidor (default: 4000) | `4000` |
| `NODE_ENV` | Entorno (`development` / `production`) | `development` |
| `FRONTEND_URL` | URL del frontend para CORS | `http://localhost:5173` |

> **Seguridad:** nunca commitear `backend/.env`. El archivo `.env.example` (sin valores reales) sí va al repositorio.

### Frontend — `frontend/.env`

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `VITE_API_URL` | URL base del backend | `http://localhost:4000` |

---

## Usuarios de prueba

Después de ejecutar `npm run db:seed` en el backend están disponibles:

| Rol | Email | Contraseña | Datos |
|---|---|---|---|
| Arrendador | `carlos.mendoza@rentavalid.pe` | `Demo1234!` | DNI 08234561 · Identidad verificada |
| Arrendatario | `diego.salinas@gmail.com` | `Demo1234!` | DNI 47382910 · Score 87/100 · Aprobado |

El seed también crea **5 inmuebles** en Miraflores, San Isidro, Santiago de Surco, Barranco y San Borja, todos asignados al Arrendador.

---

## Scripts disponibles

### Backend (`cd backend`)

| Comando | Descripción |
|---|---|
| `npm run dev` | Arranca con nodemon (recarga automática) |
| `npm start` | Arranca en modo producción |
| `npm test` | Ejecuta todos los tests con Jest |
| `npm run test:watch` | Tests en modo watch (desarrollo) |
| `npm run db:seed` | Carga los datos de prueba |
| `npm run db:migrate` | Crea una migración nueva (desarrollo) |
| `npm run db:studio` | Abre Prisma Studio en el navegador |
| `npm run db:reset` | Borra y recrea la base de datos + seed |

### Frontend (`cd frontend`)

| Comando | Descripción |
|---|---|
| `npm run dev` | Arranca Vite en modo desarrollo |
| `npm run build` | Genera el bundle de producción en `dist/` |
| `npm run preview` | Sirve el build de producción localmente |

---

## Tests

Los tests cubren los endpoints de **autenticación** y **propiedades** con mocks de Prisma y bcrypt (sin base de datos real):

```bash
cd backend
npm test
```

```
PASS __tests__/auth.test.js
  POST /auth/register  (5 tests)
  POST /auth/login     (4 tests)
  GET  /auth/me        (3 tests)

PASS __tests__/properties.test.js
  GET  /properties              (4 tests)
  GET  /properties/:id          (3 tests)
  POST /properties              (5 tests)
  POST /properties/:id/postular (6 tests)

Tests: 30 passed · Suites: 2 · Time: ~1.5 s
```

---

## API — Endpoints principales

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| POST | `/auth/register` | Crear cuenta | — |
| POST | `/auth/login` | Iniciar sesión | — |
| GET | `/auth/me` | Perfil del usuario | Bearer |
| GET | `/properties` | Listar inmuebles (filtros) | — |
| GET | `/properties/:id` | Detalle de inmueble | — |
| POST | `/properties` | Crear inmueble | Arrendador |
| POST | `/properties/:id/postular` | Postular a inmueble | Arrendatario |
| POST | `/kyc/validate` | Validar identidad con DNI | Bearer |
| POST | `/kyc/send-code` | Enviar código por correo | Bearer |
| POST | `/scoring/evaluar` | Generar scoring crediticio | Arrendatario |
| GET | `/scoring/me` | Obtener mi scoring | Arrendatario |
| POST | `/contracts/generate` | Generar contrato con Gemini | Bearer |
| GET | `/contracts/:id` | Ver contrato | Bearer |
| PATCH | `/contracts/:id` | Editar borrador | Bearer |
| POST | `/contracts/:id/sign` | Firmar con DNI + código | Bearer |
| GET | `/payments` | Listar pagos | Bearer |
| POST | `/payments` | Registrar pago | Arrendatario |
| PATCH | `/payments/:id/confirm` | Confirmar recepción | Arrendador |
| POST | `/payments/garantia` | Registrar devolución de garantía | Arrendador |

Todas las respuestas siguen el formato `{ "data": ... }` en éxito y `{ "error": "..." }` en error.

---

## Despliegue

El proyecto está configurado para desplegarse en:

- **Frontend** → [Vercel](https://vercel.com) (detecta Vite automáticamente; `vercel.json` maneja el SPA routing)
- **Backend** → [Render](https://render.com) (blueprint en `render.yaml`; build: `npm ci && npx prisma db push`)
- **Base de datos** → [Supabase](https://supabase.com) (PostgreSQL gratuito; usar conexión directa port 5432 con `?sslmode=require`)

Orden de deploy recomendado:
1. Crear base de datos en Supabase → copiar `DATABASE_URL`
2. Desplegar backend en Render → añadir variables de entorno → obtener URL
3. Desplegar frontend en Vercel → setear `VITE_API_URL` con URL de Render
4. Actualizar `FRONTEND_URL` en Render con la URL de Vercel → redeploy automático

---

## Licencia

MIT — Proyecto académico desarrollado para la Universidad.
