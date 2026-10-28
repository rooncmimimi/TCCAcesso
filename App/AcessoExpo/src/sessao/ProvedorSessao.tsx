import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { carregarStatusEmpresa, sair as sairNaApi } from '../api/autenticacao';
import { sessaoGlobal } from './global';
import type { Sessao } from './sessao';

interface ValorSessao {
  sessao: Sessao | null;
  /** true enquanto a sessão salva é lida do Keychain na abertura do app. */
  carregando: boolean;
  /** Por que a sessão acabou sem a pessoa sair (ex.: "Sua sessão expirou. Entre novamente."). */
  aviso: string | null;
  iniciar(sessao: Sessao): Promise<void>;
  sair(): Promise<void>;
  /** Depois de editar o perfil, o nome em "Olá, ..." acompanha. */
  atualizarNome(nome: string): Promise<void>;
  /** Consulta GET /auth/me para saber se a empresa já foi aprovada. */
  atualizarStatusEmpresa(): Promise<void>;
  limparAviso(): void;
}

const ContextoSessao = createContext<ValorSessao | null>(null);

export function ProvedorSessao({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(sessaoGlobal.atual());
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    const parar = sessaoGlobal.ouvir((atual, motivo) => {
      setSessao(atual);
      setAviso(atual ? null : motivo);
    });
    sessaoGlobal.carregar().then((lida) => {
      if (ativo) {
        setSessao(lida);
        setCarregando(false);
      }
    });
    return () => {
      ativo = false;
      parar();
    };
  }, []);

  const valor: ValorSessao = {
    sessao,
    carregando,
    aviso,
    iniciar: (nova) => sessaoGlobal.salvar(nova),
    sair: async () => {
      const atual = sessaoGlobal.atual();
      await sessaoGlobal.encerrar(null);
      if (atual) {
        // Depois de apagar a sessão local, para a pessoa não esperar a rede para sair.
        void sairNaApi(atual);
      }
    },
    atualizarNome: async (nome) => {
      const atual = sessaoGlobal.atual();
      if (atual && nome.trim() && nome.trim() !== atual.nome) {
        await sessaoGlobal.salvar({ ...atual, nome: nome.trim() });
      }
    },
    atualizarStatusEmpresa: async () => {
      const status = await sessaoGlobal.comSessao((token) => carregarStatusEmpresa(token));
      const atual = sessaoGlobal.atual();
      if (atual && status !== atual.statusEmpresa) {
        await sessaoGlobal.salvar({ ...atual, statusEmpresa: status });
      }
    },
    limparAviso: () => setAviso(null),
  };

  return <ContextoSessao value={valor}>{children}</ContextoSessao>;
}

export function useSessao(): ValorSessao {
  const valor = use(ContextoSessao);
  if (!valor) {
    throw new Error('useSessao precisa estar dentro de <ProvedorSessao>.');
  }
  return valor;
}
