import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CidadeAutocomplete } from "@/components/CidadeAutocomplete";
import { extrairMensagemErro } from "@/services/api";
import { perfilService } from "@/services/perfil.service";
import { useSessao } from "@/hooks/useSessao";
import { iniciaisDoNome } from "@/utils/formatacao";
import { CapaUploader } from "./CapaUploader";
import { FotoUploader } from "./FotoUploader";
import { DicaDimensaoImagem } from "./DicaDimensaoImagem";
import type { Candidato } from "@/types";
import { useT } from "@/i18n";

/** Edição do perfil pessoal: dados de conta (todos os tipos) + dados de candidato (quando aplicável). */
export function EditarPerfilDialog({
  candidato,
  children,
}: {
  candidato?: Candidato | null;
  children: ReactNode;
}) {
  const t = useT();
  const te = t.perfilEdicao;
  const tp = te.pessoa;
  const [aberto, setAberto] = useState(false);
  const [cidade, setCidade] = useState(candidato?.cidade ?? "");
  const [estado, setEstado] = useState(candidato?.estado ?? "");
  const { usuario, atualizar } = useSessao();
  const queryClient = useQueryClient();

  // Reabrir o diálogo sempre reflete os dados mais recentes do candidato.
  useEffect(() => {
    if (aberto) {
      setCidade(candidato?.cidade ?? "");
      setEstado(candidato?.estado ?? "");
    }
  }, [aberto, candidato?.cidade, candidato?.estado]);

  const salvar = useMutation({
    mutationFn: async (dados: FormData) => {
      const texto = (chave: string) => String(dados.get(chave) ?? "").trim();

      const usuarioAtualizado = await perfilService.atualizarUsuario(usuario!.id, {
        nome: texto("nome"),
        telefone: texto("telefone") || null,
      });

      if (candidato) {
        await perfilService.atualizarCandidato(candidato.id, {
          tituloProfissional: texto("tituloProfissional") || null,
          biografia: texto("biografia") || null,
          dataNascimento: texto("dataNascimento") || null,
          genero: texto("genero") || null,
          cidade: texto("cidade") || null,
          estado: texto("estado").toUpperCase() || null,
          escolaridade: texto("escolaridade") || null,
          linkedin: texto("linkedin") || null,
          github: texto("github") || null,
          disponibilidade: texto("disponibilidade") || null,
          pretensaoSalarial: texto("pretensaoSalarial") || null,
          necessidadesAcessibilidade: texto("necessidadesAcessibilidade") || null,
        });
      }

      return usuarioAtualizado;
    },
    onSuccess: (usuarioAtualizado) => {
      atualizar({ nome: usuarioAtualizado.nome, telefone: usuarioAtualizado.telefone });
      void queryClient.invalidateQueries({ queryKey: ["meu-candidato"] });
      // O toast já é lido pelo `useLeituraAutomatica`; falar aqui também duplicaria a leitura.
      toast.success(tp.atualizado);
      setAberto(false);
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, tp.erro)),
  });

  const removerBanner = useMutation({
    mutationFn: () => perfilService.atualizarUsuario(usuario!.id, { capaPerfil: null }),
    onSuccess: (usuarioAtualizado) => {
      atualizar({ capaPerfil: usuarioAtualizado.capaPerfil });
      toast.success(te.bannerRemovido);
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, te.erroRemoverBanner)),
  });

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    salvar.mutate(new FormData(evento.currentTarget));
  }

  if (!usuario) return null;

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{tp.titulo}</DialogTitle>
          <DialogDescription>{tp.descricao}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <p className="mb-2 text-sm font-medium">{te.banner}</p>
            <div className="overflow-hidden rounded-lg border">
              <CapaUploader
                capaUrl={usuario.capaPerfil}
                onEnviar={async (arquivo) => {
                  const atualizado = await perfilService.atualizarCapa(usuario.id, arquivo);
                  atualizar({ capaPerfil: atualizado.capaPerfil });
                }}
              />
            </div>
            <DicaDimensaoImagem tipo="banner" />
            {usuario.capaPerfil ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 gap-1 text-destructive hover:text-destructive"
                disabled={removerBanner.isPending}
                onClick={() => removerBanner.mutate()}
              >
                <Trash2 className="size-4" aria-hidden="true" /> {te.removerBanner}
              </Button>
            ) : null}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">{tp.fotoPerfil}</p>
            <FotoUploader
              nome={usuario.nome}
              fotoUrl={usuario.fotoPerfil}
              fallback={iniciaisDoNome(usuario.nome)}
              onEnviar={async (arquivo) => {
                const atualizado = await perfilService.atualizarFoto(usuario.id, arquivo);
                atualizar({ fotoPerfil: atualizado.fotoPerfil });
              }}
            />
            <DicaDimensaoImagem tipo="foto" />
          </div>
        </div>

        <form onSubmit={enviar} className="space-y-4 border-t pt-4">
          <div className="space-y-2">
            <Label htmlFor="nome">{tp.nome}</Label>
            <Input id="nome" name="nome" required minLength={3} maxLength={150} defaultValue={usuario?.nome ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">{tp.telefone}</Label>
            <Input id="telefone" name="telefone" maxLength={20} defaultValue={usuario?.telefone ?? ""} />
          </div>

          {candidato ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="tituloProfissional">{tp.tituloProfissional}</Label>
                <Input
                  id="tituloProfissional"
                  name="tituloProfissional"
                  maxLength={150}
                  placeholder={tp.tituloExemplo}
                  defaultValue={candidato.tituloProfissional ?? ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="biografia">{tp.sobreMim}</Label>
                <Textarea
                  id="biografia"
                  name="biografia"
                  rows={4}
                  maxLength={2000}
                  defaultValue={candidato.biografia ?? ""}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dataNascimento">{tp.dataNascimento}</Label>
                  <Input
                    id="dataNascimento"
                    name="dataNascimento"
                    type="date"
                    defaultValue={candidato.dataNascimento ? candidato.dataNascimento.slice(0, 10) : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="genero">{tp.genero}</Label>
                  <Input
                    id="genero"
                    name="genero"
                    maxLength={40}
                    placeholder={tp.generoExemplo}
                    defaultValue={candidato.genero ?? ""}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cidade">{tp.cidade}</Label>
                  <CidadeAutocomplete
                    id="cidade"
                    name="cidade"
                    value={cidade}
                    onChange={setCidade}
                    estado={estado}
                    aria-label={te.cidadeAria}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">{te.estadoUf}</Label>
                  <Input
                    id="estado"
                    name="estado"
                    maxLength={2}
                    placeholder="SP"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="escolaridade">{tp.escolaridade}</Label>
                <Input id="escolaridade" name="escolaridade" maxLength={120} defaultValue={candidato.escolaridade ?? ""} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <Input id="linkedin" name="linkedin" type="url" defaultValue={candidato.linkedin ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="github">GitHub</Label>
                  <Input id="github" name="github" type="url" defaultValue={candidato.github ?? ""} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="disponibilidade">{tp.disponibilidade}</Label>
                  <Input
                    id="disponibilidade"
                    name="disponibilidade"
                    maxLength={100}
                    placeholder={tp.disponibilidadeExemplo}
                    defaultValue={candidato.disponibilidade ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pretensaoSalarial">{tp.pretensao}</Label>
                  <Input
                    id="pretensaoSalarial"
                    name="pretensaoSalarial"
                    inputMode="decimal"
                    defaultValue={candidato.pretensaoSalarial ?? ""}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="necessidadesAcessibilidade">{tp.necessidades}</Label>
                <Textarea
                  id="necessidadesAcessibilidade"
                  name="necessidadesAcessibilidade"
                  rows={3}
                  maxLength={2000}
                  placeholder={tp.necessidadesExemplo}
                  defaultValue={candidato.necessidadesAcessibilidade ?? ""}
                />
              </div>
            </>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              {t.comum.cancelar}
            </Button>
            <Button type="submit" disabled={salvar.isPending} className="min-h-11 gap-2">
              {salvar.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {t.comum.salvar}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
