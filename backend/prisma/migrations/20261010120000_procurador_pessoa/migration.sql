-- Procurador deixa de ser uma unidade e vira uma pessoa (nome + CPF), podendo ser de fora.
-- Procurações antigas (unidade → unidade) ficam com nome/CPF vazios.
ALTER TABLE "procuracoes" DROP CONSTRAINT "procuracoes_unidade_procuradora_id_fkey";
ALTER TABLE "procuracoes" DROP COLUMN "unidade_procuradora_id";
ALTER TABLE "procuracoes" ADD COLUMN "procurador_nome" TEXT NOT NULL DEFAULT '';
ALTER TABLE "procuracoes" ADD COLUMN "procurador_cpf" TEXT NOT NULL DEFAULT '';
ALTER TABLE "procuracoes" ALTER COLUMN "procurador_nome" DROP DEFAULT;
ALTER TABLE "procuracoes" ALTER COLUMN "procurador_cpf" DROP DEFAULT;
