-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "cargo" TEXT;

-- Funcionários que já existiam usavam Encomendas: viram porteiros.
UPDATE "profiles" SET "cargo" = 'porteiro' WHERE "papel" = 'funcionario' AND "cargo" IS NULL;
