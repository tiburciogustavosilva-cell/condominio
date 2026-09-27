-- CreateTable
CREATE TABLE "procuracoes" (
    "id" UUID NOT NULL,
    "condominio_id" UUID NOT NULL,
    "assembleia_id" UUID NOT NULL,
    "unidade_outorgante_id" UUID NOT NULL,
    "unidade_procuradora_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procuracoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "procuracoes_assembleia_id_unidade_outorgante_id_key" ON "procuracoes"("assembleia_id", "unidade_outorgante_id");

-- AddForeignKey
ALTER TABLE "procuracoes" ADD CONSTRAINT "procuracoes_condominio_id_fkey" FOREIGN KEY ("condominio_id") REFERENCES "condominios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procuracoes" ADD CONSTRAINT "procuracoes_assembleia_id_fkey" FOREIGN KEY ("assembleia_id") REFERENCES "assembleias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procuracoes" ADD CONSTRAINT "procuracoes_unidade_outorgante_id_fkey" FOREIGN KEY ("unidade_outorgante_id") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procuracoes" ADD CONSTRAINT "procuracoes_unidade_procuradora_id_fkey" FOREIGN KEY ("unidade_procuradora_id") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
