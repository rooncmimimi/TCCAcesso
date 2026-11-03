import clienteApi from "./api";

import type { AssuntoDeContato } from "@/dados/assuntosDeContato";

export interface MensagemDeContato {
  nome: string;
  email: string;
  assunto: AssuntoDeContato;
  mensagem: string;
  /** Campo-isca: nenhuma pessoa o vê nem preenche. Qualquer valor aqui faz o servidor tratar como robô. */
  website: string;
}

/** Fale conosco (`POST /contato`, público). Devolve o protocolo, que a equipe também vê no assunto do e-mail. */
export async function enviarMensagemDeContato(dados: MensagemDeContato): Promise<{ protocolo: string }> {
  const { data } = await clienteApi.post<{ protocolo: string }>("/contato", dados);
  return { protocolo: data.protocolo };
}

const contatoService = { enviar: enviarMensagemDeContato };

export default contatoService;
