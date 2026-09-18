import { memo, useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Avatar, Etiqueta, Botao, Cartao, EstadoVazio, EstadoErro, EstadoCarregamento, ContainerTela, ControleSegmentado } from "../components/ui";
import type { VarianteEtiqueta } from "../components/ui";
import type { AppStackParamList, PerfilStackParamList } from "../navigation/types";
import { extrairMensagemErro } from "../services/api/erros";
import { useTema } from "../tema";
import type { Tema } from "../tema";
import { ROTULOS_MODALIDADE, ROTULOS_STATUS_CANDIDATURA, ROTULOS_STATUS_VAGA, VagasService } from "../vagas";
import type { Candidatura, StatusCandidatura, StatusVaga, Vaga } from "../vagas";
import { confirmarExclusao } from "../utils/confirmarExclusao";

const LIMITE_CANDIDATURAS = 50;

/**
 * Navega até `PublicProfile`, que fica na pilha pai (`AppStackParamList`) e não na pilha do Perfil,
 * como em `DescobrirScreen.tsx`.
 */
type JobApplicantsScreenProps = CompositeScreenProps<
  NativeStackScreenProps<PerfilStackParamList, "JobApplicants">,
  NativeStackScreenProps<AppStackParamList>
>;

/**
 * Os 4 status que a empresa pode aplicar (`STATUS_EMPRESA` em `CandidaturaService.js`). Pendente é
 * o estado inicial e Cancelada só o candidato aplica.
 */
const STATUS_EMPRESA: StatusCandidatura[] = ["visualizada", "em_analise", "aprovada", "rejeitada"];
const OPCOES_STATUS_CANDIDATURA = STATUS_EMPRESA.map((valor) => ({ rotulo: ROTULOS_STATUS_CANDIDATURA[valor], value: valor }));

const VARIANTE_STATUS_VAGA: Record<StatusVaga, VarianteEtiqueta> = {
  aberta: "success",
  pausada: "warning",
  encerrada: "neutral",
};

const VARIANTE_STATUS_CANDIDATURA: Record<StatusCandidatura, VarianteEtiqueta> = {
  pendente: "neutral",
  visualizada: "info",
  em_analise: "warning",
  aprovada: "success",
  rejeitada: "error",
  cancelada: "neutral",
};

/**
 * Gestão de uma vaga: dados, ações de status e exclusão, e as candidaturas recebidas, cada uma com
 * seu status. Vaga e candidaturas carregam juntas (`Promise.all`), porque é uma tela de gestão de
 * um único recurso, e não seções independentes como em `DetalhePostagemScreen`. Não há "carregar
 * mais": busca de uma vez um lote de 50 candidaturas, como o histórico de `ConversaScreen.tsx`.
 */
export function CandidaturasVagaScreen({ route, navigation }: JobApplicantsScreenProps) {
  const { tema } = useTema();
  const { vagaId } = route.params;

  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  const [processandoAcaoVaga, setProcessandoAcaoVaga] = useState<"pausar" | "reabrir" | "encerrar" | "excluir" | null>(null);
  const [erroAcaoVaga, setErroAcaoVaga] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        const [vagaRes, candidaturasRes] = await Promise.all([
          VagasService.obterPorId(vagaId),
          VagasService.listarCandidaturas(vagaId, { page: 1, limit: LIMITE_CANDIDATURAS }),
        ]);
        if (cancelado) return;
        setVaga(vagaRes);
        setCandidaturas(candidaturasRes.candidaturas);
      } catch (erroRequisicao) {
        if (cancelado) return;
        setErro(extrairMensagemErro(erroRequisicao, "Não foi possível carregar esta vaga."));
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }

    void carregar();
    return () => {
      cancelado = true;
    };
  }, [vagaId, tentativa]);

  function tentarNovamente() {
    setErro(null);
    setCarregando(true);
    setTentativa((valor) => valor + 1);
  }

  async function mudarStatusVaga(acao: "pausar" | "reabrir" | "encerrar", novoStatus: StatusVaga) {
    if (processandoAcaoVaga) return;
    setProcessandoAcaoVaga(acao);
    setErroAcaoVaga(null);
    try {
      const atualizada = await VagasService.alterarStatus(vagaId, novoStatus);
      setVaga(atualizada);
    } catch (erroRequisicao) {
      setErroAcaoVaga(extrairMensagemErro(erroRequisicao, "Não foi possível atualizar o status agora."));
    } finally {
      setProcessandoAcaoVaga(null);
    }
  }

  async function excluirVaga() {
    if (processandoAcaoVaga) return;
    setProcessandoAcaoVaga("excluir");
    setErroAcaoVaga(null);
    try {
      await VagasService.remover(vagaId);
      navigation.goBack();
    } catch (erroRequisicao) {
      setErroAcaoVaga(extrairMensagemErro(erroRequisicao, "Não foi possível excluir a vaga agora."));
      setProcessandoAcaoVaga(null);
    }
  }

  function editarVaga() {
    navigation.navigate("JobForm", { vagaId });
  }

  // `useCallback` junto do `memo` de `CandidaturaItem`: mudar o status de uma candidatura recria o
  // array e, sem isso, todas as linhas renderizariam de novo (ver `FeedScreen.tsx`).
  const abrirPerfilCandidato = useCallback(
    (usuarioId: string) => {
      navigation.navigate("PublicProfile", { usuarioId });
    },
    [navigation],
  );

  const atualizarCandidaturaNaLista = useCallback((id: string, atualizada: Candidatura) => {
    setCandidaturas((atual) => atual.map((candidatura) => (candidatura.id === id ? atualizada : candidatura)));
  }, []);

  if (carregando) {
    return <EstadoCarregamento />;
  }

  if (erro && !vaga) {
    return <EstadoErro titulo="Não foi possível carregar esta vaga" mensagem={erro} onTentarNovamente={tentarNovamente} />;
  }

  if (!vaga) return null;

  return (
    <ContainerTela>
      <ScrollView contentContainerStyle={{ gap: tema.spacing.lg, paddingVertical: tema.spacing.lg }}>
        <Cartao elevacao="sm" style={{ gap: tema.spacing.sm }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: tema.spacing.sm }}>
            <Text style={[tema.typography.heading, { color: tema.colors.textPrimary, flex: 1 }]}>{vaga.titulo}</Text>
            <Etiqueta variant={VARIANTE_STATUS_VAGA[vaga.status]}>{ROTULOS_STATUS_VAGA[vaga.status]}</Etiqueta>
          </View>
          <Text style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]}>
            {ROTULOS_MODALIDADE[vaga.modalidade]}
            {vaga.cidade ? ` · ${vaga.cidade}${vaga.estado ? ` - ${vaga.estado}` : ""}` : ""}
          </Text>

          <Botao variant="outline" onPress={editarVaga}>
            Editar vaga
          </Botao>

          <View style={{ flexDirection: "row", gap: tema.spacing.sm, flexWrap: "wrap" }}>
            {vaga.status !== "pausada" ? (
              <View style={{ flex: 1 }}>
                <Botao
                  variant="outline"
                  size="small"
                  onPress={() => void mudarStatusVaga("pausar", "pausada")}
                  carregando={processandoAcaoVaga === "pausar"}
                  disabled={processandoAcaoVaga !== null || vaga.status === "encerrada"}
                >
                  Pausar
                </Botao>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <Botao
                  variant="outline"
                  size="small"
                  onPress={() => void mudarStatusVaga("reabrir", "aberta")}
                  carregando={processandoAcaoVaga === "reabrir"}
                  disabled={processandoAcaoVaga !== null}
                >
                  Reabrir
                </Botao>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Botao
                variant="outline"
                size="small"
                onPress={() => void mudarStatusVaga("encerrar", "encerrada")}
                carregando={processandoAcaoVaga === "encerrar"}
                disabled={processandoAcaoVaga !== null || vaga.status === "encerrada"}
              >
                Encerrar
              </Botao>
            </View>
          </View>

          <Botao
            variant="destructive"
            size="small"
            onPress={() =>
              confirmarExclusao(
                "Excluir vaga",
                "Esta ação é definitiva e remove também o histórico de candidaturas. Continuar?",
                () => void excluirVaga(),
              )
            }
            carregando={processandoAcaoVaga === "excluir"}
            disabled={processandoAcaoVaga !== null}
          >
            Excluir vaga
          </Botao>

          {erroAcaoVaga ? (
            <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[tema.typography.caption, { color: tema.colors.error.solid }]}>
              {erroAcaoVaga}
            </Text>
          ) : null}
        </Cartao>

        <View style={{ gap: tema.spacing.sm }}>
          <Text accessibilityRole="header" style={[tema.typography.title, { color: tema.colors.textPrimary }]}>
            Candidaturas ({candidaturas.length})
          </Text>
          {candidaturas.length === 0 ? (
            <EstadoVazio descricao="Ninguém se candidatou a esta vaga ainda." />
          ) : (
            // Handlers passados direto (estáveis por `useCallback`): o item chama
            // `onAtualizada(candidatura.id, atualizada)`. Ver `FeedScreen.tsx`.
            candidaturas.map((candidatura) => (
              <CandidaturaItem
                key={candidatura.id}
                candidatura={candidatura}
                tema={tema}
                onAbrirPerfil={abrirPerfilCandidato}
                onAtualizada={atualizarCandidaturaNaLista}
              />
            ))
          )}
        </View>
      </ScrollView>
    </ContainerTela>
  );
}

/**
 * Candidatura com `memo`: cada handler recebe o id ou objeto como parâmetro e o pai os mantém
 * estáveis, então mudar uma candidatura não renderiza as outras de novo.
 */
const CandidaturaItem = memo(function CandidaturaItem({
  candidatura,
  tema,
  onAbrirPerfil,
  onAtualizada,
}: {
  candidatura: Candidatura;
  tema: Tema;
  onAbrirPerfil: (usuarioId: string) => void;
  onAtualizada: (candidaturaId: string, atualizada: Candidatura) => void;
}) {
  const [alterando, setAlterando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const usuario = candidatura.candidato?.usuario;
  const status = candidatura.status ?? "pendente";

  async function mudarStatus(novoStatus: StatusCandidatura) {
    if (alterando || novoStatus === status) return;
    setAlterando(true);
    setErro(null);
    try {
      const atualizada = await VagasService.atualizarStatusCandidatura(candidatura.id, novoStatus);
      onAtualizada(candidatura.id, atualizada);
    } catch (erroRequisicao) {
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível atualizar o status agora."));
    } finally {
      setAlterando(false);
    }
  }

  return (
    <Cartao elevacao="sm" style={{ gap: tema.spacing.sm }}>
      <Pressable
        onPress={() => usuario?.id && onAbrirPerfil(usuario.id)}
        accessibilityRole="button"
        accessibilityLabel={`Ver perfil de ${usuario?.nome ?? "candidato"}`}
        disabled={!usuario?.id}
        style={{ flexDirection: "row", alignItems: "center", gap: tema.spacing.sm }}
        // Avatar de 40dp: 4 de cada lado leva a área de toque a 48dp.
        hitSlop={4}
      >
        <Avatar nome={usuario?.nome} fotoUrl={usuario?.fotoPerfil} size="medium" />
        <View style={{ flex: 1 }}>
          <Text style={[tema.typography.body, { color: tema.colors.textPrimary }]} numberOfLines={1}>
            {usuario?.nome ?? "Candidato"}
          </Text>
          {usuario?.email ? (
            <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]} numberOfLines={1}>
              {usuario.email}
            </Text>
          ) : null}
        </View>
        <Etiqueta variant={VARIANTE_STATUS_CANDIDATURA[status]}>{ROTULOS_STATUS_CANDIDATURA[status]}</Etiqueta>
      </Pressable>

      {candidatura.mensagem ? (
        <Text style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]}>{candidatura.mensagem}</Text>
      ) : null}

      <ControleSegmentado
        rotulo="Status da candidatura"
        value={status}
        onChange={(valor) => void mudarStatus(valor)}
        opcoes={OPCOES_STATUS_CANDIDATURA}
      />
      {alterando ? <ActivityIndicator color={tema.colors.primary.solid} /> : null}
      {erro ? (
        <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[tema.typography.caption, { color: tema.colors.error.solid }]}>
          {erro}
        </Text>
      ) : null}
    </Cartao>
  );
});
