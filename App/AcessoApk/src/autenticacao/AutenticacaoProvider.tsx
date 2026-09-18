import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { registrarDispositivoParaPush, removerDispositivoDoPush } from "../notificacoes";
import { definirUsuarioObservabilidade } from "../observabilidade";
import { limparSessao, registrarOuvinteFimSessao, definirSessao, type MotivoFimSessao } from "../services/api/cliente";
import { desconectarSocket } from "../services/socket/socketClient";
import { limparTokens, obterTokens } from "../armazenamento/armazenamentoSeguro";
import { AutenticacaoContext, type AutenticacaoContextValue } from "./AutenticacaoContext";
import { AutenticacaoService } from "./AutenticacaoService";
import type {
  StatusAutenticacao,
  UsuarioAutenticado,
  CadastroCandidatoDados,
  CadastroEmpresaDados,
  CadastroResposta,
  Credenciais,
  LoginResposta,
} from "./types";

/**
 * O app não tem área administrativa. Uma conta de administrador entra normalmente no backend, mas
 * aqui fica com o status `naoSuportado`, e a tela explica que essa conta deve usar o Site.
 */
function tipoSuportado(usuario: UsuarioAutenticado): boolean {
  return usuario.tipoUsuario !== "administrador";
}

/**
 * Sessão do app: restaura os tokens salvos ao abrir, entra, cadastra e sai. Também registra este
 * aparelho para push e identifica o usuário no Sentry enquanto a sessão estiver ativa.
 */
export function AutenticacaoProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<StatusAutenticacao>("carregando");
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null);
  const [motivoFimSessao, setMotivoFimSessao] = useState<MotivoFimSessao | null>(null);

  // O `clienteApi` avisa por aqui quando encerra a sessão sozinho (renovação falhou ou conta
  // bloqueada em uso). Sem isso, o app continuaria como autenticado com tokens que já foram
  // descartados.
  useEffect(() => {
    registrarOuvinteFimSessao((motivo) => {
      setMotivoFimSessao(motivo);
      setUsuario(null);
      setStatus("naoAutenticado");
      // Sessão encerrada não pode deixar o socket autenticado aberto, nem quando foi o próprio
      // handshake do socket que descobriu o bloqueio.
      desconectarSocket();
      // Os próximos erros enviados ao Sentry não devem ficar associados à conta que saiu.
      definirUsuarioObservabilidade(null);
    });
    return () => registrarOuvinteFimSessao(null);
  }, []);

  // Ao abrir o app, o status só sai de `carregando` depois de validar o token salvo. Assim a tela
  // de login não aparece por um instante para quem já tem sessão.
  useEffect(() => {
    let cancelado = false;

    async function restaurar() {
      const tokens = await obterTokens();

      if (!tokens) {
        if (!cancelado) setStatus("naoAutenticado");
        return;
      }

      definirSessao(tokens);

      try {
        const usuarioAtual = await AutenticacaoService.obterUsuarioAtual();
        if (cancelado) return;

        setUsuario(usuarioAtual);
        const suportado = tipoSuportado(usuarioAtual);
        setStatus(suportado ? "autenticado" : "naoSuportado");
        definirUsuarioObservabilidade(usuarioAtual.id);
        // Registro para push em segundo plano; não atrasa a restauração da sessão.
        if (suportado) void registrarDispositivoParaPush();
      } catch {
        if (cancelado) return;
        limparSessao();
        await limparTokens();
        setStatus("naoAutenticado");
      }
    }

    void restaurar();
    return () => {
      cancelado = true;
    };
  }, []);

  /** Aplica a sessão quando a resposta traz token. Serve para o login e para as duas formas de cadastro. */
  const aplicarSessaoSeHouver = useCallback((resposta: LoginResposta | CadastroResposta) => {
    if ("token" in resposta) {
      setMotivoFimSessao(null);
      setUsuario(resposta.usuario);
      const suportado = tipoSuportado(resposta.usuario);
      setStatus(suportado ? "autenticado" : "naoSuportado");
      definirUsuarioObservabilidade(resposta.usuario.id);
      if (suportado) void registrarDispositivoParaPush();
    }
  }, []);

  const entrar = useCallback(
    async (credenciais: Credenciais): Promise<LoginResposta> => {
      const resposta = await AutenticacaoService.entrar(credenciais);
      aplicarSessaoSeHouver(resposta);
      return resposta;
    },
    [aplicarSessaoSeHouver],
  );

  const cadastrarCandidato = useCallback(
    async (dados: CadastroCandidatoDados): Promise<CadastroResposta> => {
      const resposta = await AutenticacaoService.cadastrarCandidato(dados);
      aplicarSessaoSeHouver(resposta);
      return resposta;
    },
    [aplicarSessaoSeHouver],
  );

  const cadastrarEmpresa = useCallback(
    async (dados: CadastroEmpresaDados): Promise<CadastroResposta> => {
      const resposta = await AutenticacaoService.cadastrarEmpresa(dados);
      aplicarSessaoSeHouver(resposta);
      return resposta;
    },
    [aplicarSessaoSeHouver],
  );

  const sair = useCallback(async (motivo?: MotivoFimSessao) => {
    // Remove este aparelho dos pushes antes de encerrar a sessão, enquanto o token ainda vale. Se
    // falhar, a saída continua normalmente — na troca de senha o token já não vale, e é o backend
    // que apaga os tokens de push da conta.
    await removerDispositivoDoPush();
    await AutenticacaoService.sair();
    setMotivoFimSessao(motivo ?? null);
    setUsuario(null);
    setStatus("naoAutenticado");
    desconectarSocket();
    definirUsuarioObservabilidade(null);
  }, []);

  const limparMotivoFimSessao = useCallback(() => setMotivoFimSessao(null), []);

  const atualizarUsuario = useCallback(async () => {
    try {
      const usuarioAtual = await AutenticacaoService.obterUsuarioAtual();
      setUsuario(usuarioAtual);
      setStatus(tipoSuportado(usuarioAtual) ? "autenticado" : "naoSuportado");
    } catch {
      // Falha silenciosa (ver comentário em `AutenticacaoContext.ts`).
    }
  }, []);

  const valorContexto = useMemo<AutenticacaoContextValue>(
    () => ({
      status,
      usuario,
      autenticado: status === "autenticado",
      carregando: status === "carregando",
      motivoFimSessao,
      entrar,
      cadastrarCandidato,
      cadastrarEmpresa,
      sair,
      limparMotivoFimSessao,
      atualizarUsuario,
    }),
    [
      status,
      usuario,
      motivoFimSessao,
      entrar,
      cadastrarCandidato,
      cadastrarEmpresa,
      sair,
      limparMotivoFimSessao,
      atualizarUsuario,
    ],
  );

  return <AutenticacaoContext.Provider value={valorContexto}>{children}</AutenticacaoContext.Provider>;
}
