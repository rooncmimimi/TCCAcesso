import { useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { IdiomaContext, criarT, type IdiomaContextValue } from "@/contexts/IdiomaContext";
import { SessaoContext } from "@/contexts/SessaoContext";
import { ehIdioma, idiomaDoNavegador, localeDe, type CodigoIdioma } from "@/i18n/idiomas";
import { guardarIdioma, lerIdiomaEscolhido } from "@/i18n/armazenamento";
import { acessibilidadeService } from "@/services/acessibilidade.service";

/**
 * O idioma do site.
 *
 * - **Quem manda:** a escolha da pessoa (guardada no aparelho); sem escolha, o idioma do navegador, se for um dos três; senão
 *   português.
 * - **Com sessão** e o recurso ligado no servidor (`IDIOMA_NA_CONTA_HABILITADO`), o idioma também mora na conta e acompanha a
 *   pessoa: no login, o da conta vale; se a conta ainda não tem um e a pessoa já escolheu neste aparelho (por exemplo, no
 *   cadastro), a escolha sobe para a conta. Sem o recurso, tudo continua funcionando só no aparelho.
 * - O atributo `lang` do documento acompanha, para leitor de tela e tradutor do navegador saberem em que idioma a página está.
 */
export function IdiomaProvider({ children }: { children: ReactNode }) {
  // Sem `SessaoProvider` (testes, páginas isoladas) o idioma só vive no aparelho.
  const usuarioId = useContext(SessaoContext)?.usuario?.id ?? null;
  const [idioma, setIdioma] = useState<CodigoIdioma>(() => lerIdiomaEscolhido() ?? idiomaDoNavegador());
  const [salvoNaConta, setSalvoNaConta] = useState(false);
  const escolhidoRef = useRef(lerIdiomaEscolhido() !== null);
  const idiomaRef = useRef(idioma);
  idiomaRef.current = idioma;

  useEffect(() => {
    document.documentElement.lang = localeDe(idioma);
  }, [idioma]);

  // Ao entrar numa conta: o idioma dela vale; sem idioma nela, a escolha deste aparelho sobe.
  useEffect(() => {
    if (!usuarioId) {
      setSalvoNaConta(false);
      return undefined;
    }

    let ativo = true;

    void (async () => {
      try {
        const preferencias = await acessibilidadeService.obter();

        if (!ativo) return;

        // O servidor não conhece o campo (recurso desligado): fica só no aparelho.
        if (!("idioma" in preferencias)) {
          setSalvoNaConta(false);
          return;
        }

        if (ehIdioma(preferencias.idioma)) {
          guardarIdioma(preferencias.idioma);
          escolhidoRef.current = true;
          setIdioma(preferencias.idioma);
          setSalvoNaConta(true);
          return;
        }

        if (escolhidoRef.current) {
          const salvas = await acessibilidadeService.salvar({ idioma: idiomaRef.current });

          if (ativo) setSalvoNaConta(salvas.idioma === idiomaRef.current);
        } else {
          setSalvoNaConta(true);
        }
      } catch {
        // Sem rede ou sem permissão agora: o idioma do aparelho segue valendo.
      }
    })();

    return () => {
      ativo = false;
    };
  }, [usuarioId]);

  const trocar = useCallback(
    (novo: CodigoIdioma) => {
      if (!ehIdioma(novo)) return;

      setIdioma(novo);
      guardarIdioma(novo);
      escolhidoRef.current = true;

      if (!usuarioId) return;

      acessibilidadeService
        .salvar({ idioma: novo })
        .then((salvas) => setSalvoNaConta(salvas.idioma === novo))
        .catch(() => setSalvoNaConta(false));
    },
    [usuarioId],
  );

  const valor = useMemo<IdiomaContextValue>(
    () => ({ idioma, locale: localeDe(idioma), trocar, t: criarT(idioma), salvoNaConta }),
    [idioma, trocar, salvoNaConta],
  );

  return <IdiomaContext.Provider value={valor}>{children}</IdiomaContext.Provider>;
}
