import clienteApi from "@/services/api";
import type { Usuario } from "@/types";

/** Perfil que o Google de fato forneceu. Nada além disto é pré-preenchido no cadastro. */
export interface PerfilGoogle {
  email: string | null;
  nome: string | null;
}

export type ResultadoGoogle =
  /** Conta já vinculada: sessão criada. */
  | { desfecho: "entrar"; usuario: Usuario; token: string; refreshToken: string }
  /** Já existe conta ACESSO com este e-mail, sem Google vinculado. Não vincula sozinho. */
  | { desfecho: "conflito"; email: string }
  /** Não há conta: o Site pergunta se é candidato ou empresa. */
  | {
      desfecho: "cadastrar";
      tipoConta: "candidato" | "empresa" | null;
      perfil: PerfilGoogle;
      /** Reenviado no cadastro para o vínculo ser feito pelo `sub` verificado no servidor. */
      codigo: string;
    };

/**
 * Entrar e cadastrar com Google.
 *
 * O Site nunca vê senha do Google nem o `sub` da conta: ele só carrega o "código de entrega" de um
 * minuto que o backend assinou, e é o backend que decide o que aquele código significa.
 */
export const googleService = {
  /** O recurso está configurado neste ambiente? Decide se o botão aparece. */
  async disponivel(): Promise<boolean> {
    const { data } = await clienteApi.get<{ disponivel: boolean }>("/auth/google/disponivel");
    return data.disponivel === true;
  },

  /** URL da tela de consentimento do Google, para onde o navegador é levado. */
  async urlDeAutorizacao(tipoConta?: "candidato" | "empresa"): Promise<string> {
    const { data } = await clienteApi.get<{ url: string }>("/auth/google/iniciar", {
      params: tipoConta ? { tipoConta } : undefined,
    });
    return data.url;
  },

  /** Troca o código de entrega pelo desfecho: entrar, conflito ou cadastrar. */
  async concluir(codigo: string): Promise<ResultadoGoogle> {
    const { data } = await clienteApi.post<ResultadoGoogle>("/auth/google/concluir", { codigo });
    return data;
  },

  /** Vincula a conta Google a quem já está autenticado por senha (saída do conflito). */
  async vincular(codigo: string): Promise<Usuario> {
    const { data } = await clienteApi.post<{ usuario: Usuario }>("/auth/google/vincular", { codigo });
    return data.usuario;
  },
};

export default googleService;

/**
 * Lê nome e e-mail de dentro do código de entrega, só para pré-preencher o formulário.
 *
 * O corpo de um JWT é base64, não segredo — dá para ler sem a chave. Isso **não** é verificação:
 * quem confere a assinatura é o servidor, quando o código volta no cadastro. Aqui serve apenas para
 * a pessoa não precisar redigitar o que o Google já informou.
 */
export function perfilDoCodigoGoogle(codigo?: string): PerfilGoogle | null {
  if (!codigo) return null;

  try {
    const corpo = codigo.split(".")[1];
    if (!corpo) return null;
    const json = JSON.parse(atob(corpo.replace(/-/g, "+").replace(/_/g, "/")));
    return { email: json?.perfil?.email ?? null, nome: json?.perfil?.nome ?? null };
  } catch {
    return null;
  }
}
