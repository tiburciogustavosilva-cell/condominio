-- CreateTable
CREATE TABLE "tarefas" (
    "id" UUID NOT NULL,
    "condominio_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "cargo" TEXT NOT NULL,
    "recorrencia" TEXT NOT NULL,
    "dias_semana" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "dia_mes" INTEGER,
    "data" DATE,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarefas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarefa_execucoes" (
    "id" UUID NOT NULL,
    "condominio_id" UUID NOT NULL,
    "tarefa_id" UUID NOT NULL,
    "data" DATE NOT NULL,
    "concluida_por_id" UUID,
    "concluida_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacao" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "tarefa_execucoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarefa_fotos" (
    "id" UUID NOT NULL,
    "condominio_id" UUID NOT NULL,
    "execucao_id" UUID NOT NULL,
    "foto" BYTEA NOT NULL,

    CONSTRAINT "tarefa_fotos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tarefa_execucoes_tarefa_id_data_key" ON "tarefa_execucoes"("tarefa_id", "data");

-- CreateIndex
CREATE INDEX "tarefa_fotos_execucao_id_idx" ON "tarefa_fotos"("execucao_id");

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_condominio_id_fkey" FOREIGN KEY ("condominio_id") REFERENCES "condominios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefa_execucoes" ADD CONSTRAINT "tarefa_execucoes_condominio_id_fkey" FOREIGN KEY ("condominio_id") REFERENCES "condominios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefa_execucoes" ADD CONSTRAINT "tarefa_execucoes_tarefa_id_fkey" FOREIGN KEY ("tarefa_id") REFERENCES "tarefas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefa_execucoes" ADD CONSTRAINT "tarefa_execucoes_concluida_por_id_fkey" FOREIGN KEY ("concluida_por_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefa_fotos" ADD CONSTRAINT "tarefa_fotos_condominio_id_fkey" FOREIGN KEY ("condominio_id") REFERENCES "condominios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefa_fotos" ADD CONSTRAINT "tarefa_fotos_execucao_id_fkey" FOREIGN KEY ("execucao_id") REFERENCES "tarefa_execucoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
