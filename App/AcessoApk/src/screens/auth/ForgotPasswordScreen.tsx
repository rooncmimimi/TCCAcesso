import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text } from "react-native";

import { AuthService } from "../../auth";
import { Button, Card, Input, ScreenContainer } from "../../components/ui";
import { getFriendlyErrorMessage } from "../../services/api/errors";
import { useTheme } from "../../theme";

// Texto fixo de confirmação: o backend responde de forma deliberadamente
// genérica (não revela se o e-mail existe na base) — se a resposta trouxer
// uma `mensagem` própria, ela é usada; senão, cai neste texto equivalente.
const MENSAGEM_PADRAO =
  "Se encontrarmos uma conta associada a este e-mail, enviaremos as instruções para recuperação.";

export function ForgotPasswordScreen({
  onVoltar,
  onTenhoCodigo,
}: {
  onVoltar: () => void;
  onTenhoCodigo: (email: string) => void;
}) {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemEnviada, setMensagemEnviada] = useState<string | null>(null);

  async function enviar() {
    if (carregando) return;

    if (!email.trim()) {
      setErro("Informe seu e-mail.");
      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      const resposta = await AuthService.esqueciSenha(email.trim());
      setMensagemEnviada(resposta.mensagem ?? MENSAGEM_PADRAO);
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível enviar. Tente novamente."));
    } finally {
      setCarregando(false);
    }
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
          <Text style={[theme.typography.heading, { color: theme.colors.textPrimary }]}>Recuperar senha</Text>

          <Card elevation="md" style={{ gap: theme.spacing.md }}>
            {mensagemEnviada ? (
              // Fase 7: sem `accessibilityLiveRegion`, um usuário de TalkBack
              // que apertou "Enviar instruções" não era avisado de que a
              // mensagem de confirmação apareceu — só descobriria explorando
              // a tela manualmente depois.
              <Text
                accessibilityLiveRegion="polite"
                style={[theme.typography.body, { color: theme.colors.textSecondary }]}
              >
                {mensagemEnviada}
              </Text>
            ) : (
              <>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]}>
                  Informe o e-mail da sua conta para receber um código de recuperação.
                </Text>
                <Input
                  label="E-mail"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChangeText={(texto) => {
                    setEmail(texto);
                    if (erro) setErro(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={() => void enviar()}
                  editable={!carregando}
                  error={erro ?? undefined}
                />
                <Button onPress={() => void enviar()} loading={carregando} disabled={carregando}>
                  Enviar instruções
                </Button>
              </>
            )}

            <Button variant="outline" onPress={() => onTenhoCodigo(email.trim())} disabled={carregando}>
              Já tenho um código
            </Button>
            <Button variant="ghost" onPress={onVoltar} disabled={carregando}>
              Voltar para o login
            </Button>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
