import type { LocalAuthenticationResult } from "expo-local-authentication";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { anunciarParaLeitorDeTela } from "../acessibilidade";
import { useAutenticacao } from "../autenticacao";
import { Botao, Cartao, ContainerTela } from "../components/ui";
import { useSeguranca } from "../seguranca";
import { useTema } from "../tema";

/** Só os códigos que merecem uma mensagem própria: cancelamento (do usuário ou do sistema) nunca vira mensagem de erro, é só o estado neutro de "ainda bloqueado". */
function mensagemDoErro(resultado: LocalAuthenticationResult): string | null {
  if (resultado.success) return null;
  switch (resultado.error) {
    case "user_cancel":
    case "app_cancel":
    case "system_cancel":
      return null;
    case "lockout":
      return "Muitas tentativas. Aguarde um momento e tente de novo, ou desbloqueie com a senha/PIN do aparelho.";
    case "not_enrolled":
      return "Nenhuma biometria cadastrada neste aparelho no momento.";
    case "not_available":
      return "A verificação por biometria não está disponível agora.";
    default:
      return "Não foi possível verificar sua identidade. Tente novamente.";
  }
}

/**
 * Tela de desbloqueio mostrada pelo `RaizNavigator` quando `precisaDesbloquear` é `true`: a sessão
 * já está autenticada, só o conteúdo fica atrás da biometria. Sempre tem a saída "Sair", como
 * `ContaNaoSuportadaScreen.tsx`, para ninguém ficar preso com um sensor com defeito ou bloqueado.
 */
export function BloqueioBiometricoScreen() {
  const { tema } = useTema();
  const { sair } = useAutenticacao();
  const { desbloquear } = useSeguranca();
  const [tentando, setTentando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  /** Processa o resultado de uma tentativa (comum ao toque manual e à tentativa automática da montagem): nunca chama `setState` antes disso, sempre depois do `await` de quem chama. */
  function processarResultado(resultado: LocalAuthenticationResult) {
    const mensagem = mensagemDoErro(resultado);
    if (mensagem) {
      setErro(mensagem);
    } else if (resultado.success) {
      anunciarParaLeitorDeTela("Desbloqueado.");
    }
  }

  async function tentar() {
    if (tentando) return;
    setTentando(true);
    setErro(null);
    try {
      processarResultado(await desbloquear());
    } finally {
      setTentando(false);
    }
  }

  // Pede a biometria assim que a tela aparece, poupando um toque; o botão continua ali para quem
  // cancelou, já que o sistema não reabre o pedido sozinho. A função fica dentro do efeito e só
  // altera estado depois do `await`, o que evita o aviso `react-hooks/set-state-in-effect`; a
  // tentativa automática não precisa de indicador, porque o pedido nativo aparece quase na hora.
  useEffect(() => {
    let cancelado = false;

    async function tentarNaMontagem() {
      const resultado = await desbloquear();
      if (cancelado) return;
      processarResultado(resultado);
    }

    void tentarNaMontagem();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só na montagem, de propósito.
  }, []);

  return (
    <ContainerTela>
      <View style={{ flex: 1, justifyContent: "center", gap: tema.spacing.lg }}>
        <Cartao elevacao="md" style={{ gap: tema.spacing.sm }}>
          <Text style={[tema.typography.heading, { color: tema.colors.textPrimary }]}>ACESSO bloqueado</Text>
          <Text style={[tema.typography.body, { color: tema.colors.textSecondary }]}>
            Use sua biometria para continuar de onde parou.
          </Text>
          {erro ? (
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[tema.typography.bodySmall, { color: tema.colors.error.solid }]}
            >
              {erro}
            </Text>
          ) : null}
        </Cartao>
        <Botao onPress={() => void tentar()} carregando={tentando} disabled={tentando}>
          Desbloquear
        </Botao>
        <Botao variant="ghost" onPress={() => void sair()} disabled={tentando}>
          Sair
        </Botao>
      </View>
    </ContainerTela>
  );
}
