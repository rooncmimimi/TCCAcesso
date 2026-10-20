import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { autenticacaoService } from "@/services/autenticacao.service";
import { extrairMensagemErro } from "@/services/api";
import { useSessao } from "@/hooks/useSessao";
import { metaPagina, regraSenha, dic, useT, type Dicionario } from "@/i18n";

function criarEsquema(t: Dicionario) {
  const v = t.validacao;

  return z
    .object({
      senhaAtual: z.string().min(1, t.configuracoes.senha.erroSenhaAtual),
      novaSenha: regraSenha(v),
      confirmarSenha: z.string().min(1, v.confirmeNovaSenha),
    })
    .refine((valores) => valores.novaSenha === valores.confirmarSenha, {
      message: v.senhasNaoCoincidem,
      path: ["confirmarSenha"],
    });
}

type Formulario = z.infer<ReturnType<typeof criarEsquema>>;

export const Route = createFileRoute("/configuracoes/senha")({
  head: () => metaPagina(dic().configuracoes.senha.meta),
  component: () => (
    <GuardaAcesso tipos={["candidato", "empresa", "administrador"]}>
      <AlterarSenha />
    </GuardaAcesso>
  ),
});

function AlterarSenha() {
  const t = useT();
  const ts = t.configuracoes.senha;
  const esquema = useMemo(() => criarEsquema(t), [t]);
  const navigate = useNavigate();
  const { sair } = useSessao();
  const [enviando, setEnviando] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: { senhaAtual: "", novaSenha: "", confirmarSenha: "" },
  });

  const aoEnviar = handleSubmit(async (valores) => {
    setEnviando(true);
    try {
      await autenticacaoService.alterarSenha(valores.senhaAtual, valores.novaSenha);
      reset();
      // O backend encerra todas as sessões ao trocar a senha, inclusive esta, então a tela sai da
      // conta, como na redefinição por código.
      await sair();
      // O toast já é lido pelo `useLeituraAutomatica`; falar aqui também duplicaria a leitura.
      toast.success(ts.sucesso);
      void navigate({ to: "/entrar" });
    } catch (erro) {
      const mensagem = extrairMensagemErro(erro, ts.erro);
      setError("senhaAtual", { message: mensagem });
      toast.error(mensagem);
    } finally {
      setEnviando(false);
    }
  });

  return (
    <EstruturaApp>
      <Link
        to="/configuracoes/conta"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> {ts.voltar}
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{ts.titulo}</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            {ts.texto}
          </p>
        </div>
      </div>

      <Card className="mt-6 max-w-lg shadow-none">
        <CardContent className="p-5 sm:p-6">
          <form className="space-y-4" onSubmit={aoEnviar} noValidate>
            <div className="space-y-2">
              <Label htmlFor="senhaAtual">{ts.senhaAtual}</Label>
              <PasswordInput
                id="senhaAtual"
                autoComplete="current-password"
                className="min-h-12"
                aria-invalid={Boolean(errors.senhaAtual)}
                aria-describedby={errors.senhaAtual ? "senhaAtual-erro" : undefined}
                {...register("senhaAtual")}
              />
              {errors.senhaAtual && (
                <p id="senhaAtual-erro" role="alert" className="text-sm font-medium text-destructive">
                  {errors.senhaAtual.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="novaSenha">{ts.novaSenha}</Label>
              <PasswordInput
                id="novaSenha"
                autoComplete="new-password"
                className="min-h-12"
                aria-invalid={Boolean(errors.novaSenha)}
                aria-describedby={errors.novaSenha ? "novaSenha-erro" : "novaSenha-dica"}
                {...register("novaSenha")}
              />
              {errors.novaSenha ? (
                <p id="novaSenha-erro" role="alert" className="text-sm font-medium text-destructive">
                  {errors.novaSenha.message}
                </p>
              ) : (
                <p id="novaSenha-dica" className="text-xs text-muted-foreground">
                  {ts.dica}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmarSenha">{ts.confirmar}</Label>
              <PasswordInput
                id="confirmarSenha"
                autoComplete="new-password"
                className="min-h-12"
                aria-invalid={Boolean(errors.confirmarSenha)}
                aria-describedby={errors.confirmarSenha ? "confirmarSenha-erro" : undefined}
                {...register("confirmarSenha")}
              />
              {errors.confirmarSenha && (
                <p id="confirmarSenha-erro" role="alert" className="text-sm font-medium text-destructive">
                  {errors.confirmarSenha.message}
                </p>
              )}
            </div>

            <Button type="submit" className="min-h-12 w-full text-base" disabled={enviando}>
              {enviando ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" /> {ts.salvando}
                </>
              ) : (
                ts.salvar
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </EstruturaApp>
  );
}
