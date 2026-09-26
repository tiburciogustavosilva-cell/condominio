-- AlterTable
ALTER TABLE "encomendas" ADD COLUMN     "codigo_retirada" TEXT,
ADD COLUMN     "entregador_cpf" TEXT,
ADD COLUMN     "entregador_nome" TEXT,
ADD COLUMN     "foto" BYTEA;
