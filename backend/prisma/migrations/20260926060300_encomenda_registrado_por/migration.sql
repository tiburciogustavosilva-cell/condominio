-- AlterTable
ALTER TABLE "encomendas" ADD COLUMN     "registrado_por_id" UUID;

-- AddForeignKey
ALTER TABLE "encomendas" ADD CONSTRAINT "encomendas_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
