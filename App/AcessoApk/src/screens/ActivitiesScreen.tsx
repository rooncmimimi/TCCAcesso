import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AtividadeService } from "../atividades";
import type {
  CandidaturaAtividade,
  ComentarioAtividade,
  EmpresaSeguidaAtividade,
  FavoritoVagaAtividade,
  MinhaAtividade,
  PessoaSeguidaAtividade,
  PostagemResumoAtividade,
} from "../atividades";
import { useAuth } from "../auth";
import { Badge, Button, Card, ScreenContainer } from "../components/ui";
import type { BadgeVariant } from "../components/ui";
import type { AppStackParamList, ProfileStackParamList } from "../navigation/types";
import { getFriendlyErrorMessage } from "../services/api/errors";
import { useTheme } from "../theme";
import type { Theme } from "../theme";
import { STATUS_CANDIDATURA_LABEL } from "../vagas";
import type { StatusCandidatura } from "../vagas";

type ActivitiesScreenProps = CompositeScreenProps<
  NativeStackScreenProps<ProfileStackParamList, "Activities">,
  NativeStackScreenProps<AppStackParamList>
>;

/** Mesmo mapa de `JobApplicantsScreen.tsx` — duplicado de propósito (mesmo raciocínio de `iniciaisDoNome` em outras telas). */
const VARIANTE_STATUS_CANDIDATURA: Record<StatusCandidatura, BadgeVariant> = {
  Pendente: "neutral",
  Visualizada: "info",
  EmAnalise: "warning",
  Aprovada: "success",
  Rejeitada: "error",
  Cancelada: "neutral",
};

/** Mesmo cálculo de `PublicProfileScreen.tsx`/`FollowListScreen.tsx` — duplicado de propósito. */
function iniciaisDoNome(nome: string | undefined): string {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.charAt(0) ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1]?.charAt(0) ?? "" : "";
  const iniciais = (primeira + ultima).toUpperCase();
  return iniciais || "?";
}

/** Mesmo padrão de `PostagemDetailScreen.tsx`/`VagaDetailScreen.tsx` — duplicado de propósito. */
function formatarData(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(data);
}

function nomeDaEmpresa(empresa: { nomeFantasia?: string | null; razaoSocial?: string } | undefined): string {
  return empresa?.nomeFantasia ?? empresa?.razaoSocial ?? "Empresa";
}

/**
 * "Minha atividade" (Fase 26 — substitui o placeholder). Leitura agregada de
 * `GET /atividades/minha` (`AtividadeService.js`, já existente e
 * estritamente escopada ao próprio usuário — ver `src/atividades/types.ts`):
 * cada categoria é uma PRÉVIA de até 5 itens + o total real, sem paginação
 * própria — não é uma lista que cresce, é um retrato do momento.
 *
 * "Ver tudo" só existe para "Pessoas que você segue" (`FollowList`, tela já
 * existente). Nenhuma outra categoria tem uma tela de listagem completa
 * hoje no app (confirmado por auditoria: `VagasService` não tem "minhas
 * candidaturas"/"favoritos" para candidato, e não existe rota para listar
 * TODAS as empresas seguidas) — em vez de um link morto, cada item
 * individual já navega para o destino real (vaga, perfil ou publicação),
 * que é mais útil que uma lista completa que só repetiria os mesmos dados.
 */
export function ActivitiesScreen({ navigation }: ActivitiesScreenProps) {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [atividade, setAtividade] = useState<MinhaAtividade | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async (comoAtualizacao: boolean) => {
    if (comoAtualizacao) setAtualizando(true);
    setErro(null);
    try {
      const resultado = await AtividadeService.minha();
      setAtividade(resultado);
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar sua atividade agora."));
    } finally {
      if (comoAtualizacao) setAtualizando(false);
      else setCarregando(false);
    }
  }, []);

  // Função inline dentro do próprio efeito (mesmo padrão de `JobsScreen.tsx`) — evita o lint `react-hooks/set-state-in-effect`.
  useEffect(() => {
    let cancelado = false;

    async function carregarInicial() {
      try {
        const resultado = await AtividadeService.minha();
        if (cancelado) return;
        setAtividade(resultado);
      } catch (erroRequisicao) {
        if (cancelado) return;
        setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar sua atividade agora."));
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }

    void carregarInicial();
    return () => {
      cancelado = true;
    };
  }, []);

  function abrirVaga(vagaId: string) {
    navigation.navigate("VagaDetail", { vagaId });
  }

  function abrirPerfil(usuarioId: string) {
    navigation.navigate("PublicProfile", { usuarioId });
  }

  function abrirPostagem(postagemId: string) {
    navigation.navigate("PostagemDetail", { postagemId });
  }

  function verPessoasQueSigo() {
    if (!user) return;
    navigation.navigate("FollowList", { usuarioId: user.id, modo: "seguindo", nomeUsuario: user.nome });
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

  if (erro && !atividade) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Card elevation="md" style={{ gap: theme.spacing.sm }}>
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[theme.typography.title, { color: theme.colors.textPrimary }]}
            >
              Não foi possível carregar sua atividade
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{erro}</Text>
            <Button onPress={() => void carregar(false)}>Tentar novamente</Button>
          </Card>
        </View>
      </ScreenContainer>
    );
  }

  if (!atividade) return null;

  return (
    <ScreenContainer>
      <ScrollView
        testID="atividades-scroll"
        contentContainerStyle={{ gap: theme.spacing.xl, paddingVertical: theme.spacing.lg }}
        refreshControl={
          <RefreshControl refreshing={atualizando} onRefresh={() => void carregar(true)} colors={[theme.colors.primary.solid]} />
        }
      >
        {erro ? (
          <Card elevation="sm" style={{ gap: theme.spacing.xs }}>
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[theme.typography.caption, { color: theme.colors.error.solid }]}
            >
              {erro}
            </Text>
          </Card>
        ) : null}

        {atividade.ehCandidato ? (
          <Secao
            theme={theme}
            titulo="Candidaturas"
            total={atividade.candidaturas.total}
            vazio={atividade.candidaturas.itens.length === 0}
            textoVazio="Você ainda não se candidatou a nenhuma vaga."
          >
            {atividade.candidaturas.itens.map((item) => (
              <ItemCandidatura key={item.id} item={item} theme={theme} onPress={() => abrirVaga(item.vaga.id)} />
            ))}
          </Secao>
        ) : null}

        {atividade.ehCandidato ? (
          <Secao
            theme={theme}
            titulo="Vagas favoritas"
            total={atividade.vagasFavoritas.total}
            vazio={atividade.vagasFavoritas.itens.length === 0}
            textoVazio="Nenhuma vaga favoritada ainda."
          >
            {atividade.vagasFavoritas.itens.map((item) => (
              <ItemVagaFavorita key={item.id} item={item} theme={theme} onPress={() => abrirVaga(item.vaga.id)} />
            ))}
          </Secao>
        ) : null}

        <Secao
          theme={theme}
          titulo="Pessoas que você segue"
          total={atividade.seguindo.pessoas.total}
          vazio={atividade.seguindo.pessoas.itens.length === 0}
          textoVazio="Você ainda não segue ninguém."
          verTudo={atividade.seguindo.pessoas.total > 0 ? verPessoasQueSigo : undefined}
        >
          {atividade.seguindo.pessoas.itens.map((pessoa) => (
            <ItemPessoa key={pessoa.id} pessoa={pessoa} theme={theme} onPress={() => abrirPerfil(pessoa.id)} />
          ))}
        </Secao>

        <Secao
          theme={theme}
          titulo="Empresas que você segue"
          total={atividade.seguindo.empresas.total}
          vazio={atividade.seguindo.empresas.itens.length === 0}
          textoVazio="Você ainda não segue nenhuma empresa."
        >
          {atividade.seguindo.empresas.itens.map((item) => (
            <ItemEmpresaSeguida key={item.id} item={item} theme={theme} onPress={() => abrirPerfil(item.empresa.usuarioId)} />
          ))}
        </Secao>

        <Secao
          theme={theme}
          titulo="Publicações que você curtiu"
          total={atividade.interacoesFeed.curtidas.total}
          vazio={atividade.interacoesFeed.curtidas.itens.length === 0}
          textoVazio="Você ainda não curtiu nenhuma publicação."
        >
          {atividade.interacoesFeed.curtidas.itens.map((item) => (
            <ItemPostagem key={item.id} postagem={item.postagem} theme={theme} onPress={() => abrirPostagem(item.postagem.id)} />
          ))}
        </Secao>

        <Secao
          theme={theme}
          titulo="Comentários que você fez"
          total={atividade.interacoesFeed.comentarios.total}
          vazio={atividade.interacoesFeed.comentarios.itens.length === 0}
          textoVazio="Você ainda não comentou em nenhuma publicação."
        >
          {atividade.interacoesFeed.comentarios.itens.map((item) => (
            <ItemComentario key={item.id} item={item} theme={theme} onPress={() => abrirPostagem(item.postagem.id)} />
          ))}
        </Secao>

        <Secao
          theme={theme}
          titulo="Publicações que você compartilhou"
          total={atividade.interacoesFeed.compartilhamentos.total}
          vazio={atividade.interacoesFeed.compartilhamentos.itens.length === 0}
          textoVazio="Você ainda não compartilhou nenhuma publicação."
        >
          {atividade.interacoesFeed.compartilhamentos.itens.map((item) => (
            <ItemPostagem key={item.id} postagem={item.postagem} theme={theme} onPress={() => abrirPostagem(item.postagem.id)} />
          ))}
        </Secao>
      </ScrollView>
    </ScreenContainer>
  );
}

function Secao({
  theme,
  titulo,
  total,
  vazio,
  textoVazio,
  verTudo,
  children,
}: {
  theme: Theme;
  titulo: string;
  total: number;
  vazio: boolean;
  textoVazio: string;
  verTudo?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text accessibilityRole="header" style={[theme.typography.title, { color: theme.colors.textPrimary }]}>
          {total > 0 ? `${titulo} (${total})` : titulo}
        </Text>
        {verTudo ? (
          <Pressable onPress={verTudo} accessibilityRole="button" accessibilityLabel={`Ver tudo em ${titulo}`}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.primary.solid }]}>Ver tudo</Text>
          </Pressable>
        ) : null}
      </View>
      {vazio ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]}>{textoVazio}</Text>
      ) : (
        <View style={{ gap: theme.spacing.xs }}>{children}</View>
      )}
    </View>
  );
}

function ItemCandidatura({ item, theme, onPress }: { item: CandidaturaAtividade; theme: Theme; onPress: () => void }) {
  const empresa = nomeDaEmpresa(item.vaga.empresa);
  return (
    <View style={{ borderRadius: theme.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${item.vaga.titulo}, ${empresa}, ${STATUS_CANDIDATURA_LABEL[item.status]}`}
        android_ripple={{ color: theme.colors.divider }}
        style={{ minHeight: theme.sizes.touchTarget }}
      >
        <Card elevation="sm" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: theme.spacing.sm }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[theme.typography.body, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {item.vaga.titulo}
            </Text>
            <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {empresa}
            </Text>
          </View>
          <Badge variant={VARIANTE_STATUS_CANDIDATURA[item.status]}>{STATUS_CANDIDATURA_LABEL[item.status]}</Badge>
        </Card>
      </Pressable>
    </View>
  );
}

function ItemVagaFavorita({ item, theme, onPress }: { item: FavoritoVagaAtividade; theme: Theme; onPress: () => void }) {
  const empresa = nomeDaEmpresa(item.vaga.empresa);
  return (
    <View style={{ borderRadius: theme.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${item.vaga.titulo}, ${empresa}`}
        android_ripple={{ color: theme.colors.divider }}
        style={{ minHeight: theme.sizes.touchTarget }}
      >
        <Card elevation="sm" style={{ gap: 2 }}>
          <Text style={[theme.typography.body, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {item.vaga.titulo}
          </Text>
          <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {empresa}
          </Text>
        </Card>
      </Pressable>
    </View>
  );
}

function ItemPessoa({ pessoa, theme, onPress }: { pessoa: PessoaSeguidaAtividade; theme: Theme; onPress: () => void }) {
  return (
    <View style={{ borderRadius: theme.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Abrir perfil de ${pessoa.nome}`}
        android_ripple={{ color: theme.colors.divider }}
        style={{ minHeight: theme.sizes.touchTarget }}
      >
        <Card elevation="sm" style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
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
            <Text style={[theme.typography.label, { color: theme.colors.primary.onSoft }]}>{iniciaisDoNome(pessoa.nome)}</Text>
          </View>
          <Text style={[theme.typography.body, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {pessoa.nome}
          </Text>
        </Card>
      </Pressable>
    </View>
  );
}

function ItemEmpresaSeguida({ item, theme, onPress }: { item: EmpresaSeguidaAtividade; theme: Theme; onPress: () => void }) {
  const nome = nomeDaEmpresa(item.empresa);
  return (
    <View style={{ borderRadius: theme.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Abrir perfil de ${nome}`}
        android_ripple={{ color: theme.colors.divider }}
        style={{ minHeight: theme.sizes.touchTarget }}
      >
        <Card elevation="sm" style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
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
          <Text style={[theme.typography.body, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {nome}
          </Text>
        </Card>
      </Pressable>
    </View>
  );
}

function ItemPostagem({ postagem, theme, onPress }: { postagem: PostagemResumoAtividade; theme: Theme; onPress: () => void }) {
  const data = formatarData(postagem.created_at);
  const texto = postagem.conteudo?.trim() || "Publicação sem texto";
  return (
    <View style={{ borderRadius: theme.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Abrir publicação: ${texto}`}
        android_ripple={{ color: theme.colors.divider }}
        style={{ minHeight: theme.sizes.touchTarget }}
      >
        <Card elevation="sm" style={{ gap: 2 }}>
          <Text style={[theme.typography.body, { color: theme.colors.textPrimary }]} numberOfLines={2}>
            {texto}
          </Text>
          {data ? <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>{data}</Text> : null}
        </Card>
      </Pressable>
    </View>
  );
}

function ItemComentario({ item, theme, onPress }: { item: ComentarioAtividade; theme: Theme; onPress: () => void }) {
  const data = formatarData(item.postagem.created_at);
  return (
    <View style={{ borderRadius: theme.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Abrir publicação onde você comentou: ${item.comentario}`}
        android_ripple={{ color: theme.colors.divider }}
        style={{ minHeight: theme.sizes.touchTarget }}
      >
        <Card elevation="sm" style={{ gap: 2 }}>
          <Text style={[theme.typography.body, { color: theme.colors.textPrimary }]} numberOfLines={2}>
            {item.comentario}
          </Text>
          {data ? <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>{data}</Text> : null}
        </Card>
      </Pressable>
    </View>
  );
}
