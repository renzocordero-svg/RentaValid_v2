-- AlterTable: agrega campo activo (default true) al modelo User, para activar/desactivar desde el panel de Admin
ALTER TABLE "User" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true;
