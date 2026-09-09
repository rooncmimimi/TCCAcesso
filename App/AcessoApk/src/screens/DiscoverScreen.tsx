import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Button, Card, ScreenContainer } from "../components/ui";
import type { AppStackParamList, ProfileStackParamList } from "../navigation/types";
import { getFriendlyErrorMessage } from "../services/api/errors";
import { SeguidorService } from "../seguidores";
import type { SugestaoEmpresa, SugestaoPessoa } from "../seguidores";
import { useTheme } from "../theme";
import type { Theme } from "../theme";

type EstadoRelacao = { seguindo: boolean; solicitacaoPendente: boolean };

type DiscoverScreenProps = CompositeScreenProps<
  NativeStackScreenProps<ProfileStackParamList, "Discover">,
  NativeStackScreenProps<AppStackParamList>
>;

/** Mesmo cálculo de `PublicProfileScreen.tsx` — duplicado de propósito. */
function iniciaisDoNome(nome: string | undefined): string {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.charAt(0) ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1]?.charAt(0) ?? "" : "";
  const iniciais = (primeira + ultima).toUpperCase();
  return iniciais || "?";
}

/**
 * Descobrir (Fase 14) — sugestões explicáveis de pessoas e empresas para
 * seguir. `GET /seguir/sugestoes*` nunca inclui quem já se segue (o
 * backend já filtra), então o estado inicial de cada item é sempre "não
 * seguindo" — os overrides locais (`estadoPessoas`/`estadoEmpresas`) só
 * existem depois de uma ação bem-sucedida nesta mesma sessão da tela.
 */
export function DiscoverScreen({ navigation }: DiscoverScreenProps) {
  const { theme } = useTheme();

  const [pessoas, setPessoas] = useState<SugestaoPessoa[]>([]);
  const [empresas, setEmpresas] = useState<SugestaoEmpresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  const [estadoPessoas, setEstadoPessoas] = useState<Record<string, EstadoRelacao>>({});
  const [estadoEmpresas, setEstadoEmpresas] = useState<Record<string, boolean>>({});
  const [processandoId, setProcessandoId] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        const [pessoasRes, empresasRes] = await Promise.all([
          SeguidorService.sugestoesPessoas(),
          SeguidorService.sugestoesEmpresas(),
        ]);
        if (cancelado) return;
        setPessoas(pessoasRes);
        setEmpresas(empresasRes);
      } catch (erroRequisicao) {
        if (cancelado) return;
        setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar sugestões agora."));
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

  function abrirPerfil(usuarioId: string) {
    navigation.navigate("PublicProfile", { usuarioId });
  }

  // Sem optimistic update (mesma política do resto do app): o botão só
  // muda depois que o servidor confirma. Erro fica silencioso (mesma
  // decisão de "curtir" no Feed — seguir aqui não é uma ação crítica; o
  // botão só volta a ficar habilitado).
  async function seguirPessoa(id: string) {
    if (processandoId) return;
    setProcessandoId(id);
    try {
      // `solicitarSeguir` funciona pra público E privado (o backend decide
      // sozinho): as sugestões não informam se o perfil é público, então
      // esta é a única chamada segura de usar aqui sem checar antes.
      const resposta = await SeguidorService.solicitarSeguir(id);
      setEstadoPessoas((atual) => ({
        ...atual,
        [id]: resposta.solicitacaoCriada
          ? { seguindo: false, solicitacaoPendente: true }
          : { seguindo: true, solicitacaoPendente: false },
      }));
    } catch {
      // silencioso — ver comentário acima
    } finally {
      setProcessandoId(null);
    }
  }

  async function deixarDeSeguirPessoa(id: string) {
    if (processandoId) return;
    setProcessandoId(id);
    try {
      await SeguidorService.alternarSeguirUsuario(id);
      setEstadoPessoas((atual) => ({ ...atual, [id]: { seguindo: false, solicitacaoPendente: false } }));
    } catch {
      // silencioso
    } finally {
      setProcessandoId(null);
    }
  }

  async function cancelarSolicitacaoPessoa(id: string) {
    if (processandoId) return;
    setProcessandoId(id);
    try {
      await SeguidorService.cancelarSolicitacao(id);
      setEstadoPessoas((atual) => ({ ...atual, [id]: { seguindo: false, solicitacaoPendente: false } }));
    } catch {
      // silencioso
    } finally {
      setProcessandoId(null);
    }
  }

  async function alternarSeguirEmpresa(id: string) {
    if (processandoId) return;
    setProcessandoId(id);
    try {
      const { seguindo } = await SeguidorService.alternarSeguirEmpresa(id);
      setEstadoEmpresas((atual) => ({ ...atual, [id]: seguindo }));
    } catch {
      // silencioso
    } finally {
      setProcessandoId(null);
    }
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

  if (erro && pessoas.length === 0 && empresas.length === 0) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Card elevation="md" style={{ gap: theme.spacing.sm }}>
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[theme.typography.title, { color: theme.colors.textPrimary }]}
            >
              Não foi possível carregar sugestões
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
        <View style={{ gap: theme.spacing.sm }}>
          <Text accessibilityRole="header" style={[theme.typography.title, { color: theme.colors.textPrimary }]}>
            Pessoas para seguir
          </Text>
          {pessoas.length === 0 ? (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]}>
              Nenhuma sugestão no momento.
            </Text>
          ) : (
            pessoas.map((pessoa) => {
              const estado = estadoPessoas[pessoa.id];
              return (
                <SugestaoCard
                  key={pessoa.id}
                  theme={theme}
                  nome={pessoa.nome}
                  subtitulo={pessoa.titulo}
                  motivo={pessoa.motivo}
                  onPress={() => abrirPerfil(pessoa.id)}
                  botao={
                    estado?.seguindo ? (
                      <Button
                        variant="outline"
                        size="small"
                        onPress={() => void deixarDeSeguirPessoa(pessoa.id)}
                        loading={processandoId === pessoa.id}
                        disabled={processandoId !== null}
                      >
                        Seguindo
                      </Button>
                    ) : estado?.solicitacaoPendente ? (
                      <Button
                        variant="outline"
                        size="small"
                        onPress={() => void cancelarSolicitacaoPessoa(pessoa.id)}
                        loading={processandoId === pessoa.id}
                        disabled={processandoId !== null}
                      >
                        Solicitado
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        onPress={() => void seguirPessoa(pessoa.id)}
                        loading={processandoId === pessoa.id}
                        disabled={processandoId !== null}
                      >
                        Seguir
                      </Button>
                    )
                  }
                />
              );
            })
          )}
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Text accessibilityRole="header" style={[theme.typography.title, { color: theme.colors.textPrimary }]}>
            Empresas para seguir
          </Text>
          {empresas.length === 0 ? (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]}>
              Nenhuma sugestão no momento.
            </Text>
          ) : (
            empresas.map((empresa) => {
              const seguindo = estadoEmpresas[empresa.id] ?? false;
              return (
                <SugestaoCard
                  key={empresa.id}
                  theme={theme}
                  nome={empresa.nomeFantasia ?? empresa.razaoSocial}
                  subtitulo={empresa.setor}
                  motivo={empresa.motivo}
                  onPress={() => abrirPerfil(empresa.usuarioId)}
                  botao={
                    <Button
                      variant={seguindo ? "outline" : "primary"}
                      size="small"
                      onPress={() => void alternarSeguirEmpresa(empresa.id)}
                      loading={processandoId === empresa.id}
                      disabled={processandoId !== null}
                    >
                      {seguindo ? "Seguindo" : "Seguir"}
                    </Button>
                  }
                />
              );
            })
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function SugestaoCard({
  theme,
  nome,
  subtitulo,
  motivo,
  onPress,
  botao,
}: {
  theme: Theme;
  nome: string;
  subtitulo?: string | null;
  motivo: string;
  onPress: () => void;
  botao: React.ReactNode;
}) {
  return (
    <Card elevation="sm" style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Abrir perfil de ${nome}`}
        style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, flex: 1 }}
      >
        <View
          accessible={false}
          style={{
            width: theme.sizes.avatarMedium,
            height: theme.sizes.avatarMedium,
            borderRadius: theme.sizes.avatarMedium / 2,
            backgroundColor: theme.colors.primary.soft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={[theme.typography.label, { color: theme.colors.primary.onSoft }]}>{iniciaisDoNome(nome)}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[theme.typography.body, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {nome}
          </Text>
          {subtitulo ? (
            <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {subtitulo}
            </Text>
          ) : null}
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {motivo}
          </Text>
        </View>
      </Pressable>
      {botao}
    </Card>
  );
}
