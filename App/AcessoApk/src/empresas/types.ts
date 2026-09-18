/**
 * Tipos de empresa: leitura do perfil público (`PerfilPublicoScreen`) e edição da própria empresa
 * (`EmpresaService` e `empresaValidator.js` no backend).
 *
 * `AtualizarEmpresaDados` é declarado campo a campo em vez de `Omit<EmpresaResumo, ...>`: como
 * `EmpresaResumo` tem o índice `[chave: string]: unknown`, o `Omit` reduziria as chaves a `string`
 * e aceitaria nomes de campo errados sem aviso.
 *
 * O app não envia logo nem capa (`PATCH /empresas/:id/logo` e `/capa`); aqui só os dados de texto
 * são editados.
 */
/**
 * `Empresa.statusAprovacao`. Quase tudo que a própria empresa faz (editar perfil, logo e capa,
 * vagas, candidaturas) exige `"aprovada"` (`garantirEmpresaAprovada` em `utils/autorizacao.js`).
 */
export type StatusAprovacaoEmpresa = "pendente" | "aprovada" | "reprovada" | "suspensa";

export type PorteEmpresa = "mei" | "micro" | "pequena" | "media" | "grande";

export interface EmpresaResumo {
  id: string;
  usuarioId: string;
  nomeFantasia?: string | null;
  razaoSocial: string;
  /** Só exibição, nunca editável pela própria empresa (exclusivo de administrador no backend). */
  cnpj?: string | null;
  logo?: string | null;
  capa?: string | null;
  setor?: string | null;
  porte?: PorteEmpresa | null;
  cidade?: string | null;
  estado?: string | null;
  endereco?: string | null;
  cep?: string | null;
  descricao?: string | null;
  culturaInclusiva?: string | null;
  site?: string | null;
  empresaVerificada?: boolean;
  statusAprovacao?: StatusAprovacaoEmpresa;
  /** Preenchido só quando `statusAprovacao === "reprovada"`. */
  motivoReprovacao?: string | null;
  /** Preenchido só quando `statusAprovacao === "suspensa"`. */
  motivoSuspensao?: string | null;
  [chave: string]: unknown;
}

export interface EmpresaResposta {
  sucesso: true;
  empresa: EmpresaResumo;
}

/** `PUT /empresas/:id`: só os campos que a própria empresa pode editar (`EmpresaService.CAMPOS_EDITAVEIS`); `cnpj`/`empresaVerificada` são exclusivos de administrador, nem aparecem aqui. */
export interface AtualizarEmpresaDados {
  razaoSocial?: string;
  nomeFantasia?: string;
  descricao?: string;
  setor?: string;
  porte?: PorteEmpresa;
  site?: string;
  cidade?: string;
  estado?: string;
  endereco?: string;
  cep?: string;
  culturaInclusiva?: string;
}
