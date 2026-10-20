import type { Dicionario } from "../dicionario";

export const vagas: Dicionario["vagas"] = {
  modalidade: {
    presencial: "Presencial",
    hibrido: "Híbrido",
    remoto: "Remoto",
  },
  contrato: {
    clt: "Contrato laboral (CLT)",
    pj: "Autónomo (PJ)",
    estagio: "Prácticas",
    jovem_aprendiz: "Joven aprendiz",
    temporario: "Temporal",
  },
  publicoAlvo: {
    geral: "Abierta a todos los públicos",
    pcd: "Exclusiva para personas con discapacidad",
    cinquenta_mais: "Exclusiva para personas de 50+",
    pcd_cinquenta_mais: "Para personas con discapacidad y de 50+",
  },
  publicoAlvoCurto: {
    geral: "Todos los públicos",
    pcd: "Exclusiva PCD",
    cinquenta_mais: "Exclusiva 50+",
    pcd_cinquenta_mais: "PCD y 50+",
  },
  recursos: {
    interprete_libras: "Intérprete de lengua de señas (Libras)",
    tecnologia_assistiva: "Tecnología de apoyo",
    ambiente_fisico_acessivel: "Entorno físico accesible",
    banheiro_adaptado: "Baño adaptado",
    elevador_rampa: "Ascensor o rampa de acceso",
    jornada_adaptavel: "Jornada flexible",
    ferramentas_digitais_acessiveis: "Herramientas digitales accesibles",
    outro: "Otro recurso (ver descripción)",
  },
  empresaParceira: "Empresa asociada",
  logoDe: (nome) => `Logo de ${nome}`,
  totalVagas: (n) => `${n} ${n === 1 ? "vacante" : "vacantes"}`,
  localNaoInformado: "ubicación no informada",
  resumoParaVoz: (titulo, empresa, local, modalidade) =>
    `Vacante de ${titulo}, empresa ${empresa}, ${local}, modalidad ${modalidade}.`,
};
