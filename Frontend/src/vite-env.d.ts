/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base da API do backend (ex.: http://localhost:3000/api). */
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
