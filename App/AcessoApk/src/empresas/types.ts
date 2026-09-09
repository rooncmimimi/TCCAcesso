/**
 * Tipos do contrato real de empresa (Site/Backend), conforme auditoria da
 * Fase 14 (leitura pública, usada por `PublicProfileScreen`) e da Fase 18
 * (gestão da própria empresa — `EmpresaController`/`EmpresaService`,
 * `empresaValidator.js`).
 *
 * IMPORTANTE (achado da Fase 12, reaplicado aqui): o payload de atualização
 * (`AtualizarEmpresaDados`) é uma interface EXPLÍCITA, nunca derivada via
 * `Omit<EmpresaResumo, ...>` — `EmpresaResumo` tem um índice `[chave:
 * string]: unknown`, e `Omit` sobre um tipo com índice colapsa `keyof` para
 * `string`, perdendo toda checagem de campo obrigatório/nome errado
 * silenciosamente (bug real encontrado e documentado na Fase 12).
 *
 * Upload de logo/capa (`PATCH /empresas/:id/logo|capa`, multipart) fica de
 * fora desta fase de propósito — mesma decisão já tomada para foto de
 * perfil do candidato (Fase 12): exigiria `expo-image-picker` (dependência
 * nova de câmera/galeria), e o próprio roteiro já reserva mídia para a Fase
 * 20 (Feed completo — mídia + Socket.IO). Editar dados de texto da empresa
 * não depende disso.
 */
/** `Empresa.statusAprovacao` — controla o que a própria empresa pode fazer (`utils/authorization.js: garantirEmpresaAprovada`). Quase toda ação de auto-gestão (editar perfil, logo/capa, vagas, candidaturas) exige `"aprovada"`. */
export type StatusAprovacaoEmpresa = "pendente" | "aprovada" | "reprovada" | "suspensa";

export type PorteEmpresa = "MEI" | "Micro" | "Pequena" | "Media" | "Grande";

export interface EmpresaResumo {
  id: string;
  usuarioId: string;
  nomeFantasia?: string | null;
  razaoSocial: string;
  /** Só exibição — nunca editável pela própria empresa (exclusivo de administrador no backend). */
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

/** `PUT /empresas/:id` — só os campos que a PRÓPRIA empresa pode editar (`EmpresaService.CAMPOS_EDITAVEIS`); `cnpj`/`empresaVerificada` são exclusivos de administrador, nem aparecem aqui. */
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
