-- Mapa do condomínio montado pelo síndico: unidades, prédios (blocos) e áreas comuns numa grade.
-- camada = "geral" (terreno) ou "bloco:<nome>" (andares de um bloco).
CREATE TABLE "mapa_itens" (
    "id" UUID NOT NULL,
    "condominio_id" UUID NOT NULL,
    "camada" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "unidade_id" UUID,
    "bloco" TEXT,
    "rotulo" TEXT NOT NULL DEFAULT '',
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "largura" INTEGER NOT NULL DEFAULT 1,
    "altura" INTEGER NOT NULL DEFAULT 1,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mapa_itens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mapa_itens_unidade_id_key" ON "mapa_itens"("unidade_id");
CREATE INDEX "mapa_itens_condominio_id_idx" ON "mapa_itens"("condominio_id");

ALTER TABLE "mapa_itens" ADD CONSTRAINT "mapa_itens_condominio_id_fkey" FOREIGN KEY ("condominio_id") REFERENCES "condominios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mapa_itens" ADD CONSTRAINT "mapa_itens_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "unidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
