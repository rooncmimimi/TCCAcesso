import { renovar } from '../api/autenticacao';
import { apagarTexto, gravarTexto, lerTexto } from './armazenamento';
import { GerenciadorSessao } from './gerenciador';

const CHAVE = 'acesso.sessao';

/** Instância única do app: sessão no Keychain e renovação por POST /auth/refresh. */
export const sessaoGlobal = new GerenciadorSessao(
  {
    ler: () => lerTexto(CHAVE),
    gravar: (texto) => gravarTexto(CHAVE, texto),
    apagar: () => apagarTexto(CHAVE),
  },
  (sessao) => renovar(sessao),
);
