import type { AxiosError } from "axios";

import clienteApi, { definirTokens, extrairMensagemErro } from "./api";
import type { RespostaLogin, RespostaLoginContaPausada, RespostaLoginEmailNaoVerificado } from "@/types";

/** Estado da verificação em duas etapas da conta. Nunca traz o segredo. */
export interface EstadoTotp {
  /** O recurso está ligado no servidor. */
  mfaDisponivel: boolean;
  mfaConfigurado: boolean;
  /** Obrigatória para a conta (administrador). */
  mfaExigido: boolean;
  codigosRestantes: number;
  confirmadoEm: string | null;
}

/** O que o aplicativo autenticador precisa. `configuracao` é o selo que volta na confirmação. */
export interface ConfiguracaoTotp {
  segredo: string;
  segredoAgrupado: string;
  uri: string;
  configuracao: string;
  /** Troca de aparelho de quem já tem TOTP. */
  troca: boolean;
}

/** Senha (quando a conta tem) e um código do aplicativo, ou de recuperação: o que as ações sensíveis pedem. */
export interface Reautenticacao {
  senhaAtual?: string;
  codigo: string;
}

export type RespostaDoSegundoPasso = RespostaLogin | RespostaLoginContaPausada | RespostaLoginEmailNaoVerificado;

/** `detalhes.codigo` que o servidor usa nos erros desta funcionalidade. */
export function codigoDoErroTotp(erro: unknown): string | undefined {
  return (erro as AxiosError<{ detalhes?: { codigo?: string } }>)?.response?.data?.detalhes?.codigo;
}

/** O desafio venceu ou foi recusado: a pessoa precisa entrar de novo. */
export const desafioVenceu = (erro: unknown) => codigoDoErroTotp(erro) === "MFA_DESAFIO_EXPIRADO";

export function mensagemDeErroTotp(erro: unknown, padrao = "Não foi possível concluir agora. Tente novamente."): string {
  return extrairMensagemErro(erro, padrao);
}

/** Serviço da verificação em duas etapas: espelha as rotas `/auth/totp` e `/auth/login/totp`. */
export const totpService = {
  async estado(): Promise<EstadoTotp> {
    const { data } = await clienteApi.get<EstadoTotp>("/auth/totp");
    return data;
  },

  /** Quem já tem TOTP (troca de aparelho) manda senha e código; quem não tem, nada. */
  async iniciar(reautenticacao?: Reautenticacao): Promise<ConfiguracaoTotp> {
    const { data } = await clienteApi.post<ConfiguracaoTotp>("/auth/totp/configurar", reautenticacao ?? {});
    return data;
  },

  /**
   * Confirma com o primeiro código. Ativar encerra as outras sessões da conta; esta recebe uma nova,
   * já verificada, e os tokens são trocados aqui mesmo para a próxima chamada já usar a sessão nova.
   */
  async ativar(configuracao: string, codigo: string): Promise<{ codigosRecuperacao: string[] }> {
    const { data } = await clienteApi.post<{ codigosRecuperacao: string[]; token: string; refreshToken: string }>(
      "/auth/totp/ativar",
      { configuracao, codigo },
    );
    definirTokens(data.token, data.refreshToken);
    return { codigosRecuperacao: data.codigosRecuperacao };
  },

  async regenerarCodigos(reautenticacao: Reautenticacao): Promise<string[]> {
    const { data } = await clienteApi.post<{ codigosRecuperacao: string[] }>("/auth/totp/codigos-recuperacao", reautenticacao);
    return data.codigosRecuperacao;
  },

  async desativar(reautenticacao: Reautenticacao): Promise<void> {
    await clienteApi.post("/auth/totp/desativar", reautenticacao);
  },

  /**
   * Passo 2 do login: o desafio entregue depois da senha (ou do Google) e o código. Devolve o mesmo que
   * `/auth/login` devolveria; com sessão, guarda os tokens como o login faz.
   */
  async concluirLogin(desafio: string, codigo: string): Promise<RespostaDoSegundoPasso> {
    const { data } = await clienteApi.post<RespostaDoSegundoPasso>("/auth/login/totp", { desafio, codigo });

    if ("token" in data) {
      definirTokens(data.token, data.refreshToken);
    }

    return data;
  },
};

export default totpService;
