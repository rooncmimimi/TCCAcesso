import { useEffect, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { announceForAccessibility } from "../../accessibility";
import { AuthService, useAuth } from "../../auth";
import { Button, Card, Input, ScreenContainer } from "../../components/ui";
import { getFriendlyErrorMessage } from "../../services/api/errors";
import { useTheme } from "../../theme";

type Etapa = "credenciais" | "conta-pausada" | "email-nao-verificado";

const MENSAGENS_SESSAO_ENCERRADA = {
  expired: "Sua sessão expirou. Entre novamente.",
  blocked: "Sua conta foi bloqueada. Entre em contato com o suporte do ACESSO.",
} as const;

/**
 * Fase 8 — política de anúncio de transição de etapa.
 *
 * ANUNCIA (uma vez, via `announceForAccessibility`): as duas transições PARA
 * FORA de "credenciais" (`conta-pausada`/`email-nao-verificado`) — o
 * formulário de login inteiro deixa de existir e um fluxo novo começa,
 * disparado por uma resposta do backend que o usuário não controla. É
 * exatamente o "o formulário atual deixa de existir" do item 14 da fase.
 *
 * NÃO ANUNCIA o caminho de volta (`voltarParaCredenciais`, os botões
 * "Voltar"/"Cancelar"): o usuário acabou de tocar num botão com esse nome
 * mesmo — TalkBack já anunciou "Voltar, botão" como parte do toque; anunciar
 * de novo "Formulário de login" logo em seguida seria ruído, não contexto
 * (item 13: não duplicar o que o próprio sistema já comunicou).
 *
 * NÃO usa `accessibilityLiveRegion` aqui (mecanismo já usado nos erros/
 * sucessos DENTRO de cada etapa, Fase 7) porque uma região viva reage a
 * TEXTO MUDANDO num nó que já existe na árvore — aqui o Card inteiro da
 * etapa anterior desmonta e um Card novo monta, então não há um nó estável
 * para anexar a região. `announceForAccessibility` é a única fonte de
 * verdade para ESTE evento (item 15: um mecanismo por evento, nunca dois).
 */
const ANUNCIOS_TRANSICAO: Record<Exclude<Etapa, "credenciais">, string> = {
  "conta-pausada": "Conta pausada.",
  "email-nao-verificado": "E-mail não verificado.",
};

/**
 * Os dois "estados intermediários" do login (conta pausada, e-mail não
 * verificado) são etapas DESTA MESMA tentativa de login — não telas
 * separadas navegáveis — por isso vivem como um `etapa` local em vez de
 * rotas do `AuthNavigator` (Fase 4). É a mesma decisão que o site já toma
 * na própria rota `/entrar` (auditoria da Fase 3).
 */
export function LoginScreen({
  onEsqueciSenha,
  onCriarConta,
  emailInicial,
}: {
  onEsqueciSenha: () => void;
  onCriarConta: () => void;
  /** Preenchido quando se chega aqui vindo de um cadastro recém-confirmado (Fase 11) — mesmo padrão de `ResetPasswordScreen`'s `emailInicial`. */
  emailInicial?: string;
}) {
  const { theme } = useTheme();
  const { login, sessionEndedReason, clearSessionEndedReason } = useAuth();

  const [email, setEmail] = useState(emailInicial ?? "");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  // Mostra uma vez só a mensagem de "sessão expirou"/"conta bloqueada", vinda
  // de um encerramento de sessão que já aconteceu antes desta tela montar
  // (ex.: o access token expirou com o app em segundo plano). Inicializador
  // preguiçoso em vez de setState num efeito — só precisa rodar uma vez, no
  // valor que já existe no primeiro render.
  const [erro, setErro] = useState<string | null>(() =>
    sessionEndedReason ? MENSAGENS_SESSAO_ENCERRADA[sessionEndedReason] : null,
  );
  const [etapa, setEtapa] = useState<Etapa>("credenciais");
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);
  // Fase 11: antes desta fase, "e-mail não verificado" só oferecia reenviar
  // o e-mail — não havia NENHUM lugar no App para digitar o código e
  // realmente confirmar. Fecha esse fluxo sem duplicar tela: o mesmo código
  // de 6 dígitos que `RegisterScreen` usa logo após o cadastro também
  // funciona aqui, para quem fechou o app antes de confirmar e só volta a
  // encontrar essa etapa ao tentar entrar depois.
  const [codigo, setCodigo] = useState("");
  const [confirmando, setConfirmando] = useState(false);

  const senhaInputRef = useRef<TextInput>(null);
  // Trava síncrona contra duplo toque (Fase 3, item 22) — um `ref`, não o
  // estado `carregando`, porque só um valor lido/escrito de forma síncrona
  // e imediata (sem esperar um re-render) garante que um segundo toque
  // disparado antes do primeiro re-render terminar seja mesmo ignorado.
  // `carregando` continua existindo só para a UI (spinner/estado desabilitado).
  const enviandoRef = useRef(false);

  // Consome o motivo assim que ele já foi capturado acima, pra não mostrar a
  // mesma mensagem de novo numa futura remontagem desta tela.
  useEffect(() => {
    if (sessionEndedReason) clearSessionEndedReason();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Único ponto que troca de etapa E anuncia — ver a política documentada acima de `ANUNCIOS_TRANSICAO`. */
  function irParaEtapa(nova: Exclude<Etapa, "credenciais">) {
    setEtapa(nova);
    announceForAccessibility(ANUNCIOS_TRANSICAO[nova]);
  }

  async function submeter(extra: { confirmarReativacao?: boolean } = {}) {
    if (enviandoRef.current) return;

    if (!email.trim() || !senha) {
      setErro("Informe e-mail e senha.");
      return;
    }

    enviandoRef.current = true;
    Keyboard.dismiss();
    setCarregando(true);
    setErro(null);

    try {
      const resposta = await login({ email: email.trim(), senha, ...extra });

      if ("contaPausada" in resposta) {
        irParaEtapa("conta-pausada");
        return;
      }
      if ("emailNaoVerificado" in resposta) {
        irParaEtapa("email-nao-verificado");
        return;
      }
      // "token" in resposta: sucesso — o AuthGate troca de tela sozinho
      // quando o status global de autenticação muda. Nada a fazer aqui.
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível entrar. Verifique seus dados."));
    } finally {
      enviandoRef.current = false;
      setCarregando(false);
    }
  }

  async function confirmarEmailEEntrar() {
    if (confirmando || !codigo.trim()) return;
    setConfirmando(true);
    setErro(null);
    try {
      await AuthService.confirmarCadastro(email.trim(), codigo.trim());
      setCodigo("");
      // Credenciais já digitadas na tentativa que trouxe o usuário até esta
      // etapa — em vez de mandar tocar "Entrar" pela terceira vez, tenta
      // entrar de novo sozinho. `submeter` já cobre qualquer resultado
      // (sucesso troca de tela via AuthGate; outro caso, trata normalmente).
      await submeter();
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Código inválido ou expirado."));
    } finally {
      setConfirmando(false);
    }
  }

  async function reenviarEmail() {
    if (reenviando) return;
    setReenviando(true);
    setErro(null);
    try {
      await AuthService.reenviarConfirmacao(email.trim());
      setReenviado(true);
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível reenviar o e-mail agora."));
    } finally {
      setReenviando(false);
    }
  }

  function voltarParaCredenciais() {
    setEtapa("credenciais");
    setErro(null);
    setReenviado(false);
    setCodigo("");
  }

  return (
    <ScreenContainer>
      {/* No Android, deixar o próprio sistema (`adjustResize`, padrão do
          Expo) redimensionar a tela funciona melhor do que forçar um
          `behavior` — por isso só o iOS recebe "padding" aqui (Fase 3, item
          36: não adicionar solução própria para o que o RN já resolve). */}
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
          <View style={{ gap: theme.spacing.xs, alignItems: "center" }}>
            <Text style={[theme.typography.display, { color: theme.colors.primary.solid }]}>ACESSO</Text>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>Entre para continuar</Text>
          </View>

          {etapa === "credenciais" ? (
            <Card elevation="md" style={{ gap: theme.spacing.md }}>
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
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => senhaInputRef.current?.focus()}
                blurOnSubmit={false}
                editable={!carregando}
              />

              <View style={{ gap: theme.spacing.xs }}>
                <Input
                  ref={senhaInputRef}
                  label="Senha"
                  placeholder="Digite sua senha"
                  value={senha}
                  onChangeText={(texto) => {
                    setSenha(texto);
                    if (erro) setErro(null);
                  }}
                  secureTextEntry={!mostrarSenha}
                  textContentType="password"
                  autoComplete="password"
                  returnKeyType="done"
                  onSubmitEditing={() => void submeter()}
                  editable={!carregando}
                  error={erro ?? undefined}
                />
                <Pressable
                  onPress={() => setMostrarSenha((valor) => !valor)}
                  accessibilityRole="button"
                  accessibilityLabel={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  // Fase 7: o texto sozinho (bodySmall, ~20dp de altura)
                  // rendia uma área de toque bem abaixo dos 44-48dp
                  // recomendados mesmo com hitSlop de 8. 14 em cada lado
                  // fecha a conta em ~48dp sem mudar o layout visual (hitSlop
                  // não desenha nada, só amplia onde o toque é aceito).
                  hitSlop={14}
                  style={{ alignSelf: "flex-end" }}
                >
                  <Text style={[theme.typography.bodySmall, { color: theme.colors.primary.solid }]}>
                    {mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  </Text>
                </Pressable>
              </View>

              <Button onPress={() => void submeter()} loading={carregando} disabled={carregando}>
                Entrar
              </Button>

              <Pressable
                onPress={onEsqueciSenha}
                accessibilityRole="button"
                accessibilityLabel="Esqueci minha senha"
                hitSlop={14}
              >
                <Text
                  style={[theme.typography.bodySmall, { color: theme.colors.primary.solid, textAlign: "center" }]}
                >
                  Esqueci minha senha
                </Text>
              </Pressable>
            </Card>
          ) : null}

          {etapa === "conta-pausada" ? (
            <Card elevation="md" style={{ gap: theme.spacing.md }}>
              <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]}>
                Sua conta está pausada
              </Text>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]}>
                Você pausou esta conta anteriormente. Deseja reativá-la e continuar?
              </Text>
              {erro ? (
                // `accessibilityLiveRegion` (não só `accessibilityRole="alert"`)
                // é o que faz o Android anunciar sozinho — mesmo motivo já
                // corrigido no `Input` na Fase 5, aqui reaplicado (Fase 7).
                <Text
                  accessibilityRole="alert"
                  accessibilityLiveRegion="assertive"
                  style={[theme.typography.caption, { color: theme.colors.error.solid }]}
                >
                  {erro}
                </Text>
              ) : null}
              <Button
                onPress={() => void submeter({ confirmarReativacao: true })}
                loading={carregando}
                disabled={carregando}
              >
                Reativar minha conta
              </Button>
              <Button variant="ghost" onPress={voltarParaCredenciais} disabled={carregando}>
                Cancelar
              </Button>
            </Card>
          ) : null}

          {etapa === "email-nao-verificado" ? (
            <Card elevation="md" style={{ gap: theme.spacing.md }}>
              <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]}>Confirme seu e-mail</Text>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]}>
                Enviamos um e-mail de confirmação para {email.trim()}. Verifique sua caixa de entrada (e a pasta de
                spam) e informe o código de 6 dígitos abaixo.
              </Text>

              <Input
                label="Código de confirmação"
                placeholder="000000"
                value={codigo}
                onChangeText={setCodigo}
                keyboardType="number-pad"
                maxLength={6}
                editable={!confirmando}
              />

              {reenviado ? (
                // "polite" (não "assertive"): confirmação de sucesso, não
                // erro — espera a fala atual terminar em vez de interromper
                // (Fase 7, item 9: usar região de anúncio só quando faz
                // sentido, com a urgência certa).
                <Text
                  accessibilityLiveRegion="polite"
                  style={[theme.typography.bodySmall, { color: theme.colors.success.solid }]}
                >
                  E-mail reenviado.
                </Text>
              ) : null}
              {erro ? (
                <Text
                  accessibilityRole="alert"
                  accessibilityLiveRegion="assertive"
                  style={[theme.typography.caption, { color: theme.colors.error.solid }]}
                >
                  {erro}
                </Text>
              ) : null}
              <Button
                onPress={() => void confirmarEmailEEntrar()}
                loading={confirmando}
                disabled={confirmando || !codigo.trim()}
              >
                Confirmar e-mail
              </Button>
              <Button onPress={() => void reenviarEmail()} loading={reenviando} disabled={reenviando} variant="outline">
                Reenviar e-mail
              </Button>
              <Button variant="ghost" onPress={voltarParaCredenciais} disabled={reenviando || confirmando}>
                Voltar
              </Button>
            </Card>
          ) : null}

          {/* Fase 11: cadastro real (antes era um `Alert` avisando "em uma
              próxima etapa"). Só aparece na etapa de credenciais — nas
              etapas "conta-pausada"/"email-nao-verificado" o usuário já
              está no meio de uma tentativa de entrar, navegar para outro
              fluxo ali só arriscaria perder contexto sem ganhar nada. */}
          {etapa === "credenciais" ? (
            <Pressable
              onPress={onCriarConta}
              accessibilityRole="button"
              accessibilityLabel="Criar conta"
              hitSlop={14}
            >
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted, textAlign: "center" }]}>
                Ainda não tem conta? Criar conta
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
