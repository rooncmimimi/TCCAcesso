import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useVoz } from "@/hooks/useVoz";
import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import { useSessao } from "@/hooks/useSessao";
import acessibilidadeService, { preferenciasParaApi } from "@/services/acessibilidade.service";
import { extrairMensagemErro } from "@/services/api";
import { dic, useIdioma, useT } from "@/i18n";

/**
 * Primeiro acesso: pergunta (em voz alta e visualmente) se a leitura por voz
 * deve ficar ativa. A escolha é salva e nunca mais perguntada, exceto após
 * redefinir as preferências.
 */
export function ConsentimentoVozDialog() {
  const { inicializado, preferencias } = useAcessibilidade();
  const { suportado, falar, parar, definirEscolha } = useVoz();
  const { autenticado } = useSessao();
  const t = useT().acessibilidade.consentimento;
  const { idioma } = useIdioma();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // A decisão vem de `preferencias.voiceConsent` (salvo na conta), e não de `escolha` (cópia
    // local de visitante); senão, entrar numa conta que já respondeu, num navegador com
    // localStorage vazio, perguntaria de novo.
    if (!inicializado || !suportado || preferencias.voiceConsent !== null) return;
    const timer = window.setTimeout(() => {
      setOpen(true);
      // `dic()` na hora de falar: a pergunta sai no idioma de quando o diálogo abre.
      falar(dic().acessibilidade.consentimento.pergunta);
    }, 700);
    return () => window.clearTimeout(timer);
    // `idioma` nas dependências: trocar de idioma com a pergunta aberta repete a pergunta no idioma
    // novo (a fala em andamento é interrompida pelo `VozProvider`).
  }, [inicializado, suportado, preferencias.voiceConsent, falar, idioma]);

  if (!open) return null;

  const decidir = (valor: "accepted" | "declined") => {
    parar();
    definirEscolha(valor);
    setOpen(false);
    if (valor === "accepted") {
      window.setTimeout(
        () => falar(dic().acessibilidade.consentimento.ativada),
        250,
      );
    }
    // `definirEscolha` só grava no localStorage. Com sessão, a resposta também vai para a conta
    // (`consentimentoVoz`), para a pessoa não ser perguntada de novo em outro dispositivo ou
    // navegador; o payload é o mesmo gravado localmente.
    if (autenticado) {
      const aceito = valor === "accepted";
      acessibilidadeService
        .salvar(preferenciasParaApi({ ...preferencias, screenReader: aceito, voiceConsent: aceito }))
        .catch((erro) => {
          toast.error(extrairMensagemErro(erro, dic().acessibilidade.consentimento.erroSalvar));
        });
    }
  };

  return (
    <AlertDialog open onOpenChange={() => undefined}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <span
            aria-hidden="true"
            className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary"
          >
            <Volume2 className="size-7" />
          </span>
          <AlertDialogTitle className="text-center text-2xl">
            {t.titulo}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-base">
            {t.descricao}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogCancel
            className="min-h-12 text-base"
            onClick={() => decidir("declined")}
          >
            <VolumeX aria-hidden="true" /> {t.nao}
          </AlertDialogCancel>
          <AlertDialogAction className="min-h-12 text-base" onClick={() => decidir("accepted")}>
            <Volume2 aria-hidden="true" /> {t.sim}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
