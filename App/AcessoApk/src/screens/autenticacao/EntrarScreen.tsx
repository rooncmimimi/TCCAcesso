import { useEffect, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { anunciarParaLeitorDeTela } from "../../acessibilidade";
import { AutenticacaoService, useAutenticacao } from "../../autenticacao";
import { Botao, Cartao, CampoTexto, ContainerTela } from "../../components/ui";
import { extrairMensagemErro } from "../../services/api/erros";
import { useTema } from "../../tema";

type Etapa = "credenciais" | "conta-pausada" | "email-nao-verificado";

const MENSAGENS_SESSAO_ENCERRADA = {
  expirada: "Sua sessão expirou. Entre novamente.",
  bloqueada: "Sua conta foi bloqueada. Entre em contato com o suporte do ACESSO.",
  senha_alterada: "Sua senha foi alterada, e isso encerra a sessão em todos os aparelhos. Entre com a senha nova.",
} as const;

/**
 * Anúncios de troca de etapa. Sair de "credenciais" para "conta pausada" ou "e-mail não verificado"
 * é anunciado uma vez com `anunciarParaLeitorDeTela`: o formulário some e começa outro fluxo,
 * disparado por uma resposta do backend.
 *
 * A volta para as credenciais não é anunciada: o TalkBack já leu "Voltar, botão" no toque, e
 * repetir seria ruído. Também não dá para usar `accessibilityLiveRegion` aqui, porque o cartão
 * inteiro da etapa anterior desmonta e não há um nó estável para a região.
 */
const ANUNCIOS_TRANSICAO: Record<Exclude<Etapa, "credenciais">, string> = {
  "conta-pausada": "Conta pausada.",
  "email-nao-verificado": "E-mail não verificado.",
};

/**
 * Login com e-mail e senha. Conta pausada e e-mail não verificado são etapas desta mesma tentativa,
 * e não rotas do `AutenticacaoNavigator`, por isso ficam num estado local `etapa`; o Site faz o
 * mesmo na rota `/entrar`.
 */
export function EntrarScreen({
  onEsqueciSenha,
  onCriarConta,
  emailInicial,
}: {
  onEsqueciSenha: () => void;
  onCriarConta: () => void;
  /** Preenchido quando a pessoa acabou de confirmar o cadastro, como o `emailInicial` da `RedefinirSenhaScreen`. */
  emailInicial?: string;
}) {
  const { tema } = useTema();
  const { entrar, motivoFimSessao, limparMotivoFimSessao } = useAutenticacao();

  const [email, setEmail] = useState(emailInicial ?? "");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  // Mostra uma vez só a mensagem de "sessão expirou"/"conta bloqueada", vinda
  // de um encerramento de sessão que já aconteceu antes desta tela montar
  // (ex.: o access token expirou com o app em segundo plano). Inicializador
  // preguiçoso em vez de setState num efeito: só precisa rodar uma vez, no
  // valor que já existe no primeiro render.
  const [erro, setErro] = useState<string | null>(() =>
    motivoFimSessao ? MENSAGENS_SESSAO_ENCERRADA[motivoFimSessao] : null,
  );
  const [etapa, setEtapa] = useState<Etapa>("credenciais");
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);
  // Código de confirmação do e-mail. É o mesmo código de 6 dígitos da `CadastroScreen`, para quem
  // fechou o app antes de confirmar e só encontra esta etapa ao tentar entrar.
  const [codigo, setCodigo] = useState("");
  const [confirmando, setConfirmando] = useState(false);

  const senhaInputRef = useRef<TextInput>(null);
  // Trava contra toque duplo. É uma `ref`, e não o estado `carregando`, porque só um valor lido e
  // escrito na hora, sem esperar um novo render, garante que o segundo toque seja ignorado.
  // `carregando` serve só para a interface.
  const enviandoRef = useRef(false);

  // Consome o motivo assim que ele já foi capturado acima, pra não mostrar a
  // mesma mensagem de novo numa futura remontagem desta tela.
  useEffect(() => {
    if (motivoFimSessao) limparMotivoFimSessao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Único ponto que troca de etapa e também anuncia (veja a regra descrita acima de `ANUNCIOS_TRANSICAO`). */
  function irParaEtapa(nova: Exclude<Etapa, "credenciais">) {
    setEtapa(nova);
    anunciarParaLeitorDeTela(ANUNCIOS_TRANSICAO[nova]);
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
      const resposta = await entrar({ email: email.trim(), senha, ...extra });

      if ("contaPausada" in resposta) {
        irParaEtapa("conta-pausada");
        return;
      }
      if ("emailNaoVerificado" in resposta) {
        irParaEtapa("email-nao-verificado");
        return;
      }
      // Com `token` na resposta, o `RaizNavigator` troca de tela sozinho quando o status da sessão
      // muda.
    } catch (erroRequisicao) {
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível entrar. Verifique seus dados."));
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
      await AutenticacaoService.confirmarCadastro(email.trim(), codigo.trim());
      setCodigo("");
      // Tenta entrar de novo com o e-mail e a senha já digitados, sem pedir outro toque em
      // "Entrar". `submeter` trata qualquer resultado: no sucesso o `RaizNavigator` troca de tela.
      await submeter();
    } catch (erroRequisicao) {
      setErro(extrairMensagemErro(erroRequisicao, "Código inválido ou expirado."));
    } finally {
      setConfirmando(false);
    }
  }

  async function reenviarEmail() {
    if (reenviando) return;
    setReenviando(true);
    setErro(null);
    try {
      await AutenticacaoService.reenviarConfirmacao(email.trim());
      setReenviado(true);
    } catch (erroRequisicao) {
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível reenviar o e-mail agora."));
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
    <ContainerTela>
      {/* No Android, o `adjustResize` padrão do Expo já redimensiona a tela com o teclado,
          então só o iOS recebe `behavior="padding"`. */}
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
          <View style={{ gap: tema.spacing.xs, alignItems: "center" }}>
            <Text style={[tema.typography.display, { color: tema.colors.primary.solid }]}>ACESSO</Text>
            <Text style={[tema.typography.body, { color: tema.colors.textSecondary }]}>Entre para continuar</Text>
          </View>

          {etapa === "credenciais" ? (
            <Cartao elevacao="md" style={{ gap: tema.spacing.md }}>
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
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => senhaInputRef.current?.focus()}
                blurOnSubmit={false}
                editable={!carregando}
              />

              <View style={{ gap: tema.spacing.xs }}>
                <CampoTexto
                  ref={senhaInputRef}
                  rotulo="Senha"
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
                  erro={erro ?? undefined}
                />
                <Pressable
                  onPress={() => setMostrarSenha((valor) => !valor)}
                  accessibilityRole="button"
                  accessibilityLabel={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  // O texto sozinho tem cerca de 20dp de altura; 14 de cada lado leva a área de
                  // toque a uns 48dp sem mudar o layout.
                  hitSlop={14}
                  style={{ alignSelf: "flex-end" }}
                >
                  <Text style={[tema.typography.bodySmall, { color: tema.colors.primary.solid }]}>
                    {mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  </Text>
                </Pressable>
              </View>

              <Botao onPress={() => void submeter()} carregando={carregando} disabled={carregando}>
                Entrar
              </Botao>

              <Pressable
                onPress={onEsqueciSenha}
                accessibilityRole="button"
                accessibilityLabel="Esqueci minha senha"
                hitSlop={14}
              >
                <Text
                  style={[tema.typography.bodySmall, { color: tema.colors.primary.solid, textAlign: "center" }]}
                >
                  Esqueci minha senha
                </Text>
              </Pressable>
            </Cartao>
          ) : null}

          {etapa === "conta-pausada" ? (
            <Cartao elevacao="md" style={{ gap: tema.spacing.md }}>
              <Text style={[tema.typography.title, { color: tema.colors.textPrimary }]}>
                Sua conta está pausada
              </Text>
              <Text style={[tema.typography.bodySmall, { color: tema.colors.textMuted }]}>
                Você pausou esta conta anteriormente. Deseja reativá-la e continuar?
              </Text>
              {erro ? (
                // `accessibilityLiveRegion`, e não só `accessibilityRole="alert"`, é o que faz o
                // Android anunciar o erro sozinho (como no `CampoTexto`).
                <Text
                  accessibilityRole="alert"
                  accessibilityLiveRegion="assertive"
                  style={[tema.typography.caption, { color: tema.colors.error.solid }]}
                >
                  {erro}
                </Text>
              ) : null}
              <Botao
                onPress={() => void submeter({ confirmarReativacao: true })}
                carregando={carregando}
                disabled={carregando}
              >
                Reativar minha conta
              </Botao>
              <Botao variant="ghost" onPress={voltarParaCredenciais} disabled={carregando}>
                Cancelar
              </Botao>
            </Cartao>
          ) : null}

          {etapa === "email-nao-verificado" ? (
            <Cartao elevacao="md" style={{ gap: tema.spacing.md }}>
              <Text style={[tema.typography.title, { color: tema.colors.textPrimary }]}>Confirme seu e-mail</Text>
              <Text style={[tema.typography.bodySmall, { color: tema.colors.textMuted }]}>
                Enviamos um e-mail de confirmação para {email.trim()}. Verifique sua caixa de entrada (e a pasta de
                spam) e informe o código de 6 dígitos abaixo.
              </Text>

              <CampoTexto
                rotulo="Código de confirmação"
                placeholder="000000"
                value={codigo}
                onChangeText={setCodigo}
                keyboardType="number-pad"
                maxLength={6}
                editable={!confirmando}
              />

              {reenviado ? (
                // `polite`, e não `assertive`: é uma confirmação, então espera a fala atual
                // terminar em vez de interromper.
                <Text
                  accessibilityLiveRegion="polite"
                  style={[tema.typography.bodySmall, { color: tema.colors.success.solid }]}
                >
                  E-mail reenviado.
                </Text>
              ) : null}
              {erro ? (
                <Text
                  accessibilityRole="alert"
                  accessibilityLiveRegion="assertive"
                  style={[tema.typography.caption, { color: tema.colors.error.solid }]}
                >
                  {erro}
                </Text>
              ) : null}
              <Botao
                onPress={() => void confirmarEmailEEntrar()}
                carregando={confirmando}
                disabled={confirmando || !codigo.trim()}
              >
                Confirmar e-mail
              </Botao>
              <Botao onPress={() => void reenviarEmail()} carregando={reenviando} disabled={reenviando} variant="outline">
                Reenviar e-mail
              </Botao>
              <Botao variant="ghost" onPress={voltarParaCredenciais} disabled={reenviando || confirmando}>
                Voltar
              </Botao>
            </Cartao>
          ) : null}

          {/* O link de cadastro só aparece na etapa de credenciais; no meio de uma conta
              pausada ou de um e-mail a confirmar, trocar de fluxo faria a pessoa perder o
              contexto. */}
          {etapa === "credenciais" ? (
            <Pressable
              onPress={onCriarConta}
              accessibilityRole="button"
              accessibilityLabel="Criar conta"
              hitSlop={14}
            >
              <Text style={[tema.typography.bodySmall, { color: tema.colors.textMuted, textAlign: "center" }]}>
                Ainda não tem conta? Criar conta
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </ContainerTela>
  );
}
