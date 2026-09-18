import { RouterProvider } from "@tanstack/react-router";

import { router } from "./router";

/** Componente raiz: só entrega o roteador ao React. */
export default function App() {
  return <RouterProvider router={router} />;
}
