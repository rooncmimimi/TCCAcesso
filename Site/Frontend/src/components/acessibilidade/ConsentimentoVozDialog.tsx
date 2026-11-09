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
import type { ChaveBase } from "@/i18n/dicionarios";
import { Frase } from "@/i18n/Frase";
import { useIdioma } from "@/hooks/useIdioma";
import { toast } from "sonner";
import { useVoz } from "@/hooks/useVoz";
import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import { useSessao } from "@/hooks/useSessao";
import acessibilidadeService, { preferenciasParaApi } from "@/services/acessibilidade.service";
import { extrairMensagemErro } from "@/services/api";

const PERGUNTA: ChaveBase = "acessibilidade.consentimentoVozDialog.perguntaFalada";

/**
 * Primeiro acesso: pergunta (em voz alta e visualmente) se a leitura por voz
 * deve ficar ativa. A escolha é salva e nunca mais perguntada, exceto após
 * redefinir as preferências.
 */
export function ConsentimentoVozDialog() {
  const { t } = useIdioma();
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
      falar(t(PERGUNTA));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [inicializado, suportado, preferencias.voiceConsent, falar, t]);

  if (!open) return null;

  const decidir = (valor: "accepted" | "declined") => {
    parar();
    definirEscolha(valor);
    setOpen(false);
    if (valor === "accepted") {
      window.setTimeout(
        () => falar(t("acessibilidade.consentimentoVozDialog.leituraPorVozAtivadaUseATecla")),
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
            extrairMensagemErro(erro, t("acessibilidade.consentimentoVozDialog.naoFoiPossivelSalvarEssa")),
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
            {t("acessibilidade.consentimentoVozDialog.desejaAtivarALeituraPorVoz")}
          </AlertDialogTitle>
          {/* O aviso sobre leitor de tela é o ponto principal desta pergunta, não um detalhe: não há como o site
              saber se um já está em uso (nenhum navegador informa isso), e ativar os dois faz cada botão ser falado
              duas vezes. Quem mais sofreria com isso é justamente parte do público do ACESSO. */}
          <AlertDialogDescription className="text-center text-base">
            <Frase
              chave="acessibilidade.consentimentoVozDialog.oAcessoPodeLerEmVozAlta"
              partes={[(texto) => <strong className="font-semibold text-foreground">{texto}</strong>]}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogCancel
            className="min-h-12 text-base"
            onClick={() => decidir("declined")}
          >
            <VolumeX aria-hidden="true" /> {t("acessibilidade.consentimentoVozDialog.naoObrigado")}
          </AlertDialogCancel>
          <AlertDialogAction className="min-h-12 text-base" onClick={() => decidir("accepted")}>
            <Volume2 aria-hidden="true" /> {t("acessibilidade.consentimentoVozDialog.simAtivarLeitura")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
