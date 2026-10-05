-- Planos (basic | pro | premium) e período de teste. Condomínios já existentes ganham 30 dias a partir de agora.
ALTER TABLE "condominios" ADD COLUMN "plano" TEXT NOT NULL DEFAULT 'basic';
ALTER TABLE "condominios" ADD COLUMN "trial_ate" TIMESTAMPTZ NOT NULL DEFAULT (now() + '30 days'::interval);
