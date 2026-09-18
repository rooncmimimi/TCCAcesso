import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
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
import { useAutenticacao } from "../autenticacao";
import { Avatar, Etiqueta, Cartao, EstadoErro, EstadoCarregamento, ContainerTela } from "../components/ui";
import type { VarianteEtiqueta } from "../components/ui";
import type { AppStackParamList, PerfilStackParamList } from "../navigation/types";
import { extrairMensagemErro } from "../services/api/erros";
import { useTema } from "../tema";
import type { Tema } from "../tema";
import { ROTULOS_STATUS_CANDIDATURA } from "../vagas";
import type { StatusCandidatura } from "../vagas";
import { formatarDataPorExtenso } from "../utils/formatacao";

type ActivitiesScreenProps = CompositeScreenProps<
  NativeStackScreenProps<PerfilStackParamList, "Activities">,
  NativeStackScreenProps<AppStackParamList>
>;

/** Mesmo mapa de `CandidaturasVagaScreen.tsx`, duplicado de propósito (mesmo raciocínio de `iniciaisDoNome` em outras telas). */
const VARIANTE_STATUS_CANDIDATURA: Record<StatusCandidatura, VarianteEtiqueta> = {
  pendente: "neutral",
  visualizada: "info",
  em_analise: "warning",
  aprovada: "success",
  rejeitada: "error",
  cancelada: "neutral",
};

function nomeDaEmpresa(empresa: { nomeFantasia?: string | null; razaoSocial?: string } | undefined): string {
  return empresa?.nomeFantasia ?? empresa?.razaoSocial ?? "Empresa";
}

/**
 * "Minha atividade": resumo de `AtividadeService.minha` (`GET /atividade/minha` no backend), em que
 * cada categoria traz uma prévia de até 5 itens e o total real, sem paginação.
 *
 * Só "Pessoas que você segue" tem "Ver tudo", porque é a única categoria com tela de lista completa
 * no app (`FollowList`). Nas outras, cada item leva direto ao destino (vaga, perfil ou publicação),
 * em vez de um link para uma lista que não existe.
 */
export function AtividadesScreen({ navigation }: ActivitiesScreenProps) {
  const { tema } = useTema();
  const { usuario } = useAutenticacao();

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
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível carregar sua atividade agora."));
    } finally {
      if (comoAtualizacao) setAtualizando(false);
      else setCarregando(false);
    }
  }, []);

  // Função inline dentro do próprio efeito (mesmo padrão de `VagasScreen.tsx`): evita o lint `react-hooks/set-state-in-effect`.
  useEffect(() => {
    let cancelado = false;

    async function carregarInicial() {
      try {
        const resultado = await AtividadeService.minha();
        if (cancelado) return;
        setAtividade(resultado);
      } catch (erroRequisicao) {
        if (cancelado) return;
        setErro(extrairMensagemErro(erroRequisicao, "Não foi possível carregar sua atividade agora."));
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
    if (!usuario) return;
    navigation.navigate("FollowList", { usuarioId: usuario.id, modo: "seguindo", nomeUsuario: usuario.nome });
  }

  if (carregando) {
    return <EstadoCarregamento />;
  }

  if (erro && !atividade) {
    return (
      <EstadoErro titulo="Não foi possível carregar sua atividade" mensagem={erro} onTentarNovamente={() => void carregar(false)} />
    );
  }

  if (!atividade) return null;

  return (
    <ContainerTela>
      <ScrollView
        testID="atividades-scroll"
        contentContainerStyle={{ gap: tema.spacing.xl, paddingVertical: tema.spacing.lg }}
        refreshControl={
          <RefreshControl refreshing={atualizando} onRefresh={() => void carregar(true)} colors={[tema.colors.primary.solid]} />
        }
      >
        {erro ? (
          <Cartao elevacao="sm" style={{ gap: tema.spacing.xs }}>
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[tema.typography.caption, { color: tema.colors.error.solid }]}
            >
              {erro}
            </Text>
          </Cartao>
        ) : null}

        {atividade.ehCandidato ? (
          <Secao
            tema={tema}
            titulo="Candidaturas"
            total={atividade.candidaturas.total}
            vazio={atividade.candidaturas.itens.length === 0}
            textoVazio="Você ainda não se candidatou a nenhuma vaga."
          >
            {atividade.candidaturas.itens.map((item) => (
              <ItemCandidatura key={item.id} item={item} tema={tema} onPress={() => abrirVaga(item.vaga.id)} />
            ))}
          </Secao>
        ) : null}

        {atividade.ehCandidato ? (
          <Secao
            tema={tema}
            titulo="Vagas favoritas"
            total={atividade.vagasFavoritas.total}
            vazio={atividade.vagasFavoritas.itens.length === 0}
            textoVazio="Nenhuma vaga favoritada ainda."
          >
            {atividade.vagasFavoritas.itens.map((item) => (
              <ItemVagaFavorita key={item.id} item={item} tema={tema} onPress={() => abrirVaga(item.vaga.id)} />
            ))}
          </Secao>
        ) : null}

        <Secao
          tema={tema}
          titulo="Pessoas que você segue"
          total={atividade.seguindo.pessoas.total}
          vazio={atividade.seguindo.pessoas.itens.length === 0}
          textoVazio="Você ainda não segue ninguém."
          verTudo={atividade.seguindo.pessoas.total > 0 ? verPessoasQueSigo : undefined}
        >
          {atividade.seguindo.pessoas.itens.map((pessoa) => (
            <ItemPessoa key={pessoa.id} pessoa={pessoa} tema={tema} onPress={() => abrirPerfil(pessoa.id)} />
          ))}
        </Secao>

        <Secao
          tema={tema}
          titulo="Empresas que você segue"
          total={atividade.seguindo.empresas.total}
          vazio={atividade.seguindo.empresas.itens.length === 0}
          textoVazio="Você ainda não segue nenhuma empresa."
        >
          {atividade.seguindo.empresas.itens.map((item) => (
            <ItemEmpresaSeguida key={item.id} item={item} tema={tema} onPress={() => abrirPerfil(item.empresa.usuarioId)} />
          ))}
        </Secao>

        <Secao
          tema={tema}
          titulo="Publicações que você curtiu"
          total={atividade.interacoesFeed.curtidas.total}
          vazio={atividade.interacoesFeed.curtidas.itens.length === 0}
          textoVazio="Você ainda não curtiu nenhuma publicação."
        >
          {atividade.interacoesFeed.curtidas.itens.map((item) => (
            <ItemPostagem key={item.id} postagem={item.postagem} tema={tema} onPress={() => abrirPostagem(item.postagem.id)} />
          ))}
        </Secao>

        <Secao
          tema={tema}
          titulo="Comentários que você fez"
          total={atividade.interacoesFeed.comentarios.total}
          vazio={atividade.interacoesFeed.comentarios.itens.length === 0}
          textoVazio="Você ainda não comentou em nenhuma publicação."
        >
          {atividade.interacoesFeed.comentarios.itens.map((item) => (
            <ItemComentario key={item.id} item={item} tema={tema} onPress={() => abrirPostagem(item.postagem.id)} />
          ))}
        </Secao>

        <Secao
          tema={tema}
          titulo="Publicações que você compartilhou"
          total={atividade.interacoesFeed.compartilhamentos.total}
          vazio={atividade.interacoesFeed.compartilhamentos.itens.length === 0}
          textoVazio="Você ainda não compartilhou nenhuma publicação."
        >
          {atividade.interacoesFeed.compartilhamentos.itens.map((item) => (
            <ItemPostagem key={item.id} postagem={item.postagem} tema={tema} onPress={() => abrirPostagem(item.postagem.id)} />
          ))}
        </Secao>
      </ScrollView>
    </ContainerTela>
  );
}

function Secao({
  tema,
  titulo,
  total,
  vazio,
  textoVazio,
  verTudo,
  children,
}: {
  tema: Tema;
  titulo: string;
  total: number;
  vazio: boolean;
  textoVazio: string;
  verTudo?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: tema.spacing.sm }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text accessibilityRole="header" style={[tema.typography.title, { color: tema.colors.textPrimary }]}>
          {total > 0 ? `${titulo} (${total})` : titulo}
        </Text>
        {verTudo ? (
          <Pressable
            onPress={verTudo}
            accessibilityRole="button"
            accessibilityLabel={`Ver tudo em ${titulo}`}
            // Texto em `bodySmall`, com uns 20dp de altura: 14 de cada lado leva a área de toque a
            // 48dp.
            hitSlop={14}
          >
            <Text style={[tema.typography.bodySmall, { color: tema.colors.primary.solid }]}>Ver tudo</Text>
          </Pressable>
        ) : null}
      </View>
      {vazio ? (
        <Text style={[tema.typography.bodySmall, { color: tema.colors.textMuted }]}>{textoVazio}</Text>
      ) : (
        <View style={{ gap: tema.spacing.xs }}>{children}</View>
      )}
    </View>
  );
}

function ItemCandidatura({ item, tema, onPress }: { item: CandidaturaAtividade; tema: Tema; onPress: () => void }) {
  const empresa = nomeDaEmpresa(item.vaga.empresa);
  return (
    <View style={{ borderRadius: tema.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${item.vaga.titulo}, ${empresa}, ${ROTULOS_STATUS_CANDIDATURA[item.status]}`}
        android_ripple={{ color: tema.colors.divider }}
        style={{ minHeight: tema.sizes.touchTarget }}
      >
        <Cartao elevacao="sm" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: tema.spacing.sm }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[tema.typography.body, { color: tema.colors.textPrimary }]} numberOfLines={1}>
              {item.vaga.titulo}
            </Text>
            <Text style={[tema.typography.caption, { color: tema.colors.textSecondary }]} numberOfLines={1}>
              {empresa}
            </Text>
          </View>
          <Etiqueta variant={VARIANTE_STATUS_CANDIDATURA[item.status]}>{ROTULOS_STATUS_CANDIDATURA[item.status]}</Etiqueta>
        </Cartao>
      </Pressable>
    </View>
  );
}

function ItemVagaFavorita({ item, tema, onPress }: { item: FavoritoVagaAtividade; tema: Tema; onPress: () => void }) {
  const empresa = nomeDaEmpresa(item.vaga.empresa);
  return (
    <View style={{ borderRadius: tema.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${item.vaga.titulo}, ${empresa}`}
        android_ripple={{ color: tema.colors.divider }}
        style={{ minHeight: tema.sizes.touchTarget }}
      >
        <Cartao elevacao="sm" style={{ gap: 2 }}>
          <Text style={[tema.typography.body, { color: tema.colors.textPrimary }]} numberOfLines={1}>
            {item.vaga.titulo}
          </Text>
          <Text style={[tema.typography.caption, { color: tema.colors.textSecondary }]} numberOfLines={1}>
            {empresa}
          </Text>
        </Cartao>
      </Pressable>
    </View>
  );
}

function ItemPessoa({ pessoa, tema, onPress }: { pessoa: PessoaSeguidaAtividade; tema: Tema; onPress: () => void }) {
  return (
    <View style={{ borderRadius: tema.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Abrir perfil de ${pessoa.nome}`}
        android_ripple={{ color: tema.colors.divider }}
        style={{ minHeight: tema.sizes.touchTarget }}
      >
        <Cartao elevacao="sm" style={{ flexDirection: "row", alignItems: "center", gap: tema.spacing.sm }}>
          <Avatar nome={pessoa.nome} fotoUrl={pessoa.fotoPerfil} size="medium" />
          <Text style={[tema.typography.body, { color: tema.colors.textPrimary }]} numberOfLines={1}>
            {pessoa.nome}
          </Text>
        </Cartao>
      </Pressable>
    </View>
  );
}

function ItemEmpresaSeguida({ item, tema, onPress }: { item: EmpresaSeguidaAtividade; tema: Tema; onPress: () => void }) {
  const nome = nomeDaEmpresa(item.empresa);
  return (
    <View style={{ borderRadius: tema.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Abrir perfil de ${nome}`}
        android_ripple={{ color: tema.colors.divider }}
        style={{ minHeight: tema.sizes.touchTarget }}
      >
        <Cartao elevacao="sm" style={{ flexDirection: "row", alignItems: "center", gap: tema.spacing.sm }}>
          <Avatar nome={nome} fotoUrl={item.empresa.logo} size="medium" />
          <Text style={[tema.typography.body, { color: tema.colors.textPrimary }]} numberOfLines={1}>
            {nome}
          </Text>
        </Cartao>
      </Pressable>
    </View>
  );
}

function ItemPostagem({ postagem, tema, onPress }: { postagem: PostagemResumoAtividade; tema: Tema; onPress: () => void }) {
  const data = formatarDataPorExtenso(postagem.criadoEm);
  const texto = postagem.conteudo?.trim() || "Publicação sem texto";
  return (
    <View style={{ borderRadius: tema.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Abrir publicação: ${texto}`}
        android_ripple={{ color: tema.colors.divider }}
        style={{ minHeight: tema.sizes.touchTarget }}
      >
        <Cartao elevacao="sm" style={{ gap: 2 }}>
          <Text style={[tema.typography.body, { color: tema.colors.textPrimary }]} numberOfLines={2}>
            {texto}
          </Text>
          {data ? <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>{data}</Text> : null}
        </Cartao>
      </Pressable>
    </View>
  );
}

function ItemComentario({ item, tema, onPress }: { item: ComentarioAtividade; tema: Tema; onPress: () => void }) {
  const data = formatarDataPorExtenso(item.postagem.criadoEm);
  return (
    <View style={{ borderRadius: tema.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Abrir publicação onde você comentou: ${item.comentario}`}
        android_ripple={{ color: tema.colors.divider }}
        style={{ minHeight: tema.sizes.touchTarget }}
      >
        <Cartao elevacao="sm" style={{ gap: 2 }}>
          <Text style={[tema.typography.body, { color: tema.colors.textPrimary }]} numberOfLines={2}>
            {item.comentario}
          </Text>
          {data ? <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>{data}</Text> : null}
        </Cartao>
      </Pressable>
    </View>
  );
}
