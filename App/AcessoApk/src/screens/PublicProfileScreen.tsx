import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAuth } from "../auth";
import { Avatar, Badge, Button, Card, Divider, ErrorState, LoadingState, ScreenContainer } from "../components/ui";
import { EmpresaService } from "../empresas";
import type { EmpresaResumo } from "../empresas";
import { ConversaService } from "../mensagens";
import { ModeracaoService } from "../moderacao";
import type { AppStackParamList } from "../navigation/types";
import { PerfilService } from "../perfil";
import type { Candidato } from "../perfil";
import { getFriendlyErrorMessage } from "../services/api/errors";
import { SeguidorService } from "../seguidores";
import type { ResumoRelacao, ResumoRelacaoEmpresa, UsuarioPublicoBasico } from "../seguidores";
import { useTheme } from "../theme";
import type { Theme } from "../theme";

type PublicProfileScreenProps = NativeStackScreenProps<AppStackParamList, "PublicProfile">;

/**
 * Perfil público de terceiros (Fase 14) — candidato ou empresa, resolvido a
 * partir de `usuarioId` (nunca `candidatoId`/`empresaId` direto, para
 * funcionar a partir de qualquer superfície que só conheça o usuário: Feed,
 * seguidores/seguindo, sugestões). Duas buscas em sequência: primeiro
 * `GET /perfil/usuario/:usuarioId` (básico, decide o tipo), depois a busca
 * completa certa (candidato ou empresa) + o resumo de relação — nunca
 * presume o tipo de antemão.
 */
export function PublicProfileScreen({ route, navigation }: PublicProfileScreenProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { usuarioId } = route.params;

  const [basico, setBasico] = useState<UsuarioPublicoBasico | null>(null);
  const [candidato, setCandidato] = useState<Candidato | null>(null);
  const [empresa, setEmpresa] = useState<EmpresaResumo | null>(null);
  const [resumoRelacao, setResumoRelacao] = useState<ResumoRelacao | null>(null);
  const [resumoEmpresaRelacao, setResumoEmpresaRelacao] = useState<ResumoRelacaoEmpresa | null>(null);
  // Fase 19: `resumo()` (candidato) já devolve `bloqueado` — para empresa,
  // `resumoEmpresa()` não tem esse campo (bloqueio é sempre por `usuarioId`,
  // nunca por `empresaId`), então busca-se `SeguidorService.resumo` em
  // paralelo só por causa deste campo, mesmo em perfil de empresa.
  const [bloqueado, setBloqueado] = useState<boolean | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  const [processandoSeguir, setProcessandoSeguir] = useState(false);
  const [erroSeguir, setErroSeguir] = useState<string | null>(null);
  const [processandoBloqueio, setProcessandoBloqueio] = useState(false);
  const [erroBloqueio, setErroBloqueio] = useState<string | null>(null);

  const ehOProprioPerfil = user?.id === usuarioId;

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        const dadosBasicos = await SeguidorService.obterUsuarioPublicoBasico(usuarioId);
        if (cancelado) return;
        setBasico(dadosBasicos);

        if (dadosBasicos.tipoUsuario === "candidato") {
          const [candidatoRes, resumoRes] = await Promise.all([
            PerfilService.obterCandidatoPorUsuario(usuarioId),
            SeguidorService.resumo(usuarioId),
          ]);
          if (cancelado) return;
          setCandidato(candidatoRes);
          setResumoRelacao(resumoRes);
          setBloqueado(resumoRes.bloqueado);
        } else if (dadosBasicos.tipoUsuario === "empresa") {
          const [empresaRes, resumoBloqueio] = await Promise.all([
            EmpresaService.obterPorUsuario(usuarioId),
            SeguidorService.resumo(usuarioId),
          ]);
          if (cancelado) return;
          setEmpresa(empresaRes);
          setBloqueado(resumoBloqueio.bloqueado);
          const resumoRes = await SeguidorService.resumoEmpresa(empresaRes.id);
          if (cancelado) return;
          setResumoEmpresaRelacao(resumoRes);
        }
        // "administrador": só o básico é mostrado — sem seguir, sem dados especializados (mesmo fallback que o backend já documenta).
      } catch (erroRequisicao) {
        if (cancelado) return;
        setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar este perfil."));
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }

    void carregar();
    return () => {
      cancelado = true;
    };
  }, [usuarioId, tentativa]);

  function tentarNovamente() {
    setErro(null);
    setCarregando(true);
    setTentativa((valor) => valor + 1);
  }

  async function alternarSeguirUsuario() {
    if (processandoSeguir || !resumoRelacao) return;
    setProcessandoSeguir(true);
    setErroSeguir(null);
    try {
      const { seguindo, totalSeguidores } = await SeguidorService.alternarSeguirUsuario(usuarioId);
      setResumoRelacao((atual) => (atual ? { ...atual, seguindoEsteUsuario: seguindo, totalSeguidores } : atual));
    } catch (erroRequisicao) {
      setErroSeguir(getFriendlyErrorMessage(erroRequisicao, "Não foi possível atualizar agora."));
    } finally {
      setProcessandoSeguir(false);
    }
  }

  async function solicitarSeguir() {
    if (processandoSeguir || !resumoRelacao) return;
    setProcessandoSeguir(true);
    setErroSeguir(null);
    try {
      const resposta = await SeguidorService.solicitarSeguir(usuarioId);
      setResumoRelacao((atual) => {
        if (!atual) return atual;
        if (resposta.solicitacaoCriada) return { ...atual, solicitacaoPendente: true };
        // Perfil virou público entre o clique e a chamada — o backend já seguiu direto.
        return { ...atual, seguindoEsteUsuario: true, totalSeguidores: resposta.totalSeguidores ?? atual.totalSeguidores };
      });
    } catch (erroRequisicao) {
      setErroSeguir(getFriendlyErrorMessage(erroRequisicao, "Não foi possível enviar a solicitação agora."));
    } finally {
      setProcessandoSeguir(false);
    }
  }

  async function cancelarSolicitacao() {
    if (processandoSeguir || !resumoRelacao) return;
    setProcessandoSeguir(true);
    setErroSeguir(null);
    try {
      await SeguidorService.cancelarSolicitacao(usuarioId);
      setResumoRelacao((atual) => (atual ? { ...atual, solicitacaoPendente: false } : atual));
    } catch (erroRequisicao) {
      setErroSeguir(getFriendlyErrorMessage(erroRequisicao, "Não foi possível cancelar a solicitação agora."));
    } finally {
      setProcessandoSeguir(false);
    }
  }

  async function alternarSeguirEmpresa() {
    if (processandoSeguir || !empresa || !resumoEmpresaRelacao) return;
    setProcessandoSeguir(true);
    setErroSeguir(null);
    try {
      const { seguindo, totalSeguidores } = await SeguidorService.alternarSeguirEmpresa(empresa.id);
      setResumoEmpresaRelacao({ seguindoEstaEmpresa: seguindo, totalSeguidores });
    } catch (erroRequisicao) {
      setErroSeguir(getFriendlyErrorMessage(erroRequisicao, "Não foi possível atualizar agora."));
    } finally {
      setProcessandoSeguir(false);
    }
  }

  function abrirListaSeguidores(modo: "seguidores" | "seguindo") {
    navigation.navigate("FollowList", { usuarioId, modo, nomeUsuario: basico?.nome ?? "" });
  }

  async function alternarBloqueio() {
    if (processandoBloqueio || bloqueado === null) return;
    setProcessandoBloqueio(true);
    setErroBloqueio(null);
    try {
      const novoEstado = bloqueado ? await ModeracaoService.desbloquear(usuarioId) : await ModeracaoService.bloquear(usuarioId);
      setBloqueado(novoEstado);
      // O backend já desfaz seguir/ser seguido nos dois sentidos ao
      // bloquear — reflete isso localmente (sem uma nova busca completa)
      // pra não deixar "Seguir"/"Deixar de seguir" com um estado que o
      // servidor já não tem mais.
      if (novoEstado) {
        setResumoRelacao((atual) =>
          atual ? { ...atual, seguindoEsteUsuario: false, elesSeguemVoce: false, solicitacaoPendente: false } : atual,
        );
        setResumoEmpresaRelacao((atual) => (atual ? { ...atual, seguindoEstaEmpresa: false } : atual));
      }
    } catch (erroRequisicao) {
      setErroBloqueio(getFriendlyErrorMessage(erroRequisicao, "Não foi possível atualizar agora."));
    } finally {
      setProcessandoBloqueio(false);
    }
  }

  function denunciar() {
    if (empresa) {
      navigation.navigate("Report", { entidadeTipo: "empresa", entidadeId: empresa.id, tituloAlvo: empresa.nomeFantasia ?? empresa.razaoSocial });
    } else {
      navigation.navigate("Report", { entidadeTipo: "usuario", entidadeId: usuarioId, tituloAlvo: basico?.nome });
    }
  }

  if (carregando) {
    return <LoadingState />;
  }

  if (erro && !basico) {
    return <ErrorState title="Não foi possível carregar este perfil" message={erro} onRetry={tentarNovamente} />;
  }

  if (!basico) return null;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ gap: theme.spacing.lg, paddingVertical: theme.spacing.lg }}>
        <Card elevation="sm" style={{ gap: theme.spacing.sm, alignItems: "center" }}>
          <Avatar
            nome={empresa?.nomeFantasia ?? empresa?.razaoSocial ?? basico.nome}
            fotoUrl={candidato?.usuario?.fotoPerfil ?? empresa?.logo ?? basico.fotoPerfil}
            size="large"
          />
          <Text style={[theme.typography.heading, { color: theme.colors.textPrimary }]} accessibilityRole="header">
            {empresa?.nomeFantasia ?? empresa?.razaoSocial ?? basico.nome}
          </Text>
          {candidato?.tituloProfissional ? (
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>
              {candidato.tituloProfissional}
            </Text>
          ) : null}
          {empresa?.setor ? (
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{empresa.setor}</Text>
          ) : null}

          {candidato ? (
            <View style={{ flexDirection: "row", gap: theme.spacing.lg, marginTop: theme.spacing.xs }}>
              <Pressable
                onPress={() => abrirListaSeguidores("seguidores")}
                accessibilityRole="button"
                accessibilityLabel={`${resumoRelacao?.totalSeguidores ?? 0} seguidores`}
                // Rodada 3, item 8 — número (`label`) + rótulo (`caption`)
                // empilhados somam ~36dp, abaixo dos 48dp do app; 6 de cada
                // lado fecha a conta sem mudar o layout visual.
                hitSlop={6}
              >
                <Text style={[theme.typography.label, { color: theme.colors.textPrimary, textAlign: "center" }]}>
                  {resumoRelacao?.totalSeguidores ?? 0}
                </Text>
                <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>Seguidores</Text>
              </Pressable>
              <Pressable
                onPress={() => abrirListaSeguidores("seguindo")}
                accessibilityRole="button"
                accessibilityLabel={`Seguindo ${resumoRelacao?.totalSeguindo ?? 0}`}
                // Rodada 3, item 8 — mesmo gap de 48dp corrigido acima para "Seguidores".
                hitSlop={6}
              >
                <Text style={[theme.typography.label, { color: theme.colors.textPrimary, textAlign: "center" }]}>
                  {resumoRelacao?.totalSeguindo ?? 0}
                </Text>
                <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>Seguindo</Text>
              </Pressable>
            </View>
          ) : empresa ? (
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
              {resumoEmpresaRelacao?.totalSeguidores ?? 0} seguidor
              {(resumoEmpresaRelacao?.totalSeguidores ?? 0) === 1 ? "" : "es"}
            </Text>
          ) : null}

          {!ehOProprioPerfil && candidato && resumoRelacao ? (
            <View style={{ gap: theme.spacing.xs, alignSelf: "stretch", marginTop: theme.spacing.sm }}>
              {resumoRelacao.seguindoEsteUsuario ? (
                <Button
                  variant="outline"
                  onPress={() => void alternarSeguirUsuario()}
                  loading={processandoSeguir}
                  disabled={processandoSeguir}
                >
                  Deixar de seguir
                </Button>
              ) : resumoRelacao.solicitacaoPendente ? (
                <Button
                  variant="outline"
                  onPress={() => void cancelarSolicitacao()}
                  loading={processandoSeguir}
                  disabled={processandoSeguir}
                >
                  Cancelar solicitação
                </Button>
              ) : resumoRelacao.perfilPublico ? (
                <Button onPress={() => void alternarSeguirUsuario()} loading={processandoSeguir} disabled={processandoSeguir}>
                  Seguir
                </Button>
              ) : (
                <Button onPress={() => void solicitarSeguir()} loading={processandoSeguir} disabled={processandoSeguir}>
                  Solicitar para seguir
                </Button>
              )}
              {resumoRelacao.elesSeguemVoce ? (
                <Text style={[theme.typography.caption, { color: theme.colors.textMuted, textAlign: "center" }]}>
                  Segue você
                </Text>
              ) : null}
            </View>
          ) : null}

          {!ehOProprioPerfil && empresa && resumoEmpresaRelacao ? (
            <View style={{ alignSelf: "stretch", marginTop: theme.spacing.sm }}>
              <Button
                variant={resumoEmpresaRelacao.seguindoEstaEmpresa ? "outline" : "primary"}
                onPress={() => void alternarSeguirEmpresa()}
                loading={processandoSeguir}
                disabled={processandoSeguir}
              >
                {resumoEmpresaRelacao.seguindoEstaEmpresa ? "Deixar de seguir" : "Seguir empresa"}
              </Button>
            </View>
          ) : null}

          {!ehOProprioPerfil && basico.tipoUsuario !== "administrador" ? (
            <View style={{ alignSelf: "stretch", marginTop: theme.spacing.xs }}>
              <BotaoEnviarMensagem
                usuarioId={usuarioId}
                nome={empresa?.nomeFantasia ?? empresa?.razaoSocial ?? basico.nome}
                navigation={navigation}
                theme={theme}
              />
            </View>
          ) : null}

          {/* Fase 19 — sem admin (mesmo raciocínio de "Enviar mensagem" acima: o app não tem superfície administrativa). */}
          {!ehOProprioPerfil && basico.tipoUsuario !== "administrador" ? (
            <View style={{ flexDirection: "row", gap: theme.spacing.sm, alignSelf: "stretch", marginTop: theme.spacing.xs }}>
              <View style={{ flex: 1 }}>
                <Button variant="outline" size="small" onPress={denunciar}>
                  Denunciar
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  variant={bloqueado ? "outline" : "destructive"}
                  size="small"
                  onPress={() => void alternarBloqueio()}
                  loading={processandoBloqueio}
                  disabled={processandoBloqueio || bloqueado === null}
                >
                  {bloqueado ? "Desbloquear" : "Bloquear"}
                </Button>
              </View>
            </View>
          ) : null}
          {erroBloqueio ? (
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[theme.typography.caption, { color: theme.colors.error.solid }]}
            >
              {erroBloqueio}
            </Text>
          ) : null}

          {erroSeguir ? (
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[theme.typography.caption, { color: theme.colors.error.solid }]}
            >
              {erroSeguir}
            </Text>
          ) : null}
        </Card>

        {candidato ? <CandidatoDetalhes candidato={candidato} theme={theme} /> : null}
        {empresa ? <EmpresaDetalhes empresa={empresa} theme={theme} /> : null}
      </ScrollView>
    </ScreenContainer>
  );
}

/**
 * "Enviar mensagem" (Fase 17) — consulta `podeIniciar` ANTES do toque para
 * decidir o que mostrar (mesmo padrão de `Site/Frontend/src/components/
 * perfil/EnviarMensagemButton.tsx`), mas a autorização de VERDADE é sempre
 * a do backend no `POST /conversas` — esta consulta nunca é a única
 * barreira. Falha ao consultar não trava a ação (cai para "permitido",
 * mesmo raciocínio do site): o clique sempre revalida de qualquer jeito.
 */
function BotaoEnviarMensagem({
  usuarioId,
  nome,
  navigation,
  theme,
}: {
  usuarioId: string;
  nome: string;
  navigation: PublicProfileScreenProps["navigation"];
  theme: Theme;
}) {
  const [consultando, setConsultando] = useState(true);
  const [permitido, setPermitido] = useState(true);
  const [motivo, setMotivo] = useState<string | undefined>(undefined);
  const [abrindo, setAbrindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function consultar() {
      try {
        const resultado = await ConversaService.podeIniciar(usuarioId);
        if (cancelado) return;
        setPermitido(resultado.permitido);
        setMotivo(resultado.motivo);
      } catch {
        if (cancelado) return;
        setPermitido(true); // ver comentário acima — não trava a ação numa falha de rede pontual.
      } finally {
        if (!cancelado) setConsultando(false);
      }
    }

    void consultar();
    return () => {
      cancelado = true;
    };
  }, [usuarioId]);

  async function abrirConversa() {
    if (abrindo) return;
    setAbrindo(true);
    setErro(null);
    try {
      const conversa = await ConversaService.abrir({ usuarioId });
      navigation.navigate("Conversation", { conversaId: conversa.id, nomeOutroParticipante: nome });
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível abrir a conversa agora."));
    } finally {
      setAbrindo(false);
    }
  }

  if (!consultando && !permitido) {
    return (
      <View style={{ gap: theme.spacing.xs }}>
        <Button variant="outline" disabled>
          Mensagens indisponíveis
        </Button>
        <Text style={[theme.typography.caption, { color: theme.colors.textMuted, textAlign: "center" }]}>
          {motivo ?? "Não é possível enviar mensagens para este usuário."}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Button variant="outline" onPress={() => void abrirConversa()} loading={consultando || abrindo} disabled={consultando || abrindo}>
        Enviar mensagem
      </Button>
      {erro ? (
        <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[theme.typography.caption, { color: theme.colors.error.solid }]}>
          {erro}
        </Text>
      ) : null}
    </View>
  );
}

function abrirLink(url: string) {
  const comProtocolo = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  void Linking.openURL(comProtocolo);
}

function CandidatoDetalhes({ candidato, theme }: { candidato: Candidato; theme: Theme }) {
  const experiencias = Array.isArray(candidato.experiencias) ? (candidato.experiencias as { id: string; cargo: string; empresa: string }[]) : [];
  const formacoes = Array.isArray(candidato.formacoes) ? (candidato.formacoes as { id: string; curso: string; instituicao: string }[]) : [];
  const habilidades = Array.isArray(candidato.habilidades) ? (candidato.habilidades as { id: string; nome: string }[]) : [];
  const deficiencias = candidato.deficiencias ?? [];

  return (
    <View style={{ gap: theme.spacing.md }}>
      {candidato.biografia ? (
        <Card elevation="sm" style={{ gap: theme.spacing.xs }}>
          <Text style={[theme.typography.label, { color: theme.colors.textPrimary }]}>Sobre</Text>
          <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{candidato.biografia}</Text>
        </Card>
      ) : null}

      {(candidato.cidade || candidato.estado || candidato.escolaridade || candidato.disponibilidade) ? (
        <Card elevation="sm" style={{ gap: theme.spacing.xs }}>
          {candidato.cidade || candidato.estado ? (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
              {[candidato.cidade, candidato.estado].filter(Boolean).join(" - ")}
            </Text>
          ) : null}
          {candidato.escolaridade ? (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{candidato.escolaridade}</Text>
          ) : null}
          {candidato.disponibilidade ? (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
              Disponibilidade: {candidato.disponibilidade}
            </Text>
          ) : null}
          {candidato.linkedin ? (
            // Rodada 3, item 8 — link de texto sozinho (bodySmall, ~20dp)
            // abaixo dos 48dp do app; mesmo cálculo de `LoginScreen.tsx`.
            <Pressable
              onPress={() => abrirLink(String(candidato.linkedin))}
              accessibilityRole="link"
              accessibilityLabel="Abrir LinkedIn"
              hitSlop={14}
            >
              <Text style={[theme.typography.bodySmall, { color: theme.colors.primary.solid }]}>LinkedIn</Text>
            </Pressable>
          ) : null}
          {candidato.github ? (
            <Pressable
              onPress={() => abrirLink(String(candidato.github))}
              accessibilityRole="link"
              accessibilityLabel="Abrir GitHub"
              hitSlop={14}
            >
              <Text style={[theme.typography.bodySmall, { color: theme.colors.primary.solid }]}>GitHub</Text>
            </Pressable>
          ) : null}
        </Card>
      ) : null}

      {deficiencias.length > 0 ? (
        <View style={{ gap: theme.spacing.xs }}>
          <Text style={[theme.typography.label, { color: theme.colors.textPrimary }]}>Deficiências</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs }}>
            {deficiencias.map((d) => (
              <Badge key={d.id} variant="info">
                {d.nome}
              </Badge>
            ))}
          </View>
        </View>
      ) : null}

      {experiencias.length > 0 ? (
        <View style={{ gap: theme.spacing.sm }}>
          <Text style={[theme.typography.label, { color: theme.colors.textPrimary }]}>Experiência</Text>
          {experiencias.map((item, indice) => (
            <View key={item.id}>
              {indice > 0 ? <Divider /> : null}
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textPrimary, marginTop: indice > 0 ? theme.spacing.sm : 0 }]}>
                {item.cargo} · {item.empresa}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {formacoes.length > 0 ? (
        <View style={{ gap: theme.spacing.sm }}>
          <Text style={[theme.typography.label, { color: theme.colors.textPrimary }]}>Formação</Text>
          {formacoes.map((item, indice) => (
            <View key={item.id}>
              {indice > 0 ? <Divider /> : null}
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textPrimary, marginTop: indice > 0 ? theme.spacing.sm : 0 }]}>
                {item.curso} · {item.instituicao}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {habilidades.length > 0 ? (
        <View style={{ gap: theme.spacing.xs }}>
          <Text style={[theme.typography.label, { color: theme.colors.textPrimary }]}>Habilidades</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs }}>
            {habilidades.map((h) => (
              <Badge key={h.id} variant="neutral">
                {h.nome}
              </Badge>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function EmpresaDetalhes({ empresa, theme }: { empresa: EmpresaResumo; theme: Theme }) {
  if (!empresa.descricao && !empresa.cidade && !empresa.site) return null;

  return (
    <Card elevation="sm" style={{ gap: theme.spacing.xs }}>
      {empresa.descricao ? (
        <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{empresa.descricao}</Text>
      ) : null}
      {empresa.cidade || empresa.estado ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
          {[empresa.cidade, empresa.estado].filter(Boolean).join(" - ")}
        </Text>
      ) : null}
      {empresa.site ? (
        // Rodada 3, item 8 — mesmo gap de 48dp corrigido acima para
        // LinkedIn/GitHub (link de texto sozinho, bodySmall).
        <Pressable
          onPress={() => abrirLink(String(empresa.site))}
          accessibilityRole="link"
          accessibilityLabel="Abrir site da empresa"
          hitSlop={14}
        >
          <Text style={[theme.typography.bodySmall, { color: theme.colors.primary.solid }]}>{empresa.site}</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}
