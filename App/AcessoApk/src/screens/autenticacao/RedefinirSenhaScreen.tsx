import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text } from "react-native";

import { anunciarParaLeitorDeTela } from "../../acessibilidade";
import { AutenticacaoService } from "../../autenticacao";
import { Botao, Cartao, CampoTexto, ContainerTela } from "../../components/ui";
import { extrairMensagemErro } from "../../services/api/erros";
import { useTema } from "../../tema";

/**
 * Segunda etapa da recuperação de senha: código de 6 dígitos e nova senha. A regra de senha forte
 * fica no backend (`validarRedefinirSenha`); aqui só se confere o preenchimento e a confirmação, e
 * qualquer recusa aparece pela mensagem de erro da API.
 */
export function RedefinirSenhaScreen({
  emailInicial,
  onVoltar,
  onConcluido,
}: {
  emailInicial: string;
  onVoltar: () => void;
  onConcluido: () => void;
}) {
  const { tema } = useTema();
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
      await AutenticacaoService.redefinirSenha({ email: email.trim(), codigo: codigo.trim(), novaSenha });
      setConcluido(true);
      // O card de sucesso substitui o formulário inteiro, então uma `accessibilityLiveRegion` não
      // teria um nó estável para anunciar; `anunciarParaLeitorDeTela` avisa o TalkBack da mudança.
      anunciarParaLeitorDeTela("Senha redefinida com sucesso.");
    } catch (erroRequisicao) {
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível redefinir sua senha. Tente novamente."));
    } finally {
      setCarregando(false);
    }
  }

  if (concluido) {
    return (
      <ContainerTela>
        <Cartao elevacao="md" style={{ gap: tema.spacing.md, marginTop: tema.spacing["2xl"] }}>
          <Text style={[tema.typography.title, { color: tema.colors.textPrimary }]}>Senha redefinida</Text>
          <Text style={[tema.typography.body, { color: tema.colors.textSecondary }]}>
            Sua senha foi alterada. Você já pode entrar com a nova senha.
          </Text>
          <Botao onPress={onConcluido}>Ir para o login</Botao>
        </Cartao>
      </ContainerTela>
    );
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
          <Text style={[tema.typography.heading, { color: tema.colors.textPrimary }]}>Redefinir senha</Text>

          <Cartao elevacao="md" style={{ gap: tema.spacing.md }}>
            <CampoTexto
              rotulo="E-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!carregando}
            />
            <CampoTexto
              rotulo="Código"
              placeholder="000000"
              value={codigo}
              onChangeText={setCodigo}
              keyboardType="number-pad"
              maxLength={6}
              editable={!carregando}
            />
            <CampoTexto
              rotulo="Nova senha"
              value={novaSenha}
              onChangeText={setNovaSenha}
              secureTextEntry
              textContentType="newPassword"
              editable={!carregando}
            />
            <CampoTexto
              rotulo="Confirmar nova senha"
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
              secureTextEntry
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={() => void redefinir()}
              editable={!carregando}
              erro={erro ?? undefined}
            />
            <Botao onPress={() => void redefinir()} carregando={carregando} disabled={carregando}>
              Redefinir senha
            </Botao>
            <Botao variant="ghost" onPress={onVoltar} disabled={carregando}>
              Voltar
            </Botao>
          </Cartao>
        </ScrollView>
      </KeyboardAvoidingView>
    </ContainerTela>
  );
}
