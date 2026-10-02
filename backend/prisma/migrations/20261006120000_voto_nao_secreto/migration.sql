ALTER TABLE "pauta_votantes" ADD COLUMN "opcao_id" UUID;

ALTER TABLE "pauta_votantes"
  ADD CONSTRAINT "pauta_votantes_opcao_id_fkey"
  FOREIGN KEY ("opcao_id") REFERENCES "pauta_opcoes"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
