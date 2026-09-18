import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { BuscaService } from "../busca";
import type { BuscaResumoResposta, TipoBusca } from "../busca";
import { BuscaResultadoItem } from "../components/BuscaResultadoItem";
import { Botao, Cartao, EstadoVazio, CampoTexto, ContainerTela } from "../components/ui";
import type { AppStackParamList, PerfilStackParamList } from "../navigation/types";
import { extrairMensagemErro } from "../services/api/erros";
import { useTema } from "../tema";
import type { Tema } from "../tema";
import { TITULO_TIPO_BUSCA } from "./ResultadosBuscaScreen";

const TAMANHO_MINIMO_TERMO = 2;

type SearchScreenProps = CompositeScreenProps<
  NativeStackScreenProps<PerfilStackParamList, "Search">,
  NativeStackScreenProps<AppStackParamList>
>;

const CATEGORIAS: TipoBusca[] = ["usuarios", "empresas", "vagas", "postagens"];

/**
 * Busca global com o resumo agrupado (`GET /busca?tipo=tudo`): até 5 itens por categoria numa única
 * chamada. "Ver mais" abre `ResultadosBuscaScreen`, que pagina de verdade.
 *
 * O backend exige pelo menos 2 caracteres (`BuscaService.normalizar`), então o botão "Buscar" só
 * habilita a partir daí, sem gerar erro enquanto a pessoa digita.
 */
export function BuscaScreen({ navigation }: SearchScreenProps) {
  const { tema } = useTema();

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
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível buscar agora."));
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
    <ContainerTela>
      <View style={{ gap: tema.spacing.sm, marginBottom: tema.spacing.md }}>
        <View style={{ flexDirection: "row", gap: tema.spacing.sm, alignItems: "flex-end" }}>
          <View style={{ flex: 1 }}>
            <CampoTexto
              value={termo}
              onChangeText={setTermo}
              placeholder="Buscar pessoas, empresas, vagas, publicações..."
              accessibilityLabel="Termo de busca"
              returnKeyType="search"
              onSubmitEditing={() => void buscar()}
              editable={!carregando}
              textoAjuda={termo.length > 0 && !termoValido ? `Digite ao menos ${TAMANHO_MINIMO_TERMO} caracteres.` : undefined}
            />
          </View>
          <Botao size="small" onPress={() => void buscar()} disabled={!termoValido || carregando} carregando={carregando}>
            Buscar
          </Botao>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ gap: tema.spacing.xl, paddingBottom: tema.spacing.lg, flexGrow: 1 }}>
        {termoPesquisado === null ? (
          <EstadoVazio descricao="Digite um termo para buscar pessoas, empresas, vagas e publicações no ACESSO." />
        ) : carregando ? (
          <View style={{ paddingVertical: tema.spacing.xl, alignItems: "center" }}>
            <ActivityIndicator color={tema.colors.primary.solid} size="large" />
          </View>
        ) : erro ? (
          <Cartao elevacao="md" style={{ gap: tema.spacing.sm }}>
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[tema.typography.title, { color: tema.colors.textPrimary }]}
            >
              Não foi possível buscar
            </Text>
            <Text style={[tema.typography.body, { color: tema.colors.textSecondary }]}>{erro}</Text>
            <Botao onPress={() => void buscar()}>Tentar novamente</Botao>
          </Cartao>
        ) : resumo && resumo.total === 0 ? (
          <EstadoVazio titulo="Nenhum resultado" descricao={`Nada encontrado para "${termoPesquisado}".`} />
        ) : resumo ? (
          CATEGORIAS.map((categoria) => (
            <SecaoResultado
              key={categoria}
              tema={tema}
              titulo={TITULO_TIPO_BUSCA[categoria]}
              total={resumo.totais[categoria]}
              onVerMais={() => verMais(categoria)}
            >
              {resumo.resultados[categoria].map((item) => (
                <BuscaResultadoItem
                  key={item.id}
                  tipo={categoria}
                  item={item}
                  tema={tema}
                  onAbrirUsuario={abrirUsuario}
                  onAbrirVaga={abrirVaga}
                  onAbrirPostagem={abrirPostagem}
                />
              ))}
            </SecaoResultado>
          ))
        ) : null}
      </ScrollView>
    </ContainerTela>
  );
}

function SecaoResultado({
  tema,
  titulo,
  total,
  onVerMais,
  children,
}: {
  tema: Tema;
  titulo: string;
  total: number;
  onVerMais: () => void;
  children: React.ReactNode;
}) {
  // Categoria sem resultado nem aparece. Em `AtividadesScreen`, "nenhuma atividade ainda" é
  // informativo; aqui seria só ruído: numa busca com resultado em 2 das 4 categorias, mostrar
  // "Nenhuma empresa encontrada" duas vezes não ajuda em nada.
  if (total === 0) return null;

  return (
    <View style={{ gap: tema.spacing.sm }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text accessibilityRole="header" style={[tema.typography.title, { color: tema.colors.textPrimary }]}>
          {`${titulo} (${total})`}
        </Text>
        {total > 5 ? (
          <Pressable
            onPress={onVerMais}
            accessibilityRole="button"
            accessibilityLabel={`Ver mais em ${titulo}`}
            // Link de texto em `bodySmall`, com uns 20dp de altura: 14 de cada lado leva a área de
            // toque a 48dp.
            hitSlop={14}
          >
            <Text style={[tema.typography.bodySmall, { color: tema.colors.primary.solid }]}>Ver mais</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={{ gap: tema.spacing.xs }}>{children}</View>
    </View>
  );
}
