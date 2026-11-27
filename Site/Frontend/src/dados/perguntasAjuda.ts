/**
 * Perguntas frequentes da Central de Ajuda, por público.
 *
 * Cada resposta descreve uma regra que o sistema de fato aplica. Ao mudar a regra (prazo do link de
 * senha, o que a empresa em análise pode fazer, quem recebe notificação...), mude a resposta junto.
 */
import type { Publico, TemaDeAjuda } from "@/dados/tutoriaisAjuda";
import type { ChaveBase } from "@/i18n/dicionarios";

export type PerguntaFrequente = {
  id: string;
  publicos: readonly Publico[];
  pergunta: ChaveBase;
  resposta: ChaveBase;
  /** Tutorial que mostra o assunto passo a passo. */
  tema?: TemaDeAjuda;
};

const faq = (id: string, publicos: readonly Publico[], tema?: TemaDeAjuda): PerguntaFrequente => ({
  id,
  publicos,
  pergunta: `ajuda.faq.${id}.pergunta` as ChaveBase,
  resposta: `ajuda.faq.${id}.resposta` as ChaveBase,
  tema,
});

const C: readonly Publico[] = ["candidato"];
const E: readonly Publico[] = ["empresa"];
const AMBOS: readonly Publico[] = ["candidato", "empresa"];

export const PERGUNTAS: readonly PerguntaFrequente[] = [
  faq("deficiencia", C, "adaptacoes"),
  faq("oQueAEmpresaVe", C, "adaptacoes"),
  faq("cancelarCandidatura", C, "candidaturas"),
  faq("respostaDaEmpresa", C, "candidaturas"),
  faq("curriculoNaoLido", C, "perfil"),
  faq("googleCandidato", C, "google"),
  faq("contaDeCandidato", E, "empresa"),
  faq("mesmoEmail", E, "empresa"),
  faq("naoConsigoPublicar", E, "aprovacao"),
  faq("vagaEncerrada", E, "gerenciar-vagas"),
  faq("avisoDeCandidatura", E, "candidaturas-recebidas"),
  faq("googleEmpresa", E, "entrar"),
  faq("esqueciSenha", AMBOS, "entrar"),
  faq("pausarOuExcluir", AMBOS),
  faq("trocarIdioma", AMBOS, "acessibilidade"),
];

export function perguntasDe(publico: Publico): readonly PerguntaFrequente[] {
  return PERGUNTAS.filter((p) => p.publicos.includes(publico));
}
