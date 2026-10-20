import type { Dicionario } from "../dicionario";

export const vagas: Dicionario["vagas"] = {
  modalidade: {
    presencial: "On-site",
    hibrido: "Hybrid",
    remoto: "Remote",
  },
  contrato: {
    clt: "Full-time employee (CLT)",
    pj: "Contractor (PJ)",
    estagio: "Internship",
    jovem_aprendiz: "Youth apprenticeship",
    temporario: "Temporary",
  },
  publicoAlvo: {
    geral: "Open to everyone",
    pcd: "Exclusive to people with disabilities",
    cinquenta_mais: "Exclusive to people 50+",
    pcd_cinquenta_mais: "For people with disabilities and 50+",
  },
  publicoAlvoCurto: {
    geral: "Everyone",
    pcd: "PWD only",
    cinquenta_mais: "50+ only",
    pcd_cinquenta_mais: "PWD and 50+",
  },
  recursos: {
    interprete_libras: "Sign language interpreter (Libras)",
    tecnologia_assistiva: "Assistive technology",
    ambiente_fisico_acessivel: "Accessible physical environment",
    banheiro_adaptado: "Accessible restroom",
    elevador_rampa: "Elevator or access ramp",
    jornada_adaptavel: "Flexible working hours",
    ferramentas_digitais_acessiveis: "Accessible digital tools",
    outro: "Other resource (see description)",
  },
  empresaParceira: "Partner company",
  logoDe: (nome) => `${nome} logo`,
  totalVagas: (n) => `${n} ${n === 1 ? "job" : "jobs"}`,
  localNaoInformado: "location not provided",
  resumoParaVoz: (titulo, empresa, local, modalidade) =>
    `Job: ${titulo}, company ${empresa}, ${local}, ${modalidade}.`,
};
