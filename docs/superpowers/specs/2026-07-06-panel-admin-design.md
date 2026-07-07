# Panel de Administración (rol Admin) — Diseño

**Fecha:** 2026-07-06
**Estado:** Aprobado, listo para plan de implementación

## Objetivo

Dar capacidades reales al rol `Admin` (que ya existe en el enum `RolNombre` pero no se usa),
mediante una sección de administración dedicada bajo `/admin` con su propio login. El Admin
tiene **todos los permisos** y puede **supervisar y actuar** sobre las áreas de la plataforma.

No se crea un rol nuevo ni jerarquía: "Superadmin" y "Admin" son el mismo rol. Un único rol
administrativo con acceso total.

## Alcance

Áreas que el Admin puede gestionar:

1. **Usuarios** — ver, filtrar, ver detalle, activar/desactivar (soft delete), asignar/quitar rol Admin.
2. **Inmuebles** — ver todos, moderar cambiando su estado (incluye ocultar vía `Inactivo`).
3. **Contratos** — ver todos, ver detalle, cambiar estado / cancelar.
4. **Pagos / Finanzas** — ver todos, totales de comisiones/ingresos, marcar estado de pago.
5. **Dashboard / Métricas** — KPIs generales de la plataforma.
6. **Auditoría** — registro de solo lectura de todas las acciones mutantes del Admin.

Fuera de alcance (por ahora): revisión/edición manual de KYC y Scoring como área dedicada,
borrado real (hard delete), tabla de credenciales separada para admins.

## Decisiones clave

- **Superadmin = Admin**: un solo rol, todos los permisos. Sin cambios al enum `RolNombre`.
- **Soft delete**: desactivar en vez de borrar. Reversible y no rompe relaciones (contratos, pagos).
- **Audit log**: cada acción que modifica datos queda registrada (quién, qué, cuándo, sobre qué).
- **Login admin dedicado** en `/admin/login`, reutilizando el sistema JWT/bcrypt existente
  (`/auth/login`), validando que el usuario tenga rol `Admin`. No hay autenticación duplicada.
- **Backend como única fuente de verdad**: el guard del frontend es solo UX.
- **Primer Admin por seed + promoción** desde el panel.

---

## Sección 1 — Modelo de datos (Prisma)

### 1.1 Soft delete en `User`

```prisma
model User {
  // ...campos actuales...
  activo        Boolean   @default(true)   // soft delete / suspensión
  desactivadoAt DateTime?

  // relación inversa nueva:
  auditLogs     AuditLog[]
}
```

`Property` ya tiene `estado: PropertyEstado` con valor `Inactivo`, así que ahí no se agrega
campo — se reutiliza ese enum para ocultar inmuebles.

### 1.2 Nuevo modelo `AuditLog`

```prisma
model AuditLog {
  id        Int      @id @default(autoincrement())
  adminId   Int                          // quién hizo la acción
  accion    String                       // ej. "user.deactivate", "contract.cancel"
  entidad   String                       // ej. "User", "Property", "Contract"
  entidadId Int?                         // id del objeto afectado
  detalle   Json?                        // datos extra (antes/después, motivo)
  ip        String?
  createdAt DateTime @default(now())

  admin User @relation(fields: [adminId], references: [id])
}
```

### 1.3 Migración

Requiere `npx prisma migrate dev`. Sin cambios al enum de roles.

**Convención de nombres:** se mantiene la mezcla español/inglés ya presente en el schema
(`titulo`, `precio`, `estado`), usando `activo`, `accion`, `detalle` en los campos nuevos.

---

## Sección 2 — Backend: endpoints y auditoría

### 2.1 Estructura de archivos

```
backend/src/
├─ routes/
│   └─ admin.js              # router único montado en /admin
├─ services/
│   └─ audit.js              # helper logAudit(...)
```

Seguridad centralizada en una línea:
`router.use(authRequired, roleRequired('Admin'))`.

### 2.2 Endpoints

Todos devuelven `{ data }` en éxito y `{ error }` en error (convención del proyecto).

**Dashboard**
- `GET /admin/dashboard` — KPIs: nº usuarios (por rol), inmuebles por estado, contratos por
  estado, pagos e ingresos por comisiones.

**Usuarios**
- `GET /admin/users` — lista con filtros (rol, activo, búsqueda por nombre/dni/email) + paginación.
- `GET /admin/users/:id` — detalle (roles, inmuebles, KYC, score).
- `PATCH /admin/users/:id/estado` — activar/desactivar (soft delete).
- `PATCH /admin/users/:id/roles` — promover/quitar rol Admin (y otros roles).

**Inmuebles**
- `GET /admin/properties` — todos, con filtros por estado/distrito + paginación.
- `PATCH /admin/properties/:id/estado` — cambiar estado (Disponible/Arrendado/Inactivo).

**Contratos**
- `GET /admin/contracts` — todos, filtro por estado + paginación.
- `GET /admin/contracts/:id` — detalle.
- `PATCH /admin/contracts/:id/estado` — cambiar estado / cancelar.

**Pagos / Finanzas**
- `GET /admin/payments` — todos, filtros (estado, periodo) + totales de comisión/ingresos.
- `PATCH /admin/payments/:id/estado` — marcar Pagado/Atrasado/Pendiente.

**Auditoría**
- `GET /admin/audit` — registro de auditoría (solo lectura), filtros y paginación.

### 2.3 Registro de auditoría

Helper explícito `logAudit()` llamado por cada endpoint mutante tras aplicar el cambio:

```js
await logAudit({
  adminId: req.user.id,
  accion: 'user.deactivate',
  entidad: 'User',
  entidadId: id,
  detalle: { motivo },
  ip: req.ip,
})
```

Las lecturas (`GET`) no se auditan. Llamada explícita (no mágica) para auditoría fiable.

---

## Sección 3 — Frontend: sección `/admin`

### 3.1 Estructura de archivos

```
frontend/src/
├─ pages/admin/
│   ├─ AdminLogin.jsx
│   ├─ AdminDashboard.jsx
│   ├─ AdminUsers.jsx
│   ├─ AdminProperties.jsx
│   ├─ AdminContracts.jsx
│   ├─ AdminPayments.jsx
│   └─ AdminAudit.jsx
├─ components/admin/
│   └─ AdminLayout.jsx       # sidebar: Dashboard, Usuarios, Inmuebles, Contratos, Pagos, Auditoría
├─ services/
│   └─ admin.js              # llamadas Axios a /admin/*
```

### 3.2 Rutas (React Router)

- `/admin/login` — pública.
- `/admin` — protegida, redirige a `/admin/dashboard`.
- `/admin/usuarios`, `/admin/inmuebles`, `/admin/contratos`, `/admin/pagos`, `/admin/auditoria`.

### 3.3 Guard de rutas

Componente `RequireAdmin`:
- Sin token → redirige a `/admin/login`.
- Token sin rol `Admin` → redirige a `/admin/login` con mensaje.
- Reutiliza el store de auth (Zustand) existente.

### 3.4 Diseño visual

Paleta oficial (Navy `#0F2D52` / Gold `#C9A84C`), Plus Jakarta Sans, clases utilitarias
existentes (`card`, `btn-primary`, `input-field`, `badge`, `section-title`). Sidebar Navy,
contenido con tablas + filtros + paginación. Incluye estados vacíos y de carga.

---

## Sección 4 — Seguridad

- Cada endpoint `/admin/*` exige `authRequired + roleRequired('Admin')`. El guard del frontend
  es solo UX; el acceso a datos siempre pasa por el backend.
- El login admin reutiliza `/auth/login`. La pantalla `/admin/login` valida que la respuesta
  incluya rol `Admin`; si no, no deja pasar. No se crea endpoint de auth nuevo.
- Un usuario con `activo=false` **no puede loguearse**: se añade esa verificación al login
  existente, cerrando el círculo del soft delete.
- **Anti-auto-bloqueo**: un Admin no puede desactivarse ni quitarse el rol Admin a sí mismo.
- **Auditoría inmutable**: `AuditLog` es solo-lectura desde la API (sin endpoints de edición/borrado).

---

## Sección 5 — Creación del primer Admin (seed)

- Se extiende `backend/prisma/seed.js` (o script `scripts/createAdmin.js`) para crear/promover
  un Admin inicial, leyendo `ADMIN_EMAIL` y `ADMIN_PASSWORD` de variables de entorno.
- Estas variables se agregan a `.env.example` (sin valores reales), según la regla del proyecto.
- Después, ese Admin promueve a otros desde `/admin/usuarios` (`PATCH /admin/users/:id/roles`).

---

## Sección 6 — Pruebas (testing)

- **Backend**: los endpoints `/admin/*` rechazan sin token y sin rol Admin (403); el soft delete
  impide login; la auto-protección funciona; cada acción mutante escribe en `AuditLog`.
- **Frontend**: verificación del flujo (login admin → dashboard → acción → aparece en auditoría).
  Usar el setup de tests de componentes si existe; si no, verificación manual documentada.
