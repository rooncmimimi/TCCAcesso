import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Mail, XCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import authService from "@/services/auth.service";
import { extrairMensagemErro } from "@/services/api";

export const Route = createFileRoute("/confirmar-email")({
  validateSearch: z.object({
    email: z.string().optional(),
    codigo: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: "Confirmar e-mail — ACESSO" },
      { name: "description", content: "Confirme seu endereço de e-mail para ativar sua conta no ACESSO." },
    ],
  }),
  component: ConfirmarEmail,
});

type Estado = "confirmando" | "sucesso" | "erro" | "faltam-dados";

function ConfirmarEmail() {
  const { email, codigo } = Route.useSearch();
  const [estado, setEstado] = useState<Estado>(email && codigo ? "confirmando" : "faltam-dados");
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const tentouRef = useRef(false);

  useEffect(() => {
    if (!email || !codigo || tentouRef.current) return;
    tentouRef.current = true;

    authService
      .confirmarCadastro(email, codigo)
      .then(() => setEstado("sucesso"))
      .catch((erro) => {
        setMensagemErro(extrairMensagemErro(erro, "Não foi possível confirmar seu e-mail."));
        setEstado("erro");
      });
  }, [email, codigo]);

  useEffect(() => {
    tituloRef.current?.focus();
  }, [estado]);

  async function reenviar() {
    if (!email) return;
    setReenviando(true);
    try {
      await authService.reenviarConfirmacaoCadastro(email);
      setReenviado(true);
      toast.success("Um novo e-mail de confirmação foi enviado.");
    } catch (erro) {
      toast.error(extrairMensagemErro(erro, "Não foi possível reenviar o e-mail agora."));
    } finally {
      setReenviando(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-secondary px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" aria-label="Voltar para a página inicial" className="mb-6 inline-flex">
          <Logo />
        </Link>
        <Card className="shadow-card">
          <CardContent className="p-6 text-center">
            {estado === "confirmando" && (
              <>
                <div className="grid place-items-center">
                  <Loader2 className="size-10 animate-spin text-primary" aria-hidden="true" />
                </div>
                <h1
                  ref={tituloRef}
                  tabIndex={-1}
                  role="status"
                  aria-live="polite"
                  className="mt-4 text-xl font-extrabold outline-none"
                >
                  Confirmando seu e-mail…
                </h1>
              </>
            )}

            {estado === "sucesso" && (
              <>
                <div className="grid place-items-center">
                  <CheckCircle2 className="size-10 text-primary" aria-hidden="true" />
                </div>
                <h1 ref={tituloRef} tabIndex={-1} className="mt-4 text-xl font-extrabold outline-none">
                  E-mail confirmado!
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Sua conta está pronta. Você já pode entrar no ACESSO.
                </p>
                <Button asChild className="mt-6 min-h-12 w-full text-base">
                  <Link to="/entrar">Entrar no ACESSO</Link>
                </Button>
              </>
            )}

            {estado === "erro" && (
              <>
                <div className="grid place-items-center">
                  <XCircle className="size-10 text-destructive" aria-hidden="true" />
                </div>
                <h1 ref={tituloRef} tabIndex={-1} role="alert" className="mt-4 text-xl font-extrabold outline-none">
                  Não foi possível confirmar
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">{mensagemErro}</p>
                {email && (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-6 min-h-11 w-full"
                    disabled={reenviando || reenviado}
                    onClick={reenviar}
                  >
                    {reenviando ? (
                      <>
                        <Loader2 className="animate-spin" aria-hidden="true" /> Reenviando…
                      </>
                    ) : reenviado ? (
                      "E-mail reenviado"
                    ) : (
                      "Reenviar e-mail de confirmação"
                    )}
                  </Button>
                )}
              </>
            )}

            {estado === "faltam-dados" && (
              <>
                <div className="grid place-items-center">
                  <Mail className="size-10 text-primary" aria-hidden="true" />
                </div>
                <h1 ref={tituloRef} tabIndex={-1} className="mt-4 text-xl font-extrabold outline-none">
                  Link de confirmação inválido
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Use o link enviado por e-mail, ou entre com sua conta para receber um novo.
                </p>
                <Button asChild className="mt-6 min-h-12 w-full text-base">
                  <Link to="/entrar">Ir para o login</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
