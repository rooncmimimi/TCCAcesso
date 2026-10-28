import type { ResumoSeguidores } from '../api/leitores';
import { botaoSeguir, textoSeguidores } from '../utilitarios/seguir';

const base: ResumoSeguidores = { totalSeguidores: 1, totalSeguindo: 2, seguindo: false, perfilPrivado: false, solicitacaoPendente: false, bloqueado: false };

describe('botão de seguir (textos do app Android)', () => {
  test('contagem: empresa só tem seguidores', () => {
    expect(textoSeguidores(base, false)).toBe('1 seguidor · 2 seguindo');
    expect(textoSeguidores({ ...base, totalSeguidores: 12 }, true)).toBe('12 seguidores');
  });

  test('estados: seguir, seguindo, pedido enviado e perfil privado', () => {
    expect(botaoSeguir(base, 'Ana', false)).toMatchObject({ titulo: 'Seguir', rotulo: 'Seguir Ana', ativo: false });
    expect(botaoSeguir({ ...base, seguindo: true }, 'Ana', false)).toMatchObject({ titulo: 'Seguindo', rotulo: 'Seguindo Ana', ativo: true });
    expect(botaoSeguir({ ...base, solicitacaoPendente: true }, 'Ana', false)).toMatchObject({ titulo: 'Pedido enviado', ativo: true });
    expect(botaoSeguir({ ...base, perfilPrivado: true }, 'Ana', false)).toMatchObject({ titulo: 'Solicitar para seguir', ativo: false });
    expect(botaoSeguir({ ...base, perfilPrivado: true }, 'X', true)).toMatchObject({ titulo: 'Seguir' });
  });
});
