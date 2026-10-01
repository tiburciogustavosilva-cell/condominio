-- Mensalidade do condomínio com a plataforma: cada pagamento (valor, pago em, válido até).
CREATE TABLE "assinatura_pagamentos" (
    "id" UUID NOT NULL,
    "condominio_id" UUID NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "pago_em" DATE NOT NULL,
    "valido_ate" DATE NOT NULL,
    "criado_em" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assinatura_pagamentos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "assinatura_pagamentos_condominio_id_idx" ON "assinatura_pagamentos"("condominio_id");

ALTER TABLE "assinatura_pagamentos" ADD CONSTRAINT "assinatura_pagamentos_condominio_id_fkey" FOREIGN KEY ("condominio_id") REFERENCES "condominios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
