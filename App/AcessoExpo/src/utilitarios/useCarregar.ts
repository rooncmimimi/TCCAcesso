import { useCallback, useEffect, useRef, useState } from 'react';

import { mensagemDe } from '../servicos/erros';

interface Estado<T> {
  dados: T | null;
  carregando: boolean;
  atualizando: boolean;
  erro: string | null;
}

/**
 * Carrega dados de uma chamada à API ao abrir a tela, com recarga (botão ou puxar para atualizar).
 * Uma resposta que chega depois de outra mais nova é descartada.
 */
export function useCarregar<T>(carregar: () => Promise<T>, dependencias: readonly unknown[] = []) {
  const [estado, setEstado] = useState<Estado<T>>({ dados: null, carregando: true, atualizando: false, erro: null });
  const versao = useRef(0);
  const funcao = useRef(carregar);
  useEffect(() => {
    funcao.current = carregar;
  });

  const executar = useCallback(async (atualizacao: boolean) => {
    const minha = ++versao.current;
    setEstado((atual) => ({
      ...atual,
      carregando: !atualizacao || atual.dados === null,
      atualizando: atualizacao && atual.dados !== null,
      erro: null,
    }));
    try {
      const dados = await funcao.current();
      if (minha === versao.current) {
        setEstado({ dados, carregando: false, atualizando: false, erro: null });
      }
    } catch (erro) {
      if (minha === versao.current) {
        setEstado((atual) => ({ ...atual, carregando: false, atualizando: false, erro: mensagemDe(erro) }));
      }
    }
  }, []);

  useEffect(() => {
    void executar(false);
    // As dependências dizem quando recarregar (ex.: filtros); a função muda a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias);

  return {
    ...estado,
    recarregar: useCallback(() => executar(true), [executar]),
    /** Troca os dados sem ir ao servidor (ex.: depois de curtir). */
    atualizarLocal: useCallback((alterar: (dados: T) => T) => {
      setEstado((atual) => (atual.dados === null ? atual : { ...atual, dados: alterar(atual.dados) }));
    }, []),
  };
}
