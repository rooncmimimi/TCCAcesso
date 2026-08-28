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
import { useSession, initials } from "@/contexts/SessionContext";
import { useSpeech } from "@/contexts/SpeechContext";
import { CapaUploader } from "./CapaUploader";
import { FotoUploader } from "./FotoUploader";
import type { Candidato } from "@/types";

/** Edição do perfil pessoal: dados de conta (todos os tipos) + dados de candidato (quando aplicável). */
export function EditarPerfilDialog({
  candidato,
  children,
}: {
  candidato?: Candidato | null;
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const [cidade, setCidade] = useState(candidato?.cidade ?? "");
  const [estado, setEstado] = useState(candidato?.estado ?? "");
  const { user, update } = useSession();
  const { speak } = useSpeech();
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

      const usuarioAtualizado = await perfilService.atualizarUsuario(user!.id, {
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
      update({ nome: usuarioAtualizado.nome, telefone: usuarioAtualizado.telefone });
      void queryClient.invalidateQueries({ queryKey: ["meu-candidato"] });
      toast.success("Perfil atualizado.");
      speak("Perfil atualizado.");
      setAberto(false);
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível atualizar o perfil.")),
  });

  const removerBanner = useMutation({
    mutationFn: () => perfilService.atualizarUsuario(user!.id, { capaPerfil: null }),
    onSuccess: (usuarioAtualizado) => {
      update({ capaPerfil: usuarioAtualizado.capaPerfil });
      toast.success("Banner removido.");
      speak("Banner removido.");
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível remover o banner.")),
  });

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    salvar.mutate(new FormData(evento.currentTarget));
  }

  if (!user) return null;

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
          <DialogDescription>Essas informações aparecem no seu perfil e nas suas publicações.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <p className="mb-2 text-sm font-medium">Banner</p>
            <div className="overflow-hidden rounded-lg border">
              <CapaUploader
                capaUrl={user.capaPerfil}
                onEnviar={async (arquivo) => {
                  const atualizado = await perfilService.atualizarCapa(user.id, arquivo);
                  update({ capaPerfil: atualizado.capaPerfil });
                }}
              />
            </div>
            {user.capaPerfil ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 gap-1 text-destructive hover:text-destructive"
                disabled={removerBanner.isPending}
                onClick={() => removerBanner.mutate()}
              >
                <Trash2 className="size-4" aria-hidden="true" /> Remover banner
              </Button>
            ) : null}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Foto de perfil</p>
            <FotoUploader
              nome={user.nome}
              fotoUrl={user.fotoPerfil}
              fallback={initials(user.nome)}
              onEnviar={async (arquivo) => {
                const atualizado = await perfilService.atualizarFoto(user.id, arquivo);
                update({ fotoPerfil: atualizado.fotoPerfil });
              }}
            />
          </div>
        </div>

        <form onSubmit={enviar} className="space-y-4 border-t pt-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" required minLength={3} maxLength={150} defaultValue={user?.nome ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" name="telefone" maxLength={20} defaultValue={user?.telefone ?? ""} />
          </div>

          {candidato ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="tituloProfissional">Título profissional</Label>
                <Input
                  id="tituloProfissional"
                  name="tituloProfissional"
                  maxLength={150}
                  placeholder="Ex.: Assistente Administrativo"
                  defaultValue={candidato.tituloProfissional ?? ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="biografia">Sobre mim</Label>
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
                  <Label htmlFor="dataNascimento">Data de nascimento</Label>
                  <Input
                    id="dataNascimento"
                    name="dataNascimento"
                    type="date"
                    defaultValue={candidato.dataNascimento ? candidato.dataNascimento.slice(0, 10) : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="genero">Gênero</Label>
                  <Input
                    id="genero"
                    name="genero"
                    maxLength={40}
                    placeholder="Como você se identifica"
                    defaultValue={candidato.genero ?? ""}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <CidadeAutocomplete
                    id="cidade"
                    name="cidade"
                    value={cidade}
                    onChange={setCidade}
                    estado={estado}
                    aria-label="Cidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado (UF)</Label>
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
                <Label htmlFor="escolaridade">Escolaridade</Label>
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
                  <Label htmlFor="disponibilidade">Disponibilidade</Label>
                  <Input
                    id="disponibilidade"
                    name="disponibilidade"
                    maxLength={100}
                    placeholder="Imediata, a combinar…"
                    defaultValue={candidato.disponibilidade ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pretensaoSalarial">Pretensão salarial (R$)</Label>
                  <Input
                    id="pretensaoSalarial"
                    name="pretensaoSalarial"
                    inputMode="decimal"
                    defaultValue={candidato.pretensaoSalarial ?? ""}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="necessidadesAcessibilidade">Necessidades de acessibilidade (opcional)</Label>
                <Textarea
                  id="necessidadesAcessibilidade"
                  name="necessidadesAcessibilidade"
                  rows={3}
                  maxLength={2000}
                  placeholder="Recursos ou ajustes que facilitam seu dia a dia de trabalho"
                  defaultValue={candidato.necessidadesAcessibilidade ?? ""}
                />
              </div>
            </>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvar.isPending} className="min-h-11 gap-2">
              {salvar.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
