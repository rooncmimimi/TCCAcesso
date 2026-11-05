import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

// O padrão de 1 s do `waitFor`/`findBy` é curto para a rodada completa, em que dezenas de arquivos
// dividem a CPU: `retorno-google.test.tsx` falhou uma vez por isso e passou isolado 9 de 9. Passar de
// 1 s não deixa um teste que falha passar; só tira a falha causada pela máquina ocupada.
configure({ asyncUtilTimeout: 4000 });

// jsdom não implementa ResizeObserver (não faz layout de verdade), mas vários
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
