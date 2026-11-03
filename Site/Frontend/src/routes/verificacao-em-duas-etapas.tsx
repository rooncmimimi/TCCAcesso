import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Accessibility, ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/Logo";
import { CampoCodigo } from "@/components/seguranca/CampoCodigo";
import { AutenticacaoLayout } from "@/layouts/AutenticacaoLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSessao } from "@/hooks/useSessao";
import { destinoAposEntrar } from "@/lib/destinoAposEntrar";
import { limparDesafio, lerDesafio } from "@/lib/desafioMfa";
import totpService, { desafioVenceu, mensagemDeErroTotp } from "@/services/totp.service";

/** Quando restam só estes códigos de recuperação (ou menos), o aviso aparece depois de entrar. */
const POUCOS_CODIGOS = 3;

/**
 * Passo 2 do login de quem tem a verificação em duas etapas: depois da senha (ou do Google), o código do
 * aplicativo autenticador ou, se o celular não está à mão, um código de recuperação.
 *
 * O desafio que o servidor entregou depois da senha fica no `sessionStorage` (`lib/desafioMfa.ts`) e vale 5
 * minutos. Sem ele, ou vencido, a pessoa volta ao login. Um código errado não derruba o desafio: dá para
 * tentar de novo, e o servidor impõe espera depois de erros seguidos.
 */
export const Route = createFileRoute("/verificacao-em-duas-etapas")({
  head: () => ({
    meta: [
      { title: "Verificação em duas etapas — ACESSO" },
      { name: "description", content: "Confirme o seu acesso com o código do aplicativo autenticador." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerificacaoEmDuasEtapas,
});

function VerificacaoEmDuasEtapas() {
  const { iniciarSessao } = useSessao();
  const navigate = useNavigate();
  const [desafio] = useState(() => lerDesafio());
  const [usandoRecuperacao, setUsandoRecuperacao] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);
  const [contaPausada, setContaPausada] = useState(false);
  const enviandoRef = useRef(false);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const campoRef = useRef<HTMLInputElement>(null);
  // Depois de um erro o foco volta ao campo, mas só quando ele já foi reabilitado (enquanto envia, fica desabilitado).
  const [pedirFoco, setPedirFoco] = useState(0);

  useEffect(() => {
    if (pedirFoco > 0) campoRef.current?.focus();
  }, [pedirFoco]);

  useEffect(() => {
    if (!desafio) {
      void navigate({ to: "/entrar", replace: true });
      return;
    }
    tituloRef.current?.focus();
  }, [desafio, navigate]);

  if (!desafio) {
    return null;
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (enviandoRef.current || !desafio) return;

    if (!codigo.trim()) {
      setErro(usandoRecuperacao ? "Informe um código de recuperação." : "Digite os 6 números que o aplicativo mostra.");
      campoRef.current?.focus();
      return;
    }

    enviandoRef.current = true;
    setEnviando(true);
    setErro(undefined);

    try {
      const resposta = await totpService.concluirLogin(desafio.desafio, codigo.trim());
      limparDesafio();

      const resultado = await iniciarSessao(resposta);

      // A conta estava pausada: o código já foi gasto e o desafio acabou; a reativação é no login.
      if ("contaPausada" in resultado) {
        setContaPausada(true);
        return;
      }

      if ("emailNaoVerificado" in resultado || "mfaNecessario" in resultado || "verificacaoDispositivo" in resultado) {
        void navigate({ to: "/entrar", replace: true });
        return;
      }

      toast.success("Login realizado com sucesso!");

      if ("codigosRecuperacaoRestantes" in resposta && typeof resposta.codigosRecuperacaoRestantes === "number") {
        const restantes = resposta.codigosRecuperacaoRestantes;
        toast.warning(
          restantes <= POUCOS_CODIGOS
            ? `Restam só ${restantes} códigos de recuperação. Gere novos em Configurações, Sessões e contas conectadas.`
            : `Você entrou com um código de recuperação. Restam ${restantes}.`,
        );
      }

      // `replace`: o botão "voltar" não pode reabrir esta tela de passagem.
      void navigate({ ...destinoAposEntrar(resultado), replace: true });
    } catch (falha) {
      if (desafioVenceu(falha)) {
        limparDesafio();
        toast.error(mensagemDeErroTotp(falha, "A verificação expirou. Entre novamente."));
        void navigate({ to: "/entrar", replace: true });
        return;
      }

      setErro(mensagemDeErroTotp(falha, "Não foi possível verificar agora. Tente novamente."));
      setCodigo("");
      setPedirFoco((n) => n + 1);
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  function alternarModo() {
    setUsandoRecuperacao((atual) => !atual);
    setCodigo("");
    setErro(undefined);
    // O campo troca de tipo; o foco volta a ele depois da renderização.
    setTimeout(() => campoRef.current?.focus(), 0);
  }

  return (
    <AutenticacaoLayout className="max-w-lg">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-3">
        <Link to="/" aria-label="Voltar para a página inicial" className="inline-flex">
          <Logo />
        </Link>
        <Button asChild variant="ghost" className="min-h-11 gap-1.5" aria-label="Configurações de acessibilidade">
          <Link to="/configuracoes/acessibilidade">
            <Accessibility aria-hidden="true" />
            <span className="hidden sm:inline">Acessibilidade</span>
          </Link>
        </Button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-6 sm:p-8">
          {contaPausada ? (
            <div className="space-y-4" role="status">
              <h1 ref={tituloRef} tabIndex={-1} className="text-2xl font-extrabold outline-none">
                Sua conta está pausada
              </h1>
              <p className="text-sm text-muted-foreground">
                O código estava certo, mas para reativar a conta é preciso entrar de novo e confirmar a reativação.
              </p>
              <Button asChild className="min-h-12 w-full text-base">
                <Link to="/entrar">Voltar para o login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={enviar} className="space-y-5" noValidate aria-labelledby="titulo-verificacao">
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <ShieldCheck className="size-5" />
                </span>
                <div>
                  <h1 id="titulo-verificacao" ref={tituloRef} tabIndex={-1} className="text-2xl font-extrabold outline-none">
                    Verificação em duas etapas
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {usandoRecuperacao
                      ? "Digite um dos seus códigos de recuperação. Cada código vale uma única vez."
                      : "Abra o aplicativo autenticador no celular e digite o código de 6 números do ACESSO."}
                  </p>
                </div>
              </div>

              <CampoCodigo
                id="codigo-verificacao"
                rotulo={usandoRecuperacao ? "Código de recuperação" : "Código do aplicativo"}
                valor={codigo}
                aoMudar={(valor) => {
                  setCodigo(valor);
                  setErro(undefined);
                }}
                erro={erro}
                ajuda={usandoRecuperacao ? "Parece com ABCDE-FGHJK. Maiúsculas e hífen não fazem diferença." : "O código muda a cada 30 segundos."}
                tipo={usandoRecuperacao ? "recuperacao" : "app"}
                desabilitado={enviando}
                refInput={campoRef}
              />

              <Button type="submit" className="min-h-12 w-full text-base" disabled={enviando}>
                {enviando ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" /> Verificando…
                  </>
                ) : (
                  "Verificar e entrar"
                )}
              </Button>

              <div className="flex flex-col gap-1">
                <Button type="button" variant="link" className="min-h-11 justify-start px-0" onClick={alternarModo} disabled={enviando}>
                  {usandoRecuperacao ? "Usar o código do aplicativo" : "Não tenho o celular: usar um código de recuperação"}
                </Button>
                <Button asChild variant="ghost" className="min-h-11 justify-start px-0">
                  <Link to="/entrar" onClick={limparDesafio}>
                    <ArrowLeft aria-hidden="true" /> Voltar para o login
                  </Link>
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </AutenticacaoLayout>
  );
}
