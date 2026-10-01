-- Vida útil deixa de ser só em anos: número + unidade. Valores existentes eram anos.
ALTER TABLE "ativos" RENAME COLUMN "vida_util_anos" TO "vida_util";
ALTER TABLE "ativos" ADD COLUMN "vida_util_unidade" TEXT NOT NULL DEFAULT 'anos';
