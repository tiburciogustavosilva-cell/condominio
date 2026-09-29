-- Aviso some da lista depois de expira_em (null = não expira).
ALTER TABLE "avisos" ADD COLUMN "expira_em" TIMESTAMPTZ;

-- Histórico de status da ocorrência: cada mudança guarda o status e o descritivo do síndico.
CREATE TABLE "ocorrencia_historico" (
    "id" UUID NOT NULL,
    "ocorrencia_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "autor_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ocorrencia_historico_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ocorrencia_historico_ocorrencia_id_idx" ON "ocorrencia_historico"("ocorrencia_id");

ALTER TABLE "ocorrencia_historico" ADD CONSTRAINT "ocorrencia_historico_ocorrencia_id_fkey" FOREIGN KEY ("ocorrencia_id") REFERENCES "ocorrencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ocorrencia_historico" ADD CONSTRAINT "ocorrencia_historico_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
