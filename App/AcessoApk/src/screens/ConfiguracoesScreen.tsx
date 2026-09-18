import { useEffect, useState } from "react";
import { ScrollView } from "react-native";

import { AutenticacaoService } from "../autenticacao";
import type { SessaoAtiva } from "../autenticacao";
import { EstadoErro, EstadoCarregamento, ContainerTela } from "../components/ui";
import type { PreferenciasNotificacao } from "../configuracoes";
import { ConfiguracoesService } from "../configuracoes";
import { extrairMensagemErro } from "../services/api/erros";
import { useTema } from "../tema";
import { SecaoPrivacidade } from "./configuracoes/SecaoPrivacidade";
import { SecaoNotificacoes } from "./configuracoes/SecaoNotificacoes";
import { SecaoSenha } from "./configuracoes/SecaoSenha";
import { SecaoEmail } from "./configuracoes/SecaoEmail";
import { SecaoSessoes } from "./configuracoes/SecaoSessoes";
import { SecaoExportarDados } from "./configuracoes/SecaoExportarDados";
import { SecaoBiometria } from "./configuracoes/SecaoBiometria";
import { SecaoZonaDePerigo } from "./configuracoes/SecaoZonaDePerigo";

/**
 * Configurações da conta, divididas em seções. Cada seção usa só o serviço de que precisa
 * (`AutenticacaoService` para `/auth/*`, `ConfiguracoesService` para privacidade e notificações).
 * Regras como senha forte e formato de e-mail ficam no backend; aqui só se valida o que é da
 * interface.
 */
export function ConfiguracoesScreen() {
  const { tema } = useTema();

  const [sessoes, setSessoes] = useState<SessaoAtiva[]>([]);
  const [prefsNotificacao, setPrefsNotificacao] = useState<PreferenciasNotificacao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        const [sessoesRes, prefsRes] = await Promise.all([
          AutenticacaoService.listarSessoes(),
          ConfiguracoesService.obterPreferenciasNotificacao(),
        ]);
        if (cancelado) return;
        setSessoes(sessoesRes);
        setPrefsNotificacao(prefsRes);
      } catch (erroRequisicao) {
        if (cancelado) return;
        setErro(extrairMensagemErro(erroRequisicao, "Não foi possível carregar suas configurações."));
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }

    void carregar();
    return () => {
      cancelado = true;
    };
  }, [tentativa]);

  function tentarNovamente() {
    setErro(null);
    setCarregando(true);
    setTentativa((valor) => valor + 1);
  }

  if (carregando) {
    return <EstadoCarregamento />;
  }

  if (erro && sessoes.length === 0 && !prefsNotificacao) {
    return <EstadoErro titulo="Não foi possível carregar suas configurações" mensagem={erro} onTentarNovamente={tentarNovamente} />;
  }

  return (
    <ContainerTela>
      <ScrollView contentContainerStyle={{ gap: tema.spacing.xl, paddingVertical: tema.spacing.lg }}>
        <SecaoPrivacidade tema={tema} />
        <SecaoExportarDados tema={tema} />
        {prefsNotificacao ? (
          <SecaoNotificacoes tema={tema} prefs={prefsNotificacao} onAtualizar={setPrefsNotificacao} />
        ) : null}
        <SecaoSenha tema={tema} />
        <SecaoEmail tema={tema} />
        <SecaoSessoes tema={tema} sessoes={sessoes} onAtualizarLista={setSessoes} />
        <SecaoBiometria tema={tema} />
        <SecaoZonaDePerigo tema={tema} />
      </ScrollView>
    </ContainerTela>
  );
}
