import { createFileRoute, Link } from "@tanstack/react-router";
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
import { ehCodigoDePais } from "@/dados/paises";
import { VERSAO_DOCUMENTOS } from "@/dados/documentosLegais";
import { useSessao } from "@/hooks/useSessao";
import { perfilService } from "@/services/perfil.service";
import { perfilDoCodigoGoogle } from "@/services/google.service";
import { extrairMensagemErro } from "@/services/api";
import { formatarCpf, formatarTelefone, somenteDigitos } from "@/lib/mascaras";

/**
 * Esquema do candidato montado a partir dos textos do idioma escolhido, para as mensagens de erro
 * acompanharem a tradução — errar em português numa tela em espanhol é justamente a hora em que a
 * pessoa mais precisa entender.
 *
 * **Todo campo aqui é obrigatório.** Os dois únicos opcionais do cadastro — foto de perfil e
 * currículo — não passam por este esquema; ficam na etapa 3, que tem validação própria.
 */
function criarEsquemaCandidato(t: TextosCadastro) {
  return z.object({
    pais: z.string().trim().min(1, t.erroPais).refine(ehCodigoDePais, t.erroPaisLista),
    email: z.string().trim().min(1, t.erroEmail).email(t.erroEmailFormato).max(150),
    cpf: z
      .string()
      .trim()
      .min(1, t.erroCpf)
      .refine((v) => somenteDigitos(v).length === 11, t.erroCpfFormato),
    senha: z
      .string()
      .min(8, t.erroSenha)
      .max(72, t.erroSenha)
      .regex(/[a-z]/, t.erroSenhaMinuscula)
      .regex(/[A-Z]/, t.erroSenhaMaiuscula)
      .regex(/\d/, t.erroSenhaNumero)
      .regex(/[^A-Za-z0-9]/, t.erroSenhaEspecial),
    termos: z.literal(true, { errorMap: () => ({ message: t.erroTermos }) }),
    nome: z.string().trim().min(3, t.erroNome).max(150),
    telefone: z
      .string()
      .trim()
      .min(1, t.erroTelefone)
      .refine((v) => {
        const digitos = somenteDigitos(v).length;
        return digitos >= 10 && digitos <= 11;
      }, t.erroTelefoneFormato),
    dataNascimento: z
      .string()
      .trim()
      .min(1, t.erroDataNascimento)
      .refine((v) => !Number.isNaN(Date.parse(v)), t.erroDataNascimento)
      .refine((v) => new Date(v) <= new Date(), t.erroDataFutura),
    cidade: z.string().trim().min(2, t.erroCidade).max(100),
    estado: z.string().trim().length(2, t.erroEstado),
  });
}

type FormCandidato = z.infer<ReturnType<typeof criarEsquemaCandidato>>;
/** Campos validados antes de liberar cada etapa do candidato. O índice é o da etapa. */
const CAMPOS_CANDIDATO: FieldPath<FormCandidato>[][] = [
  ["pais", "email", "cpf", "senha", "termos"],
  ["nome", "telefone", "dataNascimento", "cidade", "estado"],
];

/** Índices das etapas do candidato, para nenhum número solto ficar espalhado pelo arquivo. */
const CANDIDATO = { CONTA: 0, DADOS: 1, PERFIL: 2, ACESSIBILIDADE: 3 } as const;

export const Route = createFileRoute("/cadastro/candidato")({
  validateSearch: z.object({
    /** `?retomar=true` vem do login de quem tem `cadastroConcluidoEm` nula: volta na etapa de perfil. */
    retomar: z.coerce.boolean().optional(),
    /** `?depois=empresa`: quem veio por "Sou empresa" segue para o cadastro institucional ao final. */
    depois: z.enum(["empresa"]).optional(),
    /** Código de entrega do Google: vincula a conta Google à conta criada aqui. */
    google: z.string().optional(),
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
  const { autenticado, usuario } = useSessao();
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

  // Só retoma de verdade quem está logado como candidato e ainda não terminou o cadastro. Sem isso
  // um `?retomar=true` colado na barra levaria alguém deslogado a uma etapa que precisa de sessão.
  const retomando = Boolean(retomar) && autenticado && usuario?.tipo === "candidato";

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
          <WizardCandidato
            retomando={retomando}
            t={t}
            seguirParaEmpresa={depois === "empresa"}
            googleCodigo={google}
          />
        </CardContent>
      </Card>

      {!retomando && (
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
  t,
  seguirParaEmpresa,
  googleCodigo,
}: {
  seguirParaEmpresa?: boolean;
  /** Quando veio de "Continuar com Google": vai junto no cadastro para o servidor vincular. */
  googleCodigo?: string;
  /** Entrou por "retomar cadastro": a conta já existe e o fluxo começa na etapa de perfil. */
  retomando?: boolean;
  t: TextosCadastro;
}) {
  const { registrarCandidato } = useSessao();
  const [passo, setPasso] = useState<number>(retomando ? CANDIDATO.PERFIL : CANDIDATO.CONTA);
  const [enviando, setEnviando] = useState(false);
  const [candidatoId, setCandidatoId] = useState<string | null>(null);
  // Vira `true` na primeira troca de etapa: antes disso o título não puxa o foco (ver TituloEtapa).
  const navegou = useRef(false);

  function irPara(novoPasso: number) {
    navegou.current = true;
    setPasso(novoPasso);
  }

  // O esquema muda junto com o idioma; a ref deixa o resolver sempre enxergar o mais recente, para
  // trocar de idioma no meio do formulário também trocar a língua das mensagens de erro.
  // Nome e e-mail que o Google já informou, para a pessoa não redigitar (e o e-mail bater com a
  // conta Google que está sendo vinculada).
  const doGoogle = useMemo(() => perfilDoCodigoGoogle(googleCodigo), [googleCodigo]);

  const esquema = useMemo(() => criarEsquemaCandidato(t), [t]);
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
        if (!cancelado) setCandidatoId(candidato.id);
      })
      .catch(() => {
        if (!cancelado) toast.error(t.erroPerfilGenerico);
      });

    return () => {
      cancelado = true;
    };
  }, [retomando, t.erroPerfilGenerico]);

  async function criarConta() {
    const v = getValues();
    setEnviando(true);
    try {
      const resultado = await registrarCandidato({
        nome: v.nome,
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
        ...(googleCodigo ? { googleCodigo } : {}),
      });

      // O cadastro de candidato não devolve mais `pendenteVerificacaoEmail`; o ramo fica como rede
      // de segurança caso o backend volte a exigir confirmação algum dia.
      if ("pendenteVerificacaoEmail" in resultado) {
        toast.error(t.erroContaGenerico);
        return;
      }

      const candidato = await perfilService.meuCandidato();
      setCandidatoId(candidato.id);
      irPara(CANDIDATO.PERFIL);
    } catch (erro) {
      toast.error(extrairMensagemErro(erro, t.erroContaGenerico));
    } finally {
      setEnviando(false);
    }
  }

  const aoEnviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (enviando) return;

    const valido = await trigger(CAMPOS_CANDIDATO[passo]);
    if (!valido) return;

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
                aoMudar={(codigo) => setValue("pais", codigo, { shouldValidate: true })}
                temErro={Boolean(erros.pais)}
                descrito={descricao("pais", true, Boolean(erros.pais))}
                desabilitado={enviando}
                placeholder={t.paisBuscar}
              />
            </Campo>

            <Campo
              id="email-cadastro"
              rotulo={t.email}
              ajuda={t.emailAjuda}
              erro={erros.email?.message}
              obrigatorio
              dicaObrigatorio={t.dicaObrigatorio}
            >
              <Input
                id="email-cadastro"
                type="email"
                required
                className="min-h-12"
                autoComplete="email"
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
          <TituloEtapa titulo={t.dadosTitulo} descricao={t.dadosDescricao} />
          <LegendaObrigatorio texto={t.legendaObrigatorio} />

          <div className="space-y-5">
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
              </Campo>
            </div>
          </div>
        </>
      )}

      <NavegacaoEtapa
        primeiraEtapa={passo === CANDIDATO.CONTA}
        enviando={enviando}
        rotuloAvancar={passo === CANDIDATO.DADOS ? t.criarConta : t.continuar}
        rotuloVoltar={t.voltar}
        rotuloEnviando={t.enviando}
        aoVoltar={() => irPara(passo - 1)}
      />
    </form>
  );
}

