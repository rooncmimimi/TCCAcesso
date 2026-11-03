import type { AxiosError } from "axios";

import clienteApi, { extrairMensagemErro, guardarDispositivoConfiavel } from "./api";
import type { RespostaLogin, RespostaLoginContaPausada, RespostaLoginEmailNaoVerificado, RespostaLoginMfa } from "@/types";

/** Um aparelho que a pessoa marcou como de confiança. Nunca traz o token nem o hash. */
export interface DispositivoConfiavel {
  id: string;
  rotulo: string;
  ip: string | null;
  criadoEm: string;
  ultimoUsoEm: string;
  expiraEm: string;
  /** É o aparelho que está sendo usado agora. */
  atual: boolean;
}

/** Uma linha do histórico de segurança, já com o texto que a pessoa lê. */
export interface EventoDeSeguranca {
  id: string;
  tipo: string;
  descricao: string;
  ip: string | null;
  dispositivo: string | null;
  criadoEm: string;
}

export interface EstadoDoRecurso {
  /** A chave está ligada no servidor. */
  habilitado: boolean;
  /** Ligada E com e-mail capaz de enviar o código. Ligado sem e-mail, o login segue sem a verificação. */
  ativo: boolean;
}

export type RespostaDoCodigoPorEmail = RespostaLogin | RespostaLoginContaPausada | RespostaLoginEmailNaoVerificado | RespostaLoginMfa;

/** `detalhes.codigo` que o servidor usa nos erros desta funcionalidade. */
export function codigoDoErroSeguranca(erro: unknown): string | undefined {
  return (erro as AxiosError<{ detalhes?: { codigo?: string } }>)?.response?.data?.detalhes?.codigo;
}

/** O desafio venceu, foi substituído por um código mais novo ou já foi usado: a pessoa precisa entrar de novo (ou pedir outro). */
export const desafioDeDispositivoVenceu = (erro: unknown) => codigoDoErroSeguranca(erro) === "DISPOSITIVO_DESAFIO_EXPIRADO";

export function mensagemDeErroSeguranca(erro: unknown, padrao = "Não foi possível concluir agora. Tente novamente."): string {
  return extrairMensagemErro(erro, padrao);
}

/** Segundos de espera que o servidor pede antes de aceitar outro reenvio (0 se a falha não foi essa). */
export function segundosDeEspera(erro: unknown): number {
  const detalhes = (erro as AxiosError<{ detalhes?: { codigo?: string; segundos?: number } }>)?.response?.data?.detalhes;

  return detalhes?.codigo === "DISPOSITIVO_REENVIO_ESPERA" && typeof detalhes.segundos === "number" ? detalhes.segundos : 0;
}

/** Serviço da verificação por e-mail em dispositivo novo e da conta comprometida: espelha as rotas de `/auth`. */
export const segurancaService = {
  /** Público: o Site só mostra as telas novas quando o recurso está ligado. Qualquer falha vira "desligado". */
  async estado(): Promise<EstadoDoRecurso> {
    try {
      const { data } = await clienteApi.get<EstadoDoRecurso>("/auth/seguranca/disponivel");
      return { habilitado: Boolean(data.habilitado), ativo: Boolean(data.ativo) };
    } catch {
      return { habilitado: false, ativo: false };
    }
  },

  /**
   * Troca o código recebido por e-mail pela sessão. Com `lembrar`, o servidor devolve o token do aparelho (uma única vez), que
   * é guardado aqui mesmo para as próximas requisições já o enviarem.
   */
  async concluirLogin(desafio: string, codigo: string, lembrar: boolean): Promise<RespostaDoCodigoPorEmail> {
    const { data } = await clienteApi.post<RespostaDoCodigoPorEmail>("/auth/login/dispositivo", { desafio, codigo, lembrar });

    if ("dispositivo" in data && typeof data.dispositivo === "string") {
      guardarDispositivoConfiavel(data.dispositivo);
    }

    return data;
  },

  async reenviarCodigo(desafio: string): Promise<{ desafioDispositivo: string; reenvioEmSegundos: number }> {
    const { data } = await clienteApi.post<{ desafioDispositivo: string; reenvioEmSegundos: number }>("/auth/login/dispositivo/reenviar", { desafio });
    return data;
  },

  async listarDispositivos(): Promise<DispositivoConfiavel[]> {
    const { data } = await clienteApi.get<{ dispositivos: DispositivoConfiavel[] }>("/auth/dispositivos");
    return data.dispositivos;
  },

  async removerDispositivo(id: string): Promise<void> {
    await clienteApi.delete(`/auth/dispositivos/${encodeURIComponent(id)}`);
  },

  async removerTodosDispositivos(): Promise<number> {
    const { data } = await clienteApi.post<{ quantidade: number }>("/auth/dispositivos/revogar-todos");
    return data.quantidade;
  },

  async listarEventos(limite = 30): Promise<EventoDeSeguranca[]> {
    const { data } = await clienteApi.get<{ eventos: EventoDeSeguranca[] }>("/auth/eventos-de-seguranca", { params: { limite } });
    return data.eventos;
  },

  /** Pedido público; a resposta é sempre a mesma, exista a conta ou não. */
  async solicitarProtecao(email: string): Promise<string> {
    const { data } = await clienteApi.post<{ mensagem: string }>("/auth/conta-comprometida/solicitar", { email });
    return data.mensagem;
  },

  /** Confirma pelo link do e-mail: encerra todas as sessões e manda o link de nova senha. */
  async confirmarProtecao(token: string): Promise<string> {
    const { data } = await clienteApi.post<{ mensagem: string }>("/auth/conta-comprometida/confirmar", { token });
    return data.mensagem;
  },

  /** Logado: encerra as outras sessões e a confiança nos dispositivos. Pede a senha atual quando a conta tem uma. */
  async protegerAgora(senhaAtual: string | undefined, refreshToken: string | null): Promise<string> {
    const { data } = await clienteApi.post<{ mensagem: string }>("/auth/conta-comprometida/proteger-agora", {
      ...(senhaAtual ? { senhaAtual } : {}),
      ...(refreshToken ? { refreshToken } : {}),
    });
    return data.mensagem;
  },
};

export default segurancaService;
