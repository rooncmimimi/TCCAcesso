import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Avatar, Botao, Cartao, EstadoErro, EstadoCarregamento, ContainerTela } from "../components/ui";
import type { AppStackParamList, PerfilStackParamList } from "../navigation/types";
import { extrairMensagemErro } from "../services/api/erros";
import { SeguidorService } from "../seguidores";
import type { SugestaoEmpresa, SugestaoPessoa } from "../seguidores";
import { useTema } from "../tema";
import type { Tema } from "../tema";

type EstadoRelacao = { seguindo: boolean; solicitacaoPendente: boolean };

type DiscoverScreenProps = CompositeScreenProps<
  NativeStackScreenProps<PerfilStackParamList, "Discover">,
  NativeStackScreenProps<AppStackParamList>
>;

/**
 * Sugestões de pessoas e empresas para seguir, com o motivo de cada sugestão.
 * `GET /seguir/sugestoes*` nunca inclui quem a pessoa já segue, então todo item começa como "não
 * seguindo"; `estadoPessoas` e `estadoEmpresas` só guardam o resultado das ações feitas nesta tela.
 */
export function DescobrirScreen({ navigation }: DiscoverScreenProps) {
  const { tema } = useTema();

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
        setErro(extrairMensagemErro(erroRequisicao, "Não foi possível carregar sugestões agora."));
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
  // decisão de "curtir" no feed: seguir aqui não é uma ação crítica; o
  // botão só volta a ficar habilitado).
  async function seguirPessoa(id: string) {
    if (processandoId) return;
    setProcessandoId(id);
    try {
      // `solicitarSeguir` funciona para perfil público e privado (o backend decide
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
      // silencioso (ver comentário acima)
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
    return <EstadoCarregamento />;
  }

  if (erro && pessoas.length === 0 && empresas.length === 0) {
    return <EstadoErro titulo="Não foi possível carregar sugestões" mensagem={erro} onTentarNovamente={tentarNovamente} />;
  }

  return (
    <ContainerTela>
      <ScrollView contentContainerStyle={{ gap: tema.spacing.xl, paddingVertical: tema.spacing.lg }}>
        <View style={{ gap: tema.spacing.sm }}>
          <Text accessibilityRole="header" style={[tema.typography.title, { color: tema.colors.textPrimary }]}>
            Pessoas para seguir
          </Text>
          {pessoas.length === 0 ? (
            <Text style={[tema.typography.bodySmall, { color: tema.colors.textMuted }]}>
              Nenhuma sugestão no momento.
            </Text>
          ) : (
            pessoas.map((pessoa) => {
              const estado = estadoPessoas[pessoa.id];
              return (
                <CartaoSugestao
                  key={pessoa.id}
                  tema={tema}
                  nome={pessoa.nome}
                  fotoUrl={pessoa.fotoPerfil}
                  subtitulo={pessoa.titulo}
                  motivo={pessoa.motivo}
                  onPress={() => abrirPerfil(pessoa.id)}
                  botao={
                    estado?.seguindo ? (
                      <Botao
                        variant="outline"
                        size="small"
                        onPress={() => void deixarDeSeguirPessoa(pessoa.id)}
                        carregando={processandoId === pessoa.id}
                        disabled={processandoId !== null}
                      >
                        Seguindo
                      </Botao>
                    ) : estado?.solicitacaoPendente ? (
                      <Botao
                        variant="outline"
                        size="small"
                        onPress={() => void cancelarSolicitacaoPessoa(pessoa.id)}
                        carregando={processandoId === pessoa.id}
                        disabled={processandoId !== null}
                      >
                        Solicitado
                      </Botao>
                    ) : (
                      <Botao
                        size="small"
                        onPress={() => void seguirPessoa(pessoa.id)}
                        carregando={processandoId === pessoa.id}
                        disabled={processandoId !== null}
                      >
                        Seguir
                      </Botao>
                    )
                  }
                />
              );
            })
          )}
        </View>

        <View style={{ gap: tema.spacing.sm }}>
          <Text accessibilityRole="header" style={[tema.typography.title, { color: tema.colors.textPrimary }]}>
            Empresas para seguir
          </Text>
          {empresas.length === 0 ? (
            <Text style={[tema.typography.bodySmall, { color: tema.colors.textMuted }]}>
              Nenhuma sugestão no momento.
            </Text>
          ) : (
            empresas.map((empresa) => {
              const seguindo = estadoEmpresas[empresa.id] ?? false;
              return (
                <CartaoSugestao
                  key={empresa.id}
                  tema={tema}
                  nome={empresa.nomeFantasia ?? empresa.razaoSocial}
                  fotoUrl={empresa.logo}
                  subtitulo={empresa.setor}
                  motivo={empresa.motivo}
                  onPress={() => abrirPerfil(empresa.usuarioId)}
                  botao={
                    <Botao
                      variant={seguindo ? "outline" : "primary"}
                      size="small"
                      onPress={() => void alternarSeguirEmpresa(empresa.id)}
                      carregando={processandoId === empresa.id}
                      disabled={processandoId !== null}
                    >
                      {seguindo ? "Seguindo" : "Seguir"}
                    </Botao>
                  }
                />
              );
            })
          )}
        </View>
      </ScrollView>
    </ContainerTela>
  );
}

function CartaoSugestao({
  tema,
  nome,
  fotoUrl,
  subtitulo,
  motivo,
  onPress,
  botao,
}: {
  tema: Tema;
  nome: string;
  fotoUrl?: string | null;
  subtitulo?: string | null;
  motivo: string;
  onPress: () => void;
  botao: React.ReactNode;
}) {
  return (
    <Cartao elevacao="sm" style={{ flexDirection: "row", alignItems: "center", gap: tema.spacing.sm }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Abrir perfil de ${nome}`}
        style={{ flexDirection: "row", alignItems: "center", gap: tema.spacing.sm, flex: 1 }}
        // A altura vem só do avatar de 40dp: 4 de cada lado leva a área de toque a 48dp.
        hitSlop={4}
      >
        <Avatar nome={nome} fotoUrl={fotoUrl} size="medium" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[tema.typography.body, { color: tema.colors.textPrimary }]} numberOfLines={1}>
            {nome}
          </Text>
          {subtitulo ? (
            <Text style={[tema.typography.caption, { color: tema.colors.textSecondary }]} numberOfLines={1}>
              {subtitulo}
            </Text>
          ) : null}
          <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]} numberOfLines={1}>
            {motivo}
          </Text>
        </View>
      </Pressable>
      {botao}
    </Cartao>
  );
}
