/**
 * Termos de Uso e Aviso de Privacidade do ACESSO.
 *
 * ⚠️ O CONTEÚDO JURÍDICO AINDA NÃO EXISTE. Os dois documentos estão marcados como pendentes de
 * propósito: escrever um texto plausível e apresentá-lo como se fosse o termo oficial da plataforma
 * seria inventar um documento com efeito legal, e ninguém deve aceitar um contrato que foi gerado
 * para preencher espaço.
 *
 * A estrutura em volta está pronta: as páginas, o diálogo de leitura, os links no cadastro, a
 * rolagem, o foco e o registro de aceite com versão e data. Para publicar de verdade, basta
 * substituir `secoes` de cada documento pelo texto oficial e atualizar `VERSAO_DOCUMENTOS` — nada
 * mais precisa mudar.
 *
 * `VERSAO_DOCUMENTOS` é gravada junto do aceite (`usuarios.termos_versao`), então é o que permite
 * saber depois qual texto cada pessoa aceitou. Mude a versão sempre que o conteúdo mudar.
 */
export const VERSAO_DOCUMENTOS = "pendente-2026-10-09";

/** `true` enquanto o texto oficial não entrar: as telas avisam em vez de fingir que há contrato. */
export const CONTEUDO_PENDENTE = true;

export type Secao = { titulo: string; paragrafos: string[] };
export type DocumentoLegal = {
  chave: "termos" | "privacidade";
  titulo: string;
  resumo: string;
  secoes: Secao[];
};

const AVISO_PENDENTE =
  "O texto oficial deste documento ainda não foi redigido e aprovado. O que aparece abaixo descreve " +
  "apenas quais assuntos ele vai cobrir — não é um contrato, não tem valor jurídico e não deve ser " +
  "lido como tal.";

export const TERMOS_DE_USO: DocumentoLegal = {
  chave: "termos",
  titulo: "Termos de Uso",
  resumo: "As regras de uso da plataforma ACESSO.",
  secoes: [
    {
      titulo: "Situação deste documento",
      paragrafos: [AVISO_PENDENTE],
    },
    {
      titulo: "Assuntos previstos",
      paragrafos: [
        "Quem pode criar conta na plataforma e em quais condições, para pessoas candidatas e para empresas.",
        "O que cada tipo de conta pode fazer: publicar vagas, candidatar-se, enviar mensagens e publicar na comunidade.",
        "As regras de conduta e o que leva uma conta a ser suspensa ou removida pela moderação.",
        "O processo de análise e aprovação das contas de empresa antes de elas publicarem vagas.",
        "Responsabilidades do ACESSO e limites de responsabilidade sobre conteúdo publicado por terceiros.",
        "Como o documento é alterado e como as mudanças são comunicadas a quem já tem conta.",
      ],
    },
  ],
};

export const AVISO_DE_PRIVACIDADE: DocumentoLegal = {
  chave: "privacidade",
  titulo: "Aviso de Privacidade",
  resumo: "Como o ACESSO trata os seus dados pessoais.",
  secoes: [
    {
      titulo: "Situação deste documento",
      paragrafos: [AVISO_PENDENTE],
    },
    {
      titulo: "Assuntos previstos",
      paragrafos: [
        "Quais dados são coletados em cada etapa: cadastro, perfil profissional, currículo e preferências de acessibilidade.",
        "Por que cada dado é pedido e qual a base legal do tratamento, conforme a LGPD.",
        "O tratamento de dados sensíveis, em especial a declaração de deficiência, e as proteções aplicadas a eles.",
        "Com quem os dados são compartilhados: empresas que recebem candidaturas e provedores de infraestrutura.",
        "Por quanto tempo os dados ficam guardados e o que acontece ao pausar ou excluir a conta.",
        "Como exercer os direitos de acesso, correção, portabilidade e eliminação, e por qual canal.",
      ],
    },
  ],
};

export const DOCUMENTOS: Record<DocumentoLegal["chave"], DocumentoLegal> = {
  termos: TERMOS_DE_USO,
  privacidade: AVISO_DE_PRIVACIDADE,
};
