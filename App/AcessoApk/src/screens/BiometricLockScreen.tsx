import type { LocalAuthenticationResult } from "expo-local-authentication";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { announceForAccessibility } from "../accessibility";
import { useAuth } from "../auth";
import { Button, Card, ScreenContainer } from "../components/ui";
import { useSeguranca } from "../seguranca";
import { useTheme } from "../theme";

/** Só os códigos que merecem uma mensagem PRÓPRIA — cancelamento (do usuário ou do sistema) nunca vira mensagem de erro, é só o estado neutro de "ainda bloqueado". */
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
 * Mostrada pelo `RootNavigator` no lugar do app inteiro quando
 * `precisaDesbloquear` é `true` (Fase 22) — a sessão já está autenticada,
 * só o CONTEÚDO fica trancado atrás da biometria do aparelho. Sempre com
 * uma saída garantida ("Sair"), mesmo padrão de `UnsupportedAccountScreen.tsx`
 * — nunca deixa alguém preso aqui sem jeito nenhum de recuperar a conta
 * (ex.: sensor com defeito, `lockout` prolongado).
 */
export function BiometricLockScreen() {
  const { theme } = useTheme();
  const { logout } = useAuth();
  const { desbloquear } = useSeguranca();
  const [tentando, setTentando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  /** Processa o resultado de uma tentativa (comum ao toque manual e à tentativa automática da montagem) — nunca chama `setState` antes disso, sempre depois do `await` de quem chama. */
  function processarResultado(resultado: LocalAuthenticationResult) {
    const mensagem = mensagemDoErro(resultado);
    if (mensagem) {
      setErro(mensagem);
    } else if (resultado.success) {
      announceForAccessibility("Desbloqueado.");
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

  // Tenta desbloquear sozinho assim que a tela aparece — poupa um toque
  // extra na maioria das vezes; o botão continua ali pra quem cancelou ou
  // quer tentar de novo (o sistema não reabre o prompt sozinho). Função
  // INLINE dentro do próprio efeito (mesmo padrão de `AuthProvider.tsx`/
  // `HomeScreen.tsx`) — nunca `setState` antes do primeiro `await` (aqui,
  // nenhum: só depois que `desbloquear()` já resolveu), o que evita o lint
  // `react-hooks/set-state-in-effect` sem precisar de um `setTentando`
  // (a tentativa automática nem precisa do spinner — o próprio prompt
  // nativo já aparece quase instantaneamente).
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
    <ScreenContainer>
      <View style={{ flex: 1, justifyContent: "center", gap: theme.spacing.lg }}>
        <Card elevation="md" style={{ gap: theme.spacing.sm }}>
          <Text style={[theme.typography.heading, { color: theme.colors.textPrimary }]}>ACESSO bloqueado</Text>
          <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>
            Use sua biometria para continuar de onde parou.
          </Text>
          {erro ? (
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[theme.typography.bodySmall, { color: theme.colors.error.solid }]}
            >
              {erro}
            </Text>
          ) : null}
        </Card>
        <Button onPress={() => void tentar()} loading={tentando} disabled={tentando}>
          Desbloquear
        </Button>
        <Button variant="ghost" onPress={() => void logout()} disabled={tentando}>
          Sair
        </Button>
      </View>
    </ScreenContainer>
  );
}
