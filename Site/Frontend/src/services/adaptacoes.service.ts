import clienteApi from "./api";
import type {
  AdaptacoesDoCandidato,
  AdaptacoesDaEmpresa,
  CatalogoDeAdaptacoes,
  EscolhaDeCompartilhamento,
  EtapaDoRascunho,
  MinhaAcessibilidade,
  PreviaDaCandidatura,
  RascunhoDeCandidatura,
  RespostaDaEmpresa,
} from "@/types/adaptacoes";
import type { Candidatura } from "@/types";

/** Minha Acessibilidade: sempre da própria pessoa, sem id na URL. */
export const minhaAcessibilidadeService = {
  async catalogo(): Promise<CatalogoDeAdaptacoes> {
    const { data } = await clienteApi.get<{ catalogo: CatalogoDeAdaptacoes }>("/minha-acessibilidade/catalogo");
    return data.catalogo;
  },

  async obter(): Promise<MinhaAcessibilidade> {
    const { data } = await clienteApi.get<{ minhaAcessibilidade: MinhaAcessibilidade }>("/minha-acessibilidade");
    return data.minhaAcessibilidade;
  },

  async salvarAdaptacoes(corpo: { adaptacoes: string[]; observacao: string | null }): Promise<MinhaAcessibilidade> {
    const { data } = await clienteApi.put<{ minhaAcessibilidade: MinhaAcessibilidade }>("/minha-acessibilidade/adaptacoes", corpo);
    return data.minhaAcessibilidade;
  },

  async salvarComunicacao(corpo: {
    canaisPreferidos: string[];
    canaisAEvitar: string[];
    melhorHorario: string | null;
    observacao: string | null;
  }): Promise<MinhaAcessibilidade> {
    const { data } = await clienteApi.put<{ minhaAcessibilidade: MinhaAcessibilidade }>("/minha-acessibilidade/comunicacao", corpo);
    return data.minhaAcessibilidade;
  },

  async salvarPrivacidade(exibirDeficienciaNoPerfil: boolean): Promise<MinhaAcessibilidade> {
    const { data } = await clienteApi.put<{ minhaAcessibilidade: MinhaAcessibilidade }>("/minha-acessibilidade/privacidade", {
      exibirDeficienciaNoPerfil,
    });
    return data.minhaAcessibilidade;
  },
};

/** Candidatura com autorização: prévia, rascunho, envio, edição, retirada e resposta da empresa. */
export const candidaturaAdaptacoesService = {
  async previa(vagaId: string, compartilhar: EscolhaDeCompartilhamento): Promise<PreviaDaCandidatura> {
    const { data } = await clienteApi.post<{ previa: PreviaDaCandidatura }>(`/vagas/${vagaId}/candidaturas/previa`, { compartilhar });
    return data.previa;
  },

  async obterRascunho(vagaId: string): Promise<RascunhoDeCandidatura | null> {
    const { data } = await clienteApi.get<{ rascunho: RascunhoDeCandidatura | null }>(`/vagas/${vagaId}/rascunho`);
    return data.rascunho ?? null;
  },

  async salvarRascunho(
    vagaId: string,
    corpo: { mensagem: string; etapa: EtapaDoRascunho; selecao: EscolhaDeCompartilhamento },
  ): Promise<RascunhoDeCandidatura> {
    const { data } = await clienteApi.put<{ rascunho: RascunhoDeCandidatura }>(`/vagas/${vagaId}/rascunho`, corpo);
    return data.rascunho;
  },

  async descartarRascunho(vagaId: string): Promise<void> {
    await clienteApi.delete(`/vagas/${vagaId}/rascunho`);
  },

  async meusRascunhos(): Promise<RascunhoDeCandidatura[]> {
    const { data } = await clienteApi.get<{ rascunhos: RascunhoDeCandidatura[] }>("/candidaturas/rascunhos");
    return data.rascunhos ?? [];
  },

  /** O envio definitivo. `aceita` só vale depois de a pessoa ver a prévia e confirmar a autorização. */
  async enviar(
    vagaId: string,
    corpo: { mensagem: string; compartilhar: EscolhaDeCompartilhamento; aceita: boolean },
  ): Promise<Candidatura> {
    const { data } = await clienteApi.post<{ candidatura: Candidatura }>(`/vagas/${vagaId}/candidaturas`, {
      mensagem: corpo.mensagem || null,
      compartilhar: corpo.compartilhar,
      aceita: corpo.aceita,
    });
    return data.candidatura;
  },

  async editar(candidaturaId: string, compartilhar: EscolhaDeCompartilhamento, aceita: boolean): Promise<AdaptacoesDoCandidato | null> {
    const { data } = await clienteApi.put<{ adaptacoes: AdaptacoesDoCandidato | null }>(`/candidaturas/${candidaturaId}/adaptacoes`, {
      compartilhar,
      aceita,
    });
    return data.adaptacoes ?? null;
  },

  async retirar(candidaturaId: string): Promise<AdaptacoesDoCandidato | null> {
    const { data } = await clienteApi.delete<{ adaptacoes: AdaptacoesDoCandidato | null }>(`/candidaturas/${candidaturaId}/adaptacoes`);
    return data.adaptacoes ?? null;
  },

  async responder(candidaturaId: string, resposta: RespostaDaEmpresa, mensagem: string): Promise<AdaptacoesDaEmpresa> {
    const { data } = await clienteApi.post<{ adaptacoes: AdaptacoesDaEmpresa }>(`/candidaturas/${candidaturaId}/adaptacoes/resposta`, {
      resposta,
      mensagem: mensagem || null,
    });
    return data.adaptacoes;
  },
};
