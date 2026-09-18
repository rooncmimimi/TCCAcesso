import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAutenticacao } from "../autenticacao";
import { Etiqueta, Botao, Cartao, EstadoErro, EstadoCarregamento, ContainerTela, BotaoOuvir } from "../components/ui";
import type { AppStackParamList } from "../navigation/types";
import { extrairMensagemErro } from "../services/api/erros";
import { useTema } from "../tema";
import {
  ROTULOS_CONTRATO,
  ROTULOS_MODALIDADE,
  ROTULOS_RECURSO_ACESSIBILIDADE,
  ROTULOS_STATUS_VAGA,
  VagasService,
} from "../vagas";
import type { Vaga } from "../vagas";
import { formatarDataPorExtenso, formatarSalario } from "../utils/formatacao";

type VagaDetailScreenProps = NativeStackScreenProps<AppStackParamList, "VagaDetail">;

/**
 * Detalhe de uma vaga, com candidatura, favorito, leitura em voz alta e denúncia. Candidatar-se e
 * favoritar aparecem só para candidato.
 */
export function DetalheVagaScreen({ route, navigation }: VagaDetailScreenProps) {
  const { vagaId } = route.params;
  const { tema } = useTema();
  const { usuario } = useAutenticacao();
  const podeInteragir = usuario?.tipoUsuario === "candidato";

  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [primeiroCarregamentoConcluido, setPrimeiroCarregamentoConcluido] = useState(false);
  // Incrementar isto refaz a busca: usado só por "Tentar novamente" quando
  // a carga inicial falhou (não há conteúdo prévio pra preservar nesse
  // caso, então voltar pra tela cheia de loading é o comportamento certo).
  const [tentativa, setTentativa] = useState(0);

  // O favorito começa `false` porque a API não informa o estado real (nem `GET /vagas` nem
  // `GET /vagas/:id`); isso não significa que a vaga não esteja favoritada. Só a resposta de
  // `POST .../favoritar` vale, por isso não há atualização otimista.
  const [favoritado, setFavoritado] = useState(false);
  const [favoritando, setFavoritando] = useState(false);
  const [erroFavoritar, setErroFavoritar] = useState<string | null>(null);

  const [candidatando, setCandidatando] = useState(false);
  const [candidaturaEnviada, setCandidaturaEnviada] = useState(false);
  const [erroCandidatura, setErroCandidatura] = useState<string | null>(null);

  // Função inline dentro do próprio efeito (mesmo padrão de
  // `AutenticacaoProvider.tsx`/`VagasScreen.tsx`): evita o lint
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
        // A vaga pode ter mudado ou sumido desde a listagem; vale só a resposta desta chamada.
        setErro(extrairMensagemErro(erroRequisicao, "Não foi possível carregar esta vaga."));
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
      // Sem atualização otimista: se a chamada falhar, o botão não muda, só o erro aparece.
      setErroFavoritar(extrairMensagemErro(erroRequisicao, "Não foi possível favoritar esta vaga agora."));
    } finally {
      setFavoritando(false);
    }
  }

  async function candidatar() {
    if (candidatando || candidaturaEnviada || !vaga) return;
    setCandidatando(true);
    setErroCandidatura(null);
    try {
      // Sem checar antes se já houve candidatura: tenta e trata a resposta (201 sucesso, 409 já
      // candidatado, outro erro).
      await VagasService.candidatarSe(vaga.id);
      setCandidaturaEnviada(true);
    } catch (erroRequisicao) {
      setErroCandidatura(
        extrairMensagemErro(erroRequisicao, "Não foi possível enviar sua candidatura agora."),
      );
    } finally {
      setCandidatando(false);
    }
  }

  if (!primeiroCarregamentoConcluido) {
    return <EstadoCarregamento />;
  }

  if (erro && !vaga) {
    return <EstadoErro titulo="Não foi possível carregar esta vaga" mensagem={erro} onTentarNovamente={tentarNovamente} />;
  }

  // Nunca deveria acontecer (as duas condições acima cobrem loading/erro),
  // mas satisfaz o TypeScript sem um `!`: `vaga` só chega aqui preenchida.
  if (!vaga) return null;

  const empresa = vaga.empresa?.nomeFantasia ?? vaga.empresa?.razaoSocial ?? "Empresa não informada";
  const usuarioIdEmpresa = vaga.empresa?.usuario?.id;
  const local = [vaga.cidade, vaga.estado].filter(Boolean).join(" - ");
  const salarioFormatado = formatarSalario(vaga.salario);
  const dataFormatada = formatarDataPorExtenso(vaga.criadoEm);
  const vagaAberta = vaga.status === "aberta";

  // Texto do botão "Ouvir em voz alta": o conteúdo da vaga na ordem da tela. `.filter(Boolean)`
  // pula requisitos e benefícios ausentes sem pausas vazias na leitura.
  const textoParaLeitura = [
    vaga.titulo,
    `Empresa: ${empresa}.`,
    `Descrição: ${vaga.descricao}`,
    vaga.requisitos ? `Requisitos: ${vaga.requisitos}` : null,
    vaga.beneficios ? `Benefícios: ${vaga.beneficios}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <ContainerTela>
      <ScrollView contentContainerStyle={{ gap: tema.spacing.md, paddingVertical: tema.spacing.md }}>
        <View style={{ gap: tema.spacing.xs }}>
          <Text style={[tema.typography.heading, { color: tema.colors.textPrimary }]}>{vaga.titulo}</Text>
          {/* Só o detalhe (`GET /vagas/:id`) traz `empresa.usuario`, por isso o nome da empresa
              só é clicável aqui. */}
          {usuarioIdEmpresa ? (
            <Pressable
              onPress={() => navigation.navigate("PublicProfile", { usuarioId: usuarioIdEmpresa })}
              accessibilityRole="button"
              accessibilityLabel={`Ver perfil de ${empresa}`}
              // Nome da empresa em `body`, com uns 24dp de altura: 12 de cada lado leva a área de
              // toque a 48dp.
              hitSlop={12}
            >
              <Text style={[tema.typography.body, { color: tema.colors.primary.solid }]}>{empresa}</Text>
            </Pressable>
          ) : (
            <Text style={[tema.typography.body, { color: tema.colors.textSecondary }]}>{empresa}</Text>
          )}
          {!vagaAberta ? <Etiqueta variant="warning">{ROTULOS_STATUS_VAGA[vaga.status]}</Etiqueta> : null}
          <BotaoOuvir texto={textoParaLeitura} rotulo="esta vaga" />
        </View>

        <Cartao elevacao="sm" style={{ gap: tema.spacing.xs }}>
          <Text style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]}>
            {[local, ROTULOS_MODALIDADE[vaga.modalidade]].filter(Boolean).join(" · ")}
          </Text>
          {vaga.contrato ? (
            <Text style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]}>
              {ROTULOS_CONTRATO[vaga.contrato]}
              {vaga.cargaHoraria ? ` · ${vaga.cargaHoraria}` : ""}
            </Text>
          ) : null}
          {salarioFormatado ? (
            <Text style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]}>{salarioFormatado}</Text>
          ) : null}
          {dataFormatada ? (
            <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>
              Publicada em {dataFormatada}
            </Text>
          ) : null}
        </Cartao>

        {vaga.recursosAcessibilidade && vaga.recursosAcessibilidade.length > 0 ? (
          <View style={{ gap: tema.spacing.xs }}>
            <Text style={[tema.typography.label, { color: tema.colors.textPrimary }]}>
              Recursos de acessibilidade
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: tema.spacing.xs }}>
              {vaga.recursosAcessibilidade.map((recurso) => (
                <Etiqueta key={recurso} variant="info">
                  {ROTULOS_RECURSO_ACESSIBILIDADE[recurso] ?? recurso}
                </Etiqueta>
              ))}
            </View>
          </View>
        ) : null}

        <View style={{ gap: tema.spacing.xs }}>
          <Text style={[tema.typography.label, { color: tema.colors.textPrimary }]}>Descrição</Text>
          <Text style={[tema.typography.body, { color: tema.colors.textSecondary }]}>{vaga.descricao}</Text>
        </View>

        {vaga.requisitos ? (
          <View style={{ gap: tema.spacing.xs }}>
            <Text style={[tema.typography.label, { color: tema.colors.textPrimary }]}>Requisitos</Text>
            <Text style={[tema.typography.body, { color: tema.colors.textSecondary }]}>{vaga.requisitos}</Text>
          </View>
        ) : null}

        {vaga.beneficios ? (
          <View style={{ gap: tema.spacing.xs }}>
            <Text style={[tema.typography.label, { color: tema.colors.textPrimary }]}>Benefícios</Text>
            <Text style={[tema.typography.body, { color: tema.colors.textSecondary }]}>{vaga.beneficios}</Text>
          </View>
        ) : null}

        {/* Candidatar-se e favoritar só para candidato autenticado; empresa e administrador só
            visualizam. */}
        {podeInteragir ? (
          <View style={{ gap: tema.spacing.sm }}>
            {/* Controle próprio, e não o `Botao`, para expor `accessibilityState.selected` com
                o estado real do favorito. */}
            <Pressable
              onPress={() => void alternarFavorito()}
              disabled={favoritando}
              accessibilityRole="button"
              accessibilityLabel={favoritado ? "Remover dos favoritos" : "Favoritar vaga"}
              accessibilityState={{ selected: favoritado, disabled: favoritando, busy: favoritando }}
              hitSlop={14}
              style={{
                minHeight: tema.sizes.touchTarget,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: tema.spacing.xs,
                borderWidth: 1,
                borderColor: favoritado ? tema.colors.primary.solid : tema.colors.border,
                borderRadius: tema.radius.md,
                opacity: favoritando ? 0.6 : 1,
              }}
            >
              {favoritando ? (
                <ActivityIndicator color={tema.colors.primary.solid} />
              ) : (
                <Text
                  style={[
                    tema.typography.button,
                    { color: favoritado ? tema.colors.primary.solid : tema.colors.textPrimary },
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
                style={[tema.typography.caption, { color: tema.colors.error.solid }]}
              >
                {erroFavoritar}
              </Text>
            ) : null}

            {vagaAberta ? (
              <>
                <Botao
                  onPress={() => void candidatar()}
                  carregando={candidatando}
                  disabled={candidatando || candidaturaEnviada}
                >
                  {candidaturaEnviada ? "Candidatura enviada" : "Candidatar-se"}
                </Botao>
                {candidaturaEnviada ? (
                  <Text accessibilityLiveRegion="polite" style={[tema.typography.bodySmall, { color: tema.colors.success.solid }]}>
                    Candidatura enviada com sucesso!
                  </Text>
                ) : null}
                {erroCandidatura ? (
                  <Text
                    accessibilityRole="alert"
                    accessibilityLiveRegion="assertive"
                    style={[tema.typography.caption, { color: tema.colors.error.solid }]}
                  >
                    {erroCandidatura}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={[tema.typography.bodySmall, { color: tema.colors.textMuted }]}>
                Esta vaga não está mais aceitando candidaturas ({ROTULOS_STATUS_VAGA[vaga.status].toLowerCase()}).
              </Text>
            )}
          </View>
        ) : null}

        {/* Some para a empresa dona da vaga: ninguém recebe a opção de denunciar o próprio
            conteúdo. */}
        {usuarioIdEmpresa && usuarioIdEmpresa !== usuario?.id ? (
          <Pressable
            onPress={() => navigation.navigate("Report", { entidadeTipo: "vaga", entidadeId: vaga.id, tituloAlvo: vaga.titulo })}
            accessibilityRole="button"
            accessibilityLabel="Denunciar vaga"
            hitSlop={10}
            style={{ minHeight: tema.sizes.touchTarget, justifyContent: "center", alignSelf: "flex-start" }}
          >
            <Text style={[tema.typography.bodySmall, { color: tema.colors.textMuted }]}>Denunciar vaga</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </ContainerTela>
  );
}
