/** Valores do backend (enums) e textos dos cartões de vaga. */
export const vagas = {
  modalidade: {
    presencial: "Presencial",
    hibrido: "Híbrido",
    remoto: "Remoto",
  },
  contrato: {
    clt: "CLT",
    pj: "PJ",
    estagio: "Estágio",
    jovem_aprendiz: "Jovem aprendiz",
    temporario: "Temporário",
  },
  publicoAlvo: {
    geral: "Aberta a todos os públicos",
    pcd: "Exclusiva para pessoas com deficiência",
    cinquenta_mais: "Exclusiva para pessoas 50+",
    pcd_cinquenta_mais: "Para pessoas com deficiência e 50+",
  },
  publicoAlvoCurto: {
    geral: "Todos os públicos",
    pcd: "Exclusiva PCD",
    cinquenta_mais: "Exclusiva 50+",
    pcd_cinquenta_mais: "PCD e 50+",
  },
  recursos: {
    interprete_libras: "Intérprete de Libras",
    tecnologia_assistiva: "Tecnologia assistiva",
    ambiente_fisico_acessivel: "Ambiente físico acessível",
    banheiro_adaptado: "Banheiro adaptado",
    elevador_rampa: "Elevador ou rampa de acesso",
    jornada_adaptavel: "Jornada adaptável",
    ferramentas_digitais_acessiveis: "Ferramentas digitais acessíveis",
    outro: "Outro recurso (ver descrição)",
  },
  empresaParceira: "Empresa parceira",
  logoDe: (nome: string) => `Logo de ${nome}`,
  totalVagas: (n: number) => `${n} vagas`,
  localNaoInformado: "local não informado",
  resumoParaVoz: (titulo: string, empresa: string, local: string, modalidade: string) =>
    `Vaga de ${titulo}, empresa ${empresa}, ${local}, modalidade ${modalidade}.`,
};
