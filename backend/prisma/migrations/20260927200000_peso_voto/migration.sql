-- Peso do voto por unidade (cadastro da unidade): 1 = um voto normal; a
-- síndico pode configurar outro inteiro ou fração. Passa a decidir o
-- resultado e o quórum das assembleias, junto com pesoVotos por opção.

-- AlterTable
ALTER TABLE "unidades" ADD COLUMN "peso_voto" DECIMAL(10,4) NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "pauta_opcoes" ADD COLUMN "peso_votos" DECIMAL(14,4) NOT NULL DEFAULT 0;
