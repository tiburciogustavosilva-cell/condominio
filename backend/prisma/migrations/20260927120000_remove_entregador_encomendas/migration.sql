-- Remove os campos de nome/CPF do entregador em Encomendas — não são mais coletados.
ALTER TABLE "encomendas" DROP COLUMN "entregador_nome";
ALTER TABLE "encomendas" DROP COLUMN "entregador_cpf";
