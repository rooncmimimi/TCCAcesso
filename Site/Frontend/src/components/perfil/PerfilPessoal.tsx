import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Accessibility,
  Contrast,
  Ear,
  FileText,
  Loader2,
  MousePointerClick,
  Pencil,
  Sparkles,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/layouts/AppShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { initials, useSession } from "@/contexts/SessionContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { extrairMensagemErro } from "@/services/api";
import { perfilService } from "@/services/perfil.service";
import { seguidoresService } from "@/services/empresas.service";
import { urlArquivo } from "@/services/uploads.service";
import { formatarData } from "@/utils/format";
import { EditarPerfilDialog } from "./EditarPerfilDialog";
import { SeguirButton } from "./SeguirButton";
import { EnviarMensagemButton } from "./EnviarMensagemButton";
import { BloquearUsuarioMenu } from "./BloquearUsuarioMenu";
import { SecaoRecursoPerfil } from "./SecaoRecursoPerfil";
import { SecaoDeficiencias } from "./SecaoDeficiencias";
import { BotoesCurriculo } from "./BotoesCurriculo";
import { ImportarCurriculoDialog } from "./ImportarCurriculoDialog";
import { ListaSeguidoresDialog } from "./ListaSeguidoresDialog";
import { PostagensUsuario } from "./PostagensUsuario";
import { CompartilhamentosUsuario } from "./CompartilhamentosUsuario";

const TIPOS_CURRICULO_ACEITOS = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/**
 * Perfil pessoal: candidato (completo) ou administrador (versão sem seções profissionais).
 *
 * Sem `usuarioId` (ou igual ao usuário logado): perfil próprio, editável.
 * Com `usuarioId` de outra pessoa: modo leitura, com botão de seguir no lugar de editar.
 */
export function PerfilPessoal({ usuarioId }: { usuarioId?: string } = {}) {
  const { user } = useSession();
  const { prefs } = useAccessibility();

  const proprioPerfil = !usuarioId || usuarioId === user?.id;
  const alvoId = proprioPerfil ? user?.id : usuarioId;

  const { data: meuCandidato, isLoading: carregandoMeuCandidato } = useQuery({
    queryKey: ["meu-candidato"],
    queryFn: () => perfilService.meuCandidato(),
    enabled: proprioPerfil && user?.tipo === "candidato",
  });

  const { data: candidatoAlheio, isLoading: carregandoCandidatoAlheio, isError: erroCandidatoAlheio } = useQuery({
    queryKey: ["perfil-publico-candidato", alvoId],
    queryFn: () => perfilService.perfilCompletoPorUsuario(alvoId as string),
    enabled: !proprioPerfil && Boolean(alvoId),
    retry: false,
  });

  // Fallback para usuários sem registro de candidato (hoje, administradores)
  // — só é consultado depois que a tentativa de candidato falha, e usa a
  // mesma chave de query que a rota `/perfil/$usuarioId` já usa, então não
  // gera uma segunda busca de rede quando ela também precisou desse dado.
  const {
    data: usuarioGenerico,
    isLoading: carregandoUsuarioGenerico,
    isError: erroUsuarioGenerico,
  } = useQuery({
    queryKey: ["perfil-publico-usuario", alvoId],
    queryFn: () => perfilService.usuarioPublico(alvoId as string),
    enabled: !proprioPerfil && Boolean(alvoId) && erroCandidatoAlheio,
    retry: false,
  });

  const { data: resumoSeguidores } = useQuery({
    queryKey: ["perfil-resumo-seguidores", alvoId],
    queryFn: () => seguidoresService.resumo(alvoId as string),
    enabled: Boolean(alvoId),
  });

  const queryClient = useQueryClient();
  const enviarCurriculo = useMutation({
    mutationFn: (arquivo: File) => perfilService.enviarCurriculo(meuCandidato!.id, arquivo),
    onSuccess: () => {
      toast.success("Currículo enviado.");
      void queryClient.invalidateQueries({ queryKey: ["meu-candidato"] });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível enviar o currículo.")),
  });

  function aoEnviarCurriculo(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!arquivo) return;
    if (!TIPOS_CURRICULO_ACEITOS.includes(arquivo.type)) {
      toast.error("Envie um arquivo PDF, DOC ou DOCX.");
      return;
    }
    enviarCurriculo.mutate(arquivo);
  }

  if (!alvoId) return null;

  if (!proprioPerfil && erroCandidatoAlheio && erroUsuarioGenerico) {
    return (
      <AppShell>
        <div role="alert" className="py-10 text-center text-sm text-muted-foreground">
          Este perfil não está disponível.
        </div>
      </AppShell>
    );
  }

  if (
    !proprioPerfil &&
    (carregandoCandidatoAlheio || (erroCandidatoAlheio && carregandoUsuarioGenerico))
  ) {
    return (
      <AppShell>
        <div role="status" aria-live="polite" className="flex items-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Carregando perfil…
        </div>
      </AppShell>
    );
  }

  const candidato = proprioPerfil ? meuCandidato : candidatoAlheio;
  const ehCandidato = proprioPerfil ? user?.tipo === "candidato" : Boolean(candidatoAlheio);
  const carregandoCandidato = proprioPerfil && carregandoMeuCandidato;

  const nome = proprioPerfil ? user!.nome : candidato?.usuario?.nome ?? usuarioGenerico?.nome ?? "Usuário";
  const fotoPerfil = proprioPerfil
    ? user!.fotoPerfil
    : candidato?.usuario?.fotoPerfil ?? usuarioGenerico?.fotoPerfil;
  const capaPerfil = proprioPerfil
    ? user!.capaPerfil
    : candidato?.usuario?.capaPerfil ?? usuarioGenerico?.capaPerfil;

  const chipsAcessibilidade = proprioPerfil
    ? [
        { ativo: prefs.screenReader, icon: Ear, label: "Leitura por voz" },
        { ativo: prefs.vlibras, icon: Accessibility, label: "Libras (VLibras)" },
        { ativo: prefs.highContrast, icon: Contrast, label: "Alto contraste" },
        { ativo: prefs.dyslexiaFont, icon: Sparkles, label: "Fonte para dislexia" },
        { ativo: prefs.keyboardNav, icon: MousePointerClick, label: "Navegação por teclado" },
      ].filter((c) => c.ativo)
    : [];

  return (
    <AppShell>
      <Card className="overflow-hidden shadow-card">
        <div
          aria-hidden="true"
          className="h-32 w-full bg-primary bg-cover bg-center sm:h-40"
          style={capaPerfil ? { backgroundImage: `url(${urlArquivo(capaPerfil)})` } : undefined}
        />
        <CardContent className="p-5 sm:p-6">
          <div className="-mt-16 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
            <Avatar className="size-24 border-4 border-card">
              <AvatarImage src={urlArquivo(fotoPerfil)} alt="" />
              <AvatarFallback className="bg-primary-soft text-2xl font-bold text-primary">
                {initials(nome)}
              </AvatarFallback>
            </Avatar>

            {proprioPerfil ? (
              <EditarPerfilDialog candidato={ehCandidato ? candidato : null}>
                <Button variant="outline" className="min-h-11 shrink-0">
                  <Pencil aria-hidden="true" /> Editar perfil
                </Button>
              </EditarPerfilDialog>
            ) : (
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                <EnviarMensagemButton alvoId={alvoId} />
                <SeguirButton
                  alvoId={alvoId}
                  tipo="usuario"
                  chaveResumo={["perfil-resumo-seguidores", alvoId]}
                />
                <BloquearUsuarioMenu
                  alvoUsuarioId={alvoId}
                  nome={nome}
                  denunciaEntidadeTipo="usuario"
                  denunciaEntidadeId={alvoId}
                />
              </div>
            )}
          </div>

          <h1 className="mt-4 text-2xl font-extrabold">{nome}</h1>
          {ehCandidato && candidato?.tituloProfissional ? (
            <p className="text-muted-foreground">{candidato.tituloProfissional}</p>
          ) : ehCandidato && proprioPerfil ? (
            <EditarPerfilDialog candidato={candidato}>
              <button
                type="button"
                className="text-sm font-semibold text-primary underline-offset-2 hover:underline"
              >
                Adicionar título profissional
              </button>
            </EditarPerfilDialog>
          ) : ehCandidato ? (
            // Perfil de terceiro sem título: texto neutro, nunca uma
            // chamada de ação que não pertence a quem está visitando.
            <p className="text-muted-foreground">Perfil profissional</p>
          ) : (
            <p className="text-muted-foreground">Administrador do ACESSO</p>
          )}
          {ehCandidato && candidato?.cidade ? (
            <p className="text-sm text-muted-foreground">
              {[candidato.cidade, candidato.estado].filter(Boolean).join(" - ")}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <ListaSeguidoresDialog usuarioId={alvoId} modo="seguidores" total={resumoSeguidores?.totalSeguidores ?? 0}>
              <button type="button" className="font-semibold hover:underline focus-visible:underline">
                {resumoSeguidores?.totalSeguidores ?? 0} <span className="font-normal text-muted-foreground">seguidores</span>
              </button>
            </ListaSeguidoresDialog>
            <ListaSeguidoresDialog usuarioId={alvoId} modo="seguindo" total={resumoSeguidores?.totalSeguindo ?? 0}>
              <button type="button" className="font-semibold hover:underline focus-visible:underline">
                {resumoSeguidores?.totalSeguindo ?? 0} <span className="font-normal text-muted-foreground">seguindo</span>
              </button>
            </ListaSeguidoresDialog>
          </div>
        </CardContent>
      </Card>

      {ehCandidato && candidato?.biografia ? (
        <Card className="mt-4 shadow-card">
          <CardContent className="p-5 sm:p-6">
            <h2 className="text-lg font-bold">Sobre mim</h2>
            <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{candidato.biografia}</p>
          </CardContent>
        </Card>
      ) : null}

      {proprioPerfil ? (
        <Card className="mt-4 shadow-card">
          <CardContent className="p-5 sm:p-6">
            <h2 className="text-lg font-bold">Preferências de acessibilidade</h2>
            {chipsAcessibilidade.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nenhuma preferência de acessibilidade ativada.</p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2">
                {chipsAcessibilidade.map((c) => (
                  <li key={c.label}>
                    <Badge variant="secondary" className="min-h-9 gap-2 px-3 text-sm font-semibold">
                      <c.icon className="size-4" aria-hidden="true" /> {c.label}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="link" className="mt-4 h-11 px-0 font-semibold">
              <Link to="/configuracoes/acessibilidade">
                <Accessibility aria-hidden="true" /> Ajustar preferências de acessibilidade
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {ehCandidato ? (
        carregandoCandidato ? (
          <div role="status" aria-live="polite" className="mt-4 flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Carregando perfil profissional…
          </div>
        ) : candidato ? (
          <Card className="mt-4 shadow-card">
            <CardContent className="space-y-6 p-5 sm:p-6">
              {proprioPerfil && (
                <section aria-labelledby="secao-curriculo" className="border-t pt-6 first:border-t-0 first:pt-0">
                  <h2 id="secao-curriculo" className="text-lg font-bold">
                    Currículo
                  </h2>
                  {candidato.curriculoNome ? (
                    <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="size-4 shrink-0" aria-hidden="true" />
                      {candidato.curriculoNome}
                      {candidato.curriculoAtualizadoEm
                        ? ` · enviado em ${formatarData(candidato.curriculoAtualizadoEm)}`
                        : ""}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">Nenhum currículo enviado ainda.</p>
                  )}
                  {candidato.curriculoNome ? (
                    <div className="mt-3">
                      <BotoesCurriculo candidatoId={candidato.id} />
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <label
                      htmlFor="input-enviar-curriculo"
                      className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-input px-3 text-sm font-medium hover:bg-secondary"
                    >
                      {enviarCurriculo.isPending ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Upload className="size-4" aria-hidden="true" />
                      )}
                      {candidato.curriculoNome ? "Atualizar currículo" : "Enviar currículo"}
                    </label>
                    <input
                      id="input-enviar-curriculo"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="sr-only"
                      disabled={enviarCurriculo.isPending}
                      onChange={aoEnviarCurriculo}
                    />
                    <ImportarCurriculoDialog candidatoId={candidato.id}>
                      <Button type="button" variant="outline" size="sm" className="min-h-9 gap-1.5">
                        <Sparkles className="size-4" aria-hidden="true" /> Importar dados do currículo
                      </Button>
                    </ImportarCurriculoDialog>
                  </div>
                </section>
              )}
              {!proprioPerfil && candidato.curriculoNome ? (
                // Só chega aqui quando o backend já decidiu que este
                // visitante pode ver dados privados do candidato (empresa
                // com candidatura legítima ou administrador) — para
                // qualquer outra pessoa, `curriculoNome` já vem ausente
                // na resposta (ver `aplicarPrivacidadeCandidato` no
                // backend), então esta seção simplesmente não aparece,
                // sem revelar se existe ou não um currículo.
                <section aria-labelledby="secao-curriculo-terceiro" className="border-t pt-6 first:border-t-0 first:pt-0">
                  <h2 id="secao-curriculo-terceiro" className="text-lg font-bold">
                    Currículo
                  </h2>
                  <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="size-4 shrink-0" aria-hidden="true" />
                    {candidato.curriculoNome}
                  </p>
                  <div className="mt-3">
                    <BotoesCurriculo candidatoId={candidato.id} />
                  </div>
                </section>
              ) : null}
              <SecaoDeficiencias candidato={candidato} somenteLeitura={!proprioPerfil} />
              <SecaoRecursoPerfil
                recurso="experiencias"
                titulo="Experiência profissional"
                itens={candidato.experiencias}
                somenteLeitura={!proprioPerfil}
              />
              <SecaoRecursoPerfil
                recurso="formacoes"
                titulo="Formação acadêmica"
                itens={candidato.formacoes}
                somenteLeitura={!proprioPerfil}
              />
              <SecaoRecursoPerfil
                recurso="habilidades"
                titulo="Habilidades"
                itens={candidato.habilidades}
                somenteLeitura={!proprioPerfil}
              />
              <SecaoRecursoPerfil
                recurso="certificados"
                titulo="Certificados"
                itens={candidato.certificados}
                somenteLeitura={!proprioPerfil}
              />
            </CardContent>
          </Card>
        ) : null
      ) : null}

      <Card className="mt-4 shadow-card">
        <CardContent className="p-5 sm:p-6">
          <Tabs defaultValue="publicacoes">
            <TabsList>
              <TabsTrigger value="publicacoes">Publicações</TabsTrigger>
              <TabsTrigger value="compartilhamentos">Compartilhamentos</TabsTrigger>
            </TabsList>
            <TabsContent value="publicacoes">
              <PostagensUsuario usuarioId={alvoId} />
            </TabsContent>
            <TabsContent value="compartilhamentos">
              <CompartilhamentosUsuario usuarioId={alvoId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </AppShell>
  );
}
