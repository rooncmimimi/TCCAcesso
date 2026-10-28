import { CONTA_DE_ADMINISTRACAO, desserializar, empresaAguardando, estaExpirada, lerExpiracaoJwt, lerSessao, type Sessao } from '../sessao/sessao';

/** JWT sem assinatura válida: o app só lê o "exp"; quem confere a assinatura é a API. */
function jwt(carga: object): string {
  const base64url = (texto: string) => btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64url('{"alg":"HS256"}')}.${base64url(JSON.stringify(carga))}.assinatura`;
}

describe('sessão', () => {
  test('lê { usuario, token, refreshToken } e o vencimento do JWT', () => {
    const sessao = lerSessao({
      usuario: { id: 7, email: 'ana@exemplo.com', nome: 'Ana Souza', tipoUsuario: 'candidato' },
      token: jwt({ sub: 7, exp: 2_000_000_000 }),
      refreshToken: 'r1',
    });
    expect(sessao).toMatchObject({ idUsuario: '7', tipo: 'candidato', statusEmpresa: null, refreshToken: 'r1', expiraEm: 2_000_000_000_000 });
  });

  test('empresa traz o status de aprovação; o refresh (sem empresa) mantém o anterior', () => {
    const login = lerSessao({ usuario: { id: 1, tipoUsuario: 'empresa', empresa: { statusAprovacao: 'pendente' } }, token: 'x', refreshToken: 'r' });
    expect(login.statusEmpresa).toBe('pendente');
    expect(empresaAguardando(login)).toBe(true);
    const renovada = lerSessao({ usuario: { id: 1, tipoUsuario: 'empresa' }, token: 'x', refreshToken: 'r2' }, 'aprovada');
    expect(renovada.statusEmpresa).toBe('aprovada');
    expect(empresaAguardando(renovada)).toBe(false);
  });

  test('conta de administração não entra pelo app', () => {
    expect(() => lerSessao({ usuario: { id: 1, tipoUsuario: 'admin' }, token: 'x', refreshToken: 'r' })).toThrow(CONTA_DE_ADMINISTRACAO);
  });

  test('token sem "exp" usa 15 minutos; vence um minuto antes', () => {
    expect(lerExpiracaoJwt('nao-e-jwt', 1000)).toBe(1000 + 15 * 60 * 1000);
    const sessao = { expiraEm: 120_000 } as Sessao;
    expect(estaExpirada(sessao, 59_999)).toBe(false);
    expect(estaExpirada(sessao, 60_000)).toBe(true);
  });

  test('o que vem do Keychain é conferido', () => {
    expect(desserializar(null)).toBeNull();
    expect(desserializar('{quebrado')).toBeNull();
    expect(desserializar(JSON.stringify({ idUsuario: '1', token: 't' }))).toBeNull();
    const salva = { idUsuario: '1', email: 'a@b.co', nome: 'A B', tipo: 'candidato', statusEmpresa: null, token: 't', refreshToken: 'r', expiraEm: 5 };
    expect(desserializar(JSON.stringify(salva))).toEqual(salva);
  });
});
