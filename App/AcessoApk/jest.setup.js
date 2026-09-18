/* global jest */
// Mock oficial do AsyncStorage para todos os testes. Sem ele, qualquer teste que monte o
// `AcessibilidadeProvider`, direta ou indiretamente pelo `TemaProvider`, tentaria usar o módulo
// nativo, que não existe no Jest.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// `expo-notifications` acessa módulos nativos já no import. Nenhum teste envia push de verdade,
// então um mock global inofensivo basta; os testes de push ajustam o comportamento de que precisam.
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  getPermissionsAsync: jest.fn(async () => ({ status: "undetermined", canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ status: "denied", canAskAgain: false })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: "ExponentPushToken[test]" })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  AndroidImportance: { DEFAULT: 3, MAX: 5 },
}));

// `notificacoes/push.ts` só carrega `expo-notifications` fora do Expo Go, onde o próprio import
// derruba o app. Nos testes o app finge estar num build nativo para exercitar esse caminho contra o
// mock acima.
jest.mock("expo", () => ({
  ...jest.requireActual("expo"),
  isRunningInExpoGo: () => false,
}));
