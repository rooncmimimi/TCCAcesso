import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { ArrowRight, Building2, Loader2, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CidadeAutocomplete } from "@/components/CidadeAutocomplete";
import { useSession } from "@/contexts/SessionContext";
import authService from "@/services/auth.service";
import { extrairMensagemErro } from "@/services/api";
import { cn } from "@/lib/utils";
import { formatarCnpj, formatarCpf, somenteDigitos } from "@/lib/mascaras";
import type { PorteEmpresa } from "@/types";

const PORTES: PorteEmpresa[] = ["MEI", "Micro", "Pequena", "Media", "Grande"];

const regraSenha = z
  .string()
  .min(8, "A senha deve ter entre 8 e 72 caracteres.")
  .max(72, "A senha deve ter entre 8 e 72 caracteres.")
  .regex(/[a-z]/, "A senha deve conter ao menos uma letra minúscula.")
  .regex(/[A-Z]/, "A senha deve conter ao menos uma letra maiúscula.")
  .regex(/\d/, "A senha deve conter ao menos um número.")
  .regex(/[^A-Za-z0-9]/, "A senha deve conter ao menos um caractere especial.");

const camposComuns = {
  nome: z.string().trim().min(3, "Informe um nome entre 3 e 150 caracteres.").max(150),
  email: z.string().trim().email("Informe um endereço de e-mail válido.").max(150),
  telefone: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || (v.length >= 10 && v.length <= 20), "Informe um telefone válido."),
  senha: regraSenha,
  confirmarSenha: z.string(),
};

const esquemaCandidato = z
  .object({
    ...camposComuns,
    cpf: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || somenteDigitos(v).length === 11, "Informe um CPF válido."),
  })
  .refine((valores) => valores.senha === valores.confirmarSenha, {
    message: "As senhas não coincidem.",
    path: ["confirmarSenha"],
  });

const esquemaEmpresa = z
  .object({
    ...camposComuns,
    cnpj: z
      .string()
      .trim()
      .refine((v) => somenteDigitos(v).length === 14, "Informe um CNPJ válido."),
    razaoSocial: z.string().trim().min(3, "Informe a razão social (3 a 200 caracteres).").max(200),
    nomeFantasia: z.string().trim().max(200).optional(),
    setor: z.string().trim().max(120).optional(),
    porte: z.string().trim().optional(),
    site: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || /^https?:\/\/.+/i.test(v), "Informe uma URL válida (começando com http:// ou https://)."),
    descricao: z.string().trim().max(4000).optional(),
    cep: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || somenteDigitos(v).length === 8, "Informe um CEP válido (8 dígitos)."),
    endereco: z.string().trim().max(255).optional(),
    cidade: z.string().trim().max(100).optional(),
    estado: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || v.length === 2, "Informe a UF com 2 letras."),
  })
  .refine((valores) => valores.senha === valores.confirmarSenha, {
    message: "As senhas não coincidem.",
    path: ["confirmarSenha"],
  });

type FormularioCandidato = z.infer<typeof esquemaCandidato>;
type FormularioEmpresa = z.infer<typeof esquemaEmpresa>;

export const Route = createFileRoute("/cadastro")({
  validateSearch: z.object({ perfil: z.enum(["candidato", "empresa"]).optional() }),
  head: () => ({
    meta: [
      { title: "Criar conta — ACESSO" },
      {
        name: "description",
        content: "Crie sua conta no ACESSO e configure a acessibilidade do jeito que funciona para você.",
      },
      { property: "og:title", content: "Criar conta — ACESSO" },
      { property: "og:description", content: "Cadastro gratuito na rede profissional inclusiva." },
    ],
  }),
  component: Cadastro,
});

function Cadastro() {
  const { perfil } = Route.useSearch();
  const [tipo, setTipo] = useState<"candidato" | "empresa">(perfil ?? "candidato");
  const [emailPendente, setEmailPendente] = useState<string | null>(null);

  return (
    <div className="grid min-h-dvh place-items-center bg-secondary px-4 py-10">
      <div className="w-full max-w-lg">
        <Link to="/" aria-label="Voltar para a página inicial" className="mb-6 inline-flex">
          <Logo />
        </Link>
        <Card className="shadow-card">
          <CardContent className="p-6">
            {emailPendente ? (
              <ConfirmeSeuEmail email={emailPendente} />
            ) : (
              <>
                <h1 className="text-2xl font-extrabold">Criar conta gratuita</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Em seguida você configura sua acessibilidade e já vê o resultado em tempo real.
                </p>

                <fieldset className="mt-6">
                  <legend className="mb-2 text-sm font-bold">Eu sou</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        { valor: "candidato", label: "Pessoa candidata", icon: User },
                        { valor: "empresa", label: "Empresa", icon: Building2 },
                      ] as const
                    ).map((op) => (
                      <button
                        key={op.valor}
                        type="button"
                        aria-pressed={tipo === op.valor}
                        onClick={() => setTipo(op.valor)}
                        className={cn(
                          "flex min-h-14 items-center gap-3 rounded-xl border-2 px-4 text-left text-sm font-semibold transition-colors",
                          tipo === op.valor
                            ? "border-primary bg-primary-soft text-primary"
                            : "border-border hover:bg-secondary",
                        )}
                      >
                        <op.icon className="size-5 shrink-0" aria-hidden="true" />
                        <span className="min-w-0">{op.label}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                {tipo === "candidato" ? (
                  <FormularioCandidatoCadastro onPendenteVerificacao={setEmailPendente} />
                ) : (
                  <FormularioEmpresaCadastro onPendenteVerificacao={setEmailPendente} />
                )}
              </>
            )}

            <p className="mt-6 text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link to="/entrar" className="font-semibold text-primary underline">
                Entrar
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Tela mostrada no lugar do formulário depois que o cadastro é criado com
 * confirmação de e-mail pendente (Brevo configurado) — não há sessão
 * ativa ainda, só a opção de reenviar o e-mail caso não chegue.
 */
function ConfirmeSeuEmail({ email }: { email: string }) {
  const [enviando, setEnviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);
  const tituloRef = useRef<HTMLHeadingElement>(null);

  async function reenviar() {
    setEnviando(true);
    try {
      await authService.reenviarConfirmacaoCadastro(email);
      setReenviado(true);
      toast.success("Um novo e-mail de confirmação foi enviado.");
    } catch (erro) {
      toast.error(extrairMensagemErro(erro, "Não foi possível reenviar o e-mail agora."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <Mail className="size-5" />
        </span>
        <div>
          <h1 ref={tituloRef} tabIndex={-1} className="text-xl font-extrabold outline-none">
            Conta criada com sucesso!
          </h1>
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Enviamos um e-mail de confirmação para <strong className="text-foreground">{email}</strong>. Verifique sua
        caixa de entrada e também a pasta de spam, e clique no link para confirmar seu endereço antes de entrar.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Prefere digitar o código de 6 dígitos que veio no e-mail? Você também pode{" "}
        <Link
          to="/confirmar-email"
          search={{ email }}
          className="font-semibold text-primary underline"
        >
          confirmar por código
        </Link>
        .
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-6 min-h-11 w-full"
        disabled={enviando || reenviado}
        onClick={reenviar}
      >
        {enviando ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" /> Reenviando…
          </>
        ) : reenviado ? (
          "E-mail reenviado"
        ) : (
          "Reenviar e-mail"
        )}
      </Button>
    </div>
  );
}

function FormularioCandidatoCadastro({
  onPendenteVerificacao,
}: {
  onPendenteVerificacao: (email: string) => void;
}) {
  const { registrarCandidato } = useSession();
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormularioCandidato>({
    resolver: zodResolver(esquemaCandidato),
    defaultValues: { nome: "", email: "", telefone: "", senha: "", confirmarSenha: "", cpf: "" },
  });
  const cpfField = register("cpf");

  const aoEnviar = handleSubmit(async (valores) => {
    setEnviando(true);
    try {
      const payload: Record<string, unknown> = { ...valores };
      delete payload.confirmarSenha;
      if (!payload.telefone) delete payload.telefone;
      payload.cpf = payload.cpf ? somenteDigitos(String(payload.cpf)) : undefined;
      if (!payload.cpf) delete payload.cpf;
      const resultado = await registrarCandidato(payload);
      if ("pendenteVerificacaoEmail" in resultado) {
        onPendenteVerificacao(resultado.email);
        return;
      }
      toast.success("Conta criada com sucesso!");
      navigate({ to: "/boas-vindas" });
    } catch (erro) {
      toast.error(extrairMensagemErro(erro, "Não foi possível criar sua conta."));
    } finally {
      setEnviando(false);
    }
  });

  return (
    <form className="mt-6 space-y-4" onSubmit={aoEnviar} noValidate>
      <div className="space-y-2">
        <Label htmlFor="nome">Nome completo</Label>
        <Input id="nome" className="min-h-12" autoComplete="name" aria-invalid={Boolean(errors.nome)} aria-describedby={errors.nome ? "nome-erro" : undefined} {...register("nome")} />
        {errors.nome && <p id="nome-erro" role="alert" className="text-sm font-medium text-destructive">{errors.nome.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email-cadastro">E-mail</Label>
        <Input id="email-cadastro" type="email" className="min-h-12" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-cadastro-erro" : undefined} {...register("email")} />
        {errors.email && <p id="email-cadastro-erro" role="alert" className="text-sm font-medium text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="telefone">Telefone (opcional)</Label>
        <Input id="telefone" type="tel" className="min-h-12" autoComplete="tel" aria-invalid={Boolean(errors.telefone)} aria-describedby={errors.telefone ? "telefone-erro" : undefined} {...register("telefone")} />
        {errors.telefone && <p id="telefone-erro" role="alert" className="text-sm font-medium text-destructive">{errors.telefone.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="cpf">CPF (opcional)</Label>
        <Input
          id="cpf"
          inputMode="numeric"
          placeholder="000.000.000-00"
          maxLength={14}
          className="min-h-12"
          aria-invalid={Boolean(errors.cpf)}
          aria-describedby={errors.cpf ? "cpf-erro" : undefined}
          {...cpfField}
          onChange={(e) => {
            e.target.value = formatarCpf(e.target.value);
            cpfField.onChange(e);
          }}
        />
        {errors.cpf && <p id="cpf-erro" role="alert" className="text-sm font-medium text-destructive">{errors.cpf.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="senha-cadastro">Senha</Label>
        <Input id="senha-cadastro" type="password" className="min-h-12" autoComplete="new-password" aria-describedby="senha-dica" aria-invalid={Boolean(errors.senha)} {...register("senha")} />
        <p id="senha-dica" className="text-sm text-muted-foreground">
          Use ao menos 8 caracteres, com maiúscula, minúscula, número e símbolo.
        </p>
        {errors.senha && <p role="alert" className="text-sm font-medium text-destructive">{errors.senha.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmar-senha-cadastro">Confirmar senha</Label>
        <Input
          id="confirmar-senha-cadastro"
          type="password"
          className="min-h-12"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmarSenha)}
          aria-describedby={errors.confirmarSenha ? "confirmar-senha-cadastro-erro" : undefined}
          {...register("confirmarSenha")}
        />
        {errors.confirmarSenha && (
          <p id="confirmar-senha-cadastro-erro" role="alert" className="text-sm font-medium text-destructive">
            {errors.confirmarSenha.message}
          </p>
        )}
      </div>
      <Button type="submit" className="min-h-12 w-full text-base" disabled={enviando}>
        {enviando ? (<><Loader2 className="animate-spin" aria-hidden="true" /> Criando conta…</>) : (<>Continuar para acessibilidade <ArrowRight aria-hidden="true" /></>)}
      </Button>
    </form>
  );
}

/** Cabeçalho de seção reutilizado nas etapas do cadastro de empresa. */
function SecaoFormulario({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <legend className="mb-1 text-sm font-bold text-primary">{titulo}</legend>
      {children}
    </fieldset>
  );
}

function FormularioEmpresaCadastro({
  onPendenteVerificacao,
}: {
  onPendenteVerificacao: (email: string) => void;
}) {
  const { registrarEmpresa } = useSession();
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);
  const [porte, setPorte] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormularioEmpresa>({
    resolver: zodResolver(esquemaEmpresa),
    defaultValues: {
      nome: "",
      email: "",
      telefone: "",
      senha: "",
      confirmarSenha: "",
      cnpj: "",
      razaoSocial: "",
      nomeFantasia: "",
      setor: "",
      site: "",
      descricao: "",
      cep: "",
      endereco: "",
    },
  });
  const cnpjField = register("cnpj");

  const aoEnviar = handleSubmit(async (valores) => {
    setEnviando(true);
    try {
      const payload: Record<string, unknown> = { ...valores, porte: porte || undefined, cidade: cidade || undefined, estado: estado || undefined };
      delete payload.confirmarSenha;
      payload.cnpj = somenteDigitos(String(payload.cnpj));
      if (!payload.telefone) delete payload.telefone;
      if (!payload.nomeFantasia) delete payload.nomeFantasia;
      if (!payload.setor) delete payload.setor;
      if (!payload.site) delete payload.site;
      if (!payload.descricao) delete payload.descricao;
      if (payload.cep) payload.cep = somenteDigitos(String(payload.cep));
      else delete payload.cep;
      if (!payload.endereco) delete payload.endereco;
      const resultado = await registrarEmpresa(payload);
      if ("pendenteVerificacaoEmail" in resultado) {
        onPendenteVerificacao(resultado.email);
        return;
      }
      toast.success("Conta criada com sucesso!");
      navigate({ to: "/boas-vindas" });
    } catch (erro) {
      toast.error(extrairMensagemErro(erro, "Não foi possível criar sua conta."));
    } finally {
      setEnviando(false);
    }
  });

  return (
    <form className="mt-6 space-y-6" onSubmit={aoEnviar} noValidate>
      <SecaoFormulario titulo="Dados da empresa">
        <div className="space-y-2">
          <Label htmlFor="nome-resp">Nome do responsável</Label>
          <Input id="nome-resp" className="min-h-12" autoComplete="name" aria-invalid={Boolean(errors.nome)} aria-describedby={errors.nome ? "nome-resp-erro" : undefined} {...register("nome")} />
          {errors.nome && <p id="nome-resp-erro" role="alert" className="text-sm font-medium text-destructive">{errors.nome.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="razao-social">Razão social</Label>
          <Input id="razao-social" className="min-h-12" aria-invalid={Boolean(errors.razaoSocial)} aria-describedby={errors.razaoSocial ? "razao-social-erro" : undefined} {...register("razaoSocial")} />
          {errors.razaoSocial && <p id="razao-social-erro" role="alert" className="text-sm font-medium text-destructive">{errors.razaoSocial.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="nome-fantasia">Nome fantasia (opcional)</Label>
          <Input id="nome-fantasia" className="min-h-12" aria-invalid={Boolean(errors.nomeFantasia)} {...register("nomeFantasia")} />
          {errors.nomeFantasia && <p role="alert" className="text-sm font-medium text-destructive">{errors.nomeFantasia.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="cnpj">CNPJ</Label>
          <Input
            id="cnpj"
            inputMode="numeric"
            placeholder="00.000.000/0000-00"
            maxLength={18}
            className="min-h-12"
            aria-invalid={Boolean(errors.cnpj)}
            aria-describedby={errors.cnpj ? "cnpj-erro" : undefined}
            {...cnpjField}
            onChange={(e) => {
              e.target.value = formatarCnpj(e.target.value);
              cnpjField.onChange(e);
            }}
          />
          {errors.cnpj && <p id="cnpj-erro" role="alert" className="text-sm font-medium text-destructive">{errors.cnpj.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email-empresa">E-mail</Label>
          <Input id="email-empresa" type="email" className="min-h-12" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-empresa-erro" : undefined} {...register("email")} />
          {errors.email && <p id="email-empresa-erro" role="alert" className="text-sm font-medium text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefone-empresa">Telefone (opcional)</Label>
          <Input id="telefone-empresa" type="tel" className="min-h-12" autoComplete="tel" aria-invalid={Boolean(errors.telefone)} {...register("telefone")} />
          {errors.telefone && <p role="alert" className="text-sm font-medium text-destructive">{errors.telefone.message}</p>}
        </div>
      </SecaoFormulario>

      <SecaoFormulario titulo="Localização (opcional)">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cidade-empresa">Cidade</Label>
            <CidadeAutocomplete id="cidade-empresa" name="cidade" value={cidade} onChange={setCidade} estado={estado} aria-label="Cidade" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="estado-empresa">Estado (UF)</Label>
            <Input
              id="estado-empresa"
              maxLength={2}
              placeholder="SP"
              className="min-h-12"
              value={estado}
              onChange={(e) => setEstado(e.target.value.toUpperCase())}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="endereco-empresa">Endereço</Label>
          <Input id="endereco-empresa" className="min-h-12" {...register("endereco")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cep-empresa">CEP</Label>
          <Input id="cep-empresa" inputMode="numeric" maxLength={8} placeholder="00000000" className="min-h-12" aria-invalid={Boolean(errors.cep)} aria-describedby={errors.cep ? "cep-empresa-erro" : undefined} {...register("cep")} />
          {errors.cep && <p id="cep-empresa-erro" role="alert" className="text-sm font-medium text-destructive">{errors.cep.message}</p>}
        </div>
      </SecaoFormulario>

      <SecaoFormulario titulo="Informações profissionais (opcional)">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="setor-empresa">Setor</Label>
            <Input id="setor-empresa" className="min-h-12" placeholder="Ex.: Tecnologia, Varejo, Saúde" {...register("setor")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="porte-empresa">Tamanho da empresa</Label>
            <Select value={porte} onValueChange={setPorte}>
              <SelectTrigger id="porte-empresa" className="min-h-12">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {PORTES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="site-empresa">Site</Label>
          <Input id="site-empresa" type="url" placeholder="https://" className="min-h-12" aria-invalid={Boolean(errors.site)} aria-describedby={errors.site ? "site-empresa-erro" : undefined} {...register("site")} />
          {errors.site && <p id="site-empresa-erro" role="alert" className="text-sm font-medium text-destructive">{errors.site.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="descricao-empresa">Descrição</Label>
          <Textarea id="descricao-empresa" rows={4} maxLength={4000} placeholder="Conte um pouco sobre a empresa" {...register("descricao")} />
        </div>
      </SecaoFormulario>

      <SecaoFormulario titulo="Segurança">
        <div className="space-y-2">
          <Label htmlFor="senha-empresa">Senha</Label>
          <Input id="senha-empresa" type="password" className="min-h-12" autoComplete="new-password" aria-describedby="senha-empresa-dica" aria-invalid={Boolean(errors.senha)} {...register("senha")} />
          <p id="senha-empresa-dica" className="text-sm text-muted-foreground">
            Use ao menos 8 caracteres, com maiúscula, minúscula, número e símbolo.
          </p>
          {errors.senha && <p role="alert" className="text-sm font-medium text-destructive">{errors.senha.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmar-senha-empresa">Confirmar senha</Label>
          <Input
            id="confirmar-senha-empresa"
            type="password"
            className="min-h-12"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmarSenha)}
            aria-describedby={errors.confirmarSenha ? "confirmar-senha-empresa-erro" : undefined}
            {...register("confirmarSenha")}
          />
          {errors.confirmarSenha && (
            <p id="confirmar-senha-empresa-erro" role="alert" className="text-sm font-medium text-destructive">
              {errors.confirmarSenha.message}
            </p>
          )}
        </div>
      </SecaoFormulario>

      <Button type="submit" className="min-h-12 w-full text-base" disabled={enviando}>
        {enviando ? (<><Loader2 className="animate-spin" aria-hidden="true" /> Criando conta…</>) : (<>Continuar para acessibilidade <ArrowRight aria-hidden="true" /></>)}
      </Button>
    </form>
  );
}
