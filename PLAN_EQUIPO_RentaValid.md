# RentaValid · Plan de equipo para el entregable final

**Equipo (5 integrantes):** Miguel Girón · Mathias Torres · Sebastian Malca · Renzo Cordero · Christian Guevara
**Plazo:** entrega de mañana · **Tipo:** prototipo funcional (MVP) para sustentación universitaria

---

## 0. Lo primero: qué es realista para mañana

La especificación del PDF es excelente, pero construir **todo** en producción (biometría real, ML entrenado, OCR, firma con sello de tiempo) en un día con 5 personas no es posible. La estrategia ganadora para una sustentación es un **MVP que demuestre el flujo completo de punta a punta**, donde lo difícil se **simula de forma creíble** (mock) pero la pantalla y el flujo funcionan.

| Funcionalidad | Para mañana | Cómo |
|---|---|---|
| Registro / Login / Roles | **Real** | JWT + bcrypt |
| Consulta de DNI | **Real (capa gratis) o mock** | JSON.pe; si se agota, datos simulados |
| Verificación correo/SMS | **Real (correo)** | Nodemailer + Gmail; SMS se simula |
| Reconocimiento facial | **Simulado / demo** | Subir foto y mostrar "verificado ✔"; CompreFace si da tiempo |
| OCR del DNI / título | **Simulado** | Mostrar campos autocompletados; Tesseract si da tiempo |
| Scoring crediticio | **Regla simple real** | Calcular tope = 50% del ingreso ingresado; ML queda como "extra" |
| Inmuebles (CRUD + búsqueda) | **Real** | Lo más importante visualmente |
| Contrato con IA | **Real** | Gemini API (capa gratis) |
| Firma | **Real (hash + timestamp)** | Genera hash y guarda; el "facial en vivo" se simula |
| Pagos | **Real (simulado, sin pasarela)** | Registrar pago, comisión 5%, estados |

> Regla de oro: **mejor un flujo completo que se pueda demostrar, que una sola función perfecta a medio integrar.**

---

## 1. Stack confirmado (según el PDF)

- **Frontend:** React.js (Vite) + Tailwind CSS + React Router + Axios + Zustand
- **Backend:** Node.js + Express + Prisma ORM + PostgreSQL + JWT + bcrypt
- **Imágenes:** Cloudinary (capa gratis)
- **Correo:** Nodemailer
- **IA contratos:** Gemini API (Google, capa gratis)
- **DNI:** JSON.pe / ApiInti
- **Despliegue:** Vercel (frontend) · Render o Railway (backend) · Supabase/Neon (PostgreSQL)

> El proyecto actual ya es Vite + React con `Landing`, `PropertyDetail` y `Payment`. Se reutiliza como base del frontend.

---

## 2. Arquitectura general

```
[ React + Vite (Vercel) ]  --Axios/JWT-->  [ Express API (Render) ]  --Prisma-->  [ PostgreSQL (Supabase) ]
        |                                          |
   Zustand (estado)                         Servicios externos:
   Tailwind (UI)                            Cloudinary · Gemini · JSON.pe · Nodemailer
```

Dos repos o un monorepo con dos carpetas:
```
rentavalid/
├─ frontend/   (Vite + React)   <- el proyecto actual
└─ backend/    (Express + Prisma)
```

---

## 3. Reglas de trabajo en equipo (¡leer antes de codificar!)

1. **Un repo en GitHub** con ramas: `main` (estable) y una rama por persona: `feat/miguel-auth`, `feat/mathias-kyc`, etc. Nadie trabaja directo en `main`.
2. **Pull Requests** para integrar a `main`. Mínimo una persona revisa.
3. **Acordar HOY el contrato de la API y el esquema de la BD** (lo define Miguel) para que todos trabajen en paralelo sin chocar.
4. **Variables de entorno** en `.env` (nunca subir al repo; usar `.env.example`).
5. **Datos de prueba (seed)** comunes para que todos vean los mismos inmuebles/usuarios.
6. Canal de comunicación (WhatsApp/Discord) para avisar "ya subí X endpoint".

---

## 4. División del trabajo (orden solicitado)

Cada integrante es **dueño** de un módulo vertical (frontend + backend de su parte) para minimizar bloqueos.

---

### 🧩 1) Miguel Girón — Núcleo: Backend base, Base de Datos y Autenticación

**Es la base de todo; debe entregar lo antes posible para desbloquear al equipo.**

Responsabilidades:
- Inicializar el backend: `npm init`, Express, estructura de carpetas, CORS, Prisma.
- Diseñar el **esquema de la BD** con Prisma (`schema.prisma`): `User`, `Role`, `Property`, `Application`, `Contract`, `Signature`, `Payment`, `Score`.
- Conectar PostgreSQL en Supabase y correr las migraciones (`prisma migrate`).
- **Autenticación:** registro y login con **JWT** + **bcrypt**; middleware `authRequired` y `roleRequired`.
- Endpoints base: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`.
- Crear el **seed** con usuarios e inmuebles de prueba.
- Definir y documentar el **contrato de la API** (rutas + formato JSON) para el resto.

Tecnologías: Express, Prisma, PostgreSQL, JWT, bcrypt.
Archivos: `backend/src/index.js`, `backend/prisma/schema.prisma`, `backend/src/routes/auth.js`, `backend/src/middleware/auth.js`.
Entregable demostrable: poder registrarse y loguearse, y que el token funcione.

---

### 🧩 2) Mathias Torres — Onboarding: Validación de identidad (KYC) + Scoring

**El diferencial de RentaValid.**

Responsabilidades:
- Página de **registro multi-paso** (frontend) siguiendo el flujo del PDF (3.2).
- Paso 1: campo DNI → consumir **JSON.pe** para autocompletar nombres/apellidos (con mock de respaldo).
- Paso 2: **verificación por correo** (código de 6 dígitos vía Nodemailer); SMS simulado.
- Paso 3: **validación biométrica** — subir foto de DNI y selfie; mostrar "Identidad verificada ✔" (CompreFace con Docker si sobra tiempo; si no, demo).
- Paso 4 (solo arrendatarios): **scoring** — subir ingreso/estados y calcular el **tope de alquiler = 50% del ingreso**. Guardar el `Score`. (ML con scikit-learn como mejora opcional.)
- Endpoints: `POST /kyc/dni`, `POST /kyc/verify-email`, `POST /kyc/face`, `POST /scoring`.

Tecnologías: React (formularios multi-paso), Axios, Nodemailer, JSON.pe, (CompreFace/Tesseract opcional), Zustand para guardar el progreso.
Archivos: `frontend/src/pages/Register.jsx`, `frontend/src/pages/Scoring.jsx`, `backend/src/routes/kyc.js`, `backend/src/routes/scoring.js`.
Entregable demostrable: un usuario nuevo se registra, valida identidad y obtiene su tope de alquiler.

---

### 🧩 3) Sebastian Malca — Inmuebles: Publicación, Búsqueda y Detalle

**El corazón visual de la app.**

Responsabilidades:
- **Subir inmueble** (solo arrendadores, 3.8): formulario con título, descripción, dirección, distrito, área, habitaciones, baños, precio, garantía y **fotos a Cloudinary** (máx. 10). Verificación de título: simulada (subir PDF + autocompletar).
- **Buscador con filtros avanzados** (3.3): distrito, m² (rango), habitaciones, baños, cochera, amoblado, precio (rango), tipo. Resultados en **tarjetas** + ordenamiento.
- **Detalle del inmueble** (3.4): galería, datos clave, descripción, botón **"Postular"** y estado de la postulación.
- Backend CRUD: `POST /properties`, `GET /properties` (con query de filtros), `GET /properties/:id`, `POST /properties/:id/apply`, `PATCH /applications/:id` (aceptar/rechazar).

Tecnologías: React, Tailwind (cards), Axios, Cloudinary, Prisma (consultas con filtros).
Archivos: `frontend/src/pages/Search.jsx`, `frontend/src/pages/PropertyDetail.jsx` (ya existe, ampliar), `frontend/src/pages/NewProperty.jsx`, `backend/src/routes/properties.js`.
Entregable demostrable: publicar un inmueble, encontrarlo con filtros y postular.

---

### 🧩 4) Renzo Cordero — Contrato con IA + Firma biométrica

**Une la negociación con la formalización legal (Ley N° 30933).**

Responsabilidades:
- **Generación de contrato con Gemini API** (3.5): tras aceptar la postulación, construir el contrato con datos de ambas partes, monto, garantía, duración y la **cláusula de allanamiento a futuro** (Ley N° 30933). *(Ya tienes una versión con Claude API en `api-contratos-generar.ts`; se adapta a Gemini o se mantiene Claude como alternativa.)*
- **Edición** del contrato antes de firmar (ambas partes sugieren cambios).
- **Página de firma** (3.6): reconfirmar DNI + código, reconocimiento facial **en vivo (simulado)**, y al validar generar un **hash único** (datos del contrato + timestamp) como firma digital.
- Guardar el contrato firmado con **sello de tiempo** en la BD.
- Endpoints: `POST /contracts/generate`, `PATCH /contracts/:id`, `POST /contracts/:id/sign`.

Tecnologías: Gemini API (o Claude), React, Node `crypto` (hash SHA-256), Prisma.
Archivos: `frontend/src/pages/Contract.jsx`, `frontend/src/pages/Sign.jsx`, `backend/src/routes/contracts.js`.
Entregable demostrable: generar un contrato real con IA, editarlo, firmarlo y verlo guardado con su hash.

---

### 🧩 5) Christian Guevara — Pagos, Dashboards, UI/UX global, Despliegue y QA

**El integrador: hace que todo se vea coherente y esté en línea.**

Responsabilidades:
- **Página de pagos** (3.7): historial con fecha/monto/estado (pagado, pendiente, atrasado), **comisión del 5%**, y devolución de garantía. Sin pasarela real: registrar el pago.
- **Dashboards por rol** y **menú lateral** (mis alquileres / mis propiedades / contratos / pagos / configuración).
- **UI/UX global:** Navbar, Footer, paleta del PDF (azul marino `#1B2A4A`, dorado `#C9A84C`), tipografía Inter/Nunito, Landing con hero, "cómo funciona" y testimonios.
- **Despliegue:** frontend en Vercel, backend en Render, BD en Supabase. Configurar variables de entorno en cada servicio.
- **QA y documentación:** pruebas básicas (Jest), `README.md` de instalación, colección de Postman.

Tecnologías: React, Tailwind, Vercel, Render, Jest.
Archivos: `frontend/src/pages/Payment.jsx` (ya existe), `frontend/src/pages/Dashboard.jsx`, `frontend/src/components/{Navbar,Footer,Sidebar}.jsx`, `backend/src/routes/payments.js`, `README.md`.
Entregable demostrable: app desplegada con URL pública, navegación coherente y pagos visibles.

---

## 5. Cronograma sugerido para el día

| Tramo | Todos | Foco |
|---|---|---|
| **Hora 0–1** | Reunión inicial | Miguel define esquema BD + contrato API; todos crean sus ramas |
| **Hora 1–4** | Trabajo en paralelo | Miguel termina auth; el resto monta sus pantallas con datos mock |
| **Hora 4–5** | — | Miguel publica backend; los demás conectan sus endpoints reales |
| **Hora 5–7** | Integración | Unir flujos: registro → buscar → postular → contrato → firma → pago |
| **Hora 7–8** | Christian lidera | Despliegue, pruebas del flujo completo, arreglar bugs, README |
| **Cierre** | Todos | Ensayar la demo de 5 min de punta a punta |

---

## 6. El flujo que deben poder demostrar (guion de la demo)

1. **Renzo** (arrendatario) se registra → valida DNI → verifica correo → valida rostro → obtiene su tope de alquiler (scoring). *(Mathias)*
2. **Sebastian** muestra cómo un arrendador publicó un inmueble; Renzo lo encuentra con filtros y **postula**. *(Sebastian)*
3. El arrendador **acepta** la postulación → se **genera el contrato con IA** con la cláusula de la Ley 30933. *(Renzo)*
4. Ambas partes **firman** (validación + hash + sello de tiempo). *(Renzo)*
5. Se muestra el **dashboard de pagos** con la comisión del 5%. *(Christian)*
6. Todo corriendo en la **URL pública** desplegada. *(Christian)*
7. **Miguel** explica por debajo la BD, la autenticación y la seguridad (JWT, bcrypt, HTTPS).

---

## 7. Checklist final antes de entregar

- [ ] `main` estable, todas las ramas integradas vía PR
- [ ] `.env.example` en el repo, `.env` real fuera (ya tienes `.gitignore`)
- [ ] Seed cargado: usuarios y al menos 4–5 inmuebles de prueba
- [ ] Flujo completo funciona de punta a punta en la URL desplegada
- [ ] `README.md` con pasos de instalación y credenciales de prueba
- [ ] Demo de 5 min ensayada
- [ ] Mencionar en la sustentación qué es real y qué está simulado (honestidad técnica suma puntos)
