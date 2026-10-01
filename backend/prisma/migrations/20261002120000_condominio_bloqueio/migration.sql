-- Admin da plataforma trava o acesso do condomínio (ex.: mensalidade atrasada). NULL = liberado.
ALTER TABLE "condominios" ADD COLUMN "bloqueado_motivo" TEXT;
