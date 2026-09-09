/* global jest */
// Setup global de testes. Só uma coisa até agora: o mock oficial do
// AsyncStorage (usado pelas preferências de acessibilidade, Fase 5) — sem
// isso, qualquer teste que monte `AccessibilityProvider` (e, por tabela,
// qualquer teste que monte `ThemeProvider`, que agora depende dele) falharia
// tentando acessar o módulo nativo de verdade, que não existe no Jest.
// Fica num arquivo global (registrado em `package.json` → `jest.setupFiles`)
// em vez de repetido em cada arquivo de teste que precisa dele.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
