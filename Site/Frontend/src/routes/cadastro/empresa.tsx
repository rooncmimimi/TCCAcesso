import { createFileRoute, Link } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useRef, useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { Accessibility, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Logo } from "@/components/Logo";
import { AutenticacaoLayout } from "@/layouts/AutenticacaoLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CidadeAutocomplete } from "@/components/CidadeAutocomplete";
import { Campo } from "@/components/cadastro/Campo";
import { descricao } from "@/components/cadastro/descricao";
import { LegendaObrigatorio } from "@/components/cadastro/MarcaObrigatorio";
import { PaisAutocomplete } from "@/components/cadastro/PaisAutocomplete";
import { PassosCadastro } from "@/components/cadastro/PassosCadastro";
import { RequisitosSenha } from "@/components/cadastro/RequisitosSenha";
import {
  AceiteTermos,
  ConfirmeSeuEmail,
  EtapaAcessibilidade,
  NavegacaoEtapa,
  TituloEtapa,
} from "@/components/cadastro/comuns";
import { criarRegrasDeSenha } from "@/lib/regrasDeSenha";
import type { TFuncao } from "@/contexts/IdiomaContext";
import type { ChaveBase } from "@/i18n/dicionarios";
import { textoDaPagina } from "@/i18n/textoDaPagina";
import { useIdioma } from "@/hooks/useIdioma";
import { ehCodigoDePais, PAIS_POR_CODIGO } from "@/dados/paises";
import { VERSAO_DOCUMENTOS } from "@/dados/documentosLegais";
import { useSessao } from "@/hooks/useSessao";
import { extrairMensagemErro } from "@/services/api";
import { formatarCep, formatarCnpj, formatarTelefone, somenteDigitos } from "@/lib/mascaras";
import { normalizarNome } from "@/lib/validacoesPessoais";
import { esquemaNome } from "@/components/cadastro/regrasPessoais";
import { PORTES_EMPRESA } from "@/utils/formatacao";

/**
 * Cadastro institucional. Obrigatório é o que o backend exige hoje
 * (`validarCadastroEmpresa`): CNPJ, razão social, nome e e-mail do responsável e senha. O resto
 * compõe o perfil e fica opcional — não inventei exigência que o backend não faz.
 *
 * O esquema nasce do idioma atual: as mensagens de erro saem na língua da tela.
 */
const criarEsquemaEmpresa = (t: TFuncao) =>
  z.object({
    cnpj: z.string().trim().refine((v) => somenteDigitos(v).length === 14, t("cadastro.empresa.erroCnpj")),
    razaoSocial: z.string().trim().min(3, t("cadastro.empresa.erroRazaoSocial")).max(200),
    nomeFantasia: z.string().trim().max(200).optional(),
    setor: z.string().trim().max(120).optional(),
    porte: z.string().trim().optional(),

    nome: esquemaNome({
      erroNome: t("cadastro.empresa.erroNomeResponsavel"),
      erroNomeCaracteres: t("validacao.nomeCaracteres"),
    }),
    email: z.string().trim().min(1, t("cadastro.empresa.erroEmail")).email(t("cadastro.empresa.erroEmailFormato")).max(150),
    telefone: z
      .string()
      .trim()
      .optional()
      .refine(
        (v) => !v || (somenteDigitos(v).length >= 10 && somenteDigitos(v).length <= 11),
        t("cadastro.empresa.erroTelefone"),
      ),
    senha: criarRegrasDeSenha(t),

    pais: z.string().trim().optional().refine((v) => !v || ehCodigoDePais(v), t("cadastro.empresa.erroPais")),
    cep: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || somenteDigitos(v).length === 8, t("cadastro.empresa.erroCep")),
    estado: z.string().trim().optional().refine((v) => !v || v.length === 2, t("cadastro.empresa.erroUf")),
    cidade: z.string().trim().max(100).optional(),
    endereco: z.string().trim().max(255).optional(),

    descricao: z.string().trim().max(4000).optional(),
    site: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || /^https?:\/\/.+/i.test(v), t("cadastro.empresa.erroSite")),
    culturaInclusiva: z.string().trim().max(4000).optional(),

    termos: z.literal(true, {
      errorMap: () => ({ message: t("cadastro.empresa.erroTermos") }),
    }),
  });

type FormEmpresa = z.infer<ReturnType<typeof criarEsquemaEmpresa>>;

const PASSOS = [
  "cadastro.empresa.passoEmpresa",
  "cadastro.empresa.passoResponsavel",
  "cadastro.empresa.passoEndereco",
  "cadastro.empresa.passoApresentacao",
  "cadastro.empresa.passoConclusao",
  "cadastro.empresa.passoAcessibilidade",
] as const satisfies readonly ChaveBase[];

/** Campos validados antes de liberar cada etapa. O índice é o da etapa. */
const CAMPOS: FieldPath<FormEmpresa>[][] = [
  ["cnpj", "razaoSocial", "nomeFantasia", "setor", "porte"],
  ["nome", "email", "telefone", "senha"],
  ["pais", "cep", "estado", "cidade", "endereco"],
  ["descricao", "site", "culturaInclusiva"],
  ["termos"],
];

const EMPRESA = {
  IDENTIFICACAO: 0,
  RESPONSAVEL: 1,
  ENDERECO: 2,
  APRESENTACAO: 3,
  CONCLUSAO: 4,
  ACESSIBILIDADE: 5,
} as const;

export const Route = createFileRoute("/cadastro/empresa")({
  head: () => ({
    meta: [
      { title: textoDaPagina("cadastro.empresa.criarContaDeEmpresaAcesso") },
      {
        name: "description",
        content: textoDaPagina("cadastro.empresa.crieOPerfilInstitucionalDaSua"),
      },
      { property: "og:title", content: textoDaPagina("cadastro.empresa.criarContaDeEmpresaAcesso") },
      { property: "og:description", content: textoDaPagina("cadastro.empresa.cadastroInstitucionalNaRede") },
    ],
  }),
  component: CadastroEmpresa,
});

function CadastroEmpresa() {
  const { t } = useIdioma();
  const [emailPendente, setEmailPendente] = useState<string | null>(null);
  const { autenticado, usuario, inicializado } = useSessao();

  // A conta de empresa nasce de uma conta de candidato: sem ela, não há o que vincular. O backend
  // recusa igual (`cadastrarEmpresa` exige sessão de candidato); aqui é só para a pessoa não
  // preencher cinco etapas antes de descobrir.
  if (inicializado && (!autenticado || usuario?.tipo !== "candidato")) {
    return (
      <AutenticacaoLayout className="max-w-lg">
        <div className="mb-6">
          <Link to="/" aria-label={t("auth.voltarPaginaInicial")} className="inline-flex">
            <Logo />
          </Link>
        </div>

        <Card className="shadow-card">
          <CardContent className="p-6 sm:p-8">
            <h1 className="text-xl font-extrabold">{t("cadastro.empresa.primeiroASuaContaPessoal")}</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {t("cadastro.empresa.noAcessoAContaDaEmpresaFica")}
            </p>

            <Button asChild className="mt-6 min-h-12 w-full text-base">
              <Link to="/cadastro/candidato" search={{ depois: "empresa" }}>
                {t("cadastro.empresa.criarMinhaContaDeCandidato")} <ArrowRight aria-hidden="true" />
              </Link>
            </Button>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              {t("cadastro.empresa.jaTemContaDeCandidato")}{" "}
              <Link to="/entrar" className="font-semibold text-primary underline underline-offset-2">
                {t("cabecalho.entrar")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </AutenticacaoLayout>
    );
  }

  return (
    <AutenticacaoLayout className="max-w-lg">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link to="/" aria-label={t("auth.voltarPaginaInicial")} className="inline-flex">
          <Logo />
        </Link>
        <Button asChild variant="ghost" className="min-h-11 gap-1.5" aria-label={t("cabecalho.configAcessibilidade")}>
          <Link to="/configuracoes/acessibilidade">
            <Accessibility aria-hidden="true" />
            <span className="hidden sm:inline">{t("rodape.acessibilidade")}</span>
          </Link>
        </Button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-6 sm:p-8">
          {emailPendente ? (
            <ConfirmeSeuEmail email={emailPendente} />
          ) : (
            <WizardEmpresa onPendenteVerificacao={setEmailPendente} />
          )}
        </CardContent>
      </Card>

      {!emailPendente && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("cadastro.empresa.jaTemUmaConta")}{" "}
          <Link to="/entrar" className="font-semibold text-primary underline underline-offset-2">
            {t("cabecalho.entrar")}
          </Link>
        </p>
      )}
    </AutenticacaoLayout>
  );
}

/**
 * Cadastro institucional em cinco etapas, mais a de acessibilidade.
 *
 * As etapas separam o que é da empresa do que é da pessoa que responde por ela, em vez de misturar
 * tudo num formulário só: identificação, responsável, endereço, apresentação e, por fim, revisão e
 * aceite antes de criar a conta. A acessibilidade vem depois da conta existir, porque é preferência
 * pessoal de quem usa, não dado institucional.
 *
 * O cadastro de empresa **continua exigindo confirmação de e-mail** (diferente do de candidato) e a
 * conta continua sujeita à aprovação da equipe antes de publicar vagas — nada aqui contorna isso.
 */
function WizardEmpresa({ onPendenteVerificacao }: { onPendenteVerificacao: (email: string) => void }) {
  const { t } = useIdioma();
  const { registrarEmpresa } = useSessao();
  const [passo, setPasso] = useState<number>(EMPRESA.IDENTIFICACAO);
  const [enviando, setEnviando] = useState(false);
  const navegou = useRef(false);

  function irPara(novoPasso: number) {
    navegou.current = true;
    setPasso(novoPasso);
  }

  const form = useForm<FormEmpresa>({
    resolver: zodResolver(useMemo(() => criarEsquemaEmpresa(t), [t])),
    mode: "onTouched",
    defaultValues: {
      cnpj: "",
      razaoSocial: "",
      nomeFantasia: "",
      setor: "",
      porte: "",
      nome: "",
      email: "",
      telefone: "",
      senha: "",
      pais: "BR",
      cep: "",
      estado: "",
      cidade: "",
      endereco: "",
      descricao: "",
      site: "",
      culturaInclusiva: "",
      termos: false as unknown as true,
    },
  });
  const { register, formState, watch, setValue, trigger, getValues } = form;
  const erros = formState.errors;

  async function criarConta() {
    const v = getValues();
    setEnviando(true);
    try {
      const payload: Record<string, unknown> = {
        nome: normalizarNome(v.nome),
        email: v.email,
        senha: v.senha,
        cnpj: somenteDigitos(v.cnpj),
        razaoSocial: v.razaoSocial,
        // Registra qual versão dos documentos legais a tela mostrou no momento do aceite.
        termosVersao: VERSAO_DOCUMENTOS,
      };
      for (const [chave, valor] of Object.entries({
        telefone: v.telefone ? somenteDigitos(v.telefone) : "",
        nomeFantasia: v.nomeFantasia,
        setor: v.setor,
        porte: v.porte,
        site: v.site,
        descricao: v.descricao,
        culturaInclusiva: v.culturaInclusiva,
        endereco: v.endereco,
        cidade: v.cidade,
        cep: v.cep ? somenteDigitos(v.cep) : "",
        estado: v.estado ? v.estado.toUpperCase() : "",
        pais: v.pais ? v.pais.toUpperCase() : "",
      })) {
        if (valor) payload[chave] = valor;
      }

      const resultado = await registrarEmpresa(payload);

      if ("pendenteVerificacaoEmail" in resultado) {
        onPendenteVerificacao(resultado.email);
        return;
      }

      toast.success(t("cadastro.empresa.contaCriadaComSucesso"));
      irPara(EMPRESA.ACESSIBILIDADE);
    } catch (erro) {
      toast.error(extrairMensagemErro(erro, t("cadastro.empresa.naoFoiPossivelCriarAContaAgora")));
    } finally {
      setEnviando(false);
    }
  }

  const aoEnviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (enviando) return;

    const valido = await trigger(CAMPOS[passo]);
    if (!valido) return;

    if (passo < EMPRESA.CONCLUSAO) {
      irPara(passo + 1);
      return;
    }
    await criarConta();
  };

  if (passo === EMPRESA.ACESSIBILIDADE) {
    return <EtapaAcessibilidade passos={PASSOS.map((p) => t(p))} indice={EMPRESA.ACESSIBILIDADE} />;
  }

  const senha = watch("senha") ?? "";

  return (
    <form onSubmit={aoEnviar} noValidate>
      <PassosCadastro passos={PASSOS.map((p) => t(p))} atual={passo} />

      {passo === EMPRESA.IDENTIFICACAO && (
        <>
          <TituloEtapa
            titulo={t("cadastro.empresa.identificacaoDaEmpresa")}
            descricao={t("cadastro.empresa.osDadosQueIdentificamAEmpresa")}
            focar={navegou.current}
          />
          {/*
            Não há "Continuar com o Google" aqui: esta tela só é alcançável por quem já entrou com a
            conta de candidato, e o botão levaria o navegador para o Google no meio do formulário —
            ao voltar, a sessão já existe, o retorno manda para o feed e tudo que foi digitado se
            perde. A conta da empresa é uma segunda conta, com senha própria, criada a partir da
            conta pessoal; o Google entra no cadastro de candidato, não aqui.
          */}

          <LegendaObrigatorio />

          <div className="space-y-5">
            <Campo
              id="cnpj"
              rotulo="CNPJ"
              ajuda={t("cadastro.empresa.usadoParaConfirmarQueAEmpresa")}
              erro={erros.cnpj?.message}
              obrigatorio
            >
              <Input
                id="cnpj"
                required
                inputMode="numeric"
                placeholder="00.000.000/0000-00"
                maxLength={18}
                className="min-h-12"
                aria-invalid={Boolean(erros.cnpj)}
                aria-describedby={descricao("cnpj", true, Boolean(erros.cnpj))}
                {...register("cnpj", {
                  onChange: (e) => setValue("cnpj", formatarCnpj(e.target.value), { shouldValidate: false }),
                })}
              />
            </Campo>

            <Campo id="razao-social" rotulo={t("cadastro.empresa.razaoSocial")} erro={erros.razaoSocial?.message} obrigatorio>
              <Input
                id="razao-social"
                required
                className="min-h-12"
                autoComplete="organization"
                aria-invalid={Boolean(erros.razaoSocial)}
                aria-describedby={descricao("razao-social", false, Boolean(erros.razaoSocial))}
                {...register("razaoSocial")}
              />
            </Campo>

            <Campo
              id="nome-fantasia"
              rotulo={t("cadastro.empresa.nomeFantasiaOpcional")}
              ajuda={t("cadastro.empresa.eEsseNomeQueApareceEmDestaque")}
              erro={erros.nomeFantasia?.message}
            >
              <Input
                id="nome-fantasia"
                className="min-h-12"
                aria-invalid={Boolean(erros.nomeFantasia)}
                aria-describedby={descricao("nome-fantasia", true, Boolean(erros.nomeFantasia))}
                {...register("nomeFantasia")}
              />
            </Campo>

            <Campo id="setor" rotulo={t("cadastro.empresa.setorDeAtuacaoOpcional")} erro={erros.setor?.message}>
              <Input
                id="setor"
                className="min-h-12"
                placeholder={t("cadastro.empresa.exTecnologiaSaudeEducacao")}
                aria-invalid={Boolean(erros.setor)}
                aria-describedby={descricao("setor", false, Boolean(erros.setor))}
                {...register("setor")}
              />
            </Campo>

            <Campo id="porte" rotulo={t("cadastro.empresa.porteDaEmpresaOpcional")} erro={erros.porte?.message}>
              <Select value={watch("porte") ?? ""} onValueChange={(valor) => setValue("porte", valor)}>
                <SelectTrigger id="porte" className="min-h-12 w-full">
                  <SelectValue placeholder={t("cadastro.empresa.selecioneOPorte")} />
                </SelectTrigger>
                <SelectContent>
                  {PORTES_EMPRESA.map((p) => (
                    <SelectItem key={p.valor} value={p.valor}>
                      {p.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
          </div>
        </>
      )}

      {passo === EMPRESA.RESPONSAVEL && (
        <>
          <TituloEtapa
            titulo={t("cadastro.empresa.responsavelPelaConta")}
            descricao={t("cadastro.empresa.quemAdministraAContaDaEmpresa")}
          />
          <LegendaObrigatorio />

          <div className="space-y-5">
            <Campo id="nome-responsavel" rotulo={t("cadastro.empresa.nomeCompleto")} erro={erros.nome?.message} obrigatorio>
              <Input
                id="nome-responsavel"
                required
                className="min-h-12"
                autoComplete="name"
                aria-invalid={Boolean(erros.nome)}
                aria-describedby={descricao("nome-responsavel", false, Boolean(erros.nome))}
                {...register("nome")}
              />
            </Campo>

            <Campo
              id="email-empresa"
              rotulo={t("cadastro.empresa.eMailProfissional")}
              ajuda={t("cadastro.empresa.ePorEleQueAEmpresaEntraNa")}
              erro={erros.email?.message}
              obrigatorio
            >
              <Input
                id="email-empresa"
                type="email"
                required
                className="min-h-12"
                autoComplete="email"
                aria-invalid={Boolean(erros.email)}
                aria-describedby={descricao("email-empresa", true, Boolean(erros.email))}
                {...register("email")}
              />
            </Campo>

            <Campo
              id="telefone-empresa"
              rotulo={t("cadastro.empresa.telefoneDeContatoOpcional")}
              erro={erros.telefone?.message}
            >
              <Input
                id="telefone-empresa"
                type="tel"
                inputMode="numeric"
                placeholder="(00) 00000-0000"
                maxLength={15}
                className="min-h-12"
                autoComplete="tel"
                aria-invalid={Boolean(erros.telefone)}
                aria-describedby={descricao("telefone-empresa", false, Boolean(erros.telefone))}
                {...register("telefone", {
                  onChange: (e) => setValue("telefone", formatarTelefone(e.target.value), { shouldValidate: false }),
                })}
              />
            </Campo>

            <Campo id="senha-empresa" rotulo={t("login.senha")} erro={erros.senha?.message} obrigatorio>
              <PasswordInput
                id="senha-empresa"
                required
                className="min-h-12"
                autoComplete="new-password"
                aria-invalid={Boolean(erros.senha)}
                aria-describedby="senha-requisitos-empresa"
                {...register("senha")}
              />
            </Campo>

            <RequisitosSenha id="senha-requisitos-empresa" senha={senha} />
          </div>
        </>
      )}

      {passo === EMPRESA.ENDERECO && (
        <>
          <TituloEtapa
            titulo={t("cadastro.empresa.enderecoEContatoInstitucional")}
            descricao={t("cadastro.empresa.ondeAEmpresaFicaAjudaAMostrar")}
          />

          <div className="space-y-5">
            <Campo id="pais-empresa" rotulo={t("cadastro.empresa.paisOpcional")} erro={erros.pais?.message}>
              <PaisAutocomplete
                id="pais-empresa"
                valor={watch("pais") ?? ""}
                aoMudar={(codigo) => setValue("pais", codigo, { shouldValidate: true })}
                temErro={Boolean(erros.pais)}
                descrito={descricao("pais-empresa", false, Boolean(erros.pais))}
                desabilitado={enviando}
              />
            </Campo>

            <Campo id="cep" rotulo={t("cadastro.empresa.cepOpcional")} erro={erros.cep?.message}>
              <Input
                id="cep"
                inputMode="numeric"
                placeholder="00000-000"
                maxLength={9}
                className="min-h-12"
                autoComplete="postal-code"
                aria-invalid={Boolean(erros.cep)}
                aria-describedby={descricao("cep", false, Boolean(erros.cep))}
                {...register("cep", {
                  onChange: (e) => setValue("cep", formatarCep(e.target.value), { shouldValidate: false }),
                })}
              />
            </Campo>

            <div className="grid gap-5 sm:grid-cols-[1fr_7rem]">
              <Campo id="cidade-empresa" rotulo={t("cadastro.empresa.cidadeOpcional")} erro={erros.cidade?.message}>
                <CidadeAutocomplete
                  id="cidade-empresa"
                  name="cidade"
                  value={watch("cidade") ?? ""}
                  onChange={(valor) => setValue("cidade", valor, { shouldValidate: true })}
                  estado={watch("estado") ?? ""}
                  aria-label={t("filtro.cidade")}
                  aria-invalid={Boolean(erros.cidade)}
                  className="min-h-12"
                />
              </Campo>

              <Campo id="estado-empresa" rotulo={t("cadastro.empresa.estadoUf")} erro={erros.estado?.message}>
                <Input
                  id="estado-empresa"
                  maxLength={2}
                  className="min-h-12 uppercase"
                  autoComplete="address-level1"
                  aria-invalid={Boolean(erros.estado)}
                  aria-describedby={descricao("estado-empresa", false, Boolean(erros.estado))}
                  {...register("estado")}
                />
              </Campo>
            </div>

            <Campo
              id="endereco"
              rotulo={t("cadastro.empresa.enderecoOpcional")}
              ajuda={t("cadastro.empresa.ruaNumeroEComplementoSeHouver")}
              erro={erros.endereco?.message}
            >
              <Input
                id="endereco"
                className="min-h-12"
                autoComplete="street-address"
                aria-invalid={Boolean(erros.endereco)}
                aria-describedby={descricao("endereco", true, Boolean(erros.endereco))}
                {...register("endereco")}
              />
            </Campo>
          </div>
        </>
      )}

      {passo === EMPRESA.APRESENTACAO && (
        <>
          <TituloEtapa
            titulo={t("cadastro.empresa.apresentacaoDaEmpresa")}
            descricao={t("cadastro.empresa.oQueAsPessoasCandidatasLeem")}
          />

          <div className="space-y-5">
            <Campo
              id="descricao-empresa"
              rotulo={t("cadastro.empresa.descricaoInstitucionalOpcional")}
              ajuda={t("cadastro.empresa.emPoucasLinhasOQueAEmpresaFaz")}
              erro={erros.descricao?.message}
            >
              <Textarea
                id="descricao-empresa"
                rows={4}
                maxLength={4000}
                aria-invalid={Boolean(erros.descricao)}
                aria-describedby={descricao("descricao-empresa", true, Boolean(erros.descricao))}
                {...register("descricao")}
              />
            </Campo>

            <Campo
              id="cultura-inclusiva"
              rotulo={t("cadastro.empresa.culturaInclusivaOpcional")}
              ajuda={t("cadastro.empresa.comoAEmpresaPraticaInclusao")}
              erro={erros.culturaInclusiva?.message}
            >
              <Textarea
                id="cultura-inclusiva"
                rows={4}
                maxLength={4000}
                aria-invalid={Boolean(erros.culturaInclusiva)}
                aria-describedby={descricao("cultura-inclusiva", true, Boolean(erros.culturaInclusiva))}
                {...register("culturaInclusiva")}
              />
            </Campo>

            <Campo id="site" rotulo={t("cadastro.empresa.siteOpcional")} erro={erros.site?.message}>
              <Input
                id="site"
                type="url"
                placeholder="https://"
                className="min-h-12"
                autoComplete="url"
                aria-invalid={Boolean(erros.site)}
                aria-describedby={descricao("site", false, Boolean(erros.site))}
                {...register("site")}
              />
            </Campo>
          </div>
        </>
      )}

      {passo === EMPRESA.CONCLUSAO && (
        <>
          <TituloEtapa
            titulo={t("cadastro.empresa.revisaoEAceite")}
            descricao={t("cadastro.empresa.confiraOsDadosAntesDeCriarA")}
          />

          <Revisao valores={getValues()} aoEditar={irPara} />

          <div className="mt-6 space-y-4">
            <AceiteTermos
              id="termos-empresa"
              marcado={Boolean(watch("termos"))}
              aoMarcar={(valor) => setValue("termos", valor as true, { shouldValidate: true })}
              erro={erros.termos?.message}
              enviando={enviando}
              obrigatorio
            />

            <p className="rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground">
              {t("cadastro.empresa.depoisDeCriarAContaConfirmeOE")}
            </p>
          </div>
        </>
      )}

      <NavegacaoEtapa
        primeiraEtapa={passo === EMPRESA.IDENTIFICACAO}
        enviando={enviando}
        rotuloAvancar={passo === EMPRESA.CONCLUSAO ? "Criar conta" : "Continuar"}
        aoVoltar={() => irPara(passo - 1)}
      />
    </form>
  );
}

/** Revisão da etapa 5: mostra o que foi preenchido e leva de volta à etapa certa para corrigir. */
function Revisao({ valores, aoEditar }: { valores: FormEmpresa; aoEditar: (passo: number) => void }) {
  const { t } = useIdioma();
  const grupos = [
    {
      passo: EMPRESA.IDENTIFICACAO,
      titulo: "vaga.empresa",
      itens: [
        ["CNPJ", valores.cnpj],
        [t("admin.conteudoDenunciado.razaoSocial"), valores.razaoSocial],
        [t("perfil.editarEmpresaDialog.nomeFantasia"), valores.nomeFantasia],
        ["Setor", valores.setor],
        ["Porte", PORTES_EMPRESA.find((p) => p.valor === valores.porte)?.rotulo],
      ],
    },
    {
      passo: EMPRESA.RESPONSAVEL,
      titulo: "cadastro.empresa.responsavel",
      itens: [
        ["Nome", valores.nome],
        ["E-mail", valores.email],
        ["Telefone", valores.telefone],
      ],
    },
    {
      passo: EMPRESA.ENDERECO,
      titulo: "cadastro.empresa.endereco",
      itens: [
        [t("cadastro.empresa.pais"), valores.pais ? PAIS_POR_CODIGO.get(valores.pais) : ""],
        ["CEP", valores.cep],
        ["Cidade", valores.cidade],
        ["Estado", valores.estado],
        [t("perfil.editarEmpresaDialog.endereco"), valores.endereco],
      ],
    },
    {
      passo: EMPRESA.APRESENTACAO,
      titulo: "cadastro.empresa.apresentacao",
      itens: [
        [t("vagaDetalhe.descricao"), valores.descricao],
        [t("cadastro.empresa.culturaInclusiva"), valores.culturaInclusiva],
        ["Site", valores.site],
      ],
    },
  ] as const;

  return (
    <div className="space-y-4">
      {grupos.map((grupo) => {
        const preenchidos = grupo.itens.filter(([, valor]) => String(valor ?? "").trim());

        return (
          <section key={grupo.titulo} aria-labelledby={`revisao-${grupo.passo}`} className="rounded-xl border border-border p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 id={`revisao-${grupo.passo}`} className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                {grupo.titulo}
              </h3>
              <Button
                type="button"
                variant="ghost"
                className="min-h-9 text-sm"
                onClick={() => aoEditar(grupo.passo)}
              >
                {t("post.editar")}
              </Button>
            </div>

            {preenchidos.length ? (
              <dl className="space-y-1.5">
                {preenchidos.map(([rotulo, valor]) => (
                  <div key={rotulo} className="grid grid-cols-[9rem_1fr] gap-2 text-sm">
                    <dt className="text-muted-foreground">{rotulo}</dt>
                    <dd className="min-w-0 break-words">{valor}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">{t("cadastro.empresa.nadaPreenchidoNestaEtapa")}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

