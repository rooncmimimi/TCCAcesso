/** Perfis de usuário suportados pela plataforma. */
export type TipoUsuario = "candidato" | "empresa" | "administrador";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: TipoUsuario;
  ativo: boolean;
  fotoUrl?: string | null;
  criadoEm?: string;
}

export interface CredenciaisLogin {
  email: string;
  senha: string;
}

export interface RespostaLogin {
  token: string;
  usuario: Usuario;
}

export type ModalidadeVaga = "presencial" | "hibrido" | "remoto";

export interface Vaga {
  id: string;
  titulo: string;
  descricao: string;
  cidade?: string | null;
  estado?: string | null;
  modalidade: ModalidadeVaga;
  salario?: number | null;
  exclusivaPcd: boolean;
  ativa: boolean;
  criadoEm?: string;
  empresa?: {
    id: string;
    nomeFantasia: string;
    logoUrl?: string | null;
  };
}

export type StatusCandidatura = "pendente" | "em_analise" | "aprovada" | "reprovada";

export interface Candidatura {
  id: string;
  status: StatusCandidatura;
  criadoEm: string;
  vaga?: Vaga;
}
