-- CreateTable
CREATE TABLE "encomenda_autorizados" (
    "id" UUID NOT NULL,
    "encomenda_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "encomenda_autorizados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "encomenda_autorizados_encomenda_id_idx" ON "encomenda_autorizados"("encomenda_id");

-- AddForeignKey
ALTER TABLE "encomenda_autorizados" ADD CONSTRAINT "encomenda_autorizados_encomenda_id_fkey" FOREIGN KEY ("encomenda_id") REFERENCES "encomendas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
