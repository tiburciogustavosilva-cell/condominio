-- AlterTable
ALTER TABLE "encomendas" ADD COLUMN     "liberado_por_id" UUID,
ADD COLUMN     "perecivel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tentativas_retirada" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "volume_grande" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "encomendas" ADD CONSTRAINT "encomendas_liberado_por_id_fkey" FOREIGN KEY ("liberado_por_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
