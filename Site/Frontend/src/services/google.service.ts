import type { AxiosError } from "axios";

import clienteApi, { extrairMensagemErro } from "@/services/api";
import { corpoDoToken, lerVinculo, limparVinculo, prepararVinculo } from "@/lib/googleNavegador";
import type {
  RespostaLogin,
  RespostaLoginContaPausada,
  RespostaLoginEmailNaoVerificado,
} from "@/types";

/** Perfil que o Google de fato forneceu. Nada além disto é pré-preenchido no cadastro. */
export interface PerfilGoogle {
  email: string | null;
  nome: string | null;
}

/** O que a tela Contas conectadas precisa saber sobre o Google desta conta. */
export interface ContaGoogle {
  /** O recurso está configurado neste ambiente. */
  disponivel: boolean;
  /** A conta pode ter Google vinculado (hoje, só conta de candidato). */
  elegivel: boolean;
  vinculado: boolean;
}

/**
 * A mensagem do servidor só aparece para erro **da pessoa ou da conta** (4xx): "Senha incorreta",
 * "Sessão do Google expirada", "Conta bloqueada: motivo". Erro de servidor ou de rede (sem resposta)
 * fica com o texto padrão, que não vaza detalhe interno.
 */
export function mensagemDeErroGoogle(erro: unknown, padrao: string): string {
  const status = (erro as AxiosError | undefined)?.response?.status;
  return status !== undefined && status >= 400 && status < 500 ? extrairMensagemErro(erro, padrao) : padrao;
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
      /**
       * O servidor está com a criação de conta sem senha ligada: o Site leva a `/cadastro/google`
       * (aceite dos termos e conta criada na hora). Sem isso, segue o cadastro de sempre.
       */
      contaSemSenha?: boolean;
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

  /**
   * Cria a conta de candidato a partir da prova do Google, sem senha, e devolve a sessão. Só o
   * aceite dos termos (versão que a tela mostrou) acompanha a prova: nome e e-mail vêm da prova,
   * que o servidor assinou, e o resto dos dados é pedido depois do login.
   */
  async cadastrar(prova: string, termosVersao: string): Promise<RespostaLogin> {
    const { data } = await clienteApi.post<RespostaLogin>("/auth/google/cadastrar", { prova, termosVersao });
    return data;
  },

  /** Situação do Google nesta conta, para a tela Contas conectadas (exige sessão). */
  async conta(): Promise<ContaGoogle> {
    const { data } = await clienteApi.get<ContaGoogle>("/auth/google/conta");
    return { disponivel: data.disponivel, elegivel: data.elegivel, vinculado: data.vinculado };
  },

  /**
   * Passo 1 de vincular o Google a quem já tem conta: confirma a senha atual no servidor e devolve a
   * URL do Google. Como no login, começa um fluxo novo (segredo da aba); se o servidor recusar — senha
   * errada, por exemplo —, o segredo é descartado.
   */
  async iniciarVinculo(senha: string): Promise<string> {
    const vinculo = await prepararVinculo();
    try {
      const { data } = await clienteApi.post<{ url: string }>("/auth/google/vincular/iniciar", { senha, vinculo });
      return data.url;
    } catch (erro) {
      limparVinculo();
      throw erro;
    }
  },

  /**
   * Passo 2: o código de volta do Google, que só serve a esta sessão e a este navegador. A conta
   * passa a poder entrar com o Google.
   */
  async vincular(codigo: string): Promise<void> {
    await clienteApi.post("/auth/google/vincular", { codigo, vinculo: lerVinculo() ?? undefined });
  },

  /** Desfaz o vínculo; exige a senha atual. */
  async desvincular(senha: string): Promise<void> {
    await clienteApi.delete("/auth/google/vinculo", { data: { senha } });
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
