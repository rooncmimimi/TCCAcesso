/** Tipos do Bloco 3: ambiente de trabalho, entrevista adaptável e vídeo da vaga. */

export interface OpcaoDoCatalogo {
  valor: string;
  rotulo: string;
}

export interface CaracteristicaSensorial {
  chave: string;
  rotulo: string;
  opcoes: OpcaoDoCatalogo[];
}

export interface CatalogoDoAmbiente {
  ambienteSensorial: CaracteristicaSensorial[];
  itensFisicos: { chave: string; rotulo: string }[];
  situacoesFisicas: OpcaoDoCatalogo[];
  origensFisicas: OpcaoDoCatalogo[];
  entrevista: { chave: string; rotulo: string }[];
}

/** Prévia sensorial: só o que a empresa informou. Chave ausente = a empresa não informou. */
export type AmbienteSensorial = Partial<Record<string, string>> & { rotina?: string };

export type SituacaoFisica = "sim" | "parcial" | "nao";

export interface ItemFisico {
  situacao: SituacaoFisica;
  /** "verificado" só a moderação marca; a empresa apenas declara. */
  origem: "declarado" | "verificado";
  detalhe?: string;
  verificadoEm?: string;
}

/** Mapa de acessibilidade física: item ausente = a empresa não informou. */
export type AcessibilidadeFisica = Partial<Record<string, ItemFisico>>;

export interface MidiaDaVaga {
  id: string;
  descricao: string | null;
  transcricao: string;
  legendaVtt: string | null;
  video: { url: string | null; expiraEm: string | null; tipoMime: string };
}
