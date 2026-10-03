-- CreateTable
CREATE TABLE "ordem_servico_anexos" (
    "id" UUID NOT NULL,
    "ordem_servico_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "arquivo" BYTEA NOT NULL,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ordem_servico_anexos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ordem_servico_anexos_ordem_servico_id_idx" ON "ordem_servico_anexos"("ordem_servico_id");

-- AddForeignKey
ALTER TABLE "ordem_servico_anexos" ADD CONSTRAINT "ordem_servico_anexos_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
