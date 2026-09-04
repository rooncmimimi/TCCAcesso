import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Config separada de `vite.config.ts` (não reaproveitada) de propósito: os
 * plugins de dev/build (`tanstackRouter` — regeneraria `routeTree.gen.ts` a
 * cada rodada de teste — e `tailwindcss`) não têm nenhuma função em testes
 * unitários e só adicionariam custo/efeito colateral. `tsconfigPaths` é o
 * único plugin realmente necessário aqui, para resolver os imports `@/...`
 * usados em todo o projeto.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
