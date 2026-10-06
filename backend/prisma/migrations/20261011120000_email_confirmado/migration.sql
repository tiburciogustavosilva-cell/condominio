-- Cadastro público só entra depois de confirmar o e-mail. Contas existentes (e as criadas
-- por síndico/admin) já nascem confirmadas pelo default.
ALTER TABLE "profiles" ADD COLUMN "email_confirmado_em" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
