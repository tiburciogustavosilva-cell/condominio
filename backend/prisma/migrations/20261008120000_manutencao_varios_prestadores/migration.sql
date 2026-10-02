-- CreateTable
CREATE TABLE "manutencao_prestadores" (
    "id" UUID NOT NULL,
    "manutencao_id" UUID NOT NULL,
    "prestador_id" UUID NOT NULL,

    CONSTRAINT "manutencao_prestadores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "manutencao_prestadores_prestador_id_idx" ON "manutencao_prestadores"("prestador_id");

-- CreateIndex
CREATE UNIQUE INDEX "manutencao_prestadores_manutencao_id_prestador_id_key" ON "manutencao_prestadores"("manutencao_id", "prestador_id");

-- AddForeignKey
ALTER TABLE "manutencao_prestadores" ADD CONSTRAINT "manutencao_prestadores_manutencao_id_fkey" FOREIGN KEY ("manutencao_id") REFERENCES "manutencoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manutencao_prestadores" ADD CONSTRAINT "manutencao_prestadores_prestador_id_fkey" FOREIGN KEY ("prestador_id") REFERENCES "prestadores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migra os dados: cada manutenção já tinha um único prestador, agora vira uma linha de ligação.
INSERT INTO "manutencao_prestadores" ("id", "manutencao_id", "prestador_id")
SELECT gen_random_uuid(), "id", "prestador_id" FROM "manutencoes";

-- DropForeignKey / DropIndex / DropColumn: o vínculo antigo (1 prestador) saiu da tabela de manutenções.
ALTER TABLE "manutencoes" DROP CONSTRAINT "manutencoes_prestador_id_fkey";
DROP INDEX "manutencoes_prestador_id_idx";
ALTER TABLE "manutencoes" DROP COLUMN "prestador_id";
