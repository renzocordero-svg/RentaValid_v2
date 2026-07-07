# Panel de Administración (rol Admin) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar capacidades reales al rol `Admin` con una sección `/admin` (login propio, dashboard, y gestión de usuarios, inmuebles, contratos y pagos), con soft delete y registro de auditoría.

**Architecture:** Backend Express con un router único `/admin` protegido por `authRequired + roleRequired('Admin')`, controllers por área en `controllers/admin/`, y un helper `logAudit` que registra cada acción mutante. Frontend React con sección `/admin` (guard `RequireAdmin`, layout con sidebar, una página por área) consumiendo esos endpoints vía un service Axios.

**Tech Stack:** Node.js + Express + Prisma (PostgreSQL), Jest + supertest (tests backend); React 18 + Vite + React Router v6 + Zustand + Axios + Tailwind + lucide-react (frontend).

## Global Constraints

- Formato de API: **siempre** `{ data: <payload> }` en éxito y `{ error: <mensaje español> }` en error. Nunca payload en la raíz. Usar helpers `ok(res, data, status?)` / `fail(res, status, mensaje)` de `backend/src/lib/response.js`.
- Frontend lee siempre `response.data.data` y maneja `response.data.error`.
- Campos de BD y código en inglés (convención Prisma); mensajes de error en español. En el schema se mantiene la mezcla ya existente (`activo`, `accion`, `detalle`).
- Rutas backend y frontend en español donde ya aplica; el prefijo admin es `/admin`.
- Nunca commitear `.env`; toda variable nueva va también a `.env.example` (sin valores reales).
- Paleta Tailwind: `navy` (#0F2D52) y `gold` (#C9A84C) ya definidas. Clases utilitarias existentes: `btn-primary`, `btn-secondary`, `btn-outline`, `card`, `input-field`, `section-title`, `badge`.
- Backend como única fuente de verdad de autorización; el guard del frontend es solo UX.
- Tests backend: viven en `backend/__tests__/**/*.test.js`, mockean `../src/lib/prisma`, importan `../src/app`, y usan `supertest`. `JWT_SECRET` lo fija `jest.setup.js`.
- No hay setup de tests de frontend en el repo → las páginas React se verifican manualmente (`npm run dev:frontend` + navegador).

---

## FASE 1 — BACKEND

### Task 1: Esquema Prisma — soft delete en User + modelo AuditLog

**Files:**
- Modify: `backend/prisma/schema.prisma` (model `User`, nuevo model `AuditLog`)

**Interfaces:**
- Produces: campo `User.activo: Boolean @default(true)`, `User.desactivadoAt: DateTime?`, relación `User.auditLogs AuditLog[]`; nuevo model `AuditLog { id, adminId, accion, entidad, entidadId?, detalle?, ip?, createdAt, admin }`.

- [ ] **Step 1: Agregar campos de soft delete y relación inversa al model User**

En `backend/prisma/schema.prisma`, dentro de `model User`, después de `createdAt DateTime @default(now())` añade los campos y, en el bloque de relaciones (junto a `roles UserRole[]` etc.), la relación inversa:

```prisma
model User {
  id                Int      @id @default(autoincrement())
  dni               String   @unique
  nombre            String
  apellidoPaterno   String
  apellidoMaterno   String
  email             String   @unique
  telefono          String
  passwordHash      String
  fotoUrl           String?
  identidadValidada Boolean  @default(false)
  ocrDniCoincide    Boolean?
  rostroSimilitud   Float?
  activo            Boolean  @default(true)
  desactivadoAt     DateTime?
  createdAt         DateTime @default(now())

  roles            UserRole[]
  properties       Property[]
  applications     Application[]
  score            Score?
  signatures       Signature[]
  verificationCode VerificationCode?
  auditLogs        AuditLog[]
}
```

- [ ] **Step 2: Agregar el model AuditLog al final del schema**

Al final de `backend/prisma/schema.prisma`:

```prisma
// ── Auditoría de acciones de administración ──────────────────────────────────
model AuditLog {
  id        Int      @id @default(autoincrement())
  adminId   Int
  accion    String
  entidad   String
  entidadId Int?
  detalle   Json?
  ip        String?
  createdAt DateTime @default(now())

  admin User @relation(fields: [adminId], references: [id])

  @@index([entidad, entidadId])
  @@index([createdAt])
}
```

- [ ] **Step 3: Validar el schema**

Run: `cd backend && npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 4: Crear y aplicar la migración (requiere DB local)**

Run: `cd backend && npx prisma migrate dev --name admin_panel`
Expected: crea `prisma/migrations/<timestamp>_admin_panel/` y termina con `Your database is now in sync with your schema.` Genera el cliente Prisma automáticamente.

Nota: requiere `DATABASE_URL`/`DIRECT_URL` apuntando a una base accesible. Si no hay DB disponible en el entorno del ejecutor, aplicar `npx prisma migrate dev` cuando la haya; el resto de tasks backend usan prisma mockeado y no necesitan DB.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations
git commit -m "feat(admin): schema soft delete en User + modelo AuditLog"
```

---

### Task 2: El login rechaza usuarios desactivados

**Files:**
- Modify: `backend/src/controllers/auth.controller.js` (función `login`)
- Test: `backend/__tests__/auth-inactivo.test.js`

**Interfaces:**
- Consumes: `User.activo` (Task 1).
- Produces: `POST /auth/login` devuelve `403 { error: 'Tu cuenta está desactivada...' }` cuando `activo === false`, tras validar la contraseña.

- [ ] **Step 1: Write the failing test**

Crea `backend/__tests__/auth-inactivo.test.js`:

```js
'use strict'

const request = require('supertest')

jest.mock('../src/lib/prisma', () => ({
  user: { findUnique: jest.fn() },
}))
jest.mock('bcryptjs', () => ({ compare: jest.fn() }))

const app    = require('../src/app')
const prisma = require('../src/lib/prisma')
const bcrypt = require('bcryptjs')

const baseUser = {
  id: 1, nombre: 'Ana', apellidoPaterno: 'Lopez', apellidoMaterno: 'Diaz',
  dni: '12345678', email: 'ana@test.pe', telefono: '+51 900 000 000',
  fotoUrl: null, identidadValidada: true, createdAt: new Date('2026-01-01T00:00:00Z'),
  roles: [{ role: { nombre: 'Arrendatario' } }],
  passwordHash: '$2b$12$hash',
}

describe('POST /auth/login — cuenta desactivada', () => {
  test('403 cuando el usuario está desactivado', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...baseUser, activo: false })
    bcrypt.compare.mockResolvedValue(true)

    const res = await request(app).post('/auth/login').send({ email: 'ana@test.pe', password: 'x' })

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/desactivada/i)
  })

  test('200 cuando el usuario está activo', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...baseUser, activo: true })
    bcrypt.compare.mockResolvedValue(true)

    const res = await request(app).post('/auth/login').send({ email: 'ana@test.pe', password: 'x' })

    expect(res.status).toBe(200)
    expect(res.body.data.token).toBeDefined()
    expect(res.body.data.user).not.toHaveProperty('activo')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest __tests__/auth-inactivo.test.js`
Expected: FAIL — el test de 403 obtiene 200 (aún no hay verificación de `activo`).

- [ ] **Step 3: Modificar la función login**

En `backend/src/controllers/auth.controller.js`, reemplaza el cuerpo de `login` para pedir `activo` en el select y verificarlo tras comparar la contraseña:

```js
async function login(req, res) {
  try {
    const { email, password } = req.body
    if (!email || !password) return fail(res, 400, 'Correo y contraseña requeridos')

    const found = await prisma.user.findUnique({
      where:  { email },
      select: { ...SELECT_USER, passwordHash: true, activo: true },
    })

    if (!found || !(await bcrypt.compare(password, found.passwordHash))) {
      return fail(res, 401, 'Credenciales inválidas')
    }
    if (!found.activo) {
      return fail(res, 403, 'Tu cuenta está desactivada. Contacta al administrador.')
    }

    const { passwordHash: _p, activo: _a, ...withoutHash } = found
    const user  = formatUser(withoutHash)
    const token = buildToken(user, user.roles)
    ok(res, { token, user })
  } catch (err) {
    fail(res, 500, 'Error al iniciar sesión')
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest __tests__/auth-inactivo.test.js`
Expected: PASS (2 tests). Corre también `npx jest __tests__/auth.test.js` para confirmar que no rompiste el login existente → PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/auth.controller.js backend/__tests__/auth-inactivo.test.js
git commit -m "feat(admin): login rechaza cuentas desactivadas (soft delete)"
```

---

### Task 3: Helpers compartidos — servicio de auditoría + paginación

**Files:**
- Create: `backend/src/services/audit.js`
- Create: `backend/src/lib/pagination.js`
- Test: `backend/__tests__/audit.test.js`

**Interfaces:**
- Produces:
  - `logAudit({ adminId, accion, entidad, entidadId?, detalle?, ip? }): Promise` → crea un registro en `AuditLog`.
  - `parsePagination(query, { defaultPageSize?, maxPageSize? }): { page, pageSize, skip, take }`.

- [ ] **Step 1: Write the failing test**

Crea `backend/__tests__/audit.test.js`:

```js
'use strict'

jest.mock('../src/lib/prisma', () => ({
  auditLog: { create: jest.fn() },
}))

const prisma = require('../src/lib/prisma')
const { logAudit } = require('../src/services/audit')
const { parsePagination } = require('../src/lib/pagination')

describe('logAudit', () => {
  test('crea un registro con los campos y valores por defecto', async () => {
    prisma.auditLog.create.mockResolvedValue({ id: 1 })
    await logAudit({ adminId: 7, accion: 'user.deactivate', entidad: 'User', entidadId: 42, ip: '1.2.3.4' })
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: { adminId: 7, accion: 'user.deactivate', entidad: 'User', entidadId: 42, detalle: null, ip: '1.2.3.4' },
    })
  })
})

describe('parsePagination', () => {
  test('valores por defecto cuando faltan o son inválidos', () => {
    expect(parsePagination({})).toEqual({ page: 1, pageSize: 20, skip: 0, take: 20 })
    expect(parsePagination({ page: '0', pageSize: 'x' })).toEqual({ page: 1, pageSize: 20, skip: 0, take: 20 })
  })
  test('calcula skip y respeta el máximo', () => {
    expect(parsePagination({ page: '3', pageSize: '10' })).toEqual({ page: 3, pageSize: 10, skip: 20, take: 10 })
    expect(parsePagination({ pageSize: '500' })).toEqual({ page: 1, pageSize: 100, skip: 0, take: 100 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest __tests__/audit.test.js`
Expected: FAIL — `Cannot find module '../src/services/audit'`.

- [ ] **Step 3: Implementar los helpers**

Crea `backend/src/lib/pagination.js`:

```js
// Paginación uniforme para listados admin. Devuelve valores saneados.
function parsePagination(query = {}, { defaultPageSize = 20, maxPageSize = 100 } = {}) {
  let page     = parseInt(query.page, 10)
  let pageSize = parseInt(query.pageSize, 10)
  if (!Number.isInteger(page) || page < 1) page = 1
  if (!Number.isInteger(pageSize) || pageSize < 1) pageSize = defaultPageSize
  if (pageSize > maxPageSize) pageSize = maxPageSize
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize }
}

module.exports = { parsePagination }
```

Crea `backend/src/services/audit.js`:

```js
const prisma = require('../lib/prisma')

// Registra una acción mutante de un Admin. Llamar SIEMPRE después de aplicar el
// cambio. Las lecturas (GET) no se auditan.
async function logAudit({ adminId, accion, entidad, entidadId = null, detalle = null, ip = null }) {
  return prisma.auditLog.create({
    data: { adminId, accion, entidad, entidadId, detalle, ip },
  })
}

module.exports = { logAudit }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest __tests__/audit.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/audit.js backend/src/lib/pagination.js backend/__tests__/audit.test.js
git commit -m "feat(admin): helpers logAudit y parsePagination"
```

---

### Task 4: Router /admin + guard + endpoint de dashboard

**Files:**
- Create: `backend/src/routes/admin.js`
- Create: `backend/src/controllers/admin/dashboard.controller.js`
- Modify: `backend/src/app.js` (montar `/admin`)
- Test: `backend/__tests__/admin-guard.test.js`, `backend/__tests__/admin-dashboard.test.js`

**Interfaces:**
- Consumes: `authRequired`, `roleRequired` (existentes).
- Produces:
  - Router montado en `/admin`, con `router.use(authRequired, roleRequired('Admin'))`.
  - `GET /admin/dashboard` → `{ data: { usuarios, inmuebles, contratos, pagos, ingresos } }`.

- [ ] **Step 1: Write the failing tests**

Crea `backend/__tests__/admin-guard.test.js`:

```js
'use strict'

const request = require('supertest')
const jwt     = require('jsonwebtoken')

jest.mock('../src/lib/prisma', () => ({
  user: { count: jest.fn().mockResolvedValue(0) },
  userRole: { groupBy: jest.fn().mockResolvedValue([]) },
  property: { groupBy: jest.fn().mockResolvedValue([]) },
  contract: { groupBy: jest.fn().mockResolvedValue([]) },
  payment: { groupBy: jest.fn().mockResolvedValue([]), aggregate: jest.fn().mockResolvedValue({ _sum: { comision: 0 } }) },
  role: { findMany: jest.fn().mockResolvedValue([]) },
}))

const app = require('../src/app')

const userToken = jwt.sign({ id: 2, roles: ['Arrendatario'] }, process.env.JWT_SECRET, { expiresIn: '1h' })

describe('Guard de /admin', () => {
  test('401 sin token', async () => {
    const res = await request(app).get('/admin/dashboard')
    expect(res.status).toBe(401)
  })
  test('403 con token que no es Admin', async () => {
    const res = await request(app).get('/admin/dashboard').set('Authorization', `Bearer ${userToken}`)
    expect(res.status).toBe(403)
  })
})
```

Crea `backend/__tests__/admin-dashboard.test.js`:

```js
'use strict'

const request = require('supertest')
const jwt     = require('jsonwebtoken')

jest.mock('../src/lib/prisma', () => ({
  user: { count: jest.fn() },
  userRole: { groupBy: jest.fn() },
  property: { groupBy: jest.fn() },
  contract: { groupBy: jest.fn() },
  payment: { groupBy: jest.fn(), aggregate: jest.fn() },
  role: { findMany: jest.fn() },
}))

const app    = require('../src/app')
const prisma = require('../src/lib/prisma')

const adminToken = jwt.sign({ id: 1, roles: ['Admin'] }, process.env.JWT_SECRET, { expiresIn: '1h' })

describe('GET /admin/dashboard', () => {
  test('200 devuelve KPIs agregados', async () => {
    prisma.user.count.mockResolvedValueOnce(10).mockResolvedValueOnce(8)
    prisma.role.findMany.mockResolvedValue([{ id: 1, nombre: 'Arrendador' }, { id: 2, nombre: 'Arrendatario' }])
    prisma.userRole.groupBy.mockResolvedValue([{ roleId: 1, _count: { userId: 4 } }, { roleId: 2, _count: { userId: 6 } }])
    prisma.property.groupBy.mockResolvedValue([{ estado: 'Disponible', _count: { _all: 5 } }])
    prisma.contract.groupBy.mockResolvedValue([{ estado: 'Firmado', _count: { _all: 2 } }])
    prisma.payment.groupBy.mockResolvedValue([{ estado: 'Pagado', _count: { _all: 3 } }])
    prisma.payment.aggregate.mockResolvedValue({ _sum: { comision: 270 } })

    const res = await request(app).get('/admin/dashboard').set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.usuarios).toEqual({
      total: 10, activos: 8,
      porRol: [{ rol: 'Arrendador', total: 4 }, { rol: 'Arrendatario', total: 6 }],
    })
    expect(res.body.data.ingresos.comisionesCobradas).toBe(270)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest __tests__/admin-guard.test.js __tests__/admin-dashboard.test.js`
Expected: FAIL — `404 Ruta no encontrada` (el router `/admin` aún no existe).

- [ ] **Step 3: Implementar el controller de dashboard**

Crea `backend/src/controllers/admin/dashboard.controller.js`:

```js
const prisma = require('../../lib/prisma')
const { ok, fail } = require('../../lib/response')

// GET /admin/dashboard — KPIs generales de la plataforma
async function getDashboard(_req, res) {
  try {
    const [usuariosTotal, usuariosActivos, rolesGroup, propsGroup, contractsGroup, paymentsGroup, ingresos, roles] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { activo: true } }),
        prisma.userRole.groupBy({ by: ['roleId'], _count: { userId: true } }),
        prisma.property.groupBy({ by: ['estado'], _count: { _all: true } }),
        prisma.contract.groupBy({ by: ['estado'], _count: { _all: true } }),
        prisma.payment.groupBy({ by: ['estado'], _count: { _all: true } }),
        prisma.payment.aggregate({ where: { estado: 'Pagado' }, _sum: { comision: true } }),
        prisma.role.findMany({ select: { id: true, nombre: true } }),
      ])

    const roleName = (rid) => roles.find((r) => r.id === rid)?.nombre ?? String(rid)

    ok(res, {
      usuarios: {
        total:   usuariosTotal,
        activos: usuariosActivos,
        porRol:  rolesGroup.map((g) => ({ rol: roleName(g.roleId), total: g._count.userId })),
      },
      inmuebles: propsGroup.map((g) => ({ estado: g.estado, total: g._count._all })),
      contratos: contractsGroup.map((g) => ({ estado: g.estado, total: g._count._all })),
      pagos:     paymentsGroup.map((g) => ({ estado: g.estado, total: g._count._all })),
      ingresos:  { comisionesCobradas: ingresos._sum.comision ?? 0 },
    })
  } catch (err) {
    fail(res, 500, 'Error al obtener el dashboard')
  }
}

module.exports = { getDashboard }
```

- [ ] **Step 4: Crear el router admin**

Crea `backend/src/routes/admin.js` (por ahora solo dashboard; se ampliará en tasks siguientes):

```js
const express = require('express')
const { authRequired, roleRequired } = require('../middleware/auth')
const { getDashboard } = require('../controllers/admin/dashboard.controller')

const router = express.Router()

// Todo /admin/* exige sesión válida con rol Admin
router.use(authRequired, roleRequired('Admin'))

router.get('/dashboard', getDashboard)

module.exports = router
```

- [ ] **Step 5: Montar el router en app.js**

En `backend/src/app.js`, junto a los otros `require` de rutas añade:

```js
const adminRoutes = require('./routes/admin')
```

y junto a los otros `app.use('/...', ...)` (después de `app.use('/payments', paymentRoutes)`):

```js
app.use('/admin', adminRoutes)
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && npx jest __tests__/admin-guard.test.js __tests__/admin-dashboard.test.js`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add backend/src/routes/admin.js backend/src/controllers/admin/dashboard.controller.js backend/src/app.js backend/__tests__/admin-guard.test.js backend/__tests__/admin-dashboard.test.js
git commit -m "feat(admin): router /admin con guard + endpoint dashboard"
```

---

### Task 5: Endpoints de Usuarios

**Files:**
- Create: `backend/src/controllers/admin/users.controller.js`
- Modify: `backend/src/routes/admin.js`
- Test: `backend/__tests__/admin-users.test.js`

**Interfaces:**
- Consumes: `logAudit` (Task 3), `parsePagination` (Task 3).
- Produces:
  - `GET /admin/users?page&pageSize&rol&activo&q` → `{ data: { items, total, page, pageSize } }`.
  - `GET /admin/users/:id` → `{ data: <user con properties/score> }`.
  - `PATCH /admin/users/:id/estado` body `{ activo: boolean }` → `{ data: <user> }`.
  - `PATCH /admin/users/:id/roles` body `{ roles: string[] }` → `{ data: <user> }`.

- [ ] **Step 1: Write the failing test**

Crea `backend/__tests__/admin-users.test.js`:

```js
'use strict'

const request = require('supertest')
const jwt     = require('jsonwebtoken')

jest.mock('../src/lib/prisma', () => ({
  user:     { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  role:     { findMany: jest.fn() },
  userRole: { deleteMany: jest.fn(), createMany: jest.fn() },
  $transaction: jest.fn((ops) => Promise.all(ops)),
}))
jest.mock('../src/services/audit', () => ({ logAudit: jest.fn() }))

const app     = require('../src/app')
const prisma  = require('../src/lib/prisma')
const { logAudit } = require('../src/services/audit')

const adminToken = jwt.sign({ id: 1, roles: ['Admin'] }, process.env.JWT_SECRET, { expiresIn: '1h' })
const auth = (r) => r.set('Authorization', `Bearer ${adminToken}`)

const userRow = {
  id: 42, dni: '99887766', nombre: 'Luis', apellidoPaterno: 'Paz', apellidoMaterno: 'Sol',
  email: 'luis@test.pe', telefono: '+51 900 111 222', fotoUrl: null, identidadValidada: true,
  activo: true, desactivadoAt: null, createdAt: new Date('2026-02-01T00:00:00Z'),
  roles: [{ role: { nombre: 'Arrendatario' } }],
}

describe('GET /admin/users', () => {
  test('200 lista con total y paginación', async () => {
    prisma.user.findMany.mockResolvedValue([userRow])
    prisma.user.count.mockResolvedValue(1)
    const res = await auth(request(app).get('/admin/users'))
    expect(res.status).toBe(200)
    expect(res.body.data.total).toBe(1)
    expect(res.body.data.items[0].roles).toEqual(['Arrendatario'])
  })
})

describe('PATCH /admin/users/:id/estado', () => {
  test('200 desactiva y registra auditoría', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 42 })
    prisma.user.update.mockResolvedValue({ ...userRow, activo: false, desactivadoAt: new Date() })
    const res = await auth(request(app).patch('/admin/users/42/estado').send({ activo: false }))
    expect(res.status).toBe(200)
    expect(res.body.data.activo).toBe(false)
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ accion: 'user.deactivate', entidad: 'User', entidadId: 42 }))
  })
  test('400 si intenta cambiar su propio estado', async () => {
    const res = await auth(request(app).patch('/admin/users/1/estado').send({ activo: false }))
    expect(res.status).toBe(400)
  })
  test('400 si activo no es booleano', async () => {
    const res = await auth(request(app).patch('/admin/users/42/estado').send({ activo: 'no' }))
    expect(res.status).toBe(400)
  })
})

describe('PATCH /admin/users/:id/roles', () => {
  test('400 si intenta quitarse el rol Admin a sí mismo', async () => {
    const res = await auth(request(app).patch('/admin/users/1/roles').send({ roles: ['Arrendador'] }))
    expect(res.status).toBe(400)
  })
  test('200 reemplaza roles y audita', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 42 })                                   // target existe
      .mockResolvedValueOnce({ ...userRow, roles: [{ role: { nombre: 'Admin' } }] }) // recarga final
    prisma.role.findMany.mockResolvedValue([{ id: 3, nombre: 'Admin' }])
    prisma.userRole.deleteMany.mockResolvedValue({})
    prisma.userRole.createMany.mockResolvedValue({})
    const res = await auth(request(app).patch('/admin/users/42/roles').send({ roles: ['Admin'] }))
    expect(res.status).toBe(200)
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ accion: 'user.roles.update', entidadId: 42 }))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest __tests__/admin-users.test.js`
Expected: FAIL — `404 Ruta no encontrada`.

- [ ] **Step 3: Implementar el controller de usuarios**

Crea `backend/src/controllers/admin/users.controller.js`:

```js
const prisma = require('../../lib/prisma')
const { ok, fail } = require('../../lib/response')
const { logAudit } = require('../../services/audit')
const { parsePagination } = require('../../lib/pagination')

const VALID_ROLES = ['Arrendador', 'Arrendatario', 'Admin']

const SELECT_USER_ADMIN = {
  id: true, dni: true, nombre: true, apellidoPaterno: true, apellidoMaterno: true,
  email: true, telefono: true, fotoUrl: true, identidadValidada: true,
  activo: true, desactivadoAt: true, createdAt: true,
  roles: { select: { role: { select: { nombre: true } } } },
}

const formatUser = (u) => ({ ...u, roles: u.roles.map((ur) => ur.role.nombre) })

// GET /admin/users
async function listUsers(req, res) {
  try {
    const { page, pageSize, skip, take } = parsePagination(req.query)
    const { rol, activo, q } = req.query
    const where = {}
    if (activo === 'true')  where.activo = true
    if (activo === 'false') where.activo = false
    if (rol && VALID_ROLES.includes(rol)) where.roles = { some: { role: { nombre: rol } } }
    if (q) where.OR = [
      { nombre:          { contains: q, mode: 'insensitive' } },
      { apellidoPaterno: { contains: q, mode: 'insensitive' } },
      { email:           { contains: q, mode: 'insensitive' } },
      { dni:             { contains: q } },
    ]

    const [items, total] = await Promise.all([
      prisma.user.findMany({ where, select: SELECT_USER_ADMIN, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.user.count({ where }),
    ])
    ok(res, { items: items.map(formatUser), total, page, pageSize })
  } catch (err) {
    fail(res, 500, 'Error al listar usuarios')
  }
}

// GET /admin/users/:id
async function getUser(req, res) {
  try {
    const id = Number(req.params.id)
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        ...SELECT_USER_ADMIN,
        properties: { select: { id: true, titulo: true, estado: true, precio: true } },
        score:      { select: { decision: true, ingreso: true, topeAlquiler: true } },
      },
    })
    if (!user) return fail(res, 404, 'Usuario no encontrado')
    ok(res, formatUser(user))
  } catch (err) {
    fail(res, 500, 'Error al obtener el usuario')
  }
}

// PATCH /admin/users/:id/estado
async function updateUserEstado(req, res) {
  try {
    const id = Number(req.params.id)
    const { activo } = req.body
    if (typeof activo !== 'boolean') return fail(res, 400, 'El campo activo debe ser booleano')
    if (id === req.user.id) return fail(res, 400, 'No puedes cambiar tu propio estado')

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true } })
    if (!target) return fail(res, 404, 'Usuario no encontrado')

    const updated = await prisma.user.update({
      where: { id },
      data:  { activo, desactivadoAt: activo ? null : new Date() },
      select: SELECT_USER_ADMIN,
    })
    await logAudit({
      adminId: req.user.id,
      accion:  activo ? 'user.activate' : 'user.deactivate',
      entidad: 'User', entidadId: id, ip: req.ip,
    })
    ok(res, formatUser(updated))
  } catch (err) {
    fail(res, 500, 'Error al actualizar el estado del usuario')
  }
}

// PATCH /admin/users/:id/roles
async function updateUserRoles(req, res) {
  try {
    const id = Number(req.params.id)
    const { roles } = req.body
    if (!Array.isArray(roles) || roles.length === 0 || !roles.every((r) => VALID_ROLES.includes(r)))
      return fail(res, 400, 'Roles inválidos')
    if (id === req.user.id && !roles.includes('Admin'))
      return fail(res, 400, 'No puedes quitarte el rol Admin a ti mismo')

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true } })
    if (!target) return fail(res, 404, 'Usuario no encontrado')

    const roleRecords = await prisma.role.findMany({ where: { nombre: { in: roles } } })
    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { userId: id } }),
      prisma.userRole.createMany({ data: roleRecords.map((r) => ({ userId: id, roleId: r.id })) }),
    ])
    const updated = await prisma.user.findUnique({ where: { id }, select: SELECT_USER_ADMIN })
    await logAudit({
      adminId: req.user.id, accion: 'user.roles.update',
      entidad: 'User', entidadId: id, detalle: { roles }, ip: req.ip,
    })
    ok(res, formatUser(updated))
  } catch (err) {
    fail(res, 500, 'Error al actualizar los roles del usuario')
  }
}

module.exports = { listUsers, getUser, updateUserEstado, updateUserRoles }
```

- [ ] **Step 4: Registrar las rutas en admin.js**

En `backend/src/routes/admin.js` añade el import y las rutas (después de la línea de `dashboard`):

```js
const { listUsers, getUser, updateUserEstado, updateUserRoles } = require('../controllers/admin/users.controller')
```

```js
router.get('/users',              listUsers)
router.get('/users/:id',          getUser)
router.patch('/users/:id/estado', updateUserEstado)
router.patch('/users/:id/roles',  updateUserRoles)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && npx jest __tests__/admin-users.test.js`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/controllers/admin/users.controller.js backend/src/routes/admin.js backend/__tests__/admin-users.test.js
git commit -m "feat(admin): endpoints de gestión de usuarios (soft delete + roles + auditoría)"
```

---

### Task 6: Endpoints de Inmuebles

**Files:**
- Create: `backend/src/controllers/admin/properties.controller.js`
- Modify: `backend/src/routes/admin.js`
- Test: `backend/__tests__/admin-properties.test.js`

**Interfaces:**
- Consumes: `logAudit`, `parsePagination`.
- Produces:
  - `GET /admin/properties?page&pageSize&estado&distrito` → `{ data: { items, total, page, pageSize } }`.
  - `PATCH /admin/properties/:id/estado` body `{ estado: 'Disponible'|'Arrendado'|'Inactivo' }` → `{ data: { id, titulo, estado } }`.

- [ ] **Step 1: Write the failing test**

Crea `backend/__tests__/admin-properties.test.js`:

```js
'use strict'

const request = require('supertest')
const jwt     = require('jsonwebtoken')

jest.mock('../src/lib/prisma', () => ({
  property: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
}))
jest.mock('../src/services/audit', () => ({ logAudit: jest.fn() }))

const app    = require('../src/app')
const prisma = require('../src/lib/prisma')
const { logAudit } = require('../src/services/audit')

const adminToken = jwt.sign({ id: 1, roles: ['Admin'] }, process.env.JWT_SECRET, { expiresIn: '1h' })
const auth = (r) => r.set('Authorization', `Bearer ${adminToken}`)

describe('GET /admin/properties', () => {
  test('200 lista inmuebles', async () => {
    prisma.property.findMany.mockResolvedValue([{ id: 5, titulo: 'Depa', distrito: 'Miraflores', precio: 1800, estado: 'Disponible', tipo: 'Departamento', createdAt: new Date(), arrendador: { id: 2, nombre: 'Carlos', apellidoPaterno: 'M', email: 'c@t.pe' } }])
    prisma.property.count.mockResolvedValue(1)
    const res = await auth(request(app).get('/admin/properties'))
    expect(res.status).toBe(200)
    expect(res.body.data.items[0].titulo).toBe('Depa')
  })
})

describe('PATCH /admin/properties/:id/estado', () => {
  test('200 cambia estado y audita', async () => {
    prisma.property.findUnique.mockResolvedValue({ id: 5 })
    prisma.property.update.mockResolvedValue({ id: 5, titulo: 'Depa', estado: 'Inactivo' })
    const res = await auth(request(app).patch('/admin/properties/5/estado').send({ estado: 'Inactivo' }))
    expect(res.status).toBe(200)
    expect(res.body.data.estado).toBe('Inactivo')
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ accion: 'property.estado.update', entidadId: 5 }))
  })
  test('400 estado inválido', async () => {
    const res = await auth(request(app).patch('/admin/properties/5/estado').send({ estado: 'Vendido' }))
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest __tests__/admin-properties.test.js`
Expected: FAIL — `404 Ruta no encontrada`.

- [ ] **Step 3: Implementar el controller de inmuebles**

Crea `backend/src/controllers/admin/properties.controller.js`:

```js
const prisma = require('../../lib/prisma')
const { ok, fail } = require('../../lib/response')
const { logAudit } = require('../../services/audit')
const { parsePagination } = require('../../lib/pagination')

const ESTADOS = ['Disponible', 'Arrendado', 'Inactivo']

// GET /admin/properties
async function listProperties(req, res) {
  try {
    const { page, pageSize, skip, take } = parsePagination(req.query)
    const { estado, distrito } = req.query
    const where = {}
    if (estado && ESTADOS.includes(estado)) where.estado = estado
    if (distrito) where.distrito = { contains: distrito, mode: 'insensitive' }

    const [items, total] = await Promise.all([
      prisma.property.findMany({
        where,
        select: {
          id: true, titulo: true, distrito: true, precio: true, estado: true, tipo: true, createdAt: true,
          arrendador: { select: { id: true, nombre: true, apellidoPaterno: true, email: true } },
        },
        orderBy: { createdAt: 'desc' }, skip, take,
      }),
      prisma.property.count({ where }),
    ])
    ok(res, { items, total, page, pageSize })
  } catch (err) {
    fail(res, 500, 'Error al listar inmuebles')
  }
}

// PATCH /admin/properties/:id/estado
async function updatePropertyEstado(req, res) {
  try {
    const id = Number(req.params.id)
    const { estado } = req.body
    if (!ESTADOS.includes(estado)) return fail(res, 400, 'Estado inválido')

    const target = await prisma.property.findUnique({ where: { id }, select: { id: true } })
    if (!target) return fail(res, 404, 'Inmueble no encontrado')

    const updated = await prisma.property.update({
      where: { id }, data: { estado }, select: { id: true, titulo: true, estado: true },
    })
    await logAudit({ adminId: req.user.id, accion: 'property.estado.update', entidad: 'Property', entidadId: id, detalle: { estado }, ip: req.ip })
    ok(res, updated)
  } catch (err) {
    fail(res, 500, 'Error al actualizar el inmueble')
  }
}

module.exports = { listProperties, updatePropertyEstado }
```

- [ ] **Step 4: Registrar rutas en admin.js**

En `backend/src/routes/admin.js`:

```js
const { listProperties, updatePropertyEstado } = require('../controllers/admin/properties.controller')
```

```js
router.get('/properties',              listProperties)
router.patch('/properties/:id/estado', updatePropertyEstado)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && npx jest __tests__/admin-properties.test.js`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/controllers/admin/properties.controller.js backend/src/routes/admin.js backend/__tests__/admin-properties.test.js
git commit -m "feat(admin): endpoints de moderación de inmuebles"
```

---

### Task 7: Endpoints de Contratos

**Files:**
- Create: `backend/src/controllers/admin/contracts.controller.js`
- Modify: `backend/src/routes/admin.js`
- Test: `backend/__tests__/admin-contracts.test.js`

**Interfaces:**
- Consumes: `logAudit`, `parsePagination`.
- Produces:
  - `GET /admin/contracts?page&pageSize&estado` → `{ data: { items, total, page, pageSize } }`.
  - `GET /admin/contracts/:id` → `{ data: <contrato con application, property, arrendatario, payments> }`.
  - `PATCH /admin/contracts/:id/estado` body `{ estado }` (enum `ContractEstado`) → `{ data: { id, estado } }`.

- [ ] **Step 1: Write the failing test**

Crea `backend/__tests__/admin-contracts.test.js`:

```js
'use strict'

const request = require('supertest')
const jwt     = require('jsonwebtoken')

jest.mock('../src/lib/prisma', () => ({
  contract: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
}))
jest.mock('../src/services/audit', () => ({ logAudit: jest.fn() }))

const app    = require('../src/app')
const prisma = require('../src/lib/prisma')
const { logAudit } = require('../src/services/audit')

const adminToken = jwt.sign({ id: 1, roles: ['Admin'] }, process.env.JWT_SECRET, { expiresIn: '1h' })
const auth = (r) => r.set('Authorization', `Bearer ${adminToken}`)

describe('GET /admin/contracts', () => {
  test('200 lista contratos', async () => {
    prisma.contract.findMany.mockResolvedValue([{ id: 9, estado: 'Firmado', monto: 1800, garantia: 3600, fechaInicio: new Date(), fechaFin: new Date(), createdAt: new Date(), application: { property: { id: 5, titulo: 'Depa', distrito: 'Miraflores' }, arrendatario: { id: 2, nombre: 'Diego', apellidoPaterno: 'S', email: 'd@t.pe' } } }])
    prisma.contract.count.mockResolvedValue(1)
    const res = await auth(request(app).get('/admin/contracts'))
    expect(res.status).toBe(200)
    expect(res.body.data.items[0].estado).toBe('Firmado')
  })
})

describe('GET /admin/contracts/:id', () => {
  test('404 cuando no existe', async () => {
    prisma.contract.findUnique.mockResolvedValue(null)
    const res = await auth(request(app).get('/admin/contracts/999'))
    expect(res.status).toBe(404)
  })
})

describe('PATCH /admin/contracts/:id/estado', () => {
  test('200 cancela y audita', async () => {
    prisma.contract.findUnique.mockResolvedValue({ id: 9 })
    prisma.contract.update.mockResolvedValue({ id: 9, estado: 'Cancelado' })
    const res = await auth(request(app).patch('/admin/contracts/9/estado').send({ estado: 'Cancelado' }))
    expect(res.status).toBe(200)
    expect(res.body.data.estado).toBe('Cancelado')
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ accion: 'contract.estado.update', entidadId: 9 }))
  })
  test('400 estado inválido', async () => {
    const res = await auth(request(app).patch('/admin/contracts/9/estado').send({ estado: 'Roto' }))
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest __tests__/admin-contracts.test.js`
Expected: FAIL — `404 Ruta no encontrada`.

- [ ] **Step 3: Implementar el controller de contratos**

Crea `backend/src/controllers/admin/contracts.controller.js`:

```js
const prisma = require('../../lib/prisma')
const { ok, fail } = require('../../lib/response')
const { logAudit } = require('../../services/audit')
const { parsePagination } = require('../../lib/pagination')

const ESTADOS = ['Borrador', 'Activo', 'Firmado', 'Finalizado', 'Cancelado']

// GET /admin/contracts
async function listContracts(req, res) {
  try {
    const { page, pageSize, skip, take } = parsePagination(req.query)
    const { estado } = req.query
    const where = {}
    if (estado && ESTADOS.includes(estado)) where.estado = estado

    const [items, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        select: {
          id: true, estado: true, monto: true, garantia: true, fechaInicio: true, fechaFin: true, createdAt: true,
          application: { select: {
            property:     { select: { id: true, titulo: true, distrito: true } },
            arrendatario: { select: { id: true, nombre: true, apellidoPaterno: true, email: true } },
          } },
        },
        orderBy: { createdAt: 'desc' }, skip, take,
      }),
      prisma.contract.count({ where }),
    ])
    ok(res, { items, total, page, pageSize })
  } catch (err) {
    fail(res, 500, 'Error al listar contratos')
  }
}

// GET /admin/contracts/:id
async function getContract(req, res) {
  try {
    const id = Number(req.params.id)
    const contract = await prisma.contract.findUnique({
      where: { id },
      select: {
        id: true, estado: true, monto: true, garantia: true, contenido: true, clausulas: true,
        fechaInicio: true, fechaFin: true, firmadoAt: true, createdAt: true,
        application: { select: {
          property:     { select: { id: true, titulo: true, direccion: true, distrito: true } },
          arrendatario: { select: { id: true, nombre: true, apellidoPaterno: true, email: true } },
        } },
        payments: { select: { id: true, periodo: true, monto: true, comision: true, estado: true, fechaPago: true } },
      },
    })
    if (!contract) return fail(res, 404, 'Contrato no encontrado')
    ok(res, contract)
  } catch (err) {
    fail(res, 500, 'Error al obtener el contrato')
  }
}

// PATCH /admin/contracts/:id/estado
async function updateContractEstado(req, res) {
  try {
    const id = Number(req.params.id)
    const { estado } = req.body
    if (!ESTADOS.includes(estado)) return fail(res, 400, 'Estado inválido')

    const target = await prisma.contract.findUnique({ where: { id }, select: { id: true } })
    if (!target) return fail(res, 404, 'Contrato no encontrado')

    const updated = await prisma.contract.update({ where: { id }, data: { estado }, select: { id: true, estado: true } })
    await logAudit({ adminId: req.user.id, accion: 'contract.estado.update', entidad: 'Contract', entidadId: id, detalle: { estado }, ip: req.ip })
    ok(res, updated)
  } catch (err) {
    fail(res, 500, 'Error al actualizar el contrato')
  }
}

module.exports = { listContracts, getContract, updateContractEstado }
```

- [ ] **Step 4: Registrar rutas en admin.js**

```js
const { listContracts, getContract, updateContractEstado } = require('../controllers/admin/contracts.controller')
```

```js
router.get('/contracts',              listContracts)
router.get('/contracts/:id',          getContract)
router.patch('/contracts/:id/estado', updateContractEstado)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && npx jest __tests__/admin-contracts.test.js`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/controllers/admin/contracts.controller.js backend/src/routes/admin.js backend/__tests__/admin-contracts.test.js
git commit -m "feat(admin): endpoints de contratos"
```

---

### Task 8: Endpoints de Pagos / Finanzas

**Files:**
- Create: `backend/src/controllers/admin/payments.controller.js`
- Modify: `backend/src/routes/admin.js`
- Test: `backend/__tests__/admin-payments.test.js`

**Interfaces:**
- Consumes: `logAudit`, `parsePagination`.
- Produces:
  - `GET /admin/payments?page&pageSize&estado&periodo` → `{ data: { items, total, page, pageSize, totales: { comisionesCobradas, montoRecaudado } } }`.
  - `PATCH /admin/payments/:id/estado` body `{ estado: 'Pendiente'|'Pagado'|'Atrasado' }` → `{ data: { id, estado, fechaPago } }`.

- [ ] **Step 1: Write the failing test**

Crea `backend/__tests__/admin-payments.test.js`:

```js
'use strict'

const request = require('supertest')
const jwt     = require('jsonwebtoken')

jest.mock('../src/lib/prisma', () => ({
  payment: { findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
}))
jest.mock('../src/services/audit', () => ({ logAudit: jest.fn() }))

const app    = require('../src/app')
const prisma = require('../src/lib/prisma')
const { logAudit } = require('../src/services/audit')

const adminToken = jwt.sign({ id: 1, roles: ['Admin'] }, process.env.JWT_SECRET, { expiresIn: '1h' })
const auth = (r) => r.set('Authorization', `Bearer ${adminToken}`)

describe('GET /admin/payments', () => {
  test('200 lista con totales', async () => {
    prisma.payment.findMany.mockResolvedValue([{ id: 3, periodo: '2026-06', monto: 1800, comision: 90, estado: 'Pagado', fechaPago: new Date(), contract: { id: 9, application: { property: { titulo: 'Depa' }, arrendatario: { nombre: 'Diego', apellidoPaterno: 'S' } } } }])
    prisma.payment.count.mockResolvedValue(1)
    prisma.payment.aggregate.mockResolvedValue({ _sum: { comision: 270, monto: 5400 } })
    const res = await auth(request(app).get('/admin/payments'))
    expect(res.status).toBe(200)
    expect(res.body.data.totales).toEqual({ comisionesCobradas: 270, montoRecaudado: 5400 })
  })
})

describe('PATCH /admin/payments/:id/estado', () => {
  test('200 marca pagado y setea fechaPago', async () => {
    prisma.payment.findUnique.mockResolvedValue({ id: 3 })
    prisma.payment.update.mockResolvedValue({ id: 3, estado: 'Pagado', fechaPago: new Date() })
    const res = await auth(request(app).patch('/admin/payments/3/estado').send({ estado: 'Pagado' }))
    expect(res.status).toBe(200)
    expect(res.body.data.estado).toBe('Pagado')
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ accion: 'payment.estado.update', entidadId: 3 }))
  })
  test('400 estado inválido', async () => {
    const res = await auth(request(app).patch('/admin/payments/3/estado').send({ estado: 'Devuelto' }))
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest __tests__/admin-payments.test.js`
Expected: FAIL — `404 Ruta no encontrada`.

- [ ] **Step 3: Implementar el controller de pagos**

Crea `backend/src/controllers/admin/payments.controller.js`:

```js
const prisma = require('../../lib/prisma')
const { ok, fail } = require('../../lib/response')
const { logAudit } = require('../../services/audit')
const { parsePagination } = require('../../lib/pagination')

const ESTADOS = ['Pendiente', 'Pagado', 'Atrasado']

// GET /admin/payments
async function listPayments(req, res) {
  try {
    const { page, pageSize, skip, take } = parsePagination(req.query)
    const { estado, periodo } = req.query
    const where = {}
    if (estado && ESTADOS.includes(estado)) where.estado = estado
    if (periodo) where.periodo = periodo

    const [items, total, ingresos] = await Promise.all([
      prisma.payment.findMany({
        where,
        select: {
          id: true, periodo: true, monto: true, comision: true, estado: true, fechaPago: true,
          contract: { select: { id: true, application: { select: {
            property:     { select: { titulo: true } },
            arrendatario: { select: { nombre: true, apellidoPaterno: true } },
          } } } },
        },
        orderBy: [{ periodo: 'desc' }, { id: 'desc' }], skip, take,
      }),
      prisma.payment.count({ where }),
      prisma.payment.aggregate({ where: { estado: 'Pagado' }, _sum: { comision: true, monto: true } }),
    ])
    ok(res, {
      items, total, page, pageSize,
      totales: {
        comisionesCobradas: ingresos._sum.comision ?? 0,
        montoRecaudado:     ingresos._sum.monto ?? 0,
      },
    })
  } catch (err) {
    fail(res, 500, 'Error al listar pagos')
  }
}

// PATCH /admin/payments/:id/estado
async function updatePaymentEstado(req, res) {
  try {
    const id = Number(req.params.id)
    const { estado } = req.body
    if (!ESTADOS.includes(estado)) return fail(res, 400, 'Estado inválido')

    const target = await prisma.payment.findUnique({ where: { id }, select: { id: true } })
    if (!target) return fail(res, 404, 'Pago no encontrado')

    const updated = await prisma.payment.update({
      where: { id },
      data:  { estado, fechaPago: estado === 'Pagado' ? new Date() : null },
      select: { id: true, estado: true, fechaPago: true },
    })
    await logAudit({ adminId: req.user.id, accion: 'payment.estado.update', entidad: 'Payment', entidadId: id, detalle: { estado }, ip: req.ip })
    ok(res, updated)
  } catch (err) {
    fail(res, 500, 'Error al actualizar el pago')
  }
}

module.exports = { listPayments, updatePaymentEstado }
```

- [ ] **Step 4: Registrar rutas en admin.js**

```js
const { listPayments, updatePaymentEstado } = require('../controllers/admin/payments.controller')
```

```js
router.get('/payments',              listPayments)
router.patch('/payments/:id/estado', updatePaymentEstado)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && npx jest __tests__/admin-payments.test.js`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/controllers/admin/payments.controller.js backend/src/routes/admin.js backend/__tests__/admin-payments.test.js
git commit -m "feat(admin): endpoints de pagos y finanzas"
```

---

### Task 9: Endpoint de Auditoría (solo lectura)

**Files:**
- Create: `backend/src/controllers/admin/audit.controller.js`
- Modify: `backend/src/routes/admin.js`
- Test: `backend/__tests__/admin-audit.test.js`

**Interfaces:**
- Consumes: `parsePagination`.
- Produces: `GET /admin/audit?page&pageSize&entidad&accion` → `{ data: { items, total, page, pageSize } }`. Solo lectura (no hay create/update/delete de auditoría vía API).

- [ ] **Step 1: Write the failing test**

Crea `backend/__tests__/admin-audit.test.js`:

```js
'use strict'

const request = require('supertest')
const jwt     = require('jsonwebtoken')

jest.mock('../src/lib/prisma', () => ({
  auditLog: { findMany: jest.fn(), count: jest.fn() },
}))

const app    = require('../src/app')
const prisma = require('../src/lib/prisma')

const adminToken = jwt.sign({ id: 1, roles: ['Admin'] }, process.env.JWT_SECRET, { expiresIn: '1h' })
const auth = (r) => r.set('Authorization', `Bearer ${adminToken}`)

describe('GET /admin/audit', () => {
  test('200 lista registros de auditoría', async () => {
    prisma.auditLog.findMany.mockResolvedValue([{ id: 1, accion: 'user.deactivate', entidad: 'User', entidadId: 42, detalle: null, ip: '1.2.3.4', createdAt: new Date(), admin: { id: 1, nombre: 'Admin', apellidoPaterno: 'RV', email: 'admin@t.pe' } }])
    prisma.auditLog.count.mockResolvedValue(1)
    const res = await auth(request(app).get('/admin/audit?entidad=User'))
    expect(res.status).toBe(200)
    expect(res.body.data.items[0].accion).toBe('user.deactivate')
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { entidad: 'User' } }))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest __tests__/admin-audit.test.js`
Expected: FAIL — `404 Ruta no encontrada`.

- [ ] **Step 3: Implementar el controller de auditoría**

Crea `backend/src/controllers/admin/audit.controller.js`:

```js
const prisma = require('../../lib/prisma')
const { ok, fail } = require('../../lib/response')
const { parsePagination } = require('../../lib/pagination')

// GET /admin/audit — registro de auditoría (solo lectura)
async function listAudit(req, res) {
  try {
    const { page, pageSize, skip, take } = parsePagination(req.query)
    const { entidad, accion } = req.query
    const where = {}
    if (entidad) where.entidad = entidad
    if (accion)  where.accion  = accion

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        select: {
          id: true, accion: true, entidad: true, entidadId: true, detalle: true, ip: true, createdAt: true,
          admin: { select: { id: true, nombre: true, apellidoPaterno: true, email: true } },
        },
        orderBy: { createdAt: 'desc' }, skip, take,
      }),
      prisma.auditLog.count({ where }),
    ])
    ok(res, { items, total, page, pageSize })
  } catch (err) {
    fail(res, 500, 'Error al listar auditoría')
  }
}

module.exports = { listAudit }
```

- [ ] **Step 4: Registrar ruta en admin.js**

```js
const { listAudit } = require('../controllers/admin/audit.controller')
```

```js
router.get('/audit', listAudit)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && npx jest __tests__/admin-audit.test.js`
Expected: PASS (1 test).

- [ ] **Step 6: Correr toda la suite backend**

Run: `cd backend && npx jest`
Expected: PASS en todos los archivos (existentes + nuevos de admin).

- [ ] **Step 7: Commit**

```bash
git add backend/src/controllers/admin/audit.controller.js backend/src/routes/admin.js backend/__tests__/admin-audit.test.js
git commit -m "feat(admin): endpoint de auditoría (solo lectura)"
```

---

### Task 10: Script de creación del primer Admin + .env.example

**Files:**
- Create: `backend/scripts/createAdmin.js`
- Modify: `backend/package.json` (script `db:admin`)
- Modify: `.env.example` (variables de admin)

**Interfaces:**
- Consumes: `User.activo` (Task 1), rol `Admin`.
- Produces: comando `npm run db:admin` que crea o promueve un usuario Admin desde `ADMIN_EMAIL`/`ADMIN_PASSWORD`.

- [ ] **Step 1: Crear el script**

Crea `backend/scripts/createAdmin.js`:

```js
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const email    = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    console.error('⛔ Debes definir ADMIN_EMAIL y ADMIN_PASSWORD en backend/.env')
    process.exit(1)
  }

  const role = await prisma.role.upsert({ where: { nombre: 'Admin' }, update: {}, create: { nombre: 'Admin' } })

  const existing = await prisma.user.findUnique({ where: { email }, include: { roles: true } })
  if (existing) {
    const yaEsAdmin = existing.roles.some((r) => r.roleId === role.id)
    if (!yaEsAdmin) await prisma.userRole.create({ data: { userId: existing.id, roleId: role.id } })
    await prisma.user.update({ where: { id: existing.id }, data: { activo: true } })
    console.log(`✅ Usuario ${email} promovido a Admin (id ${existing.id})`)
  } else {
    const created = await prisma.user.create({
      data: {
        dni:               process.env.ADMIN_DNI    || '00000000',
        nombre:            process.env.ADMIN_NOMBRE || 'Admin',
        apellidoPaterno:   'RentaValid',
        apellidoMaterno:   'Sistema',
        email,
        telefono:          '+51 000 000 000',
        passwordHash:      await bcrypt.hash(password, 12),
        identidadValidada: true,
        activo:            true,
        roles:             { create: { roleId: role.id } },
      },
    })
    console.log(`✅ Admin creado: ${email} (id ${created.id})`)
  }
}

main()
  .catch((e) => { console.error('❌ Error creando Admin:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Agregar el script npm**

En `backend/package.json`, dentro de `"scripts"`, añade tras `"db:seed"`:

```json
    "db:admin": "node scripts/createAdmin.js",
```

- [ ] **Step 3: Agregar variables a .env.example**

En `.env.example`, tras el bloque de `JWT_SECRET`, añade:

```bash
# Admin inicial — usado por: npm run db:admin (crea o promueve a Admin)
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_DNI=
ADMIN_NOMBRE=
```

- [ ] **Step 4: Verificar la guardia de credenciales (sin DB necesaria)**

Run: `cd backend && node scripts/createAdmin.js`
Expected: `⛔ Debes definir ADMIN_EMAIL y ADMIN_PASSWORD en backend/.env` y exit code 1 (si no están definidas). Con DB local y variables definidas, imprime `✅ Admin creado/promovido`.

- [ ] **Step 5: Commit**

```bash
git add backend/scripts/createAdmin.js backend/package.json .env.example
git commit -m "feat(admin): script db:admin para crear/promover el primer Admin"
```

---

## FASE 2 — FRONTEND

> Sin setup de tests de frontend en el repo → cada página se verifica manualmente con `npm run dev:frontend` (y `npm run dev:backend` corriendo) navegando el flujo descrito. Requiere un usuario Admin (Task 10) para iniciar sesión.

### Task 11: Service admin + guard + layout + login + rutas

**Files:**
- Create: `frontend/src/services/admin.js`
- Create: `frontend/src/components/admin/RequireAdmin.jsx`
- Create: `frontend/src/components/admin/AdminLayout.jsx`
- Create: `frontend/src/pages/admin/AdminLogin.jsx`
- Modify: `frontend/src/App.jsx` (rutas admin)

**Interfaces:**
- Produces:
  - `adminService` con métodos: `dashboard`, `listUsers`, `getUser`, `setUserEstado`, `setUserRoles`, `listProperties`, `setPropertyEstado`, `listContracts`, `getContract`, `setContractEstado`, `listPayments`, `setPaymentEstado`, `listAudit`.
  - `<RequireAdmin>` (guard), `<AdminLayout>` (sidebar + `<Outlet/>`).
  - Rutas: `/admin/login`, y bajo `/admin` (protegido): `dashboard`, `usuarios`, `inmuebles`, `contratos`, `pagos`, `auditoria`.

- [ ] **Step 1: Crear el service admin**

Crea `frontend/src/services/admin.js`:

```js
import api from './api'

const unwrap = (r) => r.data.data

export const adminService = {
  dashboard: () => api.get('/admin/dashboard').then(unwrap),

  listUsers:     (params)        => api.get('/admin/users', { params }).then(unwrap),
  getUser:       (id)            => api.get(`/admin/users/${id}`).then(unwrap),
  setUserEstado: (id, activo)    => api.patch(`/admin/users/${id}/estado`, { activo }).then(unwrap),
  setUserRoles:  (id, roles)     => api.patch(`/admin/users/${id}/roles`, { roles }).then(unwrap),

  listProperties:    (params)     => api.get('/admin/properties', { params }).then(unwrap),
  setPropertyEstado: (id, estado) => api.patch(`/admin/properties/${id}/estado`, { estado }).then(unwrap),

  listContracts:     (params)     => api.get('/admin/contracts', { params }).then(unwrap),
  getContract:       (id)         => api.get(`/admin/contracts/${id}`).then(unwrap),
  setContractEstado: (id, estado) => api.patch(`/admin/contracts/${id}/estado`, { estado }).then(unwrap),

  listPayments:     (params)     => api.get('/admin/payments', { params }).then(unwrap),
  setPaymentEstado: (id, estado) => api.patch(`/admin/payments/${id}/estado`, { estado }).then(unwrap),

  listAudit: (params) => api.get('/admin/audit', { params }).then(unwrap),
}
```

- [ ] **Step 2: Crear el guard RequireAdmin**

Crea `frontend/src/components/admin/RequireAdmin.jsx`:

```jsx
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

// Guard de UX. La autorización real la impone el backend en /admin/*.
export default function RequireAdmin({ children }) {
  const isAuth  = useAuthStore((s) => !!s.token)
  const isAdmin = useAuthStore((s) => s.user?.roles?.includes('Admin') ?? false)
  if (!isAuth || !isAdmin) return <Navigate to="/admin/login" replace />
  return children
}
```

- [ ] **Step 3: Crear el layout AdminLayout**

Crea `frontend/src/components/admin/AdminLayout.jsx`:

```jsx
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Building2, FileText, CreditCard, ScrollText, LogOut } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/usuarios',  label: 'Usuarios',  icon: Users },
  { to: '/admin/inmuebles', label: 'Inmuebles', icon: Building2 },
  { to: '/admin/contratos', label: 'Contratos', icon: FileText },
  { to: '/admin/pagos',     label: 'Pagos',     icon: CreditCard },
  { to: '/admin/auditoria', label: 'Auditoría', icon: ScrollText },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const user     = useAuthStore((s) => s.user)
  const logout   = useAuthStore((s) => s.logout)
  const salir = () => { logout(); navigate('/admin/login', { replace: true }) }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-60 bg-navy text-white flex flex-col shrink-0">
        <div className="px-6 py-5 text-xl font-bold text-gold">RentaValid Admin</div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-white/15 text-gold' : 'text-white/80 hover:bg-white/10'
                }`}>
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-white/10 text-sm">
          <div className="truncate text-white/70">{user?.email}</div>
          <button onClick={salir} className="mt-2 inline-flex items-center gap-1.5 text-gold hover:underline">
            <LogOut size={14} /> Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-x-auto">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Crear la página AdminLogin**

Crea `frontend/src/pages/admin/AdminLogin.jsx`:

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Loader2, AlertCircle, ShieldCheck } from 'lucide-react'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) { setError('Ingresa tu correo y contraseña'); return }
    setLoading(true); setError('')
    try {
      const res = await api.post('/auth/login', { email: email.trim(), password })
      const { token, user } = res.data.data
      if (!user.roles?.includes('Admin')) {
        setError('Esta cuenta no tiene acceso de administrador')
        return
      }
      useAuthStore.getState().login(token, user)
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-gold font-semibold mb-3">
            <ShieldCheck size={18} /> Panel de Administración
          </div>
          <h1 className="text-3xl font-extrabold text-white">RentaValid Admin</h1>
          <p className="text-white/60 text-sm mt-1">Acceso restringido a administradores.</p>
        </div>

        <div className="card p-6 sm:p-8">
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5">
              <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Correo electrónico</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" className="input-field pl-9 text-sm" placeholder="admin@rentavalid.pe"
                  value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} autoComplete="email" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contraseña</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="password" className="input-field pl-9 text-sm" placeholder="Tu contraseña"
                  value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} autoComplete="current-password" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="mt-2 w-full btn-primary flex items-center justify-center gap-2 py-3.5 disabled:opacity-60">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Ingresando…</> : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Registrar las rutas admin en App.jsx**

En `frontend/src/App.jsx`, añade los imports:

```jsx
import RequireAdmin    from './components/admin/RequireAdmin'
import AdminLayout     from './components/admin/AdminLayout'
import AdminLogin      from './pages/admin/AdminLogin'
import AdminDashboard  from './pages/admin/AdminDashboard'
import AdminUsers      from './pages/admin/AdminUsers'
import AdminProperties from './pages/admin/AdminProperties'
import AdminContracts  from './pages/admin/AdminContracts'
import AdminPayments   from './pages/admin/AdminPayments'
import AdminAudit      from './pages/admin/AdminAudit'
```

y dentro de `<Routes>`, tras la última ruta existente (`/perfil`):

```jsx
        {/* ── Admin ─────────────────────────────────────────── */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="usuarios"  element={<AdminUsers />} />
          <Route path="inmuebles" element={<AdminProperties />} />
          <Route path="contratos" element={<AdminContracts />} />
          <Route path="pagos"     element={<AdminPayments />} />
          <Route path="auditoria" element={<AdminAudit />} />
        </Route>
```

Nota: las páginas `AdminDashboard`, `AdminUsers`, `AdminProperties`, `AdminContracts`, `AdminPayments` y `AdminAudit` se crean en los Tasks 12–17. Como `App.jsx` las importa todas ahora, el build fallaría si no existen. Por eso, en este mismo task crea un **stub temporal** para las **seis** páginas (se reemplazan en Tasks 12–17).

Crea estos seis archivos, cada uno con el componente renombrado según el archivo (`AdminDashboard`, `AdminUsers`, `AdminProperties`, `AdminContracts`, `AdminPayments`, `AdminAudit`):

- `frontend/src/pages/admin/AdminDashboard.jsx`
- `frontend/src/pages/admin/AdminUsers.jsx`
- `frontend/src/pages/admin/AdminProperties.jsx`
- `frontend/src/pages/admin/AdminContracts.jsx`
- `frontend/src/pages/admin/AdminPayments.jsx`
- `frontend/src/pages/admin/AdminAudit.jsx`

Contenido de cada stub (ajustando el nombre del componente):

```jsx
export default function AdminDashboard() {
  return <div className="section-title">En construcción…</div>
}
```

- [ ] **Step 6: Verificación manual**

Levanta backend y frontend:
Run: `npm run dev:backend` (en una terminal) y `npm run dev:frontend` (en otra).
1. Visita `http://localhost:5173/admin/dashboard` sin sesión → debe redirigir a `/admin/login`.
2. Inicia sesión con un usuario **no** Admin → debe mostrar "Esta cuenta no tiene acceso de administrador".
3. Inicia sesión con el Admin (creado con `npm run db:admin`) → entra al panel, sidebar visible, "Cerrar sesión" vuelve a `/admin/login`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/services/admin.js frontend/src/components/admin frontend/src/pages/admin frontend/src/App.jsx
git commit -m "feat(admin): service, guard, layout, login y rutas de la sección /admin"
```

---

### Task 12: Página Dashboard

**Files:**
- Create: `frontend/src/pages/admin/AdminDashboard.jsx` (reemplaza cualquier stub)

**Interfaces:**
- Consumes: `adminService.dashboard()` → `{ usuarios, inmuebles, contratos, pagos, ingresos }`.

- [ ] **Step 1: Crear la página**

Crea `frontend/src/pages/admin/AdminDashboard.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { Loader2, Users, Building2, FileText, Wallet } from 'lucide-react'
import { adminService } from '../../services/admin'

function Stat({ icon: Icon, label, value, sub }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-gray-500 text-sm"><Icon size={16} /> {label}</div>
      <div className="mt-2 text-3xl font-extrabold text-navy">{value}</div>
      {sub && <div className="mt-1 text-xs text-gray-400">{sub}</div>}
    </div>
  )
}

function Breakdown({ title, rows, keyName }) {
  return (
    <div className="card p-5">
      <div className="font-semibold text-navy mb-3">{title}</div>
      <ul className="space-y-1.5 text-sm">
        {rows.length === 0 && <li className="text-gray-400">Sin datos</li>}
        {rows.map((r) => (
          <li key={r[keyName]} className="flex justify-between">
            <span className="text-gray-600">{r[keyName]}</span>
            <span className="font-semibold text-navy">{r.total}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function AdminDashboard() {
  const [data, setData]     = useState(null)
  const [error, setError]   = useState('')

  useEffect(() => {
    adminService.dashboard().then(setData).catch((e) => setError(e.response?.data?.error || 'Error al cargar'))
  }, [])

  if (error)  return <div className="text-red-600">{error}</div>
  if (!data)  return <div className="flex items-center gap-2 text-gray-500"><Loader2 className="animate-spin" size={18} /> Cargando…</div>

  const soles = (n) => `S/ ${Number(n).toLocaleString('es-PE')}`

  return (
    <div>
      <h1 className="section-title mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat icon={Users}     label="Usuarios"   value={data.usuarios.total} sub={`${data.usuarios.activos} activos`} />
        <Stat icon={Building2} label="Inmuebles"  value={data.inmuebles.reduce((a, r) => a + r.total, 0)} />
        <Stat icon={FileText}  label="Contratos"  value={data.contratos.reduce((a, r) => a + r.total, 0)} />
        <Stat icon={Wallet}    label="Comisiones cobradas" value={soles(data.ingresos.comisionesCobradas)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Breakdown title="Usuarios por rol"     rows={data.usuarios.porRol.map((r) => ({ ...r, k: r.rol }))} keyName="rol" />
        <Breakdown title="Inmuebles por estado" rows={data.inmuebles} keyName="estado" />
        <Breakdown title="Contratos por estado" rows={data.contratos} keyName="estado" />
        <Breakdown title="Pagos por estado"     rows={data.pagos} keyName="estado" />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificación manual**

Con backend+frontend corriendo y sesión Admin, visita `/admin/dashboard`. Debe mostrar 4 tarjetas superiores y 4 desgloses con los datos del seed (usuarios, inmuebles, contratos, pagos, comisiones).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/AdminDashboard.jsx
git commit -m "feat(admin): página Dashboard con KPIs"
```

---

### Task 13: Página Usuarios

**Files:**
- Create/Replace: `frontend/src/pages/admin/AdminUsers.jsx`

**Interfaces:**
- Consumes: `adminService.listUsers`, `setUserEstado`, `setUserRoles`.

- [ ] **Step 1: Crear la página**

Reemplaza `frontend/src/pages/admin/AdminUsers.jsx`:

```jsx
import { useEffect, useState, useCallback } from 'react'
import { Loader2, Search } from 'lucide-react'
import { adminService } from '../../services/admin'

const ROLES = ['Arrendador', 'Arrendatario', 'Admin']

export default function AdminUsers() {
  const [data, setData]       = useState(null)
  const [error, setError]     = useState('')
  const [q, setQ]             = useState('')
  const [rol, setRol]         = useState('')
  const [activo, setActivo]   = useState('')
  const [page, setPage]       = useState(1)
  const [busy, setBusy]       = useState(null)   // id en proceso

  const load = useCallback(() => {
    setError('')
    adminService.listUsers({ q: q || undefined, rol: rol || undefined, activo: activo || undefined, page, pageSize: 20 })
      .then(setData)
      .catch((e) => setError(e.response?.data?.error || 'Error al cargar usuarios'))
  }, [q, rol, activo, page])

  useEffect(() => { load() }, [load])

  const toggleEstado = async (u) => {
    setBusy(u.id)
    try { await adminService.setUserEstado(u.id, !u.activo); load() }
    catch (e) { setError(e.response?.data?.error || 'No se pudo actualizar') }
    finally { setBusy(null) }
  }

  const toggleAdmin = async (u) => {
    const next = u.roles.includes('Admin')
      ? u.roles.filter((r) => r !== 'Admin')
      : [...u.roles, 'Admin']
    const roles = next.length ? next : ['Arrendatario']
    setBusy(u.id)
    try { await adminService.setUserRoles(u.id, roles); load() }
    catch (e) { setError(e.response?.data?.error || 'No se pudo actualizar el rol') }
    finally { setBusy(null) }
  }

  return (
    <div>
      <h1 className="section-title mb-6">Usuarios</h1>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-9 text-sm w-64" placeholder="Nombre, email o DNI"
            value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
        </div>
        <select className="input-field text-sm w-40" value={rol} onChange={(e) => { setRol(e.target.value); setPage(1) }}>
          <option value="">Todos los roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="input-field text-sm w-40" value={activo} onChange={(e) => { setActivo(e.target.value); setPage(1) }}>
          <option value="">Activos e inactivos</option>
          <option value="true">Solo activos</option>
          <option value="false">Solo inactivos</option>
        </select>
      </div>

      {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}

      {!data ? (
        <div className="flex items-center gap-2 text-gray-500"><Loader2 className="animate-spin" size={18} /> Cargando…</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b">
              <tr>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">DNI</th>
                <th className="px-4 py-3">Roles</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Sin resultados</td></tr>
              )}
              {data.items.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-navy">{u.nombre} {u.apellidoPaterno}</div>
                    <div className="text-gray-400 text-xs">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">{u.dni}</td>
                  <td className="px-4 py-3">{u.roles.join(', ')}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button disabled={busy === u.id} onClick={() => toggleEstado(u)}
                        className="btn-outline text-xs px-3 py-1.5 disabled:opacity-50">
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button disabled={busy === u.id} onClick={() => toggleAdmin(u)}
                        className="btn-outline text-xs px-3 py-1.5 disabled:opacity-50">
                        {u.roles.includes('Admin') ? 'Quitar Admin' : 'Hacer Admin'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-gray-500">{data.total} usuarios</span>
          <div className="flex gap-2">
            <button className="btn-outline px-3 py-1.5 disabled:opacity-40" disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}>Anterior</button>
            <button className="btn-outline px-3 py-1.5 disabled:opacity-40"
              disabled={page * data.pageSize >= data.total} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificación manual**

En `/admin/usuarios`: la tabla lista usuarios; filtros por texto/rol/estado funcionan; "Desactivar" cambia el badge a Inactivo; "Hacer Admin"/"Quitar Admin" cambia roles; intentar desactivarte a ti mismo muestra el error del backend. Cierra sesión, intenta login con el usuario desactivado → 403 "cuenta está desactivada".

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/AdminUsers.jsx
git commit -m "feat(admin): página de gestión de usuarios"
```

---

### Task 14: Página Inmuebles

**Files:**
- Create/Replace: `frontend/src/pages/admin/AdminProperties.jsx`

**Interfaces:**
- Consumes: `adminService.listProperties`, `setPropertyEstado`.

- [ ] **Step 1: Crear la página**

Reemplaza `frontend/src/pages/admin/AdminProperties.jsx`:

```jsx
import { useEffect, useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { adminService } from '../../services/admin'

const ESTADOS = ['Disponible', 'Arrendado', 'Inactivo']

export default function AdminProperties() {
  const [data, setData]     = useState(null)
  const [error, setError]   = useState('')
  const [estado, setEstado] = useState('')
  const [page, setPage]     = useState(1)
  const [busy, setBusy]     = useState(null)

  const load = useCallback(() => {
    setError('')
    adminService.listProperties({ estado: estado || undefined, page, pageSize: 20 })
      .then(setData)
      .catch((e) => setError(e.response?.data?.error || 'Error al cargar inmuebles'))
  }, [estado, page])

  useEffect(() => { load() }, [load])

  const cambiarEstado = async (p, nuevo) => {
    setBusy(p.id)
    try { await adminService.setPropertyEstado(p.id, nuevo); load() }
    catch (e) { setError(e.response?.data?.error || 'No se pudo actualizar') }
    finally { setBusy(null) }
  }

  return (
    <div>
      <h1 className="section-title mb-6">Inmuebles</h1>

      <div className="mb-4">
        <select className="input-field text-sm w-48" value={estado} onChange={(e) => { setEstado(e.target.value); setPage(1) }}>
          <option value="">Todos los estados</option>
          {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}

      {!data ? (
        <div className="flex items-center gap-2 text-gray-500"><Loader2 className="animate-spin" size={18} /> Cargando…</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b">
              <tr>
                <th className="px-4 py-3">Inmueble</th>
                <th className="px-4 py-3">Distrito</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Arrendador</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Sin resultados</td></tr>
              )}
              {data.items.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium text-navy">{p.titulo}</td>
                  <td className="px-4 py-3">{p.distrito}</td>
                  <td className="px-4 py-3">S/ {Number(p.precio).toLocaleString('es-PE')}</td>
                  <td className="px-4 py-3">{p.arrendador?.nombre} {p.arrendador?.apellidoPaterno}</td>
                  <td className="px-4 py-3">
                    <select disabled={busy === p.id} value={p.estado}
                      onChange={(e) => cambiarEstado(p, e.target.value)}
                      className="input-field text-xs py-1.5 w-36 disabled:opacity-50">
                      {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-gray-500">{data.total} inmuebles</span>
          <div className="flex gap-2">
            <button className="btn-outline px-3 py-1.5 disabled:opacity-40" disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}>Anterior</button>
            <button className="btn-outline px-3 py-1.5 disabled:opacity-40"
              disabled={page * data.pageSize >= data.total} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificación manual**

En `/admin/inmuebles`: lista inmuebles del seed; el filtro por estado funciona; cambiar el `select` de estado a `Inactivo` persiste (recarga la lista con el nuevo estado).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/AdminProperties.jsx
git commit -m "feat(admin): página de moderación de inmuebles"
```

---

### Task 15: Página Contratos

**Files:**
- Create/Replace: `frontend/src/pages/admin/AdminContracts.jsx`

**Interfaces:**
- Consumes: `adminService.listContracts`, `setContractEstado`.

- [ ] **Step 1: Crear la página**

Reemplaza `frontend/src/pages/admin/AdminContracts.jsx`:

```jsx
import { useEffect, useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { adminService } from '../../services/admin'

const ESTADOS = ['Borrador', 'Activo', 'Firmado', 'Finalizado', 'Cancelado']

export default function AdminContracts() {
  const [data, setData]     = useState(null)
  const [error, setError]   = useState('')
  const [estado, setEstado] = useState('')
  const [page, setPage]     = useState(1)
  const [busy, setBusy]     = useState(null)

  const load = useCallback(() => {
    setError('')
    adminService.listContracts({ estado: estado || undefined, page, pageSize: 20 })
      .then(setData)
      .catch((e) => setError(e.response?.data?.error || 'Error al cargar contratos'))
  }, [estado, page])

  useEffect(() => { load() }, [load])

  const cambiarEstado = async (c, nuevo) => {
    setBusy(c.id)
    try { await adminService.setContractEstado(c.id, nuevo); load() }
    catch (e) { setError(e.response?.data?.error || 'No se pudo actualizar') }
    finally { setBusy(null) }
  }

  const fecha = (d) => new Date(d).toLocaleDateString('es-PE')

  return (
    <div>
      <h1 className="section-title mb-6">Contratos</h1>

      <div className="mb-4">
        <select className="input-field text-sm w-48" value={estado} onChange={(e) => { setEstado(e.target.value); setPage(1) }}>
          <option value="">Todos los estados</option>
          {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}

      {!data ? (
        <div className="flex items-center gap-2 text-gray-500"><Loader2 className="animate-spin" size={18} /> Cargando…</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Inmueble</th>
                <th className="px-4 py-3">Arrendatario</th>
                <th className="px-4 py-3">Monto</th>
                <th className="px-4 py-3">Vigencia</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Sin resultados</td></tr>
              )}
              {data.items.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{c.id}</td>
                  <td className="px-4 py-3 font-medium text-navy">{c.application?.property?.titulo}</td>
                  <td className="px-4 py-3">{c.application?.arrendatario?.nombre} {c.application?.arrendatario?.apellidoPaterno}</td>
                  <td className="px-4 py-3">S/ {Number(c.monto).toLocaleString('es-PE')}</td>
                  <td className="px-4 py-3 text-xs">{fecha(c.fechaInicio)} – {fecha(c.fechaFin)}</td>
                  <td className="px-4 py-3">
                    <select disabled={busy === c.id} value={c.estado}
                      onChange={(e) => cambiarEstado(c, e.target.value)}
                      className="input-field text-xs py-1.5 w-36 disabled:opacity-50">
                      {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-gray-500">{data.total} contratos</span>
          <div className="flex gap-2">
            <button className="btn-outline px-3 py-1.5 disabled:opacity-40" disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}>Anterior</button>
            <button className="btn-outline px-3 py-1.5 disabled:opacity-40"
              disabled={page * data.pageSize >= data.total} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificación manual**

En `/admin/contratos`: lista el contrato del seed; cambiar estado a `Cancelado` persiste; el filtro por estado funciona.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/AdminContracts.jsx
git commit -m "feat(admin): página de contratos"
```

---

### Task 16: Página Pagos / Finanzas

**Files:**
- Create/Replace: `frontend/src/pages/admin/AdminPayments.jsx`

**Interfaces:**
- Consumes: `adminService.listPayments`, `setPaymentEstado`.

- [ ] **Step 1: Crear la página**

Reemplaza `frontend/src/pages/admin/AdminPayments.jsx`:

```jsx
import { useEffect, useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { adminService } from '../../services/admin'

const ESTADOS = ['Pendiente', 'Pagado', 'Atrasado']

export default function AdminPayments() {
  const [data, setData]     = useState(null)
  const [error, setError]   = useState('')
  const [estado, setEstado] = useState('')
  const [page, setPage]     = useState(1)
  const [busy, setBusy]     = useState(null)

  const load = useCallback(() => {
    setError('')
    adminService.listPayments({ estado: estado || undefined, page, pageSize: 20 })
      .then(setData)
      .catch((e) => setError(e.response?.data?.error || 'Error al cargar pagos'))
  }, [estado, page])

  useEffect(() => { load() }, [load])

  const cambiarEstado = async (p, nuevo) => {
    setBusy(p.id)
    try { await adminService.setPaymentEstado(p.id, nuevo); load() }
    catch (e) { setError(e.response?.data?.error || 'No se pudo actualizar') }
    finally { setBusy(null) }
  }

  const soles = (n) => `S/ ${Number(n).toLocaleString('es-PE')}`

  return (
    <div>
      <h1 className="section-title mb-6">Pagos y finanzas</h1>

      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="card p-5">
            <div className="text-gray-500 text-sm">Comisiones cobradas</div>
            <div className="mt-1 text-2xl font-extrabold text-navy">{soles(data.totales.comisionesCobradas)}</div>
          </div>
          <div className="card p-5">
            <div className="text-gray-500 text-sm">Monto recaudado</div>
            <div className="mt-1 text-2xl font-extrabold text-navy">{soles(data.totales.montoRecaudado)}</div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <select className="input-field text-sm w-48" value={estado} onChange={(e) => { setEstado(e.target.value); setPage(1) }}>
          <option value="">Todos los estados</option>
          {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}

      {!data ? (
        <div className="flex items-center gap-2 text-gray-500"><Loader2 className="animate-spin" size={18} /> Cargando…</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b">
              <tr>
                <th className="px-4 py-3">Periodo</th>
                <th className="px-4 py-3">Inmueble</th>
                <th className="px-4 py-3">Arrendatario</th>
                <th className="px-4 py-3">Monto</th>
                <th className="px-4 py-3">Comisión</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Sin resultados</td></tr>
              )}
              {data.items.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{p.periodo}</td>
                  <td className="px-4 py-3 font-medium text-navy">{p.contract?.application?.property?.titulo}</td>
                  <td className="px-4 py-3">{p.contract?.application?.arrendatario?.nombre} {p.contract?.application?.arrendatario?.apellidoPaterno}</td>
                  <td className="px-4 py-3">{soles(p.monto)}</td>
                  <td className="px-4 py-3">{soles(p.comision)}</td>
                  <td className="px-4 py-3">
                    <select disabled={busy === p.id} value={p.estado}
                      onChange={(e) => cambiarEstado(p, e.target.value)}
                      className="input-field text-xs py-1.5 w-32 disabled:opacity-50">
                      {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-gray-500">{data.total} pagos</span>
          <div className="flex gap-2">
            <button className="btn-outline px-3 py-1.5 disabled:opacity-40" disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}>Anterior</button>
            <button className="btn-outline px-3 py-1.5 disabled:opacity-40"
              disabled={page * data.pageSize >= data.total} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificación manual**

En `/admin/pagos`: dos tarjetas de totales; tabla con los pagos del seed; marcar un pago `Pendiente` como `Pagado` recarga y actualiza los totales de comisiones.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/AdminPayments.jsx
git commit -m "feat(admin): página de pagos y finanzas"
```

---

### Task 17: Página Auditoría

**Files:**
- Create/Replace: `frontend/src/pages/admin/AdminAudit.jsx`

**Interfaces:**
- Consumes: `adminService.listAudit`.

- [ ] **Step 1: Crear la página**

Reemplaza `frontend/src/pages/admin/AdminAudit.jsx`:

```jsx
import { useEffect, useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { adminService } from '../../services/admin'

const ENTIDADES = ['User', 'Property', 'Contract', 'Payment']

export default function AdminAudit() {
  const [data, setData]       = useState(null)
  const [error, setError]     = useState('')
  const [entidad, setEntidad] = useState('')
  const [page, setPage]       = useState(1)

  const load = useCallback(() => {
    setError('')
    adminService.listAudit({ entidad: entidad || undefined, page, pageSize: 20 })
      .then(setData)
      .catch((e) => setError(e.response?.data?.error || 'Error al cargar la auditoría'))
  }, [entidad, page])

  useEffect(() => { load() }, [load])

  const fechaHora = (d) => new Date(d).toLocaleString('es-PE')

  return (
    <div>
      <h1 className="section-title mb-6">Auditoría</h1>

      <div className="mb-4">
        <select className="input-field text-sm w-48" value={entidad} onChange={(e) => { setEntidad(e.target.value); setPage(1) }}>
          <option value="">Todas las entidades</option>
          {ENTIDADES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}

      {!data ? (
        <div className="flex items-center gap-2 text-gray-500"><Loader2 className="animate-spin" size={18} /> Cargando…</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Acción</th>
                <th className="px-4 py-3">Entidad</th>
                <th className="px-4 py-3">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Sin registros</td></tr>
              )}
              {data.items.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{fechaHora(a.createdAt)}</td>
                  <td className="px-4 py-3">{a.admin?.nombre} {a.admin?.apellidoPaterno}</td>
                  <td className="px-4 py-3 font-mono text-xs">{a.accion}</td>
                  <td className="px-4 py-3">{a.entidad}{a.entidadId != null ? ` #${a.entidadId}` : ''}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{a.detalle ? JSON.stringify(a.detalle) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-gray-500">{data.total} registros</span>
          <div className="flex gap-2">
            <button className="btn-outline px-3 py-1.5 disabled:opacity-40" disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}>Anterior</button>
            <button className="btn-outline px-3 py-1.5 disabled:opacity-40"
              disabled={page * data.pageSize >= data.total} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificación manual**

En `/admin/auditoria`: aparecen los registros de las acciones hechas en tasks anteriores (desactivar usuario, cambiar rol, estado de inmueble/contrato/pago), con fecha, admin, acción y detalle. El filtro por entidad funciona.

- [ ] **Step 3: Commit final**

```bash
git add frontend/src/pages/admin/AdminAudit.jsx
git commit -m "feat(admin): página de auditoría"
```

---

## Verificación final (end-to-end)

- [ ] Backend: `cd backend && npx jest` → toda la suite en verde.
- [ ] Con `npm run db:admin` (Admin creado) y ambos servidores corriendo:
  - Login Admin en `/admin/login`; usuario no-Admin y usuario desactivado son rechazados.
  - Dashboard muestra KPIs coherentes con el seed.
  - Usuarios: activar/desactivar y promover/degradar Admin; auto-protección impide auto-desactivarse y auto-quitarse Admin.
  - Inmuebles / Contratos / Pagos: cambios de estado persisten.
  - Auditoría refleja cada acción mutante.
