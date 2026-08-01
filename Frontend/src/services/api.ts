import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

/** Chave usada para persistir o token JWT no navegador. */
export const TOKEN_STORAGE_KEY = "acesso:token";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

export const api: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStoredToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

/** Extrai a mensagem de erro padronizada pela API do backend. */
export function extrairMensagemErro(erro: unknown, padrao = "Não foi possível concluir a ação."): string {
  const axiosErro = erro as AxiosError<{ mensagem?: string; message?: string }>;
  return axiosErro?.response?.data?.mensagem ?? axiosErro?.response?.data?.message ?? padrao;
}

api.interceptors.response.use(
  (response) => response,
  (erro: AxiosError) => {
    // Sessão expirada ou inválida: limpa o token para forçar novo login.
    if (erro.response?.status === 401) {
      setStoredToken(null);
    }
    return Promise.reject(erro);
  },
);

export default api;
