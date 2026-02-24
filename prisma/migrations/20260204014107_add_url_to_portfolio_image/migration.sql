/*
  Warnings:

  - Added the required column `url` to the `PortfolioImage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: Agregar columna url con valor por defecto para filas existentes
-- Primero agregar la columna con un valor temporal basado en filename
ALTER TABLE "PortfolioImage" ADD COLUMN "url" TEXT;

-- Actualizar filas existentes con una URL placeholder basada en filename
-- (Las imágenes existentes estaban en /uploads local, ahora apuntarán a R2)
UPDATE "PortfolioImage" SET "url" = CONCAT('/uploads/', "filename") WHERE "url" IS NULL;

-- Hacer la columna NOT NULL
ALTER TABLE "PortfolioImage" ALTER COLUMN "url" SET NOT NULL;
