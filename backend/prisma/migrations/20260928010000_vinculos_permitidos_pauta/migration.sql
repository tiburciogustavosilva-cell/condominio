-- Vínculos que podem votar em cada pauta (proprietário/inquilino/procurador).
-- Por padrão todos podem; o síndico restringe ao criar/editar a pauta.

-- AlterTable
ALTER TABLE "pautas" ADD COLUMN "vinculos_permitidos" TEXT[] NOT NULL DEFAULT ARRAY['proprietario', 'inquilino', 'procurador']::TEXT[];
