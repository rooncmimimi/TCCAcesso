import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text } from "react-native";

import { AutenticacaoService } from "../../autenticacao";
import { Botao, Cartao, CampoTexto, ContainerTela } from "../../components/ui";
import { extrairMensagemErro } from "../../services/api/erros";
import { useTema } from "../../tema";

// Texto fixo de confirmação: o backend responde de forma deliberadamente
// genérica (não revela se o e-mail existe na base); se a resposta trouxer
// uma `mensagem` própria, ela é usada; senão, cai neste texto equivalente.
const MENSAGEM_PADRAO =
  "Se encontrarmos uma conta associada a este e-mail, enviaremos as instruções para recuperação.";

/** Primeira etapa da recuperação de senha: pede o e-mail para o backend enviar o código. */
export function RecuperarSenhaScreen({
  onVoltar,
  onTenhoCodigo,
}: {
  onVoltar: () => void;
  onTenhoCodigo: (email: string) => void;
}) {
  const { tema } = useTema();
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
      const resposta = await AutenticacaoService.esqueciSenha(email.trim());
      setMensagemEnviada(resposta.mensagem ?? MENSAGEM_PADRAO);
    } catch (erroRequisicao) {
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível enviar. Tente novamente."));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <ContainerTela>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            gap: tema.spacing.lg,
            paddingVertical: tema.spacing.xl,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[tema.typography.heading, { color: tema.colors.textPrimary }]}>Recuperar senha</Text>

          <Cartao elevacao="md" style={{ gap: tema.spacing.md }}>
            {mensagemEnviada ? (
              // `accessibilityLiveRegion` avisa o TalkBack de que a confirmação apareceu; sem isso,
              // quem usa leitor de tela só a encontraria explorando a tela.
              <Text
                accessibilityLiveRegion="polite"
                style={[tema.typography.body, { color: tema.colors.textSecondary }]}
              >
                {mensagemEnviada}
              </Text>
            ) : (
              <>
                <Text style={[tema.typography.bodySmall, { color: tema.colors.textMuted }]}>
                  Informe o e-mail da sua conta para receber um código de recuperação.
                </Text>
                <CampoTexto
                  rotulo="E-mail"
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
                  erro={erro ?? undefined}
                />
                <Botao onPress={() => void enviar()} carregando={carregando} disabled={carregando}>
                  Enviar instruções
                </Botao>
              </>
            )}

            <Botao variant="outline" onPress={() => onTenhoCodigo(email.trim())} disabled={carregando}>
              Já tenho um código
            </Botao>
            <Botao variant="ghost" onPress={onVoltar} disabled={carregando}>
              Voltar para o login
            </Botao>
          </Cartao>
        </ScrollView>
      </KeyboardAvoidingView>
    </ContainerTela>
  );
}
