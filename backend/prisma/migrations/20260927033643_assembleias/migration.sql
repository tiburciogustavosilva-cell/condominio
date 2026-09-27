-- CreateTable
CREATE TABLE "assembleias" (
    "id" UUID NOT NULL,
    "condominio_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "segredo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'aberta',
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encerrada_em" TIMESTAMPTZ,

    CONSTRAINT "assembleias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assembleia_presencas" (
    "id" UUID NOT NULL,
    "assembleia_id" UUID NOT NULL,
    "unidade_id" UUID NOT NULL,
    "profile_id" UUID,
    "manual" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assembleia_presencas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pautas" (
    "id" UUID NOT NULL,
    "condominio_id" UUID NOT NULL,
    "assembleia_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'rascunho',

    CONSTRAINT "pautas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pauta_opcoes" (
    "id" UUID NOT NULL,
    "pauta_id" UUID NOT NULL,
    "texto" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "votos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pauta_opcoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pauta_votantes" (
    "id" UUID NOT NULL,
    "pauta_id" UUID NOT NULL,
    "unidade_id" UUID NOT NULL,

    CONSTRAINT "pauta_votantes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assembleia_presencas_assembleia_id_unidade_id_key" ON "assembleia_presencas"("assembleia_id", "unidade_id");

-- CreateIndex
CREATE INDEX "pautas_assembleia_id_idx" ON "pautas"("assembleia_id");

-- CreateIndex
CREATE INDEX "pauta_opcoes_pauta_id_idx" ON "pauta_opcoes"("pauta_id");

-- CreateIndex
CREATE UNIQUE INDEX "pauta_votantes_pauta_id_unidade_id_key" ON "pauta_votantes"("pauta_id", "unidade_id");

-- AddForeignKey
ALTER TABLE "assembleias" ADD CONSTRAINT "assembleias_condominio_id_fkey" FOREIGN KEY ("condominio_id") REFERENCES "condominios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assembleia_presencas" ADD CONSTRAINT "assembleia_presencas_assembleia_id_fkey" FOREIGN KEY ("assembleia_id") REFERENCES "assembleias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assembleia_presencas" ADD CONSTRAINT "assembleia_presencas_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assembleia_presencas" ADD CONSTRAINT "assembleia_presencas_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pautas" ADD CONSTRAINT "pautas_condominio_id_fkey" FOREIGN KEY ("condominio_id") REFERENCES "condominios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pautas" ADD CONSTRAINT "pautas_assembleia_id_fkey" FOREIGN KEY ("assembleia_id") REFERENCES "assembleias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pauta_opcoes" ADD CONSTRAINT "pauta_opcoes_pauta_id_fkey" FOREIGN KEY ("pauta_id") REFERENCES "pautas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pauta_votantes" ADD CONSTRAINT "pauta_votantes_pauta_id_fkey" FOREIGN KEY ("pauta_id") REFERENCES "pautas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pauta_votantes" ADD CONSTRAINT "pauta_votantes_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
