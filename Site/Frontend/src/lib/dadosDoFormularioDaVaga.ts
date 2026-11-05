import type { DadosParaAvaliar } from "@/lib/avaliadorDeVaga";
import { payloadDoAmbiente, type FormularioDoAmbiente } from "@/lib/ambienteDaVagaForm";

/**
 * Lê o que está escrito agora no formulário da vaga (campos de texto pelo `FormData`, e o ambiente e os
 * recursos pelo estado) no formato que o avaliador entende. Não envia nada a lugar nenhum: serve só
 * para o botão "Avaliar agora".
 */
export function lerDadosParaAvaliar(
  form: HTMLFormElement | null,
  { ambiente, recursos, video }: { ambiente: FormularioDoAmbiente; recursos: string[]; video?: { legenda: boolean } | null },
): DadosParaAvaliar {
  const dados = form ? new FormData(form) : new FormData();
  const texto = (campo: string) => String(dados.get(campo) ?? "").trim();
  const payload = payloadDoAmbiente(ambiente);

  return {
    titulo: texto("titulo"),
    descricao: texto("descricao"),
    requisitos: texto("requisitos"),
    requisitosDesejaveis: texto("requisitosDesejaveis"),
    atividades: texto("atividades"),
    etapasSelecao: texto("etapasSelecao"),
    beneficios: texto("beneficios"),
    acessibilidade: texto("acessibilidade"),
    cargaHoraria: texto("cargaHoraria"),
    salario: texto("salario"),
    modalidade: texto("modalidade"),
    cidade: texto("cidade"),
    estado: texto("estado"),
    recursosAcessibilidade: recursos,
    entrevistaAdaptacoes: payload.entrevistaAdaptacoes,
    ambienteSensorial: payload.ambienteSensorial,
    acessibilidadeFisica: Object.fromEntries(Object.entries(payload.acessibilidadeFisica).map(([chave, item]) => [chave, { situacao: item.situacao as "sim" | "parcial" | "nao", origem: "declarado" as const, detalhe: item.detalhe }])),
    video: video ?? null,
  };
}
