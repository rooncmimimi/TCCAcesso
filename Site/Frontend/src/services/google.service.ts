import clienteApi from "@/services/api";
import { corpoDoToken, lerVinculo, prepararVinculo } from "@/lib/googleNavegador";
import type {
  RespostaLogin,
  RespostaLoginContaPausada,
  RespostaLoginEmailNaoVerificado,
  Usuario,
} from "@/types";

/** Perfil que o Google de fato forneceu. Nada além disto é pré-preenchido no cadastro. */
export interface PerfilGoogle {
  email: string | null;
  nome: string | null;
}

export type ResultadoGoogle =
  /**
   * Conta já vinculada. Pelos mesmos portões do login por senha, a resposta é a sessão criada, ou
   * `{ contaPausada: true }`, ou `{ emailNaoVerificado: true, email }` (nesses dois, sem sessão).
   */
  | ({ desfecho: "entrar" } & (RespostaLogin | RespostaLoginContaPausada | RespostaLoginEmailNaoVerificado))
  /** Já existe conta ACESSO com este e-mail, sem Google vinculado. Não vincula sozinho. */
  | { desfecho: "conflito"; email: string }
  /** Não há conta: o Site leva ao cadastro de candidato, onde toda conta começa. */
  | {
      desfecho: "cadastrar";
      tipoConta: "candidato" | "empresa" | null;
      perfil: PerfilGoogle;
      /**
       * Prova assinada de que o Google verificou este `sub` e este e-mail. Fica na memória da aba
       * (`lib/googleNavegador`) e acompanha o cadastro, onde o servidor a reconfere.
       */
      prova: string;
    };

/**
 * Entrar e cadastrar com Google.
 *
 * O Site nunca vê a senha do Google. Ele leva o "código de entrega" que o backend assinou na volta
 * do Google (vale 2 minutos, **uma única vez**) e o troca por sessão ou pelo próximo passo — e só
 * no navegador que começou o fluxo: junto com o código vai o segredo que ficou no `sessionStorage`
 * desta aba (ver `lib/googleNavegador.ts`), e o servidor confere que ele bate com o hash gravado no
 * código. O corpo do código é legível (traz e-mail, nome e o `sub`), então não é segredo: o que o
 * protege é o vínculo com o navegador e o uso único.
 */
export const googleService = {
  /** O recurso está configurado neste ambiente? Decide se o botão aparece. */
  async disponivel(): Promise<boolean> {
    const { data } = await clienteApi.get<{ disponivel: boolean }>("/auth/google/disponivel");
    return data.disponivel === true;
  },

  /**
   * URL da tela de consentimento do Google, para onde o navegador é levado.
   *
   * Cada chamada começa um fluxo novo: gera e guarda o segredo desta aba e manda ao servidor só o
   * hash dele. Lança `ErroGoogleNavegador` quando o navegador não consegue guardá-lo.
   */
  async urlDeAutorizacao(tipoConta?: "candidato" | "empresa"): Promise<string> {
    const vinculo = await prepararVinculo();
    const { data } = await clienteApi.get<{ url: string }>("/auth/google/iniciar", {
      params: { vinculo, ...(tipoConta ? { tipoConta } : {}) },
    });
    return data.url;
  },

  /**
   * Troca o código de entrega pelo desfecho: entrar, conflito ou cadastrar.
   * `confirmarReativacao` é o "sim, quero reativar" de quem pausou a conta, como no login por senha.
   */
  async concluir(codigo: string, confirmarReativacao = false): Promise<ResultadoGoogle> {
    const { data } = await clienteApi.post<ResultadoGoogle>("/auth/google/concluir", {
      codigo,
      vinculo: lerVinculo() ?? undefined,
      ...(confirmarReativacao ? { confirmarReativacao: true } : {}),
    });
    return data;
  },

  /** Vincula a conta Google a quem já está autenticado por senha (saída do conflito). */
  async vincular(codigo: string): Promise<Usuario> {
    const { data } = await clienteApi.post<{ usuario: Usuario }>("/auth/google/vincular", {
      codigo,
      vinculo: lerVinculo() ?? undefined,
    });
    return data.usuario;
  },
};

export default googleService;

/**
 * Lê nome e e-mail de dentro da prova do Google, só para pré-preencher o formulário.
 *
 * O corpo de um JWT é base64, não segredo — dá para ler sem a chave. Isso **não** é verificação:
 * quem confere a assinatura é o servidor, quando a prova volta no cadastro. Aqui serve apenas para
 * a pessoa não precisar redigitar o que o Google já informou.
 */
export function perfilDaProvaGoogle(prova?: string | null): PerfilGoogle | null {
  if (!prova) return null;

  const perfil = corpoDoToken(prova)?.perfil as { email?: unknown; nome?: unknown } | undefined;
  if (!perfil || typeof perfil !== "object") return null;

  return {
    email: typeof perfil.email === "string" ? perfil.email : null,
    nome: typeof perfil.nome === "string" ? perfil.nome : null,
  };
}
