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
import { useIdioma } from "@/hooks/useIdioma";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DitadoParaCampo } from "@/components/acessibilidade/DitadoParaCampo";
import { CidadeAutocomplete } from "@/components/CidadeAutocomplete";
import { EstadoSelect } from "@/components/cadastro/EstadoSelect";
import { PaisAutocomplete } from "@/components/cadastro/PaisAutocomplete";
import { SIGLAS_ESTADOS_BR } from "@/dados/estados";
import { extrairMensagemErro } from "@/services/api";
import { perfilService } from "@/services/perfil.service";
import { textosDoCadastro } from "@/components/cadastro/idioma";
import { limitesDataNascimento, mensagemDataNascimento } from "@/components/cadastro/regrasPessoais";
import { nomeValido, normalizarNome, validarDataNascimento } from "@/lib/validacoesPessoais";

const textos = textosDoCadastro("pt");
const limitesData = limitesDataNascimento();
import { useSessao } from "@/hooks/useSessao";
import { iniciaisDoNome } from "@/utils/formatacao";
import { CapaUploader } from "./CapaUploader";
import { FotoUploader } from "./FotoUploader";
import { DicaDimensaoImagem } from "./DicaDimensaoImagem";
import type { Candidato } from "@/types";
import { DicaDeCampoBotao } from "@/components/acessibilidade/DicaDeCampoBotao";
import { AvisoDeRascunho } from "@/components/acessibilidade/AvisoDeRascunho";
import { useRascunhoDeFormulario } from "@/hooks/useRascunhoDeFormulario";

/** Os únicos campos deste formulário que entram no rascunho automático. */
const CAMPOS_DO_RASCUNHO = ["tituloProfissional", "biografia"] as const;

/** Edição do perfil pessoal: dados de conta (todos os tipos) + dados de candidato (quando aplicável). */
export function EditarPerfilDialog({
  candidato,
  children,
}: {
  candidato?: Candidato | null;
  children: ReactNode;
}) {
  const { t } = useIdioma();
  const [aberto, setAberto] = useState(false);
  const [cidade, setCidade] = useState(candidato?.cidade ?? "");
  const [estado, setEstado] = useState(candidato?.estado ?? "");
  // O país que a conta já tem; nunca é preenchido por conta própria (sem país salvo, começa vazio).
  const [pais, setPais] = useState(candidato?.pais ?? "");
  const { usuario, atualizar } = useSessao();
  const queryClient = useQueryClient();
  // Rascunho só do texto longo (nunca nome, telefone, datas nem nada pessoal): ver `lib/rascunhoDeFormulario.ts`.
  const rascunho = useRascunhoDeFormulario({
    chave: `perfil:${usuario?.id ?? "anonimo"}`,
    campos: CAMPOS_DO_RASCUNHO,
    ativo: aberto,
  });

  // Reabrir o diálogo sempre reflete os dados mais recentes do candidato.
  useEffect(() => {
    if (aberto) {
      setCidade(candidato?.cidade ?? "");
      setEstado(candidato?.estado ?? "");
      setPais(candidato?.pais ?? "");
    }
  }, [aberto, candidato?.cidade, candidato?.estado, candidato?.pais]);

  const salvar = useMutation({
    mutationFn: async (dados: FormData) => {
      const texto = (chave: string) => String(dados.get(chave) ?? "").trim();

      const usuarioAtualizado = await perfilService.atualizarUsuario(usuario!.id, {
        nome: normalizarNome(texto("nome")),
        telefone: texto("telefone") || null,
      });

      if (candidato) {
        await perfilService.atualizarCandidato(candidato.id, {
          tituloProfissional: texto("tituloProfissional") || null,
          biografia: texto("biografia") || null,
          // Só vai ao servidor se mudou: quem tem uma data antiga que a regra nova recusaria não fica
          // impedido de salvar o resto do perfil.
          ...(texto("dataNascimento") !== (candidato.dataNascimento ?? "").slice(0, 10)
            ? { dataNascimento: texto("dataNascimento") || null }
            : {}),
          genero: texto("genero") || null,
          ...(pais ? { pais } : {}),
          cidade: texto("cidade") || null,
          estado: estado.toUpperCase() || null,
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
      toast.success(t("perfil.editarPerfilDialog.perfilAtualizado"));
      rascunho.limpar();
      setAberto(false);
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, t("perfil.editarPerfilDialog.naoFoiPossivelAtualizarOPerfil"))),
  });

  const removerBanner = useMutation({
    mutationFn: () => perfilService.atualizarUsuario(usuario!.id, { capaPerfil: null }),
    onSuccess: (usuarioAtualizado) => {
      atualizar({ capaPerfil: usuarioAtualizado.capaPerfil });
      toast.success(t("perfil.editarEmpresaDialog.bannerRemovido"));
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, t("perfil.editarEmpresaDialog.naoFoiPossivelRemoverOBanner"))),
  });

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);

    // Mesmas regras do cadastro, para errar antes da viagem; o servidor confere de novo.
    if (!nomeValido(String(dados.get("nome") ?? ""))) {
      toast.error(textos.erroNomeCaracteres);
      return;
    }

    const nascimento = String(dados.get("dataNascimento") ?? "").trim();
    const nascimentoAtual = (candidato?.dataNascimento ?? "").slice(0, 10);

    if (nascimento && nascimento !== nascimentoAtual) {
      const resultado = validarDataNascimento(nascimento);

      if (!resultado.valida) {
        toast.error(mensagemDataNascimento(textos, resultado.motivo));
        return;
      }
    }

    salvar.mutate(dados);
  }

  if (!usuario) return null;

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("perfil.editarPerfilDialog.editarPerfil")}</DialogTitle>
          <DialogDescription>{t("perfil.editarPerfilDialog.essasInformacoesAparecemNoSeu")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <p className="mb-2 text-sm font-medium">{t("perfil.editarPerfilDialog.banner")}</p>
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
                <Trash2 className="size-4" aria-hidden="true" /> {t("perfil.editarEmpresaDialog.removerBanner")}
              </Button>
            ) : null}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">{t("perfil.editarPerfilDialog.fotoDePerfil")}</p>
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

        <form ref={rascunho.ref} onSubmit={enviar} className="space-y-4 border-t pt-4">
          <AvisoDeRascunho rascunho={rascunho.rascunho} aoRestaurar={rascunho.restaurar} aoDescartar={rascunho.descartar} />
          <div className="space-y-2">
            <Label htmlFor="nome">{t("perfil.editarPerfilDialog.nome")}</Label>
            <Input id="nome" name="nome" required minLength={3} maxLength={150} defaultValue={usuario?.nome ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">{t("perfil.editarPerfilDialog.telefone")}</Label>
            <Input id="telefone" name="telefone" maxLength={20} defaultValue={usuario?.telefone ?? ""} />
          </div>

          {candidato ? (
            <>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-x-2">
                  <Label htmlFor="tituloProfissional">{t("perfil.editarPerfilDialog.tituloProfissional")}</Label>
                  <DicaDeCampoBotao dica="tituloProfissional" nomeDoCampo={t("perfil.editarPerfilDialog.tituloProfissional")} />
                </div>
                <Input
                  id="tituloProfissional"
                  name="tituloProfissional"
                  maxLength={150}
                  placeholder={t("perfil.editarPerfilDialog.exAssistenteAdministrativo")}
                  defaultValue={candidato.tituloProfissional ?? ""}
                />
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-x-2">
                  <Label htmlFor="biografia">{t("perfil.editarPerfilDialog.sobreMim")}</Label>
                  <DicaDeCampoBotao dica="biografia" nomeDoCampo={t("perfil.editarPerfilDialog.sobreMim")} />
                </div>
                <Textarea
                  id="biografia"
                  name="biografia"
                  rows={4}
                  maxLength={2000}
                  defaultValue={candidato.biografia ?? ""}
                />
                <DitadoParaCampo campoId="biografia" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dataNascimento">{t("perfil.editarPerfilDialog.dataDeNascimento")}</Label>
                  <Input
                    id="dataNascimento"
                    name="dataNascimento"
                    type="date"
                    min={limitesData.min}
                    max={limitesData.max}
                    defaultValue={candidato.dataNascimento ? candidato.dataNascimento.slice(0, 10) : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="genero">{t("perfil.editarPerfilDialog.genero")}</Label>
                  <Input
                    id="genero"
                    name="genero"
                    maxLength={40}
                    placeholder={t("perfil.editarPerfilDialog.comoVoceSeIdentifica")}
                    defaultValue={candidato.genero ?? ""}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pais">{t("perfil.editarPerfilDialog.paisOndeMora")}</Label>
                <PaisAutocomplete
                  id="pais"
                  valor={pais}
                  aoMudar={(codigo) => {
                    setPais(codigo);
                    // O seletor de estado só oferece UFs: trocar para o Brasil com outra sigla limpa o campo.
                    if (codigo === "BR" && !SIGLAS_ESTADOS_BR.has(estado.toUpperCase())) setEstado("");
                  }}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cidade">{t("filtro.cidade")}</Label>
                  <CidadeAutocomplete
                    id="cidade"
                    name="cidade"
                    value={cidade}
                    onChange={setCidade}
                    estado={estado}
                    aria-label={t("filtro.cidade")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">{t("perfil.editarPerfilDialog.estadoUf")}</Label>
                  {pais === "BR" ? (
                    <EstadoSelect id="estado" name="estado" value={estado} onChange={(e) => setEstado(e.target.value)} />
                  ) : (
                    <Input
                      id="estado"
                      name="estado"
                      maxLength={2}
                      placeholder="SP"
                      value={estado}
                      onChange={(e) => setEstado(e.target.value.toUpperCase())}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="escolaridade">{t("perfil.editarPerfilDialog.escolaridade")}</Label>
                <Input id="escolaridade" name="escolaridade" maxLength={120} defaultValue={candidato.escolaridade ?? ""} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="linkedin">{t("perfil.editarPerfilDialog.linkedin")}</Label>
                  <Input id="linkedin" name="linkedin" type="url" defaultValue={candidato.linkedin ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="github">GitHub</Label>
                  <Input id="github" name="github" type="url" defaultValue={candidato.github ?? ""} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="disponibilidade">{t("perfil.editarPerfilDialog.disponibilidade")}</Label>
                  <Input
                    id="disponibilidade"
                    name="disponibilidade"
                    maxLength={100}
                    placeholder={t("perfil.editarPerfilDialog.imediataACombinar")}
                    defaultValue={candidato.disponibilidade ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pretensaoSalarial">{t("perfil.editarPerfilDialog.pretensaoSalarialR")}</Label>
                  <Input
                    id="pretensaoSalarial"
                    name="pretensaoSalarial"
                    inputMode="decimal"
                    defaultValue={candidato.pretensaoSalarial ?? ""}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="necessidadesAcessibilidade">{t("perfil.editarPerfilDialog.necessidadesDeAcessibilidade")}</Label>
                <Textarea
                  id="necessidadesAcessibilidade"
                  name="necessidadesAcessibilidade"
                  rows={3}
                  maxLength={2000}
                  placeholder={t("perfil.editarPerfilDialog.recursosOuAjustesQueFacilitam")}
                  defaultValue={candidato.necessidadesAcessibilidade ?? ""}
                />
              </div>
            </>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              {t("post.cancelar")}
            </Button>
            <Button type="submit" disabled={salvar.isPending} className="min-h-11 gap-2">
              {salvar.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {t("post.salvar")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
