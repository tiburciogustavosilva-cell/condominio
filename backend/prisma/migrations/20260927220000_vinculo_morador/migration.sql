-- Vínculo da pessoa com a unidade (proprietário, inquilino, procurador) —
-- só organizativo/informativo. Não muda papel/acesso: continua tudo condômino.

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN "vinculo" TEXT NOT NULL DEFAULT 'proprietario';
