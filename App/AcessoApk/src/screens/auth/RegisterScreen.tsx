import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text } from "react-native";

import { announceForAccessibility } from "../../accessibility";
import { AuthService, useAuth } from "../../auth";
import { Button, Card, Input, ScreenContainer, SegmentedControl } from "../../components/ui";
import { getFriendlyErrorMessage } from "../../services/api/errors";
import { useTheme } from "../../theme";

type TipoConta = "candidato" | "empresa";

/**
 * Etapas desta MESMA tentativa de cadastro (não telas separadas navegáveis
 * pelo Stack) — mesma decisão de `LoginScreen.tsx` para "conta
 * pausada"/"e-mail não verificado": são estados de UM fluxo, não destinos
 * independentes.
 */
type Etapa = "formulario" | "confirmar-email" | "sucesso";

/** Mesma política de anúncio de transição de `LoginScreen.tsx` (Fase 8): só
 * a entrada em cada etapa nova (troca de subárvore inteira) é anunciada; o
 * caminho de volta não (o usuário acabou de tocar num botão com esse nome). */
const ANUNCIOS_TRANSICAO: Record<Exclude<Etapa, "formulario">, string> = {
  "confirmar-email": "Cadastro enviado. Confirme seu e-mail.",
  sucesso: "E-mail confirmado. Bem-vindo ao ACESSO.",
};

export function RegisterScreen({
  onVoltarParaLogin,
}: {
  onVoltarParaLogin: (emailConfirmado?: string) => void;
}) {
  const { theme } = useTheme();
  const { registerCandidato, registerEmpresa } = useAuth();

  const [etapa, setEtapa] = useState<Etapa>("formulario");
  const [tipoConta, setTipoConta] = useState<TipoConta>("candidato");

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  // Um só toggle para os dois campos (mesmo padrão de utilidade do
  // `LoginScreen.tsx`, adaptado para dois campos de senha): ver o que se
  // digitou em "Confirmar senha" é tão útil quanto em "Senha" — não faria
  // sentido esconder um e mostrar o outro.
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [cpf, setCpf] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [codigo, setCodigo] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [erroConfirmar, setErroConfirmar] = useState<string | null>(null);
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);

  // Trava síncrona contra duplo toque (mesmo padrão de `LoginScreen.tsx`) —
  // aqui é ainda mais importante: um duplo cadastro tentaria criar a mesma
  // conta duas vezes (a segunda tentativa tomaria 409 "e-mail já
  // cadastrado", um erro confuso para algo que foi só um toque duplicado).
  const enviandoRef = useRef(false);

  function irParaEtapa(nova: Exclude<Etapa, "formulario">) {
    setEtapa(nova);
    announceForAccessibility(ANUNCIOS_TRANSICAO[nova]);
  }

  async function cadastrar() {
    if (enviandoRef.current) return;

    if (!nome.trim() || !email.trim() || !senha) {
      setErro("Preencha todos os campos obrigatórios.");
      return;
    }
    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }
    if (tipoConta === "empresa" && (!cnpj.trim() || !razaoSocial.trim())) {
      setErro("Preencha o CNPJ e a razão social.");
      return;
    }

    enviandoRef.current = true;
    setCarregando(true);
    setErro(null);

    try {
      const resposta =
        tipoConta === "candidato"
          ? await registerCandidato({
              nome: nome.trim(),
              email: email.trim(),
              senha,
              telefone: telefone.trim() || undefined,
              cpf: cpf.trim() || undefined,
            })
          : await registerEmpresa({
              nome: nome.trim(),
              email: email.trim(),
              senha,
              telefone: telefone.trim() || undefined,
              cnpj: cnpj.trim(),
              razaoSocial: razaoSocial.trim(),
              nomeFantasia: nomeFantasia.trim() || undefined,
            });

      if ("pendenteVerificacaoEmail" in resposta) {
        irParaEtapa("confirmar-email");
        return;
      }
      // "token" in resposta: sessão já foi gravada pelo AuthProvider — o
      // AuthGate (RootNavigator) troca de tela sozinho quando o status
      // global muda, exatamente como o login bem-sucedido já faz. Esta tela
      // desmonta antes de qualquer coisa aqui embaixo rodar de novo.
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível concluir o cadastro agora."));
    } finally {
      enviandoRef.current = false;
      setCarregando(false);
    }
  }

  async function confirmarEmail() {
    if (confirmando || !codigo.trim()) return;
    setConfirmando(true);
    setErroConfirmar(null);
    try {
      await AuthService.confirmarCadastro(email.trim(), codigo.trim());
      irParaEtapa("sucesso");
    } catch (erroRequisicao) {
      setErroConfirmar(getFriendlyErrorMessage(erroRequisicao, "Código inválido ou expirado."));
    } finally {
      setConfirmando(false);
    }
  }

  async function reenviarCodigo() {
    if (reenviando) return;
    setReenviando(true);
    setErroConfirmar(null);
    try {
      await AuthService.reenviarConfirmacao(email.trim());
      setReenviado(true);
    } catch (erroRequisicao) {
      setErroConfirmar(getFriendlyErrorMessage(erroRequisicao, "Não foi possível reenviar o código agora."));
    } finally {
      setReenviando(false);
    }
  }

  if (etapa === "sucesso") {
    return (
      <ScreenContainer>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: theme.spacing.xl }}>
          <Card elevation="md" style={{ gap: theme.spacing.md }}>
            <Text style={[theme.typography.heading, { color: theme.colors.textPrimary }]}>
              Bem-vindo(a) ao ACESSO{nome.trim() ? `, ${nome.trim().split(" ")[0]}` : ""}!
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>
              Seu e-mail foi confirmado e sua conta já está pronta. Entre com o e-mail e a senha que você acabou de
              cadastrar para começar a usar o ACESSO.
            </Text>
            <Button onPress={() => onVoltarParaLogin(email.trim())}>Ir para o login</Button>
          </Card>
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (etapa === "confirmar-email") {
    return (
      <ScreenContainer>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center", gap: theme.spacing.lg, paddingVertical: theme.spacing.xl }}
            keyboardShouldPersistTaps="handled"
          >
            <Card elevation="md" style={{ gap: theme.spacing.md }}>
              <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]}>Confirme seu e-mail</Text>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]}>
                Enviamos um código de 6 dígitos para {email.trim()}. Verifique sua caixa de entrada (e a pasta de
                spam) e informe o código abaixo.
              </Text>

              <Input
                label="Código de confirmação"
                placeholder="000000"
                value={codigo}
                onChangeText={setCodigo}
                keyboardType="number-pad"
                maxLength={6}
                editable={!confirmando}
                error={erroConfirmar ?? undefined}
              />

              {reenviado ? (
                <Text accessibilityLiveRegion="polite" style={[theme.typography.bodySmall, { color: theme.colors.success.solid }]}>
                  Código reenviado.
                </Text>
              ) : null}

              <Button onPress={() => void confirmarEmail()} loading={confirmando} disabled={confirmando || !codigo.trim()}>
                Confirmar e-mail
              </Button>
              <Button variant="outline" onPress={() => void reenviarCodigo()} loading={reenviando} disabled={reenviando}>
                Reenviar código
              </Button>
              <Button variant="ghost" onPress={() => onVoltarParaLogin()} disabled={confirmando || reenviando}>
                Voltar para o login
              </Button>
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ gap: theme.spacing.lg, paddingVertical: theme.spacing.xl }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[theme.typography.heading, { color: theme.colors.textPrimary }]}>Criar conta</Text>

          <Card elevation="md" style={{ gap: theme.spacing.md }}>
            <SegmentedControl
              label="Tipo de conta"
              value={tipoConta}
              onChange={setTipoConta}
              options={[
                { label: "Candidato", value: "candidato" },
                { label: "Empresa", value: "empresa" },
              ]}
            />

            <Input label="Nome" value={nome} onChangeText={setNome} editable={!carregando} />
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
              label="Telefone"
              value={telefone}
              onChangeText={setTelefone}
              keyboardType="phone-pad"
              editable={!carregando}
              helperText="Opcional."
            />

            {tipoConta === "candidato" ? (
              <Input
                label="CPF"
                value={cpf}
                onChangeText={setCpf}
                keyboardType="number-pad"
                maxLength={11}
                editable={!carregando}
                helperText="Opcional — somente números."
              />
            ) : (
              <>
                <Input
                  label="CNPJ"
                  value={cnpj}
                  onChangeText={setCnpj}
                  keyboardType="number-pad"
                  maxLength={14}
                  editable={!carregando}
                  helperText="Somente números."
                />
                <Input label="Razão social" value={razaoSocial} onChangeText={setRazaoSocial} editable={!carregando} />
                <Input
                  label="Nome fantasia"
                  value={nomeFantasia}
                  onChangeText={setNomeFantasia}
                  editable={!carregando}
                  helperText="Opcional — os demais dados da empresa (logo, setor, endereço) podem ser preenchidos depois, no perfil."
                />
              </>
            )}

            <Input
              label="Senha"
              value={senha}
              onChangeText={setSenha}
              secureTextEntry={!mostrarSenha}
              textContentType="newPassword"
              editable={!carregando}
              helperText="Mínimo 8 caracteres, com letra maiúscula, minúscula, número e símbolo."
            />
            <Input
              label="Confirmar senha"
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
              secureTextEntry={!mostrarSenha}
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={() => void cadastrar()}
              editable={!carregando}
            />
            <Pressable
              onPress={() => setMostrarSenha((valor) => !valor)}
              accessibilityRole="button"
              accessibilityLabel={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              hitSlop={14}
              style={{ alignSelf: "flex-end" }}
            >
              <Text style={[theme.typography.bodySmall, { color: theme.colors.primary.solid }]}>
                {mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              </Text>
            </Pressable>

            {erro ? (
              <Text
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
                style={[theme.typography.caption, { color: theme.colors.error.solid }]}
              >
                {erro}
              </Text>
            ) : null}

            <Button onPress={() => void cadastrar()} loading={carregando} disabled={carregando}>
              Criar conta
            </Button>
            <Button variant="ghost" onPress={() => onVoltarParaLogin()} disabled={carregando}>
              Já tenho conta
            </Button>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
