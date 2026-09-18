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

const PERGUNTA =
  "Olá! Bem-vindo ao ACESSO. Deseja utilizar o sistema de leitura por voz como padrão durante toda a sua navegação? Escolha sim ou não.";

/**
 * Primeiro acesso: pergunta (em voz alta e visualmente) se a leitura por voz
 * deve ficar ativa. A escolha é salva e nunca mais perguntada, exceto após
 * redefinir as preferências.
 */
export function ConsentimentoVozDialog() {
  const { inicializado, preferencias } = useAcessibilidade();
  const { suportado, falar, parar, definirEscolha } = useVoz();
  const { autenticado } = useSessao();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // A decisão vem de `preferencias.voiceConsent` (salvo na conta), e não de `escolha` (cópia
    // local de visitante); senão, entrar numa conta que já respondeu, num navegador com
    // localStorage vazio, perguntaria de novo.
    if (!inicializado || !suportado || preferencias.voiceConsent !== null) return;
    const timer = window.setTimeout(() => {
      setOpen(true);
      falar(PERGUNTA);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [inicializado, suportado, preferencias.voiceConsent, falar]);

  if (!open) return null;

  const decidir = (valor: "accepted" | "declined") => {
    parar();
    definirEscolha(valor);
    setOpen(false);
    if (valor === "accepted") {
      window.setTimeout(
        () => falar("Leitura por voz ativada. Use a tecla Tab para navegar pelo site."),
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
          toast.error(
            extrairMensagemErro(erro, "Não foi possível salvar essa escolha na sua conta. Ficou salva neste dispositivo."),
          );
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
            Deseja ativar a leitura por voz?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-base">
            O ACESSO pode ler em voz alta os conteúdos enquanto você navega. Você pode alterar essa
            escolha depois em Configurações de acessibilidade.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogCancel
            className="min-h-12 text-base"
            onClick={() => decidir("declined")}
          >
            <VolumeX aria-hidden="true" /> Não, obrigado
          </AlertDialogCancel>
          <AlertDialogAction className="min-h-12 text-base" onClick={() => decidir("accepted")}>
            <Volume2 aria-hidden="true" /> Sim, ativar leitura
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
