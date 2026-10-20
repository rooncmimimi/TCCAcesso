import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import googleService from "@/services/google.service";
import { extrairMensagemErro } from "@/services/api";
import { useT } from "@/i18n";

/** Logotipo oficial do Google, nas cores da marca. Decorativo: o texto do botão é quem nomeia. */
function IconeGoogle() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true" focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/**
 * "Continuar com Google".
 *
 * Só aparece quando o backend confirma que o recurso está configurado: um botão que leva a erro é
 * pior do que botão nenhum. A senha do Google nunca é digitada no ACESSO — o botão leva à página
 * oficial de autorização, e o retorno é tratado em `/retorno-google`.
 *
 * `tipoConta` não escolhe o tipo da conta: toda conta começa como candidato. Ele só carrega a
 * intenção de seguir para o cadastro da empresa depois, e viaja dentro do `state` assinado pelo
 * backend em vez de solto na URL — assim ninguém troca um parâmetro no caminho para virar empresa.
 */
export function BotaoGoogle({
  tipoConta,
  rotulo,
}: {
  tipoConta?: "candidato" | "empresa";
  rotulo?: string;
}) {
  const t = useT().auth.google;
  const [disponivel, setDisponivel] = useState(false);
  const [indo, setIndo] = useState(false);

  useEffect(() => {
    let cancelado = false;
    googleService
      .disponivel()
      .then((ok) => {
        if (!cancelado) setDisponivel(ok);
      })
      .catch(() => {
        if (!cancelado) setDisponivel(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  if (!disponivel) return null;

  async function ir() {
    if (indo) return;
    setIndo(true);
    try {
      const url = await googleService.urlDeAutorizacao(tipoConta);
      window.location.href = url;
    } catch (erro) {
      toast.error(extrairMensagemErro(erro, t.erroAbrir));
      setIndo(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        className="min-h-12 w-full gap-3 text-base"
        disabled={indo}
        onClick={ir}
      >
        {indo ? <Loader2 className="animate-spin" aria-hidden="true" /> : <IconeGoogle />}
        {rotulo ?? t.continuar}
      </Button>

      {/* Separador decorativo: o texto "ou" fica fora do fluxo de leitura dos leitores de tela. */}
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.ou}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}

/**
 * Substitui o botão depois que a pessoa já voltou do Google.
 *
 * Mostrar "Continuar com Google" outra vez convidaria a sair do ACESSO no meio do cadastro e voltar
 * com o formulário vazio. Aqui o papel é outro: dizer qual conta foi verificada, que é a que será
 * vinculada quando o cadastro terminar.
 *
 * A confirmação é dita por texto, não por cor nem só pelo ícone — o ícone é decorativo.
 */
export function ContaGoogleConfirmada({ email }: { email?: string | null }) {
  const t = useT().auth.google;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-border bg-secondary px-4 py-3">
      <span className="mt-0.5 shrink-0">
        <IconeGoogle />
      </span>
      <p className="text-sm">
        <span className="font-semibold">{t.confirmada}</span>{" "}
        {email ? (
          <>
            {t.vinculadaA} <strong className="font-semibold">{email}</strong>.
          </>
        ) : (
          <>{t.vinculadaSemEmail}</>
        )}{" "}
        <span className="text-muted-foreground">
          {t.definaSenha}
        </span>
      </p>
    </div>
  );
}
