import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAutenticacao } from "../autenticacao";
import { Avatar, Etiqueta, Botao, Cartao, Divisor, EstadoErro, EstadoCarregamento, ContainerTela } from "../components/ui";
import { EmpresaService } from "../empresas";
import type { EmpresaResumo } from "../empresas";
import { ConversaService } from "../mensagens";
import { ModeracaoService } from "../moderacao";
import type { AppStackParamList } from "../navigation/types";
import { PerfilService } from "../perfil";
import type { Candidato } from "../perfil";
import { extrairMensagemErro } from "../services/api/erros";
import { SeguidorService } from "../seguidores";
import type { ResumoRelacao, ResumoRelacaoEmpresa, UsuarioPublicoBasico } from "../seguidores";
import { useTema } from "../tema";
import type { Tema } from "../tema";

type PublicProfileScreenProps = NativeStackScreenProps<AppStackParamList, "PublicProfile">;

/**
 * Perfil público de outra pessoa, candidato ou empresa, aberto sempre pelo `usuarioId` para
 * funcionar a partir de qualquer lugar do app (feed, seguidores, sugestões). Primeiro busca
 * `GET /perfil/usuario/:usuarioId`, que diz o tipo da conta, e só depois o perfil completo certo e
 * o resumo da relação.
 */
export function PerfilPublicoScreen({ route, navigation }: PublicProfileScreenProps) {
  const { tema } = useTema();
  const { usuario } = useAutenticacao();
  const { usuarioId } = route.params;

  const [basico, setBasico] = useState<UsuarioPublicoBasico | null>(null);
  const [candidato, setCandidato] = useState<Candidato | null>(null);
  const [empresa, setEmpresa] = useState<EmpresaResumo | null>(null);
  const [resumoRelacao, setResumoRelacao] = useState<ResumoRelacao | null>(null);
  const [resumoEmpresaRelacao, setResumoEmpresaRelacao] = useState<ResumoRelacaoEmpresa | null>(null);
  // `resumo()` devolve `bloqueado`, mas `resumoEmpresa()` não tem esse campo (o bloqueio é sempre
  // por `usuarioId`). Por isso `SeguidorService.resumo` também é buscado em perfis de empresa, só
  // por este campo.
  const [bloqueado, setBloqueado] = useState<boolean | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  const [processandoSeguir, setProcessandoSeguir] = useState(false);
  const [erroSeguir, setErroSeguir] = useState<string | null>(null);
  const [processandoBloqueio, setProcessandoBloqueio] = useState(false);
  const [erroBloqueio, setErroBloqueio] = useState<string | null>(null);

  const ehOProprioPerfil = usuario?.id === usuarioId;

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
        // "administrador": só o básico é mostrado; sem seguir, sem dados especializados (mesmo fallback que o backend já documenta).
      } catch (erroRequisicao) {
        if (cancelado) return;
        setErro(extrairMensagemErro(erroRequisicao, "Não foi possível carregar este perfil."));
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
      setErroSeguir(extrairMensagemErro(erroRequisicao, "Não foi possível atualizar agora."));
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
        // Perfil virou público entre o clique e a chamada: o backend já seguiu direto.
        return { ...atual, seguindoEsteUsuario: true, totalSeguidores: resposta.totalSeguidores ?? atual.totalSeguidores };
      });
    } catch (erroRequisicao) {
      setErroSeguir(extrairMensagemErro(erroRequisicao, "Não foi possível enviar a solicitação agora."));
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
      setErroSeguir(extrairMensagemErro(erroRequisicao, "Não foi possível cancelar a solicitação agora."));
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
      setErroSeguir(extrairMensagemErro(erroRequisicao, "Não foi possível atualizar agora."));
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
      // bloquear: reflete isso localmente (sem uma nova busca completa)
      // pra não deixar "Seguir"/"Deixar de seguir" com um estado que o
      // servidor já não tem mais.
      if (novoEstado) {
        setResumoRelacao((atual) =>
          atual ? { ...atual, seguindoEsteUsuario: false, elesSeguemVoce: false, solicitacaoPendente: false } : atual,
        );
        setResumoEmpresaRelacao((atual) => (atual ? { ...atual, seguindoEstaEmpresa: false } : atual));
      }
    } catch (erroRequisicao) {
      setErroBloqueio(extrairMensagemErro(erroRequisicao, "Não foi possível atualizar agora."));
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
    return <EstadoCarregamento />;
  }

  if (erro && !basico) {
    return <EstadoErro titulo="Não foi possível carregar este perfil" mensagem={erro} onTentarNovamente={tentarNovamente} />;
  }

  if (!basico) return null;

  return (
    <ContainerTela>
      <ScrollView contentContainerStyle={{ gap: tema.spacing.lg, paddingVertical: tema.spacing.lg }}>
        <Cartao elevacao="sm" style={{ gap: tema.spacing.sm, alignItems: "center" }}>
          <Avatar
            nome={empresa?.nomeFantasia ?? empresa?.razaoSocial ?? basico.nome}
            fotoUrl={candidato?.usuario?.fotoPerfil ?? empresa?.logo ?? basico.fotoPerfil}
            size="large"
          />
          <Text style={[tema.typography.heading, { color: tema.colors.textPrimary }]} accessibilityRole="header">
            {empresa?.nomeFantasia ?? empresa?.razaoSocial ?? basico.nome}
          </Text>
          {candidato?.tituloProfissional ? (
            <Text style={[tema.typography.body, { color: tema.colors.textSecondary }]}>
              {candidato.tituloProfissional}
            </Text>
          ) : null}
          {empresa?.setor ? (
            <Text style={[tema.typography.body, { color: tema.colors.textSecondary }]}>{empresa.setor}</Text>
          ) : null}

          {candidato ? (
            <View style={{ flexDirection: "row", gap: tema.spacing.lg, marginTop: tema.spacing.xs }}>
              <Pressable
                onPress={() => abrirListaSeguidores("seguidores")}
                accessibilityRole="button"
                accessibilityLabel={`${resumoRelacao?.totalSeguidores ?? 0} seguidores`}
                // Número e rótulo empilhados somam uns 36dp: 6 de cada lado leva a área de toque a
                // 48dp.
                hitSlop={6}
              >
                <Text style={[tema.typography.label, { color: tema.colors.textPrimary, textAlign: "center" }]}>
                  {resumoRelacao?.totalSeguidores ?? 0}
                </Text>
                <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>Seguidores</Text>
              </Pressable>
              <Pressable
                onPress={() => abrirListaSeguidores("seguindo")}
                accessibilityRole="button"
                accessibilityLabel={`Seguindo ${resumoRelacao?.totalSeguindo ?? 0}`}
                // Mesmo ajuste de "Seguidores", acima.
                hitSlop={6}
              >
                <Text style={[tema.typography.label, { color: tema.colors.textPrimary, textAlign: "center" }]}>
                  {resumoRelacao?.totalSeguindo ?? 0}
                </Text>
                <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>Seguindo</Text>
              </Pressable>
            </View>
          ) : empresa ? (
            <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>
              {resumoEmpresaRelacao?.totalSeguidores ?? 0} seguidor
              {(resumoEmpresaRelacao?.totalSeguidores ?? 0) === 1 ? "" : "es"}
            </Text>
          ) : null}

          {!ehOProprioPerfil && candidato && resumoRelacao ? (
            <View style={{ gap: tema.spacing.xs, alignSelf: "stretch", marginTop: tema.spacing.sm }}>
              {resumoRelacao.seguindoEsteUsuario ? (
                <Botao
                  variant="outline"
                  onPress={() => void alternarSeguirUsuario()}
                  carregando={processandoSeguir}
                  disabled={processandoSeguir}
                >
                  Deixar de seguir
                </Botao>
              ) : resumoRelacao.solicitacaoPendente ? (
                <Botao
                  variant="outline"
                  onPress={() => void cancelarSolicitacao()}
                  carregando={processandoSeguir}
                  disabled={processandoSeguir}
                >
                  Cancelar solicitação
                </Botao>
              ) : resumoRelacao.perfilPublico ? (
                <Botao onPress={() => void alternarSeguirUsuario()} carregando={processandoSeguir} disabled={processandoSeguir}>
                  Seguir
                </Botao>
              ) : (
                <Botao onPress={() => void solicitarSeguir()} carregando={processandoSeguir} disabled={processandoSeguir}>
                  Solicitar para seguir
                </Botao>
              )}
              {resumoRelacao.elesSeguemVoce ? (
                <Text style={[tema.typography.caption, { color: tema.colors.textMuted, textAlign: "center" }]}>
                  Segue você
                </Text>
              ) : null}
            </View>
          ) : null}

          {!ehOProprioPerfil && empresa && resumoEmpresaRelacao ? (
            <View style={{ alignSelf: "stretch", marginTop: tema.spacing.sm }}>
              <Botao
                variant={resumoEmpresaRelacao.seguindoEstaEmpresa ? "outline" : "primary"}
                onPress={() => void alternarSeguirEmpresa()}
                carregando={processandoSeguir}
                disabled={processandoSeguir}
              >
                {resumoEmpresaRelacao.seguindoEstaEmpresa ? "Deixar de seguir" : "Seguir empresa"}
              </Botao>
            </View>
          ) : null}

          {!ehOProprioPerfil && basico.tipoUsuario !== "administrador" ? (
            <View style={{ alignSelf: "stretch", marginTop: tema.spacing.xs }}>
              <BotaoEnviarMensagem
                usuarioId={usuarioId}
                nome={empresa?.nomeFantasia ?? empresa?.razaoSocial ?? basico.nome}
                navigation={navigation}
                tema={tema}
              />
            </View>
          ) : null}

          {/* Sem bloquear ou denunciar administrador, como em "Enviar mensagem": o app não tem
              área administrativa. */}
          {!ehOProprioPerfil && basico.tipoUsuario !== "administrador" ? (
            <View style={{ flexDirection: "row", gap: tema.spacing.sm, alignSelf: "stretch", marginTop: tema.spacing.xs }}>
              <View style={{ flex: 1 }}>
                <Botao variant="outline" size="small" onPress={denunciar}>
                  Denunciar
                </Botao>
              </View>
              <View style={{ flex: 1 }}>
                <Botao
                  variant={bloqueado ? "outline" : "destructive"}
                  size="small"
                  onPress={() => void alternarBloqueio()}
                  carregando={processandoBloqueio}
                  disabled={processandoBloqueio || bloqueado === null}
                >
                  {bloqueado ? "Desbloquear" : "Bloquear"}
                </Botao>
              </View>
            </View>
          ) : null}
          {erroBloqueio ? (
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[tema.typography.caption, { color: tema.colors.error.solid }]}
            >
              {erroBloqueio}
            </Text>
          ) : null}

          {erroSeguir ? (
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[tema.typography.caption, { color: tema.colors.error.solid }]}
            >
              {erroSeguir}
            </Text>
          ) : null}
        </Cartao>

        {candidato ? <CandidatoDetalhes candidato={candidato} tema={tema} /> : null}
        {empresa ? <EmpresaDetalhes empresa={empresa} tema={tema} /> : null}
      </ScrollView>
    </ContainerTela>
  );
}

/**
 * "Enviar mensagem" consulta `podeIniciar` antes do toque para decidir o que mostrar, como o
 * `EnviarMensagemButton.tsx` do Site. A autorização real é a do backend no `POST /conversas`, então
 * uma falha na consulta não trava a ação: conta como permitido e o envio revalida.
 */
function BotaoEnviarMensagem({
  usuarioId,
  nome,
  navigation,
  tema,
}: {
  usuarioId: string;
  nome: string;
  navigation: PublicProfileScreenProps["navigation"];
  tema: Tema;
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
        setPermitido(true); // ver comentário acima: não trava a ação numa falha de rede pontual.
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
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível abrir a conversa agora."));
    } finally {
      setAbrindo(false);
    }
  }

  if (!consultando && !permitido) {
    return (
      <View style={{ gap: tema.spacing.xs }}>
        <Botao variant="outline" disabled>
          Mensagens indisponíveis
        </Botao>
        <Text style={[tema.typography.caption, { color: tema.colors.textMuted, textAlign: "center" }]}>
          {motivo ?? "Não é possível enviar mensagens para este usuário."}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: tema.spacing.xs }}>
      <Botao variant="outline" onPress={() => void abrirConversa()} carregando={consultando || abrindo} disabled={consultando || abrindo}>
        Enviar mensagem
      </Botao>
      {erro ? (
        <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[tema.typography.caption, { color: tema.colors.error.solid }]}>
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

function CandidatoDetalhes({ candidato, tema }: { candidato: Candidato; tema: Tema }) {
  const experiencias = Array.isArray(candidato.experiencias) ? (candidato.experiencias as { id: string; cargo: string; empresa: string }[]) : [];
  const formacoes = Array.isArray(candidato.formacoes) ? (candidato.formacoes as { id: string; curso: string; instituicao: string }[]) : [];
  const habilidades = Array.isArray(candidato.habilidades) ? (candidato.habilidades as { id: string; nome: string }[]) : [];
  const deficiencias = candidato.deficiencias ?? [];

  return (
    <View style={{ gap: tema.spacing.md }}>
      {candidato.biografia ? (
        <Cartao elevacao="sm" style={{ gap: tema.spacing.xs }}>
          <Text style={[tema.typography.label, { color: tema.colors.textPrimary }]}>Sobre</Text>
          <Text style={[tema.typography.body, { color: tema.colors.textSecondary }]}>{candidato.biografia}</Text>
        </Cartao>
      ) : null}

      {(candidato.cidade || candidato.estado || candidato.escolaridade || candidato.disponibilidade) ? (
        <Cartao elevacao="sm" style={{ gap: tema.spacing.xs }}>
          {candidato.cidade || candidato.estado ? (
            <Text style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]}>
              {[candidato.cidade, candidato.estado].filter(Boolean).join(" - ")}
            </Text>
          ) : null}
          {candidato.escolaridade ? (
            <Text style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]}>{candidato.escolaridade}</Text>
          ) : null}
          {candidato.disponibilidade ? (
            <Text style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]}>
              Disponibilidade: {candidato.disponibilidade}
            </Text>
          ) : null}
          {candidato.linkedin ? (
            // Link de texto em `bodySmall`, com uns 20dp de altura: 14 de cada lado leva a área de
            // toque a 48dp.
            <Pressable
              onPress={() => abrirLink(String(candidato.linkedin))}
              accessibilityRole="link"
              accessibilityLabel="Abrir LinkedIn"
              hitSlop={14}
            >
              <Text style={[tema.typography.bodySmall, { color: tema.colors.primary.solid }]}>LinkedIn</Text>
            </Pressable>
          ) : null}
          {candidato.github ? (
            <Pressable
              onPress={() => abrirLink(String(candidato.github))}
              accessibilityRole="link"
              accessibilityLabel="Abrir GitHub"
              hitSlop={14}
            >
              <Text style={[tema.typography.bodySmall, { color: tema.colors.primary.solid }]}>GitHub</Text>
            </Pressable>
          ) : null}
        </Cartao>
      ) : null}

      {deficiencias.length > 0 ? (
        <View style={{ gap: tema.spacing.xs }}>
          <Text style={[tema.typography.label, { color: tema.colors.textPrimary }]}>Deficiências</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: tema.spacing.xs }}>
            {deficiencias.map((d) => (
              <Etiqueta key={d.id} variant="info">
                {d.nome}
              </Etiqueta>
            ))}
          </View>
        </View>
      ) : null}

      {experiencias.length > 0 ? (
        <View style={{ gap: tema.spacing.sm }}>
          <Text style={[tema.typography.label, { color: tema.colors.textPrimary }]}>Experiência</Text>
          {experiencias.map((item, indice) => (
            <View key={item.id}>
              {indice > 0 ? <Divisor /> : null}
              <Text style={[tema.typography.bodySmall, { color: tema.colors.textPrimary, marginTop: indice > 0 ? tema.spacing.sm : 0 }]}>
                {item.cargo} · {item.empresa}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {formacoes.length > 0 ? (
        <View style={{ gap: tema.spacing.sm }}>
          <Text style={[tema.typography.label, { color: tema.colors.textPrimary }]}>Formação</Text>
          {formacoes.map((item, indice) => (
            <View key={item.id}>
              {indice > 0 ? <Divisor /> : null}
              <Text style={[tema.typography.bodySmall, { color: tema.colors.textPrimary, marginTop: indice > 0 ? tema.spacing.sm : 0 }]}>
                {item.curso} · {item.instituicao}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {habilidades.length > 0 ? (
        <View style={{ gap: tema.spacing.xs }}>
          <Text style={[tema.typography.label, { color: tema.colors.textPrimary }]}>Habilidades</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: tema.spacing.xs }}>
            {habilidades.map((h) => (
              <Etiqueta key={h.id} variant="neutral">
                {h.nome}
              </Etiqueta>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function EmpresaDetalhes({ empresa, tema }: { empresa: EmpresaResumo; tema: Tema }) {
  if (!empresa.descricao && !empresa.cidade && !empresa.site) return null;

  return (
    <Cartao elevacao="sm" style={{ gap: tema.spacing.xs }}>
      {empresa.descricao ? (
        <Text style={[tema.typography.body, { color: tema.colors.textSecondary }]}>{empresa.descricao}</Text>
      ) : null}
      {empresa.cidade || empresa.estado ? (
        <Text style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]}>
          {[empresa.cidade, empresa.estado].filter(Boolean).join(" - ")}
        </Text>
      ) : null}
      {empresa.site ? (
        // Mesmo ajuste dos links do LinkedIn e do GitHub, acima.
        <Pressable
          onPress={() => abrirLink(String(empresa.site))}
          accessibilityRole="link"
          accessibilityLabel="Abrir site da empresa"
          hitSlop={14}
        >
          <Text style={[tema.typography.bodySmall, { color: tema.colors.primary.solid }]}>{empresa.site}</Text>
        </Pressable>
      ) : null}
    </Cartao>
  );
}
