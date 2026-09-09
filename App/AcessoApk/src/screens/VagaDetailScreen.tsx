import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAuth } from "../auth";
import { Badge, Button, Card, ScreenContainer } from "../components/ui";
import type { AppStackParamList } from "../navigation/types";
import { getFriendlyErrorMessage } from "../services/api/errors";
import { useTheme } from "../theme";
import {
  CONTRATO_LABEL,
  MODALIDADE_LABEL,
  RECURSO_ACESSIBILIDADE_LABEL,
  STATUS_VAGA_LABEL,
  VagasService,
} from "../vagas";
import type { Vaga } from "../vagas";

type VagaDetailScreenProps = NativeStackScreenProps<AppStackParamList, "VagaDetail">;

/**
 * `salario` é `DECIMAL(10,2)` no Postgres — chega como string no JSON
 * (`"3500.00"`), não `number`. Nunca formatar direto; se não der pra
 * converter, omite o campo em vez de mostrar "R$ NaN" (Fase 9, item 11).
 */
function formatarSalario(valor: Vaga["salario"]): string | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numero);
}

/** Sem biblioteca de data nova (Fase 9, item 12) — `Intl.DateTimeFormat` nativo já resolve. */
function formatarData(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(data);
}

export function VagaDetailScreen({ route, navigation }: VagaDetailScreenProps) {
  const { vagaId } = route.params;
  const { theme } = useTheme();
  const { user } = useAuth();
  const podeInteragir = user?.tipoUsuario === "candidato";

  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [primeiroCarregamentoConcluido, setPrimeiroCarregamentoConcluido] = useState(false);
  // Incrementar isto refaz a busca — usado só por "Tentar novamente" quando
  // a carga inicial falhou (não há conteúdo prévio pra preservar nesse
  // caso, então voltar pra tela cheia de loading é o comportamento certo).
  const [tentativa, setTentativa] = useState(0);

  // Estado do favorito nasce `false` só porque a API não informa o estado
  // real (nem `GET /vagas` nem `GET /vagas/:id` dizem se o candidato já
  // favoritou) — NÃO é uma confirmação de que a vaga não está favoritada
  // (Fase 9, item 4). Só o valor devolvido por `POST .../favoritar` é fonte
  // de verdade; por isso não há optimistic update aqui.
  const [favoritado, setFavoritado] = useState(false);
  const [favoritando, setFavoritando] = useState(false);
  const [erroFavoritar, setErroFavoritar] = useState<string | null>(null);

  const [candidatando, setCandidatando] = useState(false);
  const [candidaturaEnviada, setCandidaturaEnviada] = useState(false);
  const [erroCandidatura, setErroCandidatura] = useState<string | null>(null);

  // Função inline dentro do próprio efeito (mesmo padrão de
  // `AuthProvider.tsx`/`JobsScreen.tsx`) — evita o lint
  // `react-hooks/set-state-in-effect` que uma função externa chamada por um
  // efeito dispararia.
  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        const resultado = await VagasService.obterPorId(vagaId);
        if (cancelado) return;
        setVaga(resultado);
      } catch (erroRequisicao) {
        if (cancelado) return;
        // Fase 9, item 6: a vaga pode ter mudado (ou sumido) entre a
        // listagem e agora — confiamos só na resposta REAL desta chamada,
        // nunca no que a listagem mostrou antes.
        setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar esta vaga."));
      } finally {
        if (!cancelado) {
          setPrimeiroCarregamentoConcluido(true);
        }
      }
    }

    void carregar();
    return () => {
      cancelado = true;
    };
  }, [vagaId, tentativa]);

  function tentarNovamente() {
    setErro(null);
    setPrimeiroCarregamentoConcluido(false);
    setTentativa((valor) => valor + 1);
  }

  async function alternarFavorito() {
    if (favoritando || !vaga) return;
    setFavoritando(true);
    setErroFavoritar(null);
    try {
      const novoEstado = await VagasService.favoritar(vaga.id);
      setFavoritado(novoEstado);
    } catch (erroRequisicao) {
      // Sem optimistic update (Fase 9, item 4): se a chamada falhar, o botão
      // não muda visualmente — só o erro aparece.
      setErroFavoritar(getFriendlyErrorMessage(erroRequisicao, "Não foi possível favoritar esta vaga agora."));
    } finally {
      setFavoritando(false);
    }
  }

  async function candidatar() {
    if (candidatando || candidaturaEnviada || !vaga) return;
    setCandidatando(true);
    setErroCandidatura(null);
    try {
      // Fase 9, item 5: sem pré-checagem de "já candidatado" — só tenta e
      // trata a resposta real (201 sucesso, 409 já candidatado, outro erro).
      await VagasService.candidatarSe(vaga.id);
      setCandidaturaEnviada(true);
    } catch (erroRequisicao) {
      setErroCandidatura(
        getFriendlyErrorMessage(erroRequisicao, "Não foi possível enviar sua candidatura agora."),
      );
    } finally {
      setCandidatando(false);
    }
  }

  if (!primeiroCarregamentoConcluido) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={theme.colors.primary.solid} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  if (erro && !vaga) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Card elevation="md" style={{ gap: theme.spacing.sm }}>
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[theme.typography.title, { color: theme.colors.textPrimary }]}
            >
              Não foi possível carregar esta vaga
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{erro}</Text>
            <Button onPress={tentarNovamente}>Tentar novamente</Button>
          </Card>
        </View>
      </ScreenContainer>
    );
  }

  // Nunca deveria acontecer (as duas condições acima cobrem loading/erro),
  // mas satisfaz o TypeScript sem um `!` — `vaga` só chega aqui preenchida.
  if (!vaga) return null;

  const empresa = vaga.empresa?.nomeFantasia ?? vaga.empresa?.razaoSocial ?? "Empresa não informada";
  const usuarioIdEmpresa = vaga.empresa?.usuario?.id;
  const local = [vaga.cidade, vaga.estado].filter(Boolean).join(" - ");
  const salarioFormatado = formatarSalario(vaga.salario);
  const dataFormatada = formatarData(vaga.dataPublicacao);
  const vagaAberta = vaga.status === "Aberta";

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ gap: theme.spacing.md, paddingVertical: theme.spacing.md }}>
        <View style={{ gap: theme.spacing.xs }}>
          <Text style={[theme.typography.heading, { color: theme.colors.textPrimary }]}>{vaga.titulo}</Text>
          {/* Fase 14: só `GET /vagas/:id` (detalhe) traz `empresa.usuario` — confirmado por auditoria; por isso o nome da empresa só é clicável aqui, nunca na listagem. */}
          {usuarioIdEmpresa ? (
            <Pressable
              onPress={() => navigation.navigate("PublicProfile", { usuarioId: usuarioIdEmpresa })}
              accessibilityRole="button"
              accessibilityLabel={`Ver perfil de ${empresa}`}
            >
              <Text style={[theme.typography.body, { color: theme.colors.primary.solid }]}>{empresa}</Text>
            </Pressable>
          ) : (
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{empresa}</Text>
          )}
          {!vagaAberta ? <Badge variant="warning">{STATUS_VAGA_LABEL[vaga.status]}</Badge> : null}
        </View>

        <Card elevation="sm" style={{ gap: theme.spacing.xs }}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
            {[local, MODALIDADE_LABEL[vaga.modalidade]].filter(Boolean).join(" · ")}
          </Text>
          {vaga.contrato ? (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
              {CONTRATO_LABEL[vaga.contrato]}
              {vaga.cargaHoraria ? ` · ${vaga.cargaHoraria}` : ""}
            </Text>
          ) : null}
          {salarioFormatado ? (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{salarioFormatado}</Text>
          ) : null}
          {dataFormatada ? (
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
              Publicada em {dataFormatada}
            </Text>
          ) : null}
        </Card>

        {vaga.recursosAcessibilidade && vaga.recursosAcessibilidade.length > 0 ? (
          <View style={{ gap: theme.spacing.xs }}>
            <Text style={[theme.typography.label, { color: theme.colors.textPrimary }]}>
              Recursos de acessibilidade
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs }}>
              {vaga.recursosAcessibilidade.map((recurso) => (
                <Badge key={recurso} variant="info">
                  {RECURSO_ACESSIBILIDADE_LABEL[recurso] ?? recurso}
                </Badge>
              ))}
            </View>
          </View>
        ) : null}

        <View style={{ gap: theme.spacing.xs }}>
          <Text style={[theme.typography.label, { color: theme.colors.textPrimary }]}>Descrição</Text>
          <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{vaga.descricao}</Text>
        </View>

        {vaga.requisitos ? (
          <View style={{ gap: theme.spacing.xs }}>
            <Text style={[theme.typography.label, { color: theme.colors.textPrimary }]}>Requisitos</Text>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{vaga.requisitos}</Text>
          </View>
        ) : null}

        {vaga.beneficios ? (
          <View style={{ gap: theme.spacing.xs }}>
            <Text style={[theme.typography.label, { color: theme.colors.textPrimary }]}>Benefícios</Text>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{vaga.beneficios}</Text>
          </View>
        ) : null}

        {/* Fase 9, item 2: candidatar-se/favoritar só para candidato autenticado — visitante e empresa/administrador só visualizam. */}
        {podeInteragir ? (
          <View style={{ gap: theme.spacing.sm }}>
            {/* Controle próprio (não o `Button` compartilhado) para poder expor
                `accessibilityState.selected`, que reflete o favorito de verdade
                (Fase 9, item 18) — o `Button` genérico não tem esse conceito. */}
            <Pressable
              onPress={() => void alternarFavorito()}
              disabled={favoritando}
              accessibilityRole="button"
              accessibilityLabel={favoritado ? "Remover dos favoritos" : "Favoritar vaga"}
              accessibilityState={{ selected: favoritado, disabled: favoritando, busy: favoritando }}
              hitSlop={14}
              style={{
                minHeight: theme.sizes.touchTarget,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: theme.spacing.xs,
                borderWidth: 1,
                borderColor: favoritado ? theme.colors.primary.solid : theme.colors.border,
                borderRadius: theme.radius.md,
                opacity: favoritando ? 0.6 : 1,
              }}
            >
              {favoritando ? (
                <ActivityIndicator color={theme.colors.primary.solid} />
              ) : (
                <Text
                  style={[
                    theme.typography.button,
                    { color: favoritado ? theme.colors.primary.solid : theme.colors.textPrimary },
                  ]}
                >
                  {favoritado ? "Favoritado" : "Favoritar"}
                </Text>
              )}
            </Pressable>
            {erroFavoritar ? (
              <Text
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
                style={[theme.typography.caption, { color: theme.colors.error.solid }]}
              >
                {erroFavoritar}
              </Text>
            ) : null}

            {vagaAberta ? (
              <>
                <Button
                  onPress={() => void candidatar()}
                  loading={candidatando}
                  disabled={candidatando || candidaturaEnviada}
                >
                  {candidaturaEnviada ? "Candidatura enviada" : "Candidatar-se"}
                </Button>
                {candidaturaEnviada ? (
                  <Text accessibilityLiveRegion="polite" style={[theme.typography.bodySmall, { color: theme.colors.success.solid }]}>
                    Candidatura enviada com sucesso!
                  </Text>
                ) : null}
                {erroCandidatura ? (
                  <Text
                    accessibilityRole="alert"
                    accessibilityLiveRegion="assertive"
                    style={[theme.typography.caption, { color: theme.colors.error.solid }]}
                  >
                    {erroCandidatura}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]}>
                Esta vaga não está mais aceitando candidaturas ({STATUS_VAGA_LABEL[vaga.status].toLowerCase()}).
              </Text>
            )}
          </View>
        ) : null}

        {/* Fase 19 — some para a própria empresa dona da vaga (mesmo raciocínio de "Enviar mensagem"/"Denunciar" no perfil público: nunca oferecer denunciar o próprio conteúdo). */}
        {usuarioIdEmpresa && usuarioIdEmpresa !== user?.id ? (
          <Pressable
            onPress={() => navigation.navigate("Report", { entidadeTipo: "vaga", entidadeId: vaga.id, tituloAlvo: vaga.titulo })}
            accessibilityRole="button"
            accessibilityLabel="Denunciar vaga"
            hitSlop={10}
            style={{ minHeight: theme.sizes.touchTarget, justifyContent: "center", alignSelf: "flex-start" }}
          >
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]}>Denunciar vaga</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}
