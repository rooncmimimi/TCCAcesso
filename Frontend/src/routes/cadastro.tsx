import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowRight, Building2, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/contexts/SessionContext";
import { extrairMensagemErro } from "@/services/api";
import { cn } from "@/lib/utils";

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
  email: z.string().trim().email("Informe um e-mail válido.").max(150),
  telefone: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || (v.length >= 10 && v.length <= 20), "Informe um telefone válido."),
  senha: regraSenha,
};

const esquemaCandidato = z.object({
  ...camposComuns,
  cpf: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^\d{11}$/.test(v), "O CPF deve conter 11 dígitos numéricos."),
});

const esquemaEmpresa = z.object({
  ...camposComuns,
  cnpj: z.string().trim().regex(/^\d{14}$/, "O CNPJ deve conter 14 dígitos numéricos."),
  razaoSocial: z.string().trim().min(3, "Informe a razão social (3 a 200 caracteres).").max(200),
  nomeFantasia: z.string().trim().max(200).optional(),
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

  return (
    <div className="grid min-h-dvh place-items-center bg-secondary px-4 py-10">
      <div className="w-full max-w-lg">
        <Link to="/" aria-label="Voltar para a página inicial" className="mb-6 inline-flex">
          <Logo />
        </Link>
        <Card className="shadow-card">
          <CardContent className="p-6">
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

            {tipo === "candidato" ? <FormularioCandidatoCadastro /> : <FormularioEmpresaCadastro />}

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

function FormularioCandidatoCadastro() {
  const { registrarCandidato } = useSession();
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormularioCandidato>({
    resolver: zodResolver(esquemaCandidato),
    defaultValues: { nome: "", email: "", telefone: "", senha: "", cpf: "" },
  });

  const aoEnviar = handleSubmit(async (valores) => {
    setEnviando(true);
    try {
      const payload: Record<string, unknown> = { ...valores };
      if (!payload.telefone) delete payload.telefone;
      if (!payload.cpf) delete payload.cpf;
      await registrarCandidato(payload);
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
        <Input id="cpf" inputMode="numeric" placeholder="Somente números" className="min-h-12" aria-invalid={Boolean(errors.cpf)} aria-describedby={errors.cpf ? "cpf-erro" : undefined} {...register("cpf")} />
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
      <Button type="submit" className="min-h-12 w-full text-base" disabled={enviando}>
        {enviando ? (<><Loader2 className="animate-spin" aria-hidden="true" /> Criando conta…</>) : (<>Continuar para acessibilidade <ArrowRight aria-hidden="true" /></>)}
      </Button>
    </form>
  );
}

function FormularioEmpresaCadastro() {
  const { registrarEmpresa } = useSession();
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormularioEmpresa>({
    resolver: zodResolver(esquemaEmpresa),
    defaultValues: { nome: "", email: "", telefone: "", senha: "", cnpj: "", razaoSocial: "", nomeFantasia: "" },
  });

  const aoEnviar = handleSubmit(async (valores) => {
    setEnviando(true);
    try {
      const payload: Record<string, unknown> = { ...valores };
      if (!payload.telefone) delete payload.telefone;
      if (!payload.nomeFantasia) delete payload.nomeFantasia;
      await registrarEmpresa(payload);
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
        <Input id="cnpj" inputMode="numeric" placeholder="Somente números" className="min-h-12" aria-invalid={Boolean(errors.cnpj)} aria-describedby={errors.cnpj ? "cnpj-erro" : undefined} {...register("cnpj")} />
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
      <div className="space-y-2">
        <Label htmlFor="senha-empresa">Senha</Label>
        <Input id="senha-empresa" type="password" className="min-h-12" autoComplete="new-password" aria-describedby="senha-empresa-dica" aria-invalid={Boolean(errors.senha)} {...register("senha")} />
        <p id="senha-empresa-dica" className="text-sm text-muted-foreground">
          Use ao menos 8 caracteres, com maiúscula, minúscula, número e símbolo.
        </p>
        {errors.senha && <p role="alert" className="text-sm font-medium text-destructive">{errors.senha.message}</p>}
      </div>
      <Button type="submit" className="min-h-12 w-full text-base" disabled={enviando}>
        {enviando ? (<><Loader2 className="animate-spin" aria-hidden="true" /> Criando conta…</>) : (<>Continuar para acessibilidade <ArrowRight aria-hidden="true" /></>)}
      </Button>
    </form>
  );
}
