import { useEffect } from "react";

import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import {
  descreverElemento,
  obterContextoDialogo,
  resolverAlvoFalavel,
  SELETOR_DIALOGO,
} from "@/lib/leitorSemantico";
import { useVoz } from "@/hooks/useVoz";

/**
 * Lê em voz alta o elemento que a pessoa está usando, por foco de teclado ou clique, quando o
 * leitor de voz está ativo. Acompanha a interação, como o VLibras, e nunca narra a página inteira.
 * Clique e foco passam pela mesma interpretação (`descreverElemento`, em `lib/leitorSemantico.ts`).
 *
 * Diálogos do Radix (`role="dialog"`) são um caso especial: ao abrir, o Radix move o foco para o
 * primeiro elemento navegável, que raramente é o mais importante. Na primeira vez que o foco entra
 * num diálogo recém-aberto, anuncia o contexto dele (`aria-labelledby` e `aria-describedby`,
 * ligados a `DialogTitle` e `DialogDescription`), e o `Tab` seguinte volta ao normal. A marca fica
 * no próprio nó (`dataset.vozAnunciado`); como o Radix recria o nó a cada abertura, ela não vaza
 * para a próxima.
 *
 * Também anuncia os toasts (sucesso ou erro de ações como publicar ou candidatar-se) quando
 * aparecem. O `aria-live` do `sonner` só é lido por leitores de tela nativos; sem isto, quem usa só
 * a voz do ACESSO não os ouviria. O texto falado é o do próprio toast.
 */
export function useLeituraAutomatica() {
  const { preferencias } = useAcessibilidade();
  const { falar, parar } = useVoz();

  useEffect(() => {
    if (!preferencias.screenReader) return;

    // Evita falar o mesmo elemento duas vezes seguidas por causa de um
    // clique que também dispara foco (comportamento padrão de botão no
    // Chromium): sem isso, um único clique falaria a mesma frase 2x.
    let ultimoElemento: HTMLElement | null = null;
    let ultimoInstante = 0;

    // Fala na hora (síncrono), só depois que o DOM já está assentado: dentro do
    // `requestAnimationFrame` de `anunciar` e `lerElementoDoEvento`, abaixo. Nunca é chamado direto
    // de um listener.
    const anunciarAgora = (elemento: HTMLElement) => {
      const agora = Date.now();
      if (elemento === ultimoElemento && agora - ultimoInstante < 400) return;
      const texto = descreverElemento(elemento);
      if (!texto) return;
      ultimoElemento = elemento;
      ultimoInstante = agora;
      falar(texto);
    };

    // Adia a leitura para o próximo frame. Sem isso, um foco disparado no mesmo evento que uma
    // atualização de estado do React (por exemplo, o react-hook-form focando um campo inválido logo
    // depois de a validação falhar) leria `aria-invalid`, `aria-expanded` e afins antes de o React
    // aplicar a mudança no DOM, o que só acontece depois que o handler síncrono termina, e o campo
    // seria anunciado sem "com erro".
    const anunciar = (elemento: HTMLElement | null) => {
      if (!elemento) return;
      requestAnimationFrame(() => anunciarAgora(elemento));
    };

    const lerElementoDoEvento = (target: EventTarget | null) => {
      const elemento = resolverAlvoFalavel(target);
      if (!elemento) return;

      requestAnimationFrame(() => {
        // Autofoco do Radix ao abrir um diálogo: anuncia o contexto do
        // diálogo uma única vez (por nó), não o elemento que recebeu o foco.
        const dialogo = elemento.closest<HTMLElement>(SELETOR_DIALOGO);
        if (dialogo && dialogo.dataset.vozAnunciado !== "1") {
          dialogo.dataset.vozAnunciado = "1";
          const contexto = obterContextoDialogo(dialogo);
          if (contexto) {
            ultimoElemento = dialogo;
            ultimoInstante = Date.now();
            falar(contexto);
            return;
          }
          // Diálogo sem `aria-labelledby`/`aria-describedby`: sem contexto
          // pra anunciar, cai para o comportamento normal abaixo (melhor
          // falar o elemento focado do que ficar em silêncio).
        }

        anunciarAgora(elemento);
      });
    };

    const onFocus = (e: FocusEvent) => lerElementoDoEvento(e.target);
    document.addEventListener("focusin", onFocus);

    // O clique usa a mesma interpretação do foco. `capture: true` porque alguns cliques (como numa
    // `<img>`, que não é focável) nunca disparam `focusin`, e, quando disparam, este handler roda
    // primeiro; a deduplicação acima evita repetir.
    const onClick = (e: MouseEvent) => anunciar(resolverAlvoFalavel(e.target));
    document.addEventListener("click", onClick, true);

    // Observa a região de toasts do sonner e fala cada novo toast, sem
    // interromper uma fala em andamento (duas ações rápidas em sequência
    // não devem cortar o anúncio uma da outra).
    const observadorToast = new MutationObserver((mutacoes) => {
      for (const mutacao of mutacoes) {
        mutacao.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          const texto = node.innerText?.trim();
          if (texto) falar(texto.slice(0, 400), { interrupt: false });
        });
      }
    });

    const iniciarObservacaoToast = () => {
      // Observa o `<section aria-live="polite">` do sonner, que fica sempre montado. O
      // `[data-sonner-toaster]` só existe enquanto há toast visível e é recriado a cada ciclo,
      // então um observer preso a ele deixaria de funcionar. Com `subtree: true`, qualquer toast
      // novo é capturado, mesmo quando a lista interna é recriada.
      const regiao = document.querySelector('section[aria-live="polite"]');
      if (regiao) {
        observadorToast.observe(regiao, { childList: true, subtree: true });
        return true;
      }
      return false;
    };

    // O <Toaster/> monta no primeiro render do app inteiro: tenta de
    // novo em vez de assumir que já existe no momento deste efeito.
    let idTentativa: number | undefined;
    if (!iniciarObservacaoToast()) {
      idTentativa = window.setInterval(() => {
        if (iniciarObservacaoToast() && idTentativa !== undefined) {
          window.clearInterval(idTentativa);
        }
      }, 300);
    }

    return () => {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("click", onClick, true);
      observadorToast.disconnect();
      if (idTentativa !== undefined) window.clearInterval(idTentativa);
      parar();
    };
  }, [preferencias.screenReader, falar, parar]);
}
