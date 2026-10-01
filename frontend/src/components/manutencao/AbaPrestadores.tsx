import { useState } from "react";
import { HardHat, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { usePrestadores } from "@/hooks/usePrestadores";
import type { Prestador } from "@/types/condominio";
import { FormModal } from "@/components/shared/FormModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { Field } from "@/components/shared/Field";
import { AsyncConfirmDialog } from "@/components/shared/AsyncConfirmDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/shared/ListSkeleton";
import { BuscaInput, bate } from "@/components/shared/BuscaInput";

const PRESTADOR_VAZIO = {
  nome: "",
  email: "",
  servico: "",
  empresa: "",
  telefone: "",
  observacao: "",
};

/** Aba "Prestadores" da Manutenção Predial. Recebe o mesmo usePrestadores() do plano,
 * pra quem for cadastrado aqui já aparecer no select do plano. */
export function AbaPrestadores({
  prestadores,
  carregando,
  recarregar: recarregarPrestadores,
  criar: criarPrestador,
  atualizar: atualizarPrestador,
  remover: removerPrestador,
}: ReturnType<typeof usePrestadores>) {

  const [formP, setFormP] = useState<any>(PRESTADOR_VAZIO);
  const [editP, setEditP] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [savingP, setSavingP] = useState(false);
  const [busca, setBusca] = useState("");

  const filtrados = prestadores.filter((p) =>
    bate(busca, p.nome, p.servico, p.empresa, p.email),
  );

  function setP(campo: string, valor: string) {
    setFormP((f: any) => ({ ...f, [campo]: valor }));
  }
  function editarPrestador(p: Prestador) {
    setEditP(p.id);
    setFormP({
      nome: p.nome,
      email: p.email,
      servico: p.servico || "",
      empresa: p.empresa || "",
      telefone: p.telefone || "",
      observacao: p.observacao || "",
    });
    setAberto(true);
  }
  function cancelarPrestador() {
    setAberto(false);
    setEditP(null);
    setFormP(PRESTADOR_VAZIO);
  }
  async function salvarPrestador(e: React.FormEvent) {
    e.preventDefault();
    setSavingP(true);
    try {
      if (editP) {
        await atualizarPrestador(editP, formP);
        toast.success("Prestador atualizado");
      } else {
        await criarPrestador(formP);
        toast.success("Prestador cadastrado");
      }
      cancelarPrestador();
      recarregarPrestadores();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSavingP(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {prestadores.length > 0 ? (
          <BuscaInput
            value={busca}
            onChange={setBusca}
            placeholder="Buscar por nome, serviço ou empresa…"
          />
        ) : (
          <span />
        )}
        <Button variant="brand" onClick={() => setAberto(true)}>
          <Plus className="h-4 w-4" /> Novo prestador
        </Button>
      </div>

      <FormModal
        aberto={aberto}
        titulo={editP ? "Editar prestador" : "Novo prestador"}
        onFechar={cancelarPrestador}
        salvando={savingP}
      >
        <form onSubmit={salvarPrestador} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome / contato" htmlFor="p-nome">
              <Input
                id="p-nome"
                value={formP.nome}
                onChange={(e) => setP("nome", e.target.value)}
                required
              />
            </Field>
            <Field label="E-mail (recebe os lembretes)" htmlFor="p-email">
              <Input
                id="p-email"
                type="email"
                value={formP.email}
                onChange={(e) => setP("email", e.target.value)}
                required
              />
            </Field>
            <Field label="Serviço" htmlFor="p-servico">
              <Input
                id="p-servico"
                placeholder="Ex.: Extintores, Elevadores, Dedetização…"
                value={formP.servico}
                onChange={(e) => setP("servico", e.target.value)}
              />
            </Field>
            <Field label="Empresa" htmlFor="p-empresa">
              <Input
                id="p-empresa"
                value={formP.empresa}
                onChange={(e) => setP("empresa", e.target.value)}
              />
            </Field>
            <Field label="Telefone" htmlFor="p-tel">
              <Input
                id="p-tel"
                value={formP.telefone}
                onChange={(e) => setP("telefone", e.target.value)}
              />
            </Field>
            <Field label="Observação" htmlFor="p-obs">
              <Input
                id="p-obs"
                value={formP.observacao}
                onChange={(e) => setP("observacao", e.target.value)}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={cancelarPrestador}>
              Cancelar
            </Button>
            <Button type="submit" variant="brand" disabled={savingP}>
              {savingP && <Loader2 className="h-4 w-4 animate-spin" />}
              {editP ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </FormModal>

      {carregando ? (
        <ListSkeleton />
      ) : prestadores.length === 0 ? (
        <EmptyState
          icon={HardHat}
          title="Nenhum prestador cadastrado"
          description="Cadastre quem executa os serviços para usá-lo nos planos de manutenção."
          action={
            <Button variant="brand" onClick={() => setAberto(true)}>
              <Plus className="h-4 w-4" /> Cadastrar prestador
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
        {filtrados.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum prestador encontrado para "{busca}".
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {filtrados.map((p) => (
            <Card key={p.id}>
              <CardContent className="space-y-1.5 pt-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{p.nome}</p>
                  <Badge variant="muted">{p.manutencoes} manut.</Badge>
                </div>
                {(p.servico || p.empresa) && (
                  <p className="text-sm text-muted-foreground">
                    {[p.servico, p.empresa].filter(Boolean).join(" · ")}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  <a href={`mailto:${p.email}`} className="hover:underline">
                    {p.email}
                  </a>
                  {p.telefone && (
                    <>
                      {" · "}
                      <a href={`tel:${p.telefone}`} className="hover:underline">
                        {p.telefone}
                      </a>
                    </>
                  )}
                </p>
                {p.observacao && (
                  <p className="text-xs text-muted-foreground">
                    {p.observacao}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => editarPrestador(p)}
                  >
                    Editar
                  </Button>
                  <AsyncConfirmDialog
                    trigger={
                      <Button size="sm" variant="ghost">
                        Remover
                      </Button>
                    }
                    title={`Remover ${p.nome}?`}
                    description="As manutenções vinculadas a este prestador também serão removidas."
                    confirmLabel="Remover"
                    confirmVariant="destructive"
                    successMessage="Prestador removido"
                    onConfirm={() =>
                      removerPrestador(p.id).then(recarregarPrestadores)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        </div>
      )}
    </div>
  );
}
