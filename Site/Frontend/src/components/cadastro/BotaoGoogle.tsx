import { useEffect, useState } from "react";
import { useIdioma } from "@/hooks/useIdioma";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import googleService from "@/services/google.service";
import { extrairMensagemErro } from "@/services/api";
import { ErroGoogleNavegador } from "@/lib/googleNavegador";

/** Logotipo oficial do Google, nas cores da marca. Decorativo: o texto do botão é quem nomeia. */
export function IconeGoogle({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
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
 * Quanto esperar, em ms, antes de cada nova tentativa de perguntar se o Google está disponível.
 *
 * O servidor da hospedagem "dorme" quando fica parado e leva meio minuto para acordar (medido: 32 s,
 * com o tempo limite do cliente em 20 s). Sem nova tentativa, a pergunta falhava uma vez e o botão
 * sumia até a pessoa recarregar a página, sem aviso. Só **falha** de rede ou de servidor tenta de
 * novo; a resposta "não está configurado" é definitiva.
 */
const ESPERAS_ENTRE_TENTATIVAS = [2000, 4000, 8000, 16000];

/**
 * "Continuar com Google".
 *
 * Só aparece quando o backend confirma que o recurso está configurado: um botão que leva a erro é
 * pior do que botão nenhum. Se o servidor estiver acordando, pergunta de novo algumas vezes antes
 * de desistir (ver `ESPERAS_ENTRE_TENTATIVAS`). A senha do Google nunca é digitada no ACESSO — o botão leva à página
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
  const { t } = useIdioma();
  const [disponivel, setDisponivel] = useState(false);
  const [indo, setIndo] = useState(false);

  useEffect(() => {
    let cancelado = false;
    let temporizador: ReturnType<typeof setTimeout> | undefined;

    function perguntar(tentativa: number) {
      googleService
        .disponivel()
        .then((ok) => {
          if (!cancelado) setDisponivel(ok);
        })
        .catch(() => {
          if (cancelado) return;

          if (tentativa < ESPERAS_ENTRE_TENTATIVAS.length) {
            temporizador = setTimeout(() => perguntar(tentativa + 1), ESPERAS_ENTRE_TENTATIVAS[tentativa]);
          } else {
            setDisponivel(false);
          }
        });
    }

    perguntar(0);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
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
      // O navegador que não guarda o segredo da aba já traz a mensagem pronta e o que fazer.
      toast.error(
        erro instanceof ErroGoogleNavegador
          ? erro.message
          : extrairMensagemErro(erro, t("auth.googleErro"))
      );
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
        {rotulo ?? t("auth.continuarGoogle")}
      </Button>

      {/*
        Quem ainda não tem conta ganha uma na hora, sem tela de aceite (ver `retorno-google`). O aceite
        dos documentos passa a ser este aviso, na frente do botão, antes de sair para o Google.
        Links comuns, em nova aba: o botão aparece em formulários e não deve perder o que foi digitado.
      */}
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        {t("auth.googleAvisoAntes")}{" "}
        <a href="/termos" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-2">
          {t("auth.googleAvisoTermos")}
        </a>{" "}
        {t("auth.googleAvisoEntre")}{" "}
        <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-2">
          {t("auth.googleAvisoPrivacidade")}
        </a>
        {t("auth.googleAvisoDepois")}
      </p>

      {/* Separador decorativo: o texto "ou" fica fora do fluxo de leitura dos leitores de tela. */}
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("auth.ou")}</span>
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
  const { t } = useIdioma();
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-border bg-secondary px-4 py-3">
      <span className="mt-0.5 shrink-0">
        <IconeGoogle />
      </span>
      <p className="text-sm">
        <span className="font-semibold">{t("cadastro.botaoGoogle.contaGoogleConfirmada")}</span>{" "}
        {email ? (
          <>
            Ela será vinculada a este cadastro: <strong className="font-semibold">{email}</strong>.
          </>
        ) : (
          <>{t("cadastro.botaoGoogle.elaSeraVinculadaAEsteCadastro")}</>
        )}{" "}
        <span className="text-muted-foreground">
          {t("cadastro.botaoGoogle.definaTambemUmaSenhaComElaVoce")}
        </span>
      </p>
    </div>
  );
}
