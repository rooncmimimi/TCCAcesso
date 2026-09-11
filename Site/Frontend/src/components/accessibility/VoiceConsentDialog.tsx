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
import { useSpeech } from "@/contexts/SpeechContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useSession } from "@/contexts/SessionContext";
import acessibilidadeService, { prefsParaApi } from "@/services/acessibilidade.service";
import { extrairMensagemErro } from "@/services/api";

const PERGUNTA =
  "Olá! Bem-vindo ao ACESSO. Deseja utilizar o sistema de leitura por voz como padrão durante toda a sua navegação? Escolha sim ou não.";

/**
 * Primeiro acesso: pergunta (em voz alta e visualmente) se a leitura por voz
 * deve ficar ativa. A escolha é salva e nunca mais perguntada, exceto após
 * redefinir as preferências.
 */
export function VoiceConsentDialog() {
  const { hydrated, prefs } = useAccessibility();
  const { supported, speak, stop, setChoice } = useSpeech();
  const { autenticado } = useSession();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Fonte da verdade é `prefs.voiceConsent` (durável, sincronizado com a
    // conta), não `SpeechContext.choice` (cache local só de visitante) —
    // caso contrário, um login numa conta que já respondeu, num dispositivo
    // com localStorage vazio, perguntaria de novo.
    if (!hydrated || !supported || prefs.voiceConsent !== null) return;
    const timer = window.setTimeout(() => {
      setOpen(true);
      speak(PERGUNTA);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [hydrated, supported, prefs.voiceConsent, speak]);

  if (!open) return null;

  const decidir = (valor: "accepted" | "declined") => {
    stop();
    setChoice(valor);
    setOpen(false);
    if (valor === "accepted") {
      window.setTimeout(
        () => speak("Leitura por voz ativada. Use a tecla Tab para navegar pelo site."),
        250,
      );
    }
    // `setChoice` (SpeechContext) só grava em localStorage — sem isto, a
    // resposta nunca chegava à conta (`consentimentoVoz` ficava `null` no
    // backend para sempre), e a pessoa era perguntada de novo em qualquer
    // outro dispositivo/navegador, exatamente o que este fluxo deveria
    // evitar. Mesmo payload que `setChoice` já grava localmente.
    if (autenticado) {
      const aceito = valor === "accepted";
      acessibilidadeService
        .salvar(prefsParaApi({ ...prefs, screenReader: aceito, voiceConsent: aceito }))
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
