import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Config separada do `vite.config.ts` de propósito: os plugins de dev e build (`tanstackRouter`,
 * que regeneraria `routeTree.gen.ts` a cada execução dos testes, e `tailwindcss`) não servem para
 * testes unitários e só trariam custo e efeitos colaterais. `tsconfigPaths` é o único plugin
 * necessário aqui, para resolver os imports `@/...` usados em todo o projeto.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
