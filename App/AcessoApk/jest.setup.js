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

// Fase R5 — `expo-notifications` toca módulos nativos já no `import` (e
// ainda emite um aviso alto sobre Expo Go). Nenhum teste exercita push de
// verdade (o comportamento fica coberto por mocks nos testes que precisam),
// então aqui vira um mock global inócuo — mesma ideia do AsyncStorage acima.
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  getPermissionsAsync: jest.fn(async () => ({ status: "undetermined", canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ status: "denied", canAskAgain: false })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: "ExponentPushToken[test]" })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  AndroidImportance: { DEFAULT: 3, MAX: 5 },
}));

// Fase R5 (correção pós-teste no device) — `src/notificacoes/push.ts` só
// carrega `expo-notifications` FORA do Expo Go (`isRunningInExpoGo()`),
// porque dentro do Expo Go o próprio `import` derruba o app. No Jest a gente
// finge estar num build de verdade (`false`) para os testes de push
// exercitarem o caminho real contra o mock acima.
jest.mock("expo", () => ({
  ...jest.requireActual("expo"),
  isRunningInExpoGo: () => false,
}));
