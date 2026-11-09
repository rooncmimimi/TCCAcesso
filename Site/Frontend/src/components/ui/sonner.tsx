import { Toaster as Sonner } from "sonner";

import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import { DURACAO_MAXIMA_DO_AVISO } from "@/lib/avisos";
import { useIdioma } from "@/hooks/useIdioma";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Avisos do Site. Com "Manter avisos na tela até eu fechar" (`persistentToasts`), eles ganham botão
 * de fechar e ficam até `DURACAO_MAXIMA_DO_AVISO`. Fora dessa opção, seguem o tempo padrão do
 * `sonner`.
 *
 * O leitor de tela nativo continua sendo avisado pela região `aria-live` do próprio `sonner`, uma
 * vez por aviso: manter o aviso na tela não o repete. O botão de fechar tem nome acessível.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { t } = useIdioma();
  const { preferencias } = useAcessibilidade();
  const persistir = preferencias.persistentToasts;

  return (
    <Sonner
      className="toaster group"
      closeButton={persistir}
      // Fica espaço para mais de um aviso importante sem empilhar por cima de outro.
      visibleToasts={persistir ? 5 : 3}
      toastOptions={{
        // `undefined` mantém a duração padrão do `sonner`; um aviso com `duration` própria (como o
        // de conta bloqueada) trata a preferência por conta própria (`duracaoDoAviso`).
        duration: persistir ? DURACAO_MAXIMA_DO_AVISO : undefined,
        closeButtonAriaLabel: t("ui.sonner.fecharAviso"),
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
