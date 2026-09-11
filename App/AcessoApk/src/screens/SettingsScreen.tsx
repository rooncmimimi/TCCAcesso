import * as LocalAuthentication from "expo-local-authentication";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAccessibility } from "../accessibility";
import { AuthService, useAuth } from "../auth";
import type { SessaoAtiva } from "../auth";
import { Button, Card, Input, ScreenContainer, SegmentedControl, ToggleRow } from "../components/ui";
import type { PreferenciaMensagens, PreferenciasNotificacao } from "../configuracoes";
import { ConfiguracoesService } from "../configuracoes";
import type { ProfileStackParamList } from "../navigation/types";
import {
  coletarMeusDados,
  exportarECompartilhar,
  getBloqueioBiometricoAtivo,
  setBloqueioBiometricoAtivo,
} from "../seguranca";
import { getFriendlyErrorMessage } from "../services/api/errors";
import { useTheme } from "../theme";
import type { Theme } from "../theme";

const LABEL_PREFERENCIA_MENSAGENS: Record<PreferenciaMensagens, string> = {
  todos: "Todos",
  seguidores: "Só meus seguidores",
  seguindo: "Só quem eu sigo",
  mutuo: "Seguimos um ao outro",
  empresas: "Só empresas",
  ninguem: "Ninguém",
};

/** Sem biblioteca de data nova — `Intl.DateTimeFormat` nativo já resolve. */
function formatarData(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(data);
}

function SectionHeader({ title, theme }: { title: string; theme: Theme }) {
  return (
    <Text accessibilityRole="header" style={[theme.typography.title, { color: theme.colors.textPrimary }]}>
      {title}
    </Text>
  );
}

function ErroAcao({ mensagem, theme }: { mensagem: string; theme: Theme }) {
  return (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={[theme.typography.caption, { color: theme.colors.error.solid }]}
    >
      {mensagem}
    </Text>
  );
}

/**
 * Configurações da conta (Fase 15) — substitui o placeholder das fases
 * anteriores. Cada seção fala só com o serviço que precisa (`AuthService`
 * para o que é `/auth/*`, `ConfiguracoesService` para privacidade/
 * notificação, ambos já confirmados por auditoria) — nenhuma duplica regra
 * do backend (senha forte, formato de e-mail etc. só são validados no
 * servidor; aqui só o que é inequivocamente do frontend).
 */
export function SettingsScreen() {
  const { theme } = useTheme();

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
          AuthService.listarSessoes(),
          ConfiguracoesService.obterPreferenciasNotificacao(),
        ]);
        if (cancelado) return;
        setSessoes(sessoesRes);
        setPrefsNotificacao(prefsRes);
      } catch (erroRequisicao) {
        if (cancelado) return;
        setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar suas configurações."));
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
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={theme.colors.primary.solid} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  if (erro && sessoes.length === 0 && !prefsNotificacao) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Card elevation="md" style={{ gap: theme.spacing.sm }}>
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[theme.typography.title, { color: theme.colors.textPrimary }]}
            >
              Não foi possível carregar suas configurações
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{erro}</Text>
            <Button onPress={tentarNovamente}>Tentar novamente</Button>
          </Card>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ gap: theme.spacing.xl, paddingVertical: theme.spacing.lg }}>
        <SecaoPrivacidade theme={theme} />
        <SecaoExportarDados theme={theme} />
        {prefsNotificacao ? (
          <SecaoNotificacoes theme={theme} prefs={prefsNotificacao} onAtualizar={setPrefsNotificacao} />
        ) : null}
        <SecaoSenha theme={theme} />
        <SecaoEmail theme={theme} />
        <SecaoSessoes theme={theme} sessoes={sessoes} onAtualizarLista={setSessoes} />
        <SecaoBiometria theme={theme} />
        <SecaoZonaDePerigo theme={theme} />
      </ScrollView>
    </ScreenContainer>
  );
}

function SecaoPrivacidade({ theme }: { theme: Theme }) {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const [perfilPublico, setPerfilPublico] = useState(user?.perfilPublico !== false);
  const [preferenciaMensagens, setPreferenciaMensagens] = useState<PreferenciaMensagens>(
    (user?.preferenciaMensagens as PreferenciaMensagens) ?? "todos",
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function alternarPerfilPublico(valor: boolean) {
    if (salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      const novo = await ConfiguracoesService.atualizarPrivacidade(valor);
      setPerfilPublico(novo);
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível atualizar agora."));
    } finally {
      setSalvando(false);
    }
  }

  async function mudarPreferenciaMensagens(valor: PreferenciaMensagens) {
    if (salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      const nova = await ConfiguracoesService.atualizarPreferenciaMensagens(valor);
      setPreferenciaMensagens(nova);
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível atualizar agora."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <SectionHeader title="Privacidade" theme={theme} />
      <Card elevation="sm" style={{ gap: theme.spacing.md }}>
        <ToggleRow
          label="Perfil público"
          description="Com o perfil privado, quem quiser te seguir precisa enviar uma solicitação, que você aprova ou recusa."
          value={perfilPublico}
          onValueChange={(valor) => void alternarPerfilPublico(valor)}
        />
        <SegmentedControl
          label="Quem pode te enviar mensagens"
          value={preferenciaMensagens}
          onChange={(valor) => void mudarPreferenciaMensagens(valor)}
          options={(Object.keys(LABEL_PREFERENCIA_MENSAGENS) as PreferenciaMensagens[]).map((valor) => ({
            label: LABEL_PREFERENCIA_MENSAGENS[valor],
            value: valor,
          }))}
        />
        {erro ? <ErroAcao mensagem={erro} theme={theme} /> : null}
        <Button variant="outline" onPress={() => navigation.navigate("BlockedUsers")}>
          Usuários bloqueados
        </Button>
      </Card>
    </View>
  );
}

function SecaoNotificacoes({
  theme,
  prefs,
  onAtualizar,
}: {
  theme: Theme;
  prefs: PreferenciasNotificacao;
  onAtualizar: (prefs: PreferenciasNotificacao) => void;
}) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function alternar(campo: keyof Pick<PreferenciasNotificacao, "vagasCandidaturas" | "mensagens" | "publicacoesComentarios" | "redeSeguidores">, valor: boolean) {
    if (salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      const atualizado = await ConfiguracoesService.atualizarPreferenciasNotificacao({ [campo]: valor });
      onAtualizar(atualizado);
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível atualizar agora."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <SectionHeader title="Notificações" theme={theme} />
      <Card elevation="sm" style={{ gap: theme.spacing.md }}>
        <ToggleRow
          label="Vagas e candidaturas"
          value={prefs.vagasCandidaturas}
          onValueChange={(valor) => void alternar("vagasCandidaturas", valor)}
        />
        <ToggleRow label="Mensagens" value={prefs.mensagens} onValueChange={(valor) => void alternar("mensagens", valor)} />
        <ToggleRow
          label="Publicações e comentários"
          value={prefs.publicacoesComentarios}
          onValueChange={(valor) => void alternar("publicacoesComentarios", valor)}
        />
        <ToggleRow
          label="Rede (seguidores)"
          value={prefs.redeSeguidores}
          onValueChange={(valor) => void alternar("redeSeguidores", valor)}
        />
        {erro ? <ErroAcao mensagem={erro} theme={theme} /> : null}
      </Card>
    </View>
  );
}

function SecaoSenha({ theme }: { theme: Theme }) {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  async function salvar() {
    if (salvando) return;
    if (!senhaAtual || !novaSenha) {
      setErro("Preencha a senha atual e a nova senha.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }
    setSalvando(true);
    setErro(null);
    setSucesso(false);
    try {
      await AuthService.alterarSenha(senhaAtual, novaSenha);
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
      setSucesso(true);
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível alterar sua senha agora."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <SectionHeader title="Alterar senha" theme={theme} />
      <Card elevation="sm" style={{ gap: theme.spacing.md }}>
        <Input label="Senha atual" value={senhaAtual} onChangeText={setSenhaAtual} secureTextEntry editable={!salvando} />
        <Input
          label="Nova senha"
          value={novaSenha}
          onChangeText={setNovaSenha}
          secureTextEntry
          textContentType="newPassword"
          editable={!salvando}
          helperText="Mínimo 8 caracteres, com letra maiúscula, minúscula, número e símbolo."
        />
        <Input
          label="Confirmar nova senha"
          value={confirmarSenha}
          onChangeText={setConfirmarSenha}
          secureTextEntry
          textContentType="newPassword"
          editable={!salvando}
        />
        {sucesso ? (
          <Text accessibilityLiveRegion="polite" style={[theme.typography.bodySmall, { color: theme.colors.success.solid }]}>
            Senha alterada com sucesso. Suas outras sessões foram encerradas.
          </Text>
        ) : null}
        {erro ? <ErroAcao mensagem={erro} theme={theme} /> : null}
        <Button onPress={() => void salvar()} loading={salvando} disabled={salvando}>
          Salvar nova senha
        </Button>
      </Card>
    </View>
  );
}

function SecaoEmail({ theme }: { theme: Theme }) {
  const { user, refreshUser } = useAuth();
  const [etapa, setEtapa] = useState<"formulario" | "confirmar">("formulario");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function solicitar() {
    if (enviando) return;
    if (!senhaAtual.trim() || !novoEmail.trim()) {
      setErro("Preencha a senha atual e o novo e-mail.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await AuthService.solicitarTrocaEmail(senhaAtual, novoEmail.trim());
      setEtapa("confirmar");
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível solicitar a troca de e-mail agora."));
    } finally {
      setEnviando(false);
    }
  }

  async function confirmar() {
    if (enviando || !codigo.trim()) return;
    setEnviando(true);
    setErro(null);
    try {
      await AuthService.confirmarTrocaEmail(codigo.trim());
      await refreshUser();
      setEtapa("formulario");
      setSenhaAtual("");
      setNovoEmail("");
      setCodigo("");
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Código inválido ou expirado."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <SectionHeader title="E-mail" theme={theme} />
      <Card elevation="sm" style={{ gap: theme.spacing.md }}>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]}>E-mail atual: {user?.email}</Text>

        {etapa === "formulario" ? (
          <>
            <Input label="Senha atual" value={senhaAtual} onChangeText={setSenhaAtual} secureTextEntry editable={!enviando} />
            <Input
              label="Novo e-mail"
              value={novoEmail}
              onChangeText={setNovoEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!enviando}
            />
            {erro ? <ErroAcao mensagem={erro} theme={theme} /> : null}
            <Button onPress={() => void solicitar()} loading={enviando} disabled={enviando}>
              Enviar código de confirmação
            </Button>
          </>
        ) : (
          <>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
              Enviamos um código de 6 dígitos para {novoEmail}.
            </Text>
            <Input label="Código de confirmação" value={codigo} onChangeText={setCodigo} keyboardType="number-pad" maxLength={6} editable={!enviando} />
            {erro ? <ErroAcao mensagem={erro} theme={theme} /> : null}
            <Button onPress={() => void confirmar()} loading={enviando} disabled={enviando || !codigo.trim()}>
              Confirmar novo e-mail
            </Button>
            <Button variant="ghost" onPress={() => setEtapa("formulario")} disabled={enviando}>
              Cancelar
            </Button>
          </>
        )}
      </Card>
    </View>
  );
}

function SecaoSessoes({
  theme,
  sessoes,
  onAtualizarLista,
}: {
  theme: Theme;
  sessoes: SessaoAtiva[];
  onAtualizarLista: (sessoes: SessaoAtiva[]) => void;
}) {
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [encerrandoOutras, setEncerrandoOutras] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function encerrar(id: string) {
    if (processandoId || encerrandoOutras) return;
    setProcessandoId(id);
    setErro(null);
    try {
      await AuthService.revogarSessao(id);
      onAtualizarLista(sessoes.filter((sessao) => sessao.id !== id));
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível encerrar esta sessão agora."));
    } finally {
      setProcessandoId(null);
    }
  }

  async function encerrarOutras() {
    if (processandoId || encerrandoOutras) return;
    setEncerrandoOutras(true);
    setErro(null);
    try {
      await AuthService.revogarOutrasSessoes();
      onAtualizarLista(sessoes.filter((sessao) => sessao.atual));
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível encerrar as outras sessões agora."));
    } finally {
      setEncerrandoOutras(false);
    }
  }

  const outras = sessoes.filter((sessao) => !sessao.atual);

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <SectionHeader title="Sessões ativas" theme={theme} />
      <View style={{ gap: theme.spacing.sm }}>
        {sessoes.map((sessao) => (
          <Card key={sessao.id} elevation="sm" style={{ gap: theme.spacing.xs }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {sessao.userAgent ?? "Dispositivo desconhecido"}
              </Text>
              {sessao.atual ? (
                <Text style={[theme.typography.caption, { color: theme.colors.primary.solid }]}>Esta sessão</Text>
              ) : null}
            </View>
            {sessao.ip ? (
              <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>IP: {sessao.ip}</Text>
            ) : null}
            {formatarData(sessao.criadoEm) ? (
              <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
                Desde {formatarData(sessao.criadoEm)}
              </Text>
            ) : null}
            {!sessao.atual ? (
              <Button
                variant="outline"
                size="small"
                onPress={() => void encerrar(sessao.id)}
                loading={processandoId === sessao.id}
                disabled={processandoId !== null || encerrandoOutras}
              >
                Encerrar sessão
              </Button>
            ) : null}
          </Card>
        ))}
      </View>
      {erro ? <ErroAcao mensagem={erro} theme={theme} /> : null}
      {outras.length > 0 ? (
        <Button
          variant="outline"
          onPress={() => void encerrarOutras()}
          loading={encerrandoOutras}
          disabled={encerrandoOutras || processandoId !== null}
        >
          Encerrar todas as outras sessões
        </Button>
      ) : null}
    </View>
  );
}

/**
 * "Exportar meus dados" (Fase 22, LGPD/portabilidade) — monta um arquivo
 * JSON a partir de endpoints "meus dados" que já existem (nenhuma rota nova
 * no backend) e abre a folha de compartilhamento do aparelho. Escopo
 * deliberado: conta + perfil + preferências, NUNCA o histórico de
 * publicações/comentários/mensagens (coleções sem limite, exportação
 * futura separada — ver `seguranca/exportarDados.ts`).
 */
function SecaoExportarDados({ theme }: { theme: Theme }) {
  const { user } = useAuth();
  const { preferences } = useAccessibility();
  const [exportando, setExportando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function exportar() {
    if (exportando || !user) return;
    setExportando(true);
    setErro(null);
    try {
      const dados = await coletarMeusDados(user, preferences);
      await exportarECompartilhar(dados);
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível exportar seus dados agora."));
    } finally {
      setExportando(false);
    }
  }

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <SectionHeader title="Seus dados" theme={theme} />
      <Card elevation="sm" style={{ gap: theme.spacing.md }}>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
          Baixe uma cópia dos dados que o ACESSO guarda sobre você: dados da conta, perfil e preferências.
        </Text>
        {erro ? <ErroAcao mensagem={erro} theme={theme} /> : null}
        <Button variant="outline" onPress={() => void exportar()} loading={exportando} disabled={exportando}>
          Exportar meus dados
        </Button>
      </Card>
    </View>
  );
}

/**
 * "Bloqueio por biometria" (Fase 22) — só oferece o controle quando o
 * aparelho de fato tem biometria disponível E cadastrada
 * (`hasHardwareAsync`/`isEnrolledAsync`); nunca um toggle "morto" que liga
 * sem nenhum efeito real. Preferência local (`seguranca/segurancaStorage.ts`),
 * nunca sincronizada com o backend — ver `useSeguranca()`, que é quem de
 * fato aplica o bloqueio (`RootNavigator`/`BiometricLockScreen`).
 */
function SecaoBiometria({ theme }: { theme: Theme }) {
  const [carregando, setCarregando] = useState(true);
  const [disponivelNoAparelho, setDisponivelNoAparelho] = useState(false);
  const [ativo, setAtivo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;

    async function carregar() {
      const [hardware, matriculado, preferenciaAtiva] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        getBloqueioBiometricoAtivo(),
      ]);
      if (!vivo) return;
      setDisponivelNoAparelho(hardware && matriculado);
      setAtivo(preferenciaAtiva);
      setCarregando(false);
    }

    void carregar();
    return () => {
      vivo = false;
    };
  }, []);

  async function alternar(valor: boolean) {
    setErro(null);
    try {
      await setBloqueioBiometricoAtivo(valor);
      setAtivo(valor);
    } catch {
      setErro("Não foi possível salvar esta preferência agora.");
    }
  }

  if (carregando) return null;

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <SectionHeader title="Segurança do aparelho" theme={theme} />
      <Card elevation="sm" style={{ gap: theme.spacing.md }}>
        {disponivelNoAparelho ? (
          <ToggleRow
            label="Bloqueio por biometria"
            description="Exige sua digital ou reconhecimento facial para abrir o ACESSO, além do login."
            value={ativo}
            onValueChange={(valor) => void alternar(valor)}
          />
        ) : (
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]}>
            Cadastre uma biometria (digital ou reconhecimento facial) nas configurações do aparelho para usar o
            bloqueio do ACESSO.
          </Text>
        )}
        {erro ? <ErroAcao mensagem={erro} theme={theme} /> : null}
      </Card>
    </View>
  );
}

/** Confirmação nativa antes de pausar/excluir — mesmo mecanismo já usado em `MyProfileScreen.tsx`. */
function confirmarAcaoDestrutiva(titulo: string, mensagem: string, textoBotao: string, aoConfirmar: () => void) {
  Alert.alert(titulo, mensagem, [
    { text: "Cancelar", style: "cancel" },
    { text: textoBotao, style: "destructive", onPress: aoConfirmar },
  ]);
}

function SecaoZonaDePerigo({ theme }: { theme: Theme }) {
  const { logout } = useAuth();
  const [modo, setModo] = useState<"nenhum" | "pausar" | "excluir">("nenhum");
  const [senha, setSenha] = useState("");
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function abrir(novoModo: "pausar" | "excluir") {
    setModo(novoModo);
    setSenha("");
    setErro(null);
  }

  function cancelar() {
    setModo("nenhum");
    setSenha("");
    setErro(null);
  }

  async function pausar() {
    if (processando || !senha) return;
    setProcessando(true);
    setErro(null);
    try {
      await AuthService.pausarConta(senha);
      await logout();
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível pausar sua conta agora."));
      setProcessando(false);
    }
  }

  async function excluir() {
    if (processando || !senha) return;
    setProcessando(true);
    setErro(null);
    try {
      await AuthService.excluirConta(senha);
      await logout();
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível excluir sua conta agora."));
      setProcessando(false);
    }
  }

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <SectionHeader title="Zona de perigo" theme={theme} />
      <Card elevation="sm" style={{ gap: theme.spacing.md, borderColor: theme.colors.error.solid }}>
        <View style={{ gap: theme.spacing.xs }}>
          <Text style={[theme.typography.label, { color: theme.colors.textPrimary }]}>Pausar conta</Text>
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
            Sua conta fica invisível para outras pessoas. Você pode reativá-la a qualquer momento fazendo login de
            novo.
          </Text>
        </View>
        {modo === "pausar" ? (
          <View style={{ gap: theme.spacing.xs }}>
            <Input label="Confirme sua senha" value={senha} onChangeText={setSenha} secureTextEntry editable={!processando} />
            {erro ? <ErroAcao mensagem={erro} theme={theme} /> : null}
            <Button
              variant="destructive"
              onPress={() =>
                confirmarAcaoDestrutiva("Pausar conta", "Você poderá reativar fazendo login novamente. Continuar?", "Pausar", () => void pausar())
              }
              loading={processando}
              disabled={processando || !senha}
            >
              Confirmar pausa
            </Button>
            <Button variant="ghost" onPress={cancelar} disabled={processando}>
              Cancelar
            </Button>
          </View>
        ) : (
          <Button variant="outline" onPress={() => abrir("pausar")}>
            Pausar minha conta
          </Button>
        )}

        <View style={{ gap: theme.spacing.xs, marginTop: theme.spacing.sm }}>
          <Text style={[theme.typography.label, { color: theme.colors.error.solid }]}>Excluir conta</Text>
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
            Ação definitiva. Todos os seus dados são apagados e não podem ser recuperados.
          </Text>
        </View>
        {modo === "excluir" ? (
          <View style={{ gap: theme.spacing.xs }}>
            <Input label="Confirme sua senha" value={senha} onChangeText={setSenha} secureTextEntry editable={!processando} />
            {erro ? <ErroAcao mensagem={erro} theme={theme} /> : null}
            <Button
              variant="destructive"
              onPress={() =>
                confirmarAcaoDestrutiva(
                  "Excluir conta",
                  "Esta ação é definitiva e não pode ser desfeita. Todos os seus dados serão apagados. Continuar?",
                  "Excluir",
                  () => void excluir(),
                )
              }
              loading={processando}
              disabled={processando || !senha}
            >
              Confirmar exclusão
            </Button>
            <Button variant="ghost" onPress={cancelar} disabled={processando}>
              Cancelar
            </Button>
          </View>
        ) : (
          <Button variant="destructive" onPress={() => abrir("excluir")}>
            Excluir minha conta
          </Button>
        )}
      </Card>
    </View>
  );
}
