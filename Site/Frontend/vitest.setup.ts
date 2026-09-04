import "@testing-library/jest-dom/vitest";

// jsdom não implementa ResizeObserver (não faz layout de verdade) — vários
// componentes Radix UI (Select, Popover...) o usam para posicionamento.
// Sem isso, qualquer teste que renderize um desses componentes quebra com
// "ResizeObserver is not defined", mesmo sem o teste depender de medição de
// tamanho nenhuma.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
