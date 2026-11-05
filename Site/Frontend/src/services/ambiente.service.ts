import clienteApi from "./api";
import type { CatalogoDoAmbiente, MidiaDaVaga } from "@/types/ambiente";

/** Ambiente de trabalho, entrevista adaptável e vídeo da vaga em Libras. */
export const ambienteService = {
  /** As listas fechadas (uma fonte só para o formulário e as telas). Pública. */
  async catalogo(): Promise<CatalogoDoAmbiente> {
    const { data } = await clienteApi.get<{ catalogo: CatalogoDoAmbiente }>("/vagas/catalogo-acessibilidade");
    return data.catalogo;
  },

  /** O vídeo da vaga, para quem pode ver a vaga. Nulo quando não há vídeo. */
  async midia(vagaId: string): Promise<MidiaDaVaga | null> {
    const { data } = await clienteApi.get<{ midia: MidiaDaVaga | null }>(`/vagas/${vagaId}/midia`);
    return data.midia ?? null;
  },

  /** Envia (ou troca) o vídeo. A transcrição é obrigatória e vai no mesmo envio. */
  async enviarVideo(vagaId: string, corpo: { video: File; transcricao: string; descricao: string }): Promise<MidiaDaVaga> {
    const form = new FormData();
    form.append("transcricao", corpo.transcricao);
    form.append("descricao", corpo.descricao);
    form.append("video", corpo.video);

    const { data } = await clienteApi.put<{ midia: MidiaDaVaga }>(`/vagas/${vagaId}/midia/video`, form);
    return data.midia;
  },

  /** Envia a legenda WebVTT. O tipo é declarado explicitamente: alguns sistemas mandam .vtt como texto genérico. */
  async enviarLegenda(vagaId: string, arquivo: File): Promise<MidiaDaVaga> {
    const form = new FormData();
    form.append("legenda", new File([await arquivo.arrayBuffer()], arquivo.name, { type: "text/vtt" }));

    const { data } = await clienteApi.put<{ midia: MidiaDaVaga }>(`/vagas/${vagaId}/midia/legenda`, form);
    return data.midia;
  },

  async removerLegenda(vagaId: string): Promise<MidiaDaVaga> {
    const { data } = await clienteApi.delete<{ midia: MidiaDaVaga }>(`/vagas/${vagaId}/midia/legenda`);
    return data.midia;
  },

  async atualizarTextos(vagaId: string, corpo: { transcricao: string; descricao: string }): Promise<MidiaDaVaga> {
    const { data } = await clienteApi.patch<{ midia: MidiaDaVaga }>(`/vagas/${vagaId}/midia`, corpo);
    return data.midia;
  },

  async removerMidia(vagaId: string): Promise<void> {
    await clienteApi.delete(`/vagas/${vagaId}/midia`);
  },
};
