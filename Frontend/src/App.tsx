import { RouterProvider } from "@tanstack/react-router";

import { router } from "./router";

/**
 * Componente raiz da aplicação.
 * Responsável apenas por entregar o roteador ao React.
 */
export default function App() {
  return <RouterProvider router={router} />;
}
