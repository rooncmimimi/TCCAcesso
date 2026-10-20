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
import { PassosCadastro } from "@/components/cadastro/PassosCadastro";
import { RequisitosSenha } from "@/components/cadastro/RequisitosSenha";
import {
  AceiteTermos,
  ConfirmeSeuEmail,
  EtapaAcessibilidade,
  NavegacaoEtapa,
  TituloEtapa,
} from "@/components/cadastro/comuns";
import { PAIS_PADRAO } from "@/dados/localidade";
import { VERSAO_DOCUMENTOS } from "@/dados/documentosLegais";
import { useSessao } from "@/hooks/useSessao";
import { extrairMensagemErro } from "@/services/api";
import { formatarCep, formatarCnpj, formatarTelefone, somenteDigitos } from "@/lib/mascaras";
import { PORTES_EMPRESA } from "@/utils/formatacao";
import { metaPagina, regraSenha, SeletorIdioma, dic, useT, type Dicionario } from "@/i18n";

/**
 * Cadastro institucional. Obrigatório é o que o backend exige hoje
 * (`validarCadastroEmpresa`): CNPJ, razão social, nome e e-mail do responsável e senha. O resto
 * compõe o perfil e fica opcional — não inventei exigência que o backend não faz.
 */
function criarEsquemaEmpresa(t: Dicionario) {
  const e = t.cadastro.empresa.erros;

  return z.object({
  cnpj: z.string().trim().refine((v) => somenteDigitos(v).length === 14, e.cnpj),
  razaoSocial: z.string().trim().min(3, e.razaoSocial).max(200),
  nomeFantasia: z.string().trim().max(200).optional(),
  setor: z.string().trim().max(120).optional(),
  porte: z.string().trim().optional(),

  nome: z.string().trim().min(3, e.nome).max(150),
  email: z.string().trim().min(1, e.email).email(e.emailFormato).max(150),
  telefone: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || (somenteDigitos(v).length >= 10 && somenteDigitos(v).length <= 11),
      e.telefone,
    ),
  senha: regraSenha(t.validacao),

  cep: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || somenteDigitos(v).length === 8, e.cep),
  estado: z.string().trim().optional().refine((v) => !v || v.length === 2, e.estado),
  cidade: z.string().trim().max(100).optional(),
  endereco: z.string().trim().max(255).optional(),

  descricao: z.string().trim().max(4000).optional(),
  site: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^https?:\/\/.+/i.test(v), e.site),
  culturaInclusiva: z.string().trim().max(4000).optional(),

  termos: z.literal(true, {
    errorMap: () => ({ message: e.termos }),
  }),
  });
}

type FormEmpresa = z.infer<ReturnType<typeof criarEsquemaEmpresa>>;

/** Campos validados antes de liberar cada etapa. O índice é o da etapa. */
const CAMPOS: FieldPath<FormEmpresa>[][] = [
  ["cnpj", "razaoSocial", "nomeFantasia", "setor", "porte"],
  ["nome", "email", "telefone", "senha"],
  ["cep", "estado", "cidade", "endereco"],
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
  head: () => metaPagina(dic().cadastro.empresa.meta),
  component: CadastroEmpresa,
});

function CadastroEmpresa() {
  const t = useT();
  const te = t.cadastro.empresa;
  const [emailPendente, setEmailPendente] = useState<string | null>(null);
  const { autenticado, usuario, inicializado } = useSessao();

  // A conta de empresa nasce de uma conta de candidato: sem ela, não há o que vincular. O backend
  // recusa igual (`cadastrarEmpresa` exige sessão de candidato); aqui é só para a pessoa não
  // preencher cinco etapas antes de descobrir.
  if (inicializado && (!autenticado || usuario?.tipo !== "candidato")) {
    return (
      <AutenticacaoLayout className="max-w-lg">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link to="/" aria-label={t.auth.voltarInicioAria} className="inline-flex">
            <Logo />
          </Link>
          <SeletorIdioma compacto id="seletor-idioma-empresa" />
        </div>

        <Card className="shadow-card">
          <CardContent className="p-6 sm:p-8">
            <h1 className="text-xl font-extrabold">{te.primeiro.titulo}</h1>
            <p className="mt-3 text-sm text-muted-foreground">{te.primeiro.texto}</p>

            <Button asChild className="mt-6 min-h-12 w-full text-base">
              <Link to="/cadastro/candidato" search={{ depois: "empresa" }}>
                {te.primeiro.criar} <ArrowRight aria-hidden="true" />
              </Link>
            </Button>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              {te.primeiro.jaTem}{" "}
              <Link to="/entrar" className="font-semibold text-primary underline underline-offset-2">
                {t.comum.entrar}
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
        <Link to="/" aria-label={t.auth.voltarInicioAria} className="inline-flex">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <SeletorIdioma compacto id="seletor-idioma-empresa" />
          <Button asChild variant="ghost" className="min-h-11 gap-1.5" aria-label={t.layout.configuracoesAcessibilidade}>
            <Link to="/configuracoes/acessibilidade">
              <Accessibility aria-hidden="true" />
              <span className="hidden sm:inline">{t.comum.acessibilidade}</span>
            </Link>
          </Button>
        </div>
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
          {te.jaTemConta}{" "}
          <Link to="/entrar" className="font-semibold text-primary underline underline-offset-2">
            {t.comum.entrar}
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
  const { registrarEmpresa } = useSessao();
  const t = useT();
  const te = t.cadastro.empresa;
  const PASSOS = te.passos;
  const [passo, setPasso] = useState<number>(EMPRESA.IDENTIFICACAO);
  const [enviando, setEnviando] = useState(false);
  const navegou = useRef(false);

  function irPara(novoPasso: number) {
    navegou.current = true;
    setPasso(novoPasso);
  }

  // O esquema muda junto com o idioma; a ref deixa o resolver sempre enxergar o mais recente.
  const esquema = useMemo(() => criarEsquemaEmpresa(t), [t]);
  const esquemaRef = useRef(esquema);
  esquemaRef.current = esquema;

  const form = useForm<FormEmpresa>({
    resolver: (valores, contexto, opcoes) => zodResolver(esquemaRef.current)(valores, contexto, opcoes),
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
        nome: v.nome,
        email: v.email,
        senha: v.senha,
        cnpj: somenteDigitos(v.cnpj),
        razaoSocial: v.razaoSocial,
        // Registra qual versão dos documentos legais a tela mostrou no momento do aceite.
        termosVersao: VERSAO_DOCUMENTOS,
        // O cadastro não pergunta o país (ver `dados/localidade.ts`).
        pais: PAIS_PADRAO,
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
      })) {
        if (valor) payload[chave] = valor;
      }

      const resultado = await registrarEmpresa(payload);

      if ("pendenteVerificacaoEmail" in resultado) {
        onPendenteVerificacao(resultado.email);
        return;
      }

      toast.success(te.sucesso);
      irPara(EMPRESA.ACESSIBILIDADE);
    } catch (erro) {
      toast.error(extrairMensagemErro(erro, te.erro));
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
    return <EtapaAcessibilidade passos={PASSOS} indice={EMPRESA.ACESSIBILIDADE} />;
  }

  const senha = watch("senha") ?? "";

  return (
    <form onSubmit={aoEnviar} noValidate>
      <PassosCadastro passos={PASSOS} atual={passo} />

      {passo === EMPRESA.IDENTIFICACAO && (
        <>
          <TituloEtapa
            titulo={te.identificacao.titulo}
            descricao={te.identificacao.descricao}
            focar={navegou.current}
          />
          {/*
            Não há "Continuar com Google" aqui: esta tela só é alcançável por quem já entrou com a
            conta de candidato, e o botão levaria o navegador para o Google no meio do formulário —
            ao voltar, a sessão já existe, o retorno manda para o feed e tudo que foi digitado se
            perde. A conta da empresa é uma segunda conta, com senha própria, criada a partir da
            conta pessoal; o Google entra no cadastro de candidato, não aqui.
          */}

          <LegendaObrigatorio />

          <div className="space-y-5">
            <Campo
              id="cnpj"
              rotulo={te.identificacao.cnpj}
              ajuda={te.identificacao.cnpjAjuda}
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

            <Campo id="razao-social" rotulo={te.identificacao.razaoSocial} erro={erros.razaoSocial?.message} obrigatorio>
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
              rotulo={te.identificacao.nomeFantasia}
              ajuda={te.identificacao.nomeFantasiaAjuda}
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

            <Campo id="setor" rotulo={te.identificacao.setor} erro={erros.setor?.message}>
              <Input
                id="setor"
                className="min-h-12"
                placeholder={te.identificacao.setorExemplo}
                aria-invalid={Boolean(erros.setor)}
                aria-describedby={descricao("setor", false, Boolean(erros.setor))}
                {...register("setor")}
              />
            </Campo>

            <Campo id="porte" rotulo={te.identificacao.porte} erro={erros.porte?.message}>
              <Select value={watch("porte") ?? ""} onValueChange={(valor) => setValue("porte", valor)}>
                <SelectTrigger id="porte" className="min-h-12 w-full">
                  <SelectValue placeholder={te.identificacao.porteEscolha} />
                </SelectTrigger>
                <SelectContent>
                  {PORTES_EMPRESA.map((p) => (
                    <SelectItem key={p.valor} value={p.valor}>
                      {t.comum.portes[p.valor]}
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
            titulo={te.responsavel.titulo}
            descricao={te.responsavel.descricao}
          />
          <LegendaObrigatorio />

          <div className="space-y-5">
            <Campo id="nome-responsavel" rotulo={te.responsavel.nome} erro={erros.nome?.message} obrigatorio>
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
              rotulo={te.responsavel.email}
              ajuda={te.responsavel.emailAjuda}
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
              rotulo={te.responsavel.telefone}
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

            <Campo id="senha-empresa" rotulo={te.responsavel.senha} erro={erros.senha?.message} obrigatorio>
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
            titulo={te.endereco.titulo}
            descricao={te.endereco.descricao}
          />

          <div className="space-y-5">
            <Campo id="cep" rotulo={te.endereco.cep} erro={erros.cep?.message}>
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
              <Campo id="cidade-empresa" rotulo={te.endereco.cidade} erro={erros.cidade?.message}>
                <CidadeAutocomplete
                  id="cidade-empresa"
                  name="cidade"
                  value={watch("cidade") ?? ""}
                  onChange={(valor) => setValue("cidade", valor, { shouldValidate: true })}
                  estado={watch("estado") ?? ""}
                  aria-label={te.endereco.cidadeAria}
                  aria-invalid={Boolean(erros.cidade)}
                  className="min-h-12"
                />
              </Campo>

              <Campo id="estado-empresa" rotulo={te.endereco.estado} erro={erros.estado?.message}>
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
              rotulo={te.endereco.endereco}
              ajuda={te.endereco.enderecoAjuda}
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
            titulo={te.apresentacao.titulo}
            descricao={te.apresentacao.descricao}
          />

          <div className="space-y-5">
            <Campo
              id="descricao-empresa"
              rotulo={te.apresentacao.descricaoCampo}
              ajuda={te.apresentacao.descricaoAjuda}
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
              rotulo={te.apresentacao.cultura}
              ajuda={te.apresentacao.culturaAjuda}
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

            <Campo id="site" rotulo={te.apresentacao.site} erro={erros.site?.message}>
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
            titulo={te.conclusao.titulo}
            descricao={te.conclusao.descricao}
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
              {te.conclusao.aviso}
            </p>
          </div>
        </>
      )}

      <NavegacaoEtapa
        primeiraEtapa={passo === EMPRESA.IDENTIFICACAO}
        enviando={enviando}
        rotuloAvancar={passo === EMPRESA.CONCLUSAO ? te.criarConta : t.comum.continuar}
        aoVoltar={() => irPara(passo - 1)}
      />
    </form>
  );
}

/** Revisão da etapa 5: mostra o que foi preenchido e leva de volta à etapa certa para corrigir. */
function Revisao({ valores, aoEditar }: { valores: FormEmpresa; aoEditar: (passo: number) => void }) {
  const t = useT();
  const r = t.cadastro.empresa.revisao;

  const grupos = [
    {
      passo: EMPRESA.IDENTIFICACAO,
      titulo: r.grupos.empresa,
      itens: [
        [r.cnpj, valores.cnpj],
        [r.razaoSocial, valores.razaoSocial],
        [r.nomeFantasia, valores.nomeFantasia],
        [r.setor, valores.setor],
        [r.porte, valores.porte ? t.comum.portes[valores.porte as keyof typeof t.comum.portes] : ""],
      ],
    },
    {
      passo: EMPRESA.RESPONSAVEL,
      titulo: r.grupos.responsavel,
      itens: [
        [r.nome, valores.nome],
        [r.email, valores.email],
        [r.telefone, valores.telefone],
      ],
    },
    {
      passo: EMPRESA.ENDERECO,
      titulo: r.grupos.endereco,
      itens: [
        [r.cep, valores.cep],
        [r.cidade, valores.cidade],
        [r.estado, valores.estado],
        [r.endereco, valores.endereco],
      ],
    },
    {
      passo: EMPRESA.APRESENTACAO,
      titulo: r.grupos.apresentacao,
      itens: [
        [r.descricao, valores.descricao],
        [r.cultura, valores.culturaInclusiva],
        [r.site, valores.site],
      ],
    },
  ] as const;

  return (
    <div className="space-y-4">
      {grupos.map((grupo) => {
        const preenchidos = grupo.itens.filter(([, valor]) => String(valor ?? "").trim());

        return (
          <section key={grupo.passo} aria-labelledby={`revisao-${grupo.passo}`} className="rounded-xl border border-border p-4">
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
                {r.editar}
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
              <p className="text-sm text-muted-foreground">{r.nada}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
