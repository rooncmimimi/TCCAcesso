import { juntar, local, mascaraCpf, mascaraData, mascaraTelefone, moeda, periodo, tempoRelativo } from '../utilitarios/formatacao';

describe('formatação (igual ao app Android)', () => {
  const agora = Date.parse('2026-10-27T12:00:00Z');
  test.each([
    ['2026-10-27T11:59:40Z', 'agora mesmo'],
    ['2026-10-27T11:59:00Z', 'há 1 minuto'],
    ['2026-10-27T10:00:00Z', 'há 2 horas'],
    ['2026-10-26T11:00:00Z', 'ontem'],
    ['2026-10-20T12:00:00Z', 'há 7 dias'],
    ['2026-08-27T12:00:00Z', 'há 2 meses'],
    ['2024-10-01T12:00:00Z', 'há 2 anos'],
    ['inválida', ''],
  ])('tempoRelativo(%s) = %s', (iso, esperado) => {
    expect(tempoRelativo(iso, agora)).toBe(esperado);
  });

  test('moeda: DECIMAL em texto vira R$; zero ou inválido fica de fora', () => {
    expect(moeda('3500.00')).toBe('R$ 3.500,00');
    expect(moeda('1234567.5')).toBe('R$ 1.234.567,50');
    expect(moeda('0.00')).toBeNull();
    expect(moeda('abc')).toBeNull();
    expect(moeda(null)).toBeNull();
  });

  test('período, juntar e local', () => {
    expect(periodo('2020-03-01', '2022-11-30', false)).toBe('mar/2020 – nov/2022');
    expect(periodo('2020-03-01', null, true)).toBe('mar/2020 – atual');
    expect(periodo(null, null, false)).toBeNull();
    expect(juntar('Desenvolvedora', ' ')).toBe('Desenvolvedora');
    expect(local('Recife', 'PE')).toBe('Recife - PE');
  });

  test('máscaras de digitação', () => {
    expect(mascaraData('25092000')).toBe('25/09/2000');
    expect(mascaraData('2509')).toBe('25/09');
    expect(mascaraTelefone('11987654321')).toBe('(11) 98765-4321');
    expect(mascaraTelefone('1134567890')).toBe('(11) 3456-7890');
    expect(mascaraCpf('52998224725')).toBe('529.982.247-25');
  });
});
