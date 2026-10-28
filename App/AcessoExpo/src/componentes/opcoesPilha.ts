import { cores } from '../tema';

/** Cabeçalho das pilhas dentro das abas: título grande do iOS, que acompanha o Texto Maior. */
export const opcoesPilha = {
  headerLargeTitle: true,
  headerTintColor: cores.primaria,
  headerTitleStyle: { color: cores.texto },
  headerLargeTitleStyle: { color: cores.texto },
  headerBackButtonDisplayMode: 'minimal' as const,
  contentStyle: { backgroundColor: cores.fundo },
};
