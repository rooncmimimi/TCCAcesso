/**
 * Cores e medidas do app, iguais às do app Android (res/values/cores.xml), para as duas versões
 * terem a mesma cara. Todas as combinações de texto passam de 4,5:1 de contraste (WCAG AA);
 * a conta está em App/AcessoApk/docs/ACESSIBILIDADE.md.
 */
export const cores = {
  fundo: '#F8FAFD',
  superficie: '#FFFFFF',
  fundoSecundario: '#EDF2F9',
  primaria: '#178035',
  sobrePrimaria: '#FFFFFF',
  containerPrimaria: '#EEFAF1',
  sobreContainerPrimaria: '#0E4F21',
  texto: '#101926',
  textoSecundario: '#475569',
  borda: '#DDE2E8',
  contorno: '#6B7280',
  erro: '#D5131C',
  containerErro: '#FDE7E8',
  sobreContainerErro: '#5C0A0E',
  sucesso: '#1B5E20',
  containerSucesso: '#DCEFD9',
  containerAviso: '#FFF6C2',
  sobreContainerAviso: '#3D3300',
} as const;

export const espacos = {
  pequeno: 8,
  medio: 16,
  grande: 24,
} as const;

/** Área mínima de toque no iOS (Human Interface Guidelines): 44 x 44 pontos. */
export const ALVO_TOQUE = 44;

/**
 * Tamanhos de texto em pontos. O React Native multiplica pelo "Texto Maior" do iPhone
 * (allowFontScaling, ligado por padrão), então nada aqui fixa o tamanho.
 */
export const texto = {
  titulo: { fontSize: 28, fontWeight: '700', color: cores.texto },
  subtitulo: { fontSize: 20, fontWeight: '700', color: cores.texto },
  corpo: { fontSize: 17, color: cores.texto, lineHeight: 24 },
  secundario: { fontSize: 15, color: cores.textoSecundario, lineHeight: 21 },
  rotulo: { fontSize: 15, fontWeight: '600', color: cores.texto },
} as const;
