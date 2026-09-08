import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text } from "react-native";

import { announceForAccessibility } from "../../accessibility";
import { AuthService } from "../../auth";
import { Button, Card, Input, ScreenContainer } from "../../components/ui";
import { getFriendlyErrorMessage } from "../../services/api/errors";
import { useTheme } from "../../theme";

/**
 * Segunda etapa da recuperação de senha: código de 6 dígitos + nova senha.
 * Não duplica aqui nenhuma regra de complexidade de senha do backend — a
 * auditoria da Fase 3 não confirmou uma regra própria para este endpoint
 * específico (`/auth/senha/redefinir`), então só valida o que é
 * inequivocamente do frontend (campos preenchidos, confirmação igual à
 * senha) e deixa qualquer regra de política de senha aparecer via a
 * mensagem de erro real da API (Fase 3, item 23).
 */
export function ResetPasswordScreen({
  emailInicial,
  onVoltar,
  onConcluido,
}: {
  emailInicial: string;
  onVoltar: () => void;
  onConcluido: () => void;
}) {
  const { theme } = useTheme();
  const [email, setEmail] = useState(emailInicial);
  const [codigo, setCodigo] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [concluido, setConcluido] = useState(false);

  async function redefinir() {
    if (carregando) return;

    if (!email.trim() || !codigo.trim() || !novaSenha) {
      setErro("Preencha todos os campos.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      await AuthService.redefinirSenha({ email: email.trim(), codigo: codigo.trim(), novaSenha });
      setConcluido(true);
      // O card de sucesso substitui o formulário inteiro (não é um texto
      // aparecendo dentro da MESMA árvore já montada, como os outros erros/
      // confirmações desta fase) — uma `accessibilityLiveRegion` não
      // ajudaria aqui. `announceForAccessibility` (Fase 5, sem nenhuma tela
      // usando até agora) é a ferramenta certa para exatamente este caso:
      // avisar o TalkBack de uma mudança que uma região de anúncio não
      // cobre (Fase 7, item 26).
      announceForAccessibility("Senha redefinida com sucesso.");
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível redefinir sua senha. Tente novamente."));
    } finally {
      setCarregando(false);
    }
  }

  if (concluido) {
    return (
      <ScreenContainer>
        <Card elevation="md" style={{ gap: theme.spacing.md, marginTop: theme.spacing["2xl"] }}>
          <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]}>Senha redefinida</Text>
          <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>
            Sua senha foi alterada. Você já pode entrar com a nova senha.
          </Text>
          <Button onPress={onConcluido}>Ir para o login</Button>
        </Card>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            gap: theme.spacing.lg,
            paddingVertical: theme.spacing.xl,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[theme.typography.heading, { color: theme.colors.textPrimary }]}>Redefinir senha</Text>

          <Card elevation="md" style={{ gap: theme.spacing.md }}>
            <Input
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!carregando}
            />
            <Input
              label="Código"
              placeholder="000000"
              value={codigo}
              onChangeText={setCodigo}
              keyboardType="number-pad"
              maxLength={6}
              editable={!carregando}
            />
            <Input
              label="Nova senha"
              value={novaSenha}
              onChangeText={setNovaSenha}
              secureTextEntry
              textContentType="newPassword"
              editable={!carregando}
            />
            <Input
              label="Confirmar nova senha"
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
              secureTextEntry
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={() => void redefinir()}
              editable={!carregando}
              error={erro ?? undefined}
            />
            <Button onPress={() => void redefinir()} loading={carregando} disabled={carregando}>
              Redefinir senha
            </Button>
            <Button variant="ghost" onPress={onVoltar} disabled={carregando}>
              Voltar
            </Button>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
