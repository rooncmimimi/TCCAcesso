import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { BuscaService } from "../busca";
import type { BuscaResumoResposta, TipoBusca } from "../busca";
import { BuscaResultadoItem } from "../components/BuscaResultadoItem";
import { Button, Card, EmptyState, Input, ScreenContainer } from "../components/ui";
import type { AppStackParamList, ProfileStackParamList } from "../navigation/types";
import { getFriendlyErrorMessage } from "../services/api/errors";
import { useTheme } from "../theme";
import type { Theme } from "../theme";
import { TITULO_TIPO_BUSCA } from "./SearchResultsScreen";

const TAMANHO_MINIMO_TERMO = 2;

type SearchScreenProps = CompositeScreenProps<
  NativeStackScreenProps<ProfileStackParamList, "Search">,
  NativeStackScreenProps<AppStackParamList>
>;

const CATEGORIAS: TipoBusca[] = ["usuarios", "empresas", "vagas", "postagens"];

/**
 * Busca global (Fase R2, recomendada) — `GET /busca` (`BuscaController`/
 * `BuscaService`, auditado antes de escrever qualquer código aqui). Mostra
 * o resumo agrupado (`tipo=tudo`, até 5 itens por categoria, UMA chamada
 * só) — "Ver mais" de uma categoria empilha `SearchResultsScreen`, que
 * pagina de verdade (o resumo não pagina, é só uma prévia).
 *
 * `q` precisa de pelo menos 2 caracteres (limite real do backend,
 * `BuscaService.normalizar`) — o botão "Buscar" fica desabilitado até lá,
 * pra nunca gerar um 400 "esperado" enquanto o usuário ainda digita a
 * primeira letra.
 */
export function SearchScreen({ navigation }: SearchScreenProps) {
  const { theme } = useTheme();

  const [termo, setTermo] = useState("");
  const [termoPesquisado, setTermoPesquisado] = useState<string | null>(null);
  const [resumo, setResumo] = useState<BuscaResumoResposta | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const termoValido = termo.trim().length >= TAMANHO_MINIMO_TERMO;

  async function buscar() {
    if (!termoValido || carregando) return;
    const termoNormalizado = termo.trim();
    setCarregando(true);
    setErro(null);
    setTermoPesquisado(termoNormalizado);
    try {
      const resposta = await BuscaService.buscarResumo(termoNormalizado);
      setResumo(resposta);
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível buscar agora."));
      setResumo(null);
    } finally {
      setCarregando(false);
    }
  }

  function verMais(tipo: TipoBusca) {
    if (!termoPesquisado) return;
    navigation.navigate("SearchResults", { termo: termoPesquisado, tipo });
  }

  function abrirUsuario(usuarioId: string) {
    navigation.navigate("PublicProfile", { usuarioId });
  }

  function abrirVaga(vagaId: string) {
    navigation.navigate("VagaDetail", { vagaId });
  }

  function abrirPostagem(postagemId: string) {
    navigation.navigate("PostagemDetail", { postagemId });
  }

  return (
    <ScreenContainer>
      <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        <View style={{ flexDirection: "row", gap: theme.spacing.sm, alignItems: "flex-end" }}>
          <View style={{ flex: 1 }}>
            <Input
              value={termo}
              onChangeText={setTermo}
              placeholder="Buscar pessoas, empresas, vagas, publicações..."
              accessibilityLabel="Termo de busca"
              returnKeyType="search"
              onSubmitEditing={() => void buscar()}
              editable={!carregando}
              helperText={termo.length > 0 && !termoValido ? `Digite ao menos ${TAMANHO_MINIMO_TERMO} caracteres.` : undefined}
            />
          </View>
          <Button size="small" onPress={() => void buscar()} disabled={!termoValido || carregando} loading={carregando}>
            Buscar
          </Button>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ gap: theme.spacing.xl, paddingBottom: theme.spacing.lg, flexGrow: 1 }}>
        {termoPesquisado === null ? (
          <EmptyState description="Digite um termo para buscar pessoas, empresas, vagas e publicações no ACESSO." />
        ) : carregando ? (
          <View style={{ paddingVertical: theme.spacing.xl, alignItems: "center" }}>
            <ActivityIndicator color={theme.colors.primary.solid} size="large" />
          </View>
        ) : erro ? (
          <Card elevation="md" style={{ gap: theme.spacing.sm }}>
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[theme.typography.title, { color: theme.colors.textPrimary }]}
            >
              Não foi possível buscar
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{erro}</Text>
            <Button onPress={() => void buscar()}>Tentar novamente</Button>
          </Card>
        ) : resumo && resumo.total === 0 ? (
          <EmptyState title="Nenhum resultado" description={`Nada encontrado para "${termoPesquisado}".`} />
        ) : resumo ? (
          CATEGORIAS.map((categoria) => (
            <SecaoResultado
              key={categoria}
              theme={theme}
              titulo={TITULO_TIPO_BUSCA[categoria]}
              total={resumo.totais[categoria]}
              onVerMais={() => verMais(categoria)}
            >
              {resumo.resultados[categoria].map((item) => (
                <BuscaResultadoItem
                  key={item.id}
                  tipo={categoria}
                  item={item}
                  theme={theme}
                  onAbrirUsuario={abrirUsuario}
                  onAbrirVaga={abrirVaga}
                  onAbrirPostagem={abrirPostagem}
                />
              ))}
            </SecaoResultado>
          ))
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

function SecaoResultado({
  theme,
  titulo,
  total,
  onVerMais,
  children,
}: {
  theme: Theme;
  titulo: string;
  total: number;
  onVerMais: () => void;
  children: React.ReactNode;
}) {
  // Categoria sem nenhum resultado nem aparece — diferente de `ActivitiesScreen`
  // (onde "nenhuma atividade ainda" é informativo), aqui é só ruído: numa
  // busca com resultado em 2 das 4 categorias, mostrar "Nenhuma empresa
  // encontrada" duas vezes não ajuda em nada.
  if (total === 0) return null;

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text accessibilityRole="header" style={[theme.typography.title, { color: theme.colors.textPrimary }]}>
          {`${titulo} (${total})`}
        </Text>
        {total > 5 ? (
          <Pressable
            onPress={onVerMais}
            accessibilityRole="button"
            accessibilityLabel={`Ver mais em ${titulo}`}
            // Rodada 3, item 8 — mesmo gap de 48dp já corrigido em
            // `ActivitiesScreen.tsx`/`LoginScreen.tsx` para um link de texto
            // sozinho (bodySmall, ~20dp): hitSlop 14 de cada lado.
            hitSlop={14}
          >
            <Text style={[theme.typography.bodySmall, { color: theme.colors.primary.solid }]}>Ver mais</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={{ gap: theme.spacing.xs }}>{children}</View>
    </View>
  );
}
