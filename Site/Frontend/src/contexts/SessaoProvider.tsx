import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import autenticacaoService from "@/services/autenticacao.service";
import { aoExpirarSessao, limparTokens, obterAccessToken } from "@/services/api";
import { conectarSocket, desconectarSocket } from "@/services/socket";
import acessibilidadeService, {
  preferenciasDaApi,
  preferenciasParaApi,
} from "@/services/acessibilidade.service";
import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import { aoEscolherIdioma, definirIdioma, ehIdioma, obterIdioma } from "@/i18n";
import type { TipoUsuario, Usuario } from "@/types";
import { type UsuarioSessao, type SessaoContextValue, SessaoContext } from "@/contexts/SessaoContext";

function normalizarUsuarioSessao(usuario: Usuario | (Usuario & Record<string, unknown>)): UsuarioSessao {
  const bruto = usuario as Usuario & Record<string, unknown>;
  return {
    ...bruto,
    tipo: (bruto.tipo ?? (bruto.tipoUsuario as TipoUsuario) ?? "candidato") as TipoUsuario,
    titulo: (bruto.titulo as string | null) ?? null,
    cidade: (bruto.cidade as string | null) ?? null,
    onboarded: Boolean(bruto.onboarded ?? true),
  };
}

/**
 * No login e ao recarregar a página, o idioma salvo na conta passa a valer na interface — é o que
 * faz a escolha acompanhar a pessoa de um aparelho para outro. A origem `"conta"` impede que essa
 * troca volte ao servidor como se a pessoa tivesse acabado de escolher (ver `i18n/estado.ts`).
 */
function adotarIdiomaDaConta(usuario: Usuario) {
  if (ehIdioma(usuario.idioma) && usuario.idioma !== obterIdioma()) {
    definirIdioma(usuario.idioma, "conta");
  }
}

/**
 * Sessão do Site: carrega o perfil a partir do token salvo e conecta o socket, entra, cadastra e
 * sai, e reage quando a API encerra a sessão. No login e no cadastro, também sincroniza as
 * preferências de acessibilidade com a conta.
 */
export function SessaoProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSessao | null>(null);
  const [inicializado, setInicializado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const { preferencias, salvar } = useAcessibilidade();
  const prefsRef = useRef(preferencias);
  prefsRef.current = preferencias;

  const carregarPerfil = useCallback(async () => {
    if (!obterAccessToken()) {
      setUsuario(null);
      return;
    }
    try {
      setCarregando(true);
      const perfil = await autenticacaoService.perfilAtual();
      adotarIdiomaDaConta(perfil);
      setUsuario(normalizarUsuarioSessao(perfil));
      conectarSocket();
    } catch {
      limparTokens();
      setUsuario(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarPerfil().finally(() => setInicializado(true));
  }, [carregarPerfil]);

  useEffect(() => {
    // Só a escolha feita na interface chega aqui (`origem: "usuario"`); adotar o idioma da conta não
    // dispara este aviso, então não há laço. Falha em silêncio: o idioma já mudou na tela e a conta
    // se acerta na próxima escolha.
    return aoEscolherIdioma((novo) => {
      if (!obterAccessToken()) return;
      void autenticacaoService.alterarIdioma(novo).catch(() => {});
    });
  }, []);

  useEffect(() => {
    // `motivo` só vem quando a sessão acabou por bloqueio da conta (ver `services/api.ts`); nesse
    // caso mostra a mensagem do backend, em vez do encerramento silencioso, que pareceria só uma
    // sessão expirada.
    return aoExpirarSessao((motivo) => {
      desconectarSocket();
      setUsuario(null);
      if (motivo) {
        toast.error(motivo, { duration: 10_000 });
      }
    });
  }, []);

  const aposAutenticar = useCallback((usuario: Usuario) => {
    adotarIdiomaDaConta(usuario);
    const normalizado = normalizarUsuarioSessao(usuario);
    setUsuario(normalizado);
    conectarSocket();
    return normalizado;
  }, []);

  // Sincroniza a acessibilidade no login e no cadastro sem nunca atrapalhar a autenticação: roda
  // depois de `aposAutenticar` confirmar a sessão, e qualquer falha só vai para o console.
  const sincronizarNoLogin = useCallback(async () => {
    try {
      const dto = await acessibilidadeService.obter();
      const parcial = preferenciasDaApi(dto);
      // A conta é a fonte de verdade no login: sobrescreve o que estava
      // só localmente (ex.: outro dispositivo, ou um visitante que usou
      // este navegador antes de logar em outra conta).
      salvar({ ...prefsRef.current, ...parcial });
    } catch (erro) {
      console.error("Falha ao sincronizar preferências de acessibilidade no login:", erro);
    }
  }, [salvar]);

  const sincronizarNoCadastro = useCallback(async () => {
    try {
      // A escolha feita como visitante, imediatamente antes do cadastro,
      // prevalece: empurra o estado local para a conta recém-criada.
      await acessibilidadeService.salvar(preferenciasParaApi(prefsRef.current));
    } catch (erro) {
      console.error("Falha ao sincronizar preferências de acessibilidade no cadastro:", erro);
    }
  }, []);

  const valorContexto = useMemo<SessaoContextValue>(
    () => ({
      usuario,
      inicializado,
      carregando,
      autenticado: Boolean(usuario),
      entrar: async (credenciais) => {
        const resposta = await autenticacaoService.entrar(credenciais);
        if ("contaPausada" in resposta || "emailNaoVerificado" in resposta) {
          return resposta;
        }
        const normalizado = aposAutenticar(resposta.usuario);
        void sincronizarNoLogin();
        return normalizado;
      },
      registrarCandidato: async (payload) => {
        const resposta = await autenticacaoService.registrarCandidato(payload);
        if ("pendenteVerificacaoEmail" in resposta) return resposta;
        const normalizado = aposAutenticar(resposta.usuario);
        void sincronizarNoCadastro();
        return normalizado;
      },
      registrarEmpresa: async (payload) => {
        const resposta = await autenticacaoService.registrarEmpresa(payload);
        if ("pendenteVerificacaoEmail" in resposta) return resposta;
        const normalizado = aposAutenticar(resposta.usuario);
        void sincronizarNoCadastro();
        return normalizado;
      },
      sair: async () => {
        try {
          await autenticacaoService.sair();
        } finally {
          desconectarSocket();
          setUsuario(null);
        }
      },
      atualizar: (patch) => setUsuario((atual) => (atual ? { ...atual, ...patch } : atual)),
      recarregar: carregarPerfil,
    }),
    [usuario, inicializado, carregando, aposAutenticar, carregarPerfil, sincronizarNoLogin, sincronizarNoCadastro],
  );

  return <SessaoContext.Provider value={valorContexto}>{children}</SessaoContext.Provider>;
}
