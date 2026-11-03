import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, type FieldPath, type Resolver } from "react-hook-form";
import { Accessibility } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Logo } from "@/components/Logo";
import { AutenticacaoLayout } from "@/layouts/AutenticacaoLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { CidadeAutocomplete } from "@/components/CidadeAutocomplete";
import { PainelAcessibilidade } from "@/components/acessibilidade/PainelAcessibilidade";
import { BotaoGoogle, ContaGoogleConfirmada } from "@/components/cadastro/BotaoGoogle";
import { Campo } from "@/components/cadastro/Campo";
import { descricao } from "@/components/cadastro/descricao";
import { EtapaCurriculoPerfil } from "@/components/cadastro/EtapaCurriculoPerfil";
import { LegendaObrigatorio } from "@/components/cadastro/MarcaObrigatorio";
import { PaisAutocomplete } from "@/components/cadastro/PaisAutocomplete";
import { PassosCadastro } from "@/components/cadastro/PassosCadastro";
import { RequisitosSenha } from "@/components/cadastro/RequisitosSenha";
import { SeletorIdioma } from "@/components/cadastro/SeletorIdioma";
import { AceiteTermos, BotaoFinalizar, NavegacaoEtapa, TituloEtapa } from "@/components/cadastro/comuns";
import { textosDoCadastro, type CodigoIdioma, type TextosCadastro } from "@/components/cadastro/idioma";
import { SIGLAS_ESTADOS_BR } from "@/dados/estados";
import { EstadoSelect } from "@/components/cadastro/EstadoSelect";
import { criarEsquemaCandidato } from "@/components/cadastro/esquemaCandidato";
import { VERSAO_DOCUMENTOS } from "@/dados/documentosLegais";
import { useSessao } from "@/hooks/useSessao";
import { perfilService } from "@/services/perfil.service";
import { perfilDaProvaGoogle } from "@/services/google.service";
import { extrairMensagemErro } from "@/services/api";
import { lerProva, limparProva } from "@/lib/googleNavegador";
import { formatarCpf, formatarTelefone, somenteDigitos } from "@/lib/mascaras";
import { destinoAposEntrar } from "@/lib/destinoAposEntrar";
import { lerEtapaSalva, salvarEtapa } from "@/lib/etapaCadastro";
import { normalizarNome } from "@/lib/validacoesPessoais";
import { limitesDataNascimento } from "@/components/cadastro/regrasPessoais";

type FormCandidato = z.infer<ReturnType<typeof criarEsquemaCandidato>>;
/** Campos validados antes de liberar cada etapa do candidato. O índice é o da etapa. */
const CAMPOS_CANDIDATO: FieldPath<FormCandidato>[][] = [
  ["pais", "email", "cpf", "senha", "termos"],
  ["nome", "telefone", "dataNascimento", "cidade", "estado"],
];

/** Dados que a conta pode ter ficado sem (ver `dadosCadastroPendentes`): o passo "completar" pede só estes. */
const CAMPOS_COMPLETAR: FieldPath<FormCandidato>[] = ["pais", "dataNascimento", "cidade", "estado"];

/** Índices das etapas do candidato, para nenhum número solto ficar espalhado pelo arquivo. */
const CANDIDATO = { CONTA: 0, DADOS: 1, PERFIL: 2, ACESSIBILIDADE: 3 } as const;

export const Route = createFileRoute("/cadastro/candidato")({
  validateSearch: z.object({
    /** `?retomar=true` vem do login de quem tem `cadastroConcluidoEm` nula: volta na etapa de perfil. */
    retomar: z.coerce.boolean().optional(),
    /** `?depois=empresa`: quem veio por "Sou empresa" segue para o cadastro institucional ao final. */
    depois: z.enum(["empresa"]).optional(),
    /**
     * `?google=true`: quem chega do Google sem ter conta. A prova do Google que vincula a conta
     * criada aqui **não** vai na URL — fica no `sessionStorage` da aba (`lib/googleNavegador`).
     */
    google: z.coerce.boolean().optional(),
  }),
  head: () => ({
    meta: [
      { title: "Criar conta de candidato — ACESSO" },
      {
        name: "description",
        content: "Monte seu perfil profissional no ACESSO e configure a acessibilidade do seu jeito.",
      },
      { property: "og:title", content: "Criar conta de candidato — ACESSO" },
      { property: "og:description", content: "Cadastro gratuito na rede profissional inclusiva." },
    ],
  }),
  component: CadastroCandidato,
});

function CadastroCandidato() {
  const { retomar, depois, google } = Route.useSearch();
  const { autenticado, usuario, inicializado } = useSessao();
  const navigate = useNavigate();

  /**
   * Como esta tela se comporta, decidido **uma vez**, assim que a sessão carrega:
   * - `novo`: cadastro comum (quem não está logado como candidato);
   * - `retomar`: candidato logado que ainda tem o que fazer aqui (dado obrigatório faltando, uma etapa
   *   salva nesta aba ou `?retomar` explícito);
   * - `sair`: candidato logado com o cadastro completo. Não há o que fazer aqui: antes, atualizar a página
   *   reabria o formulário de conta (a primeira etapa) mesmo com a conta já criada.
   * Decidir uma vez evita que o cadastro recém-criado, que também deixa a sessão autenticada, expulse
   * a pessoa no meio do próprio assistente.
   */
  const [modo, setModo] = useState<"aguardando" | "novo" | "retomar" | "sair">("aguardando");

  useEffect(() => {
    if (!inicializado || modo !== "aguardando") return;

    if (autenticado && usuario?.tipo === "candidato") {
      // Servidor antigo (sem `cadastroPendente`): cai no sinal que existia, a data de conclusão.
      const pendente = usuario.cadastroPendente ?? !usuario.cadastroConcluidoEm;
      setModo(Boolean(retomar) || pendente || lerEtapaSalva(usuario.id) !== null ? "retomar" : "sair");
    } else {
      setModo("novo");
    }
  }, [inicializado, autenticado, usuario, retomar, modo]);

  useEffect(() => {
    if (modo === "sair" && usuario) {
      void navigate({ ...destinoAposEntrar(usuario), replace: true });
    }
  }, [modo, usuario, navigate]);
  // A prova do Google só vale quando a pessoa veio do Google (`?google`); sem isso, uma prova que
  // sobrou de um cadastro abandonado é descartada, para não travar o e-mail de outro cadastro.
  const googleProva = useMemo(() => (google ? lerProva() : null), [google]);
  useEffect(() => {
    if (!google) limparProva();
  }, [google]);
  // O idioma vale só enquanto o cadastro durar: não é salvo na conta, porque nada fora deste fluxo
  // está traduzido e uma preferência gravada não teria onde ser honrada depois do login.
  const [idioma, setIdioma] = useState<CodigoIdioma>("pt");
  const t = useMemo(() => textosDoCadastro(idioma), [idioma]);

  // Mantém o `lang` do documento de acordo com a escolha: leitor de tela troca a pronúncia por ele.
  useEffect(() => {
    const anterior = document.documentElement.lang;
    document.documentElement.lang = t.htmlLang;
    return () => {
      document.documentElement.lang = anterior;
    };
  }, [t.htmlLang]);

  // Só retoma de verdade quem está logado como candidato. Sem isso um `?retomar=true` colado na barra
  // levaria alguém deslogado a uma etapa que precisa de sessão.
  const retomando = modo === "retomar";

  // Quem criou a conta direto pelo Google ainda não informou CPF, nascimento e endereço, e as etapas
  // seguintes dependem deles: começa por `/cadastro/dados`, e só depois volta para cá.
  const faltamDadosPessoais = retomando && Boolean(usuario?.dadosPessoaisPendentes);
  useEffect(() => {
    if (faltamDadosPessoais) {
      void navigate({ to: "/cadastro/dados", search: { depois }, replace: true });
    }
  }, [faltamDadosPessoais, navigate, depois]);

  return (
    <AutenticacaoLayout className="max-w-lg">
      {/* Quebra em duas linhas quando logo + idioma + acessibilidade não cabem (celular estreito),
          em vez de espremer e cortar o último botão. */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-3">
        <Link to="/" aria-label="Voltar para a página inicial" className="inline-flex">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-end gap-2">
          <SeletorIdioma idioma={idioma} aoTrocar={setIdioma} rotulo={t.idiomaRotulo} />
          <Button asChild variant="ghost" className="min-h-11 gap-1.5" aria-label={t.acessibilidade}>
            <Link to="/configuracoes/acessibilidade">
              <Accessibility aria-hidden="true" />
              <span className="hidden sm:inline">{t.acessibilidade}</span>
            </Link>
          </Button>
        </div>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-6 sm:p-8">
          {modo === "aguardando" || modo === "sair" ? (
            <p role="status" className="py-10 text-center text-sm text-muted-foreground">
              {t.carregandoCadastro}
            </p>
          ) : faltamDadosPessoais ? (
            <p role="status" className="py-6 text-sm text-muted-foreground">
              Abrindo seus dados…
            </p>
          ) : (
            <WizardCandidato
              retomando={retomando}
              dadosPendentes={usuario?.dadosCadastroPendentes ?? []}
              t={t}
              seguirParaEmpresa={depois === "empresa"}
              googleProva={googleProva ?? undefined}
            />
          )}
        </CardContent>
      </Card>

      {modo === "novo" && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t.jaTemConta}{" "}
          <Link to="/entrar" className="font-semibold text-primary underline underline-offset-2">
            {t.entrar}
          </Link>
        </p>
      )}
    </AutenticacaoLayout>
  );
}
/**
 * Cadastro do candidato em quatro etapas.
 *
 * As duas primeiras (conta e dados pessoais) são enviadas juntas, numa chamada só, no fim da etapa
 * 2 — são os campos obrigatórios da conta, e gravá-los numa transação evita conta pela metade. O
 * cadastro **não** exige confirmação de e-mail: o backend devolve sessão na hora, e as etapas 3 e 4
 * seguem direto. Quem fechar a aba no meio retoma por `/cadastro?retomar=true` depois do login.
 *
 * Todo campo das etapas 1 e 2 é obrigatório. Os dois opcionais do cadastro são foto de perfil e
 * currículo, ambos na etapa 3.
 */
function WizardCandidato({
  retomando,
  dadosPendentes,
  t,
  seguirParaEmpresa,
  googleProva,
}: {
  /** Dados obrigatórios que a conta ainda não tem (nomes de campo, vindos do servidor). */
  dadosPendentes: string[];
  seguirParaEmpresa?: boolean;
  /** Quando veio de "Continuar com Google": vai junto no cadastro para o servidor vincular. */
  googleProva?: string;
  /** Entrou por "retomar cadastro": a conta já existe e o fluxo começa na etapa de perfil. */
  retomando?: boolean;
  t: TextosCadastro;
}) {
  const { registrarCandidato, recarregar, usuario } = useSessao();
  // Fixo no primeiro render: ao gravar os dados, a sessão passa a dizer que nada falta, e a tela não pode
  // mudar de forma sob os pés de quem está preenchendo.
  const [completando] = useState(() => Boolean(retomando) && dadosPendentes.length > 0);
  const [passo, setPasso] = useState<number>(() => {
    if (!retomando) return CANDIDATO.CONTA;
    // Falta dado obrigatório: o passo é o de completar (as etapas de perfil não pedem esses dados).
    if (completando) return CANDIDATO.DADOS;

    // Atualizar a página não volta a etapa: retoma onde a pessoa estava nesta aba.
    const salvo = usuario ? lerEtapaSalva(usuario.id) : null;
    return salvo !== null && salvo >= CANDIDATO.PERFIL && salvo <= CANDIDATO.ACESSIBILIDADE ? salvo : CANDIDATO.PERFIL;
  });
  const [enviando, setEnviando] = useState(false);
  const [candidatoId, setCandidatoId] = useState<string | null>(null);
  // Vira `true` na primeira troca de etapa: antes disso o título não puxa o foco (ver TituloEtapa).
  const navegou = useRef(false);

  function irPara(novoPasso: number, usuarioId: string | undefined = usuario?.id) {
    navegou.current = true;
    setPasso(novoPasso);
    // Da etapa de perfil em diante a conta existe: lembra a etapa para o F5 não voltar atrás.
    if (usuarioId && novoPasso >= CANDIDATO.PERFIL) salvarEtapa(usuarioId, novoPasso);
  }

  // O esquema muda junto com o idioma; a ref deixa o resolver sempre enxergar o mais recente, para
  // trocar de idioma no meio do formulário também trocar a língua das mensagens de erro.
  // Nome e e-mail que o Google já informou, para a pessoa não redigitar (e o e-mail bater com a
  // conta Google que está sendo vinculada).
  const doGoogle = useMemo(() => perfilDaProvaGoogle(googleProva), [googleProva]);
  // O e-mail que o Google verificou é o da conta: o servidor recusa qualquer outro neste cadastro,
  // então o campo vem travado em vez de deixar a pessoa descobrir isso só no fim da etapa 2.
  const emailDoGoogle = Boolean(doGoogle?.email);

  const esquema = useMemo(() => criarEsquemaCandidato(t), [t]);
  const limitesData = useMemo(() => limitesDataNascimento(), []);
  const esquemaRef = useRef(esquema);
  esquemaRef.current = esquema;
  const resolver: Resolver<FormCandidato> = (valores, contexto, opcoes) =>
    zodResolver(esquemaRef.current)(valores, contexto, opcoes);

  const form = useForm<FormCandidato>({
    resolver,
    mode: "onTouched",
    defaultValues: {
      pais: "BR",
      email: doGoogle?.email ?? "",
      cpf: "",
      senha: "",
      termos: false as unknown as true,
      nome: doGoogle?.nome ?? "",
      telefone: "",
      dataNascimento: "",
      cidade: "",
      estado: "",
    },
  });
  const { register, formState, watch, setValue, trigger, getValues } = form;
  const erros = formState.errors;

  // Ao retomar, a conta já existe: busca o id do candidato para a etapa 3 poder gravar.
  useEffect(() => {
    if (!retomando) return;
    let cancelado = false;

    perfilService
      .meuCandidato()
      .then((candidato) => {
        if (cancelado) return;
        setCandidatoId(candidato.id);

        if (completando) {
          // Parte do que a conta já tem. O país nunca é escolhido por conta própria: se a conta não tem,
          // o campo fica vazio para a pessoa escolher.
          setValue("pais", candidato.pais ?? "");
          if (candidato.dataNascimento) setValue("dataNascimento", candidato.dataNascimento.slice(0, 10));
          if (candidato.cidade) setValue("cidade", candidato.cidade);
          if (candidato.estado) setValue("estado", candidato.estado);
        }
      })
      .catch(() => {
        if (!cancelado) toast.error(t.erroPerfilGenerico);
      });

    return () => {
      cancelado = true;
    };
  }, [retomando, completando, setValue, t.erroPerfilGenerico]);

  async function criarConta() {
    const v = getValues();
    setEnviando(true);
    try {
      const resultado = await registrarCandidato({
        nome: normalizarNome(v.nome),
        email: v.email,
        senha: v.senha,
        telefone: somenteDigitos(v.telefone),
        cpf: somenteDigitos(v.cpf),
        pais: v.pais,
        dataNascimento: v.dataNascimento,
        cidade: v.cidade,
        estado: v.estado.toUpperCase(),
        // Registra qual versão dos documentos legais a tela mostrou no momento do aceite.
        termosVersao: VERSAO_DOCUMENTOS,
        // O campo da API continua `googleCodigo`; o conteúdo é a prova assinada pelo servidor.
        ...(googleProva ? { googleCodigo: googleProva } : {}),
      });

      // A conta existe: a prova cumpriu o papel e não deve ficar na aba para outro cadastro.
      limparProva();

      // O cadastro de candidato não devolve mais `pendenteVerificacaoEmail`; o ramo fica como rede
      // de segurança caso o backend volte a exigir confirmação algum dia.
      if ("pendenteVerificacaoEmail" in resultado) {
        toast.error(t.erroContaGenerico);
        return;
      }

      const candidato = await perfilService.meuCandidato();
      setCandidatoId(candidato.id);
      irPara(CANDIDATO.PERFIL, resultado.id);
    } catch (erro) {
      toast.error(extrairMensagemErro(erro, t.erroContaGenerico));
    } finally {
      setEnviando(false);
    }
  }

  /** Conta que já existe, mas sem dado obrigatório: grava o que falta e segue para a etapa de perfil. */
  async function completarDados() {
    if (!candidatoId) {
      toast.error(t.erroPerfilGenerico);
      return;
    }

    const v = getValues();
    setEnviando(true);
    try {
      await perfilService.atualizarCandidato(candidatoId, {
        pais: v.pais,
        dataNascimento: v.dataNascimento,
        cidade: v.cidade,
        estado: v.estado.toUpperCase(),
      });
      // A sessão passa a saber que nada falta; é ela que decide o destino nos próximos logins.
      await recarregar();
      irPara(CANDIDATO.PERFIL);
    } catch (erro) {
      toast.error(extrairMensagemErro(erro, t.erroPerfilGenerico));
    } finally {
      setEnviando(false);
    }
  }

  const aoEnviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (enviando) return;

    const valido = await trigger(completando ? CAMPOS_COMPLETAR : CAMPOS_CANDIDATO[passo]);
    if (!valido) return;

    if (completando) {
      await completarDados();
      return;
    }

    if (passo === CANDIDATO.CONTA) {
      irPara(CANDIDATO.DADOS);
      return;
    }
    await criarConta();
  };

  const passos = t.passos;
  const rotulosPassos = {
    concluida: t.etapaConcluida,
    atual: t.etapaAtual,
    pendente: t.etapaPendente,
    lista: t.passos.join(", "),
  };

  if (passo === CANDIDATO.ACESSIBILIDADE) {
    return (
      <div>
        <PassosCadastro
          passos={passos}
          atual={CANDIDATO.ACESSIBILIDADE}
          frase={t.etapa}
          rotulos={rotulosPassos}
        />
        <TituloEtapa titulo={t.acessTitulo} descricao={t.acessDescricao} />
        <PainelAcessibilidade />
        <BotaoFinalizar t={t} seguirParaEmpresa={seguirParaEmpresa} />
      </div>
    );
  }

  if (passo === CANDIDATO.PERFIL) {
    return (
      <div>
        <PassosCadastro passos={passos} atual={CANDIDATO.PERFIL} frase={t.etapa} rotulos={rotulosPassos} />
        <TituloEtapa titulo={t.perfilTitulo} descricao={t.perfilDescricao} />
        {/* Sem legenda de obrigatório: nesta etapa nada é. */}
        <EtapaCurriculoPerfil
          candidatoId={candidatoId}
          t={t}
          aoConcluir={() => irPara(CANDIDATO.ACESSIBILIDADE)}
        />
      </div>
    );
  }

  const senha = watch("senha") ?? "";

  return (
    <form onSubmit={aoEnviar} noValidate>
      <PassosCadastro passos={passos} atual={passo} frase={t.etapa} rotulos={rotulosPassos} />

      {passo === CANDIDATO.CONTA && (
        <>
          <TituloEtapa titulo={t.contaTitulo} descricao={t.contaDescricao} focar={navegou.current} />
          {doGoogle ? (
            /*
              Quem já voltou do Google não vê o botão de novo: clicar nele sairia do ACESSO para a
              tela do Google outra vez e, na volta, o formulário recomeçaria vazio. No lugar, a
              confirmação de qual conta foi verificada — é ela que será vinculada no fim.
            */
            <ContaGoogleConfirmada email={doGoogle.email} />
          ) : (
            /*
              `tipoConta` carrega a intenção de quem entrou por "Sou empresa": ela viaja dentro do
              `state` assinado pelo backend e volta no retorno do Google, que então manda de novo
              para cá com `?depois=empresa`. Sem isso, usar o Google no caminho "Sou empresa" perdia
              a intenção e a pessoa terminava só com a conta pessoal, sem seguir para a empresa.
            */
            <BotaoGoogle tipoConta={seguirParaEmpresa ? "empresa" : "candidato"} />
          )}

          <LegendaObrigatorio texto={t.legendaObrigatorio} />

          <div className="space-y-5">
            <Campo id="pais" rotulo={t.pais} ajuda={t.paisAjuda} erro={erros.pais?.message} obrigatorio>
              <PaisAutocomplete
                id="pais"
                valor={watch("pais") ?? ""}
                aoMudar={(codigo) => {
                    setValue("pais", codigo, { shouldValidate: true });
                    if (codigo === "BR" && !SIGLAS_ESTADOS_BR.has((getValues("estado") ?? "").toUpperCase())) {
                      setValue("estado", "");
                    }
                  }}
                temErro={Boolean(erros.pais)}
                descrito={descricao("pais", true, Boolean(erros.pais))}
                desabilitado={enviando}
                placeholder={t.paisBuscar}
              />
            </Campo>

            <Campo
              id="email-cadastro"
              rotulo={t.email}
              ajuda={emailDoGoogle ? t.emailGoogleAjuda : t.emailAjuda}
              erro={erros.email?.message}
              obrigatorio
              dicaObrigatorio={t.dicaObrigatorio}
            >
              <Input
                id="email-cadastro"
                type="email"
                required
                className={emailDoGoogle ? "min-h-12 read-only:bg-secondary" : "min-h-12"}
                autoComplete="email"
                readOnly={emailDoGoogle}
                aria-invalid={Boolean(erros.email)}
                aria-describedby={descricao("email-cadastro", true, Boolean(erros.email))}
                {...register("email")}
              />
            </Campo>

            <Campo id="cpf" rotulo={t.cpf} ajuda={t.cpfAjuda} erro={erros.cpf?.message} obrigatorio>
              <Input
                id="cpf"
                required
                inputMode="numeric"
                placeholder="000.000.000-00"
                maxLength={14}
                className="min-h-12"
                autoComplete="off"
                aria-invalid={Boolean(erros.cpf)}
                aria-describedby={descricao("cpf", true, Boolean(erros.cpf))}
                {...register("cpf", {
                  onChange: (e) => setValue("cpf", formatarCpf(e.target.value), { shouldValidate: false }),
                })}
              />
            </Campo>

            <Campo id="senha-cadastro" rotulo={t.senha} erro={erros.senha?.message} obrigatorio>
              <PasswordInput
                id="senha-cadastro"
                required
                className="min-h-12"
                autoComplete="new-password"
                rotuloMostrar={t.mostrarSenha}
                aria-invalid={Boolean(erros.senha)}
                aria-describedby="senha-requisitos"
                {...register("senha")}
              />
            </Campo>

            <RequisitosSenha
              id="senha-requisitos"
              senha={senha}
              rotulos={t.requisitos}
              atendidoTexto={t.requisitoAtendido}
              pendenteTexto={t.requisitoPendente}
            />

            <AceiteTermos
              id="termos-candidato"
              marcado={Boolean(watch("termos"))}
              aoMarcar={(valor) => setValue("termos", valor as true, { shouldValidate: true })}
              erro={erros.termos?.message}
              enviando={enviando}
              textos={{ antes: t.termosAntes, linkUso: t.termosLinkUso, entre: t.termosEntre, linkPrivacidade: t.termosLinkPrivacidade, depois: t.termosDepois }}
              obrigatorio
              dicaObrigatorio={t.dicaObrigatorio}
            />
          </div>
        </>
      )}

      {passo === CANDIDATO.DADOS && (
        <>
          <TituloEtapa
            titulo={completando ? t.completarTitulo : t.dadosTitulo}
            descricao={completando ? t.completarDescricao : t.dadosDescricao}
          />
          <LegendaObrigatorio texto={t.legendaObrigatorio} />

          <div className="space-y-5">
            {completando && (
              <Campo id="pais" rotulo={t.pais} ajuda={t.paisAjuda} erro={erros.pais?.message} obrigatorio>
                <PaisAutocomplete
                  id="pais"
                  valor={watch("pais") ?? ""}
                  aoMudar={(codigo) => {
                    setValue("pais", codigo, { shouldValidate: true });
                    if (codigo === "BR" && !SIGLAS_ESTADOS_BR.has((getValues("estado") ?? "").toUpperCase())) {
                      setValue("estado", "");
                    }
                  }}
                  temErro={Boolean(erros.pais)}
                  descrito={descricao("pais", true, Boolean(erros.pais))}
                  desabilitado={enviando}
                  placeholder={t.paisBuscar}
                />
              </Campo>
            )}

            {!completando && (
              <>
            <Campo id="nome" rotulo={t.nome} erro={erros.nome?.message} obrigatorio>
              <Input
                id="nome"
                required
                className="min-h-12"
                autoComplete="name"
                aria-invalid={Boolean(erros.nome)}
                aria-describedby={descricao("nome", false, Boolean(erros.nome))}
                {...register("nome")}
              />
            </Campo>

            <Campo
              id="telefone"
              rotulo={t.telefone}
              ajuda={t.telefoneAjuda}
              erro={erros.telefone?.message}
              obrigatorio
              dicaObrigatorio={t.dicaObrigatorio}
            >
              <Input
                id="telefone"
                type="tel"
                required
                inputMode="numeric"
                placeholder="(00) 00000-0000"
                maxLength={15}
                className="min-h-12"
                autoComplete="tel"
                aria-invalid={Boolean(erros.telefone)}
                aria-describedby={descricao("telefone", true, Boolean(erros.telefone))}
                {...register("telefone", {
                  onChange: (e) => setValue("telefone", formatarTelefone(e.target.value), { shouldValidate: false }),
                })}
              />
            </Campo>
              </>
            )}

            <Campo
              id="data-nascimento"
              rotulo={t.dataNascimento}
              ajuda={t.dataNascimentoAjuda}
              erro={erros.dataNascimento?.message}
              obrigatorio
              dicaObrigatorio={t.dicaObrigatorio}
            >
              <Input
                id="data-nascimento"
                type="date"
                required
                min={limitesData.min}
                max={limitesData.max}
                className="min-h-12"
                autoComplete="bday"
                aria-invalid={Boolean(erros.dataNascimento)}
                aria-describedby={descricao("data-nascimento", true, Boolean(erros.dataNascimento))}
                {...register("dataNascimento")}
              />
            </Campo>

            <div className="grid gap-5 sm:grid-cols-[1fr_7rem]">
              <Campo id="cidade" rotulo={t.cidade} erro={erros.cidade?.message} obrigatorio>
                <CidadeAutocomplete
                  id="cidade"
                  name="cidade"
                  value={watch("cidade") ?? ""}
                  onChange={(valor) => setValue("cidade", valor, { shouldValidate: true })}
                  estado={watch("estado") ?? ""}
                  aria-label={t.cidade}
                  aria-invalid={Boolean(erros.cidade)}
                  aria-describedby={descricao("cidade", false, Boolean(erros.cidade))}
                  className="min-h-12"
                />
              </Campo>

              <Campo id="estado" rotulo={t.estado} erro={erros.estado?.message} obrigatorio>
                {/* No Brasil, a sigla se escolhe numa lista; fora dele, o campo de 2 letras de sempre. */}
                {watch("pais") === "BR" ? (
                  <EstadoSelect
                    id="estado"
                    required
                    placeholder={t.escolaridadeSelecione}
                    className="min-h-12"
                    autoComplete="address-level1"
                    aria-invalid={Boolean(erros.estado)}
                    aria-describedby={descricao("estado", false, Boolean(erros.estado))}
                    {...register("estado")}
                  />
                ) : (
                  <Input
                    id="estado"
                    required
                    maxLength={2}
                    className="min-h-12 uppercase"
                    autoComplete="address-level1"
                    aria-invalid={Boolean(erros.estado)}
                    aria-describedby={descricao("estado", false, Boolean(erros.estado))}
                    {...register("estado")}
                  />
                )}
              </Campo>
            </div>
          </div>
        </>
      )}

      <NavegacaoEtapa
        primeiraEtapa={passo === CANDIDATO.CONTA || completando}
        enviando={enviando}
        rotuloAvancar={passo === CANDIDATO.DADOS && !completando ? t.criarConta : t.continuar}
        rotuloVoltar={t.voltar}
        rotuloEnviando={t.enviando}
        aoVoltar={() => irPara(passo - 1)}
      />
    </form>
  );
}

