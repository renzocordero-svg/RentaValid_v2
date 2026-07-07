-- CreateEnum
CREATE TYPE "RolNombre" AS ENUM ('Arrendador', 'Arrendatario', 'Admin');
CREATE TYPE "PropertyTipo" AS ENUM ('Departamento', 'Casa', 'Studio', 'Oficina');
CREATE TYPE "PropertyEstado" AS ENUM ('Disponible', 'Arrendado', 'Inactivo');
CREATE TYPE "ApplicationEstado" AS ENUM ('Pendiente', 'Aceptada', 'Rechazada');
CREATE TYPE "ScoreDecision" AS ENUM ('Aprobado', 'Observado');
CREATE TYPE "ContractEstado" AS ENUM ('Borrador', 'Activo', 'Firmado', 'Finalizado', 'Cancelado');
CREATE TYPE "SignatureTipo" AS ENUM ('Arrendador', 'Arrendatario');
CREATE TYPE "PaymentEstado" AS ENUM ('Pendiente', 'Pagado', 'Atrasado');

-- CreateTable
CREATE TABLE "User" (
    "id"                SERIAL          NOT NULL,
    "dni"               TEXT            NOT NULL,
    "nombre"            TEXT            NOT NULL,
    "apellidoPaterno"   TEXT            NOT NULL,
    "apellidoMaterno"   TEXT            NOT NULL,
    "email"             TEXT            NOT NULL,
    "telefono"          TEXT            NOT NULL,
    "passwordHash"      TEXT            NOT NULL,
    "fotoUrl"           TEXT,
    "identidadValidada" BOOLEAN         NOT NULL DEFAULT false,
    "createdAt"         TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id"     SERIAL          NOT NULL,
    "nombre" "RolNombre"     NOT NULL,
    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,
    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId", "roleId")
);

-- CreateTable
CREATE TABLE "VerificationCode" (
    "id"        SERIAL          NOT NULL,
    "userId"    INTEGER         NOT NULL,
    "code"      TEXT            NOT NULL,
    "expiresAt" TIMESTAMP(3)    NOT NULL,
    CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id"            SERIAL              NOT NULL,
    "arrendadorId"  INTEGER             NOT NULL,
    "titulo"        TEXT                NOT NULL,
    "descripcion"   TEXT                NOT NULL,
    "direccion"     TEXT                NOT NULL,
    "distrito"      TEXT                NOT NULL,
    "area"          DOUBLE PRECISION    NOT NULL,
    "habitaciones"  INTEGER             NOT NULL,
    "banos"         INTEGER             NOT NULL,
    "cochera"       BOOLEAN             NOT NULL DEFAULT false,
    "amoblado"      BOOLEAN             NOT NULL DEFAULT false,
    "precio"        DOUBLE PRECISION    NOT NULL,
    "mesesGarantia" INTEGER             NOT NULL DEFAULT 2,
    "tipo"          "PropertyTipo"      NOT NULL,
    "estado"        "PropertyEstado"    NOT NULL DEFAULT 'Disponible',
    "createdAt"     TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyPhoto" (
    "id"         SERIAL  NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "url"        TEXT    NOT NULL,
    "orden"      INTEGER NOT NULL,
    CONSTRAINT "PropertyPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id"             SERIAL                  NOT NULL,
    "propertyId"     INTEGER                 NOT NULL,
    "arrendatarioId" INTEGER                 NOT NULL,
    "estado"         "ApplicationEstado"     NOT NULL DEFAULT 'Pendiente',
    "createdAt"      TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Score" (
    "id"             SERIAL              NOT NULL,
    "arrendatarioId" INTEGER             NOT NULL,
    "ingreso"        DOUBLE PRECISION    NOT NULL,
    "topeAlquiler"   DOUBLE PRECISION    NOT NULL,
    "decision"       "ScoreDecision"     NOT NULL,
    "detalle"        JSONB               NOT NULL,
    "createdAt"      TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id"            SERIAL              NOT NULL,
    "applicationId" INTEGER             NOT NULL,
    "contenido"     TEXT                NOT NULL,
    "clausulas"     JSONB               NOT NULL,
    "monto"         DOUBLE PRECISION    NOT NULL,
    "garantia"      DOUBLE PRECISION    NOT NULL,
    "fechaInicio"   TIMESTAMP(3)        NOT NULL,
    "fechaFin"      TIMESTAMP(3)        NOT NULL,
    "estado"        "ContractEstado"    NOT NULL DEFAULT 'Borrador',
    "hashFirma"     TEXT,
    "firmadoAt"     TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signature" (
    "id"         SERIAL          NOT NULL,
    "contractId" INTEGER         NOT NULL,
    "userId"     INTEGER         NOT NULL,
    "tipo"       "SignatureTipo" NOT NULL,
    "hash"       TEXT            NOT NULL,
    "ip"         TEXT            NOT NULL,
    "createdAt"  TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id"         SERIAL          NOT NULL,
    "contractId" INTEGER         NOT NULL,
    "periodo"    TEXT            NOT NULL,
    "monto"      DOUBLE PRECISION NOT NULL,
    "comision"   DOUBLE PRECISION NOT NULL,
    "estado"     "PaymentEstado" NOT NULL DEFAULT 'Pendiente',
    "fechaPago"  TIMESTAMP(3),
    "createdAt"  TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_dni_key"   ON "User"("dni");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE UNIQUE INDEX "Role_nombre_key" ON "Role"("nombre");

CREATE UNIQUE INDEX "VerificationCode_userId_key" ON "VerificationCode"("userId");

CREATE UNIQUE INDEX "PropertyPhoto_propertyId_orden_key" ON "PropertyPhoto"("propertyId", "orden");

CREATE UNIQUE INDEX "Application_propertyId_arrendatarioId_key" ON "Application"("propertyId", "arrendatarioId");

CREATE UNIQUE INDEX "Score_arrendatarioId_key" ON "Score"("arrendatarioId");

CREATE UNIQUE INDEX "Contract_applicationId_key" ON "Contract"("applicationId");

-- AddForeignKey
ALTER TABLE "UserRole"
    ADD CONSTRAINT "UserRole_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserRole"
    ADD CONSTRAINT "UserRole_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VerificationCode"
    ADD CONSTRAINT "VerificationCode_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Property"
    ADD CONSTRAINT "Property_arrendadorId_fkey"
    FOREIGN KEY ("arrendadorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PropertyPhoto"
    ADD CONSTRAINT "PropertyPhoto_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Application"
    ADD CONSTRAINT "Application_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Application"
    ADD CONSTRAINT "Application_arrendatarioId_fkey"
    FOREIGN KEY ("arrendatarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Score"
    ADD CONSTRAINT "Score_arrendatarioId_fkey"
    FOREIGN KEY ("arrendatarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Contract"
    ADD CONSTRAINT "Contract_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Signature"
    ADD CONSTRAINT "Signature_contractId_fkey"
    FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Signature"
    ADD CONSTRAINT "Signature_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Payment"
    ADD CONSTRAINT "Payment_contractId_fkey"
    FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
