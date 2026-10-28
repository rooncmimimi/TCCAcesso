import { CodigosErro, FalhaApi, MensagensErro, encerraSessao } from '../servicos/erros';
import { desserializar, estaExpirada, type Sessao } from './sessao';

/** Onde a sessão é gravada (Keychain no iPhone; ver armazenamento.ts). */
export interface Persistencia {
  ler(): Promise<string | null>;
  gravar(texto: string): Promise<void>;
  apagar(): Promise<void>;
}

/** A chamada POST /auth/refresh (api/autenticacao.ts). */
export type AcaoRenovar = (sessao: Sessao) => Promise<Sessao>;

/** Avisado quando a sessão muda; `aviso` vem preenchido quando ela acabou sem a pessoa sair. */
export type Ouvinte = (sessao: Sessao | null, aviso: string | null) => void;

function semSessao(): FalhaApi {
  return new FalhaApi(MensagensErro.SESSAO_EXPIRADA, { status: 401, codigo: CodigosErro.SESSAO_EXPIRADA });
}

/**
 * Único lugar que guarda e renova a sessão (o RenovadorSessao do app Android).
 *
 * O refresh token da API é rotativo: a cada renovação o antigo deixa de valer e, se um token já
 * trocado for reapresentado, o servidor entende como roubo e derruba todas as sessões da conta
 * (SessaoService.rotacionar). Por isso:
 * - só existe uma renovação em andamento; quem chega durante ela recebe o mesmo resultado;
 * - quem chega com uma sessão antiga, quando já há uma renovada, recebe a renovada;
 * - falha definitiva (sessão recusada, conta bloqueada, senha alterada) apaga a sessão e avisa;
 *   falha passageira (sem internet, 429, 5xx) não apaga nada.
 */
export class GerenciadorSessao {
  private sessao: Sessao | null = null;
  private leitura: Promise<void> | null = null;
  /** true depois de um login ou saída: o que estava gravado deixa de valer. */
  private alterada = false;
  private renovacao: Promise<Sessao> | null = null;
  private readonly ouvintes = new Set<Ouvinte>();

  constructor(
    private readonly persistencia: Persistencia,
    private readonly acaoRenovar: AcaoRenovar,
  ) {}

  /**
   * Lê a sessão salva uma vez (na abertura do app) e devolve sempre a sessão atual: depois de um
   * login ou de uma renovação, é a nova, não a que estava gravada.
   */
  carregar(): Promise<Sessao | null> {
    if (!this.leitura) {
      this.leitura = this.persistencia
        .ler()
        .then(desserializar)
        .catch(() => null)
        .then((lida) => {
          // Um login ou saída feito enquanto o Keychain era lido vale mais que o que estava gravado.
          if (!this.alterada) {
            this.sessao = lida;
          }
        });
    }
    return this.leitura.then(() => this.sessao);
  }

  atual(): Sessao | null {
    return this.sessao;
  }

  async salvar(sessao: Sessao): Promise<void> {
    this.sessao = sessao;
    this.alterada = true;
    try {
      await this.persistencia.gravar(JSON.stringify(sessao));
    } catch {
      // Sem conseguir gravar, a sessão vale até o app fechar.
    }
    this.avisar(null);
  }

  /** Apaga a sessão. `aviso` é o motivo mostrado na apresentação (vazio quando a pessoa saiu). */
  async encerrar(aviso: string | null = null): Promise<void> {
    this.sessao = null;
    this.alterada = true;
    try {
      await this.persistencia.apagar();
    } catch {
      // Já saiu da memória; o que sobrar no Keychain é trocado no próximo login.
    }
    this.avisar(aviso);
  }

  ouvir(ouvinte: Ouvinte): () => void {
    this.ouvintes.add(ouvinte);
    return () => this.ouvintes.delete(ouvinte);
  }

  /** Renova a sessão. `usada` é a sessão com que o chamador tentou (pode já ter sido trocada). */
  renovar(usada: Sessao | null): Promise<Sessao> {
    if (this.renovacao) {
      return this.renovacao;
    }
    const salva = this.sessao;
    if (!salva) {
      return Promise.reject(semSessao());
    }
    if (usada && usada.refreshToken !== salva.refreshToken) {
      // Alguém já renovou: a salva é mais nova que a usada.
      return Promise.resolve(salva);
    }
    this.renovacao = this.acaoRenovar(salva)
      .then(async (renovada) => {
        await this.salvar(renovada);
        return renovada;
      })
      .catch(async (erro: unknown) => {
        if (erro instanceof FalhaApi && encerraSessao(erro.codigo)) {
          await this.encerrar(erro.message);
        }
        throw erro;
      })
      .finally(() => {
        this.renovacao = null;
      });
    return this.renovacao;
  }

  /**
   * Faz uma chamada em nome do usuário logado: renova o token vencido antes de enviar e, se a API
   * responder 401, renova uma vez e repete. Conta bloqueada ou senha alterada encerram a sessão.
   */
  async comSessao<T>(enviar: (token: string) => Promise<T>): Promise<T> {
    let sessao = await this.carregar();
    if (!sessao) {
      throw semSessao();
    }
    let jaRenovou = false;
    if (estaExpirada(sessao)) {
      sessao = await this.renovar(sessao);
      jaRenovou = true;
    }
    for (;;) {
      try {
        return await enviar(sessao.token);
      } catch (erro) {
        if (!(erro instanceof FalhaApi) || (erro.status !== 401 && erro.status !== 403)) {
          throw erro;
        }
        if (erro.codigo === CodigosErro.CONTA_BLOQUEADA || erro.codigo === CodigosErro.SENHA_ALTERADA) {
          await this.encerrar(erro.message);
          throw erro;
        }
        if (erro.status === 403) {
          // Sem permissão para esta ação (ex.: empresa ainda não aprovada); a sessão continua.
          throw erro;
        }
        if (jaRenovou) {
          await this.encerrar(MensagensErro.SESSAO_EXPIRADA);
          throw semSessao();
        }
        sessao = await this.renovar(sessao);
        jaRenovou = true;
      }
    }
  }

  private avisar(aviso: string | null): void {
    for (const ouvinte of this.ouvintes) {
      ouvinte(this.sessao, aviso);
    }
  }
}
