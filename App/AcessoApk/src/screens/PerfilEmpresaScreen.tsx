import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";

import { Botao, Cartao, EstadoErro, CampoTexto, EstadoCarregamento, ContainerTela, ControleSegmentado, iniciaisDoNome } from "../components/ui";
import { EmpresaService } from "../empresas";
import type { EmpresaResumo, PorteEmpresa } from "../empresas";
import type { PerfilStackParamList } from "../navigation/types";
import { extrairMensagemErro } from "../services/api/erros";
import { useTema } from "../tema";
import type { Tema } from "../tema";

const ROTULOS_PORTE: Record<PorteEmpresa, string> = {
  mei: "MEI",
  micro: "Microempresa",
  pequena: "Pequena",
  media: "Média",
  grande: "Grande",
};

const MENSAGEM_STATUS: Record<string, (empresa: EmpresaResumo) => string> = {
  pendente: () =>
    "Sua empresa está aguardando aprovação da equipe do ACESSO. Você poderá editar o perfil e publicar vagas assim que a análise for concluída.",
  reprovada: (empresa) =>
    empresa.motivoReprovacao
      ? `Seu cadastro empresarial não foi aprovado. Motivo: ${empresa.motivoReprovacao}`
      : "Seu cadastro empresarial não foi aprovado pela equipe do ACESSO.",
  suspensa: (empresa) =>
    empresa.motivoSuspensao
      ? `Sua empresa está suspensa pela moderação do ACESSO. Motivo: ${empresa.motivoSuspensao}`
      : "Sua empresa está suspensa pela moderação do ACESSO.",
};

/**
 * Perfil da própria empresa, mostrado por `MeuPerfilScreen.tsx` quando `tipoUsuario` é `"empresa"`.
 * Edita só os dados de texto; logo e capa não são enviados pelo app (ver `empresas/types.ts`).
 *
 * Editar exige empresa aprovada (`garantirEmpresaAprovada` no backend). Nos outros três estados a
 * tela mostra um aviso no lugar do formulário, com a mesma mensagem que a API devolveria no 403.
 */
export function PerfilEmpresaScreen() {
  const { tema } = useTema();
  const navigation = useNavigation<NativeStackNavigationProp<PerfilStackParamList>>();

  const [empresa, setEmpresa] = useState<EmpresaResumo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        const dados = await EmpresaService.meuPerfil();
        if (cancelado) return;
        setEmpresa(dados);
      } catch (erroRequisicao) {
        if (cancelado) return;
        setErro(extrairMensagemErro(erroRequisicao, "Não foi possível carregar o perfil da empresa."));
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

  if (carregando) {
    return <EstadoCarregamento />;
  }

  if (erro && !empresa) {
    return (
      <EstadoErro titulo="Não foi possível carregar o perfil da empresa" mensagem={erro} onTentarNovamente={tentarNovamente} />
    );
  }

  if (!empresa) return null;

  const aprovada = empresa.statusAprovacao === "aprovada";

  return (
    <ContainerTela>
      <ScrollView contentContainerStyle={{ gap: tema.spacing.lg, paddingVertical: tema.spacing.lg }}>
        <CabecalhoEmpresa empresa={empresa} tema={tema} />

        {/* Atalhos para "Minhas vagas" e "Atividades", as mesmas rotas do `PerfilNavigator`,
            com as mesmas regras de acesso, para o perfil funcionar como ponto de partida da
            empresa. */}
        <View style={{ flexDirection: "row", gap: tema.spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Botao variant="outline" size="small" onPress={() => navigation.navigate("MyJobs")}>
              Minhas vagas
            </Botao>
          </View>
          <View style={{ flex: 1 }}>
            <Botao variant="outline" size="small" onPress={() => navigation.navigate("Activities")}>
              Atividades
            </Botao>
          </View>
        </View>

        {!aprovada ? (
          <Cartao elevacao="sm" style={{ gap: tema.spacing.xs, borderColor: tema.colors.warning.solid }}>
            <Text style={[tema.typography.label, { color: tema.colors.textPrimary }]}>
              {empresa.razaoSocial}
            </Text>
            <Text style={[tema.typography.body, { color: tema.colors.textSecondary }]}>
              {(MENSAGEM_STATUS[empresa.statusAprovacao ?? "pendente"] ?? MENSAGEM_STATUS.pendente)(empresa)}
            </Text>
          </Cartao>
        ) : (
          <FormularioEmpresa empresa={empresa} tema={tema} onAtualizado={setEmpresa} />
        )}
      </ScrollView>
    </ContainerTela>
  );
}

/**
 * Cabeçalho da empresa, diferente do de candidato (`CabecalhoPerfil`): logo numa caixa arredondada,
 * porque logos costumam ser retangulares, ao lado do nome, em vez de uma foto redonda centralizada.
 */
function CabecalhoEmpresa({ empresa, tema }: { empresa: EmpresaResumo; tema: Tema }) {
  const nome = empresa.nomeFantasia || empresa.razaoSocial;
  const localizacao = [empresa.cidade, empresa.estado].filter(Boolean).join(" - ");
  const logoTamanho = tema.sizes.avatarXLarge;

  return (
    <Cartao elevacao="sm" style={{ gap: tema.spacing.sm, padding: 0, overflow: "hidden" }}>
      {/* Mostra a capa quando a empresa já tem uma cadastrada. Sem capa não há placeholder: um
          bloco de cor genérico não representaria nada. */}
      {empresa.capa ? (
        <Image
          accessible={false}
          source={{ uri: empresa.capa, cacheKey: empresa.capa }}
          style={{ width: "100%", height: 96 }}
          contentFit="cover"
        />
      ) : null}
      <View style={{ flexDirection: "row", gap: tema.spacing.md, alignItems: "center", padding: tema.spacing.md }}>
        {/* Mesmo raciocínio de `Avatar.tsx` (`accessible={false}`): o nome já
            aparece como texto ao lado; a caixa do logo nunca deveria ser o
            único portador do nome acessível nem duplicar o anúncio dele. */}
        <View
          accessible={false}
          style={{
            width: logoTamanho,
            height: logoTamanho,
            borderRadius: tema.radius.lg,
            backgroundColor: tema.colors.primary.soft,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {empresa.logo ? (
            <Image
              source={{ uri: empresa.logo, cacheKey: empresa.logo }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          ) : (
            <Text style={[tema.typography.heading, { color: tema.colors.primary.onSoft }]}>
              {iniciaisDoNome(nome)}
            </Text>
          )}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: tema.spacing.xs }}>
            <Text
              accessibilityRole="header"
              style={[tema.typography.heading, { color: tema.colors.textPrimary, flexShrink: 1 }]}
              numberOfLines={2}
            >
              {nome}
            </Text>
            {empresa.empresaVerificada ? (
              <Ionicons
                name="checkmark-circle"
                size={tema.sizes.iconSmall}
                color={tema.colors.primary.solid}
                accessibilityLabel="Empresa verificada"
              />
            ) : null}
          </View>
          {empresa.setor ? (
            <Text style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]}>{empresa.setor}</Text>
          ) : null}
          {localizacao ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="location-outline" size={tema.sizes.iconSmall} color={tema.colors.textMuted} />
              <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>{localizacao}</Text>
            </View>
          ) : null}
        </View>
      </View>
      {empresa.descricao ? (
        <Text
          style={[
            tema.typography.body,
            { color: tema.colors.textSecondary, paddingHorizontal: tema.spacing.md, paddingBottom: tema.spacing.md },
          ]}
        >
          {empresa.descricao}
        </Text>
      ) : null}
    </Cartao>
  );
}

function FormularioEmpresa({
  empresa,
  tema,
  onAtualizado,
}: {
  empresa: EmpresaResumo;
  tema: Tema;
  onAtualizado: (empresa: EmpresaResumo) => void;
}) {
  const [razaoSocial, setRazaoSocial] = useState(empresa.razaoSocial);
  const [nomeFantasia, setNomeFantasia] = useState(empresa.nomeFantasia ?? "");
  const [descricao, setDescricao] = useState(empresa.descricao ?? "");
  const [setor, setSetor] = useState(empresa.setor ?? "");
  const [porte, setPorte] = useState<PorteEmpresa | "">(empresa.porte ?? "");
  const [site, setSite] = useState(empresa.site ?? "");
  const [cidade, setCidade] = useState(empresa.cidade ?? "");
  const [estado, setEstado] = useState(empresa.estado ?? "");
  const [endereco, setEndereco] = useState(empresa.endereco ?? "");
  const [cep, setCep] = useState(empresa.cep ?? "");
  const [culturaInclusiva, setCulturaInclusiva] = useState(empresa.culturaInclusiva ?? "");

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  async function salvar() {
    if (salvando) return;
    if (!razaoSocial.trim()) {
      setErro("A razão social não pode ficar vazia.");
      return;
    }
    setSalvando(true);
    setErro(null);
    setSucesso(false);
    try {
      const atualizada = await EmpresaService.atualizar(empresa.id, {
        razaoSocial: razaoSocial.trim(),
        nomeFantasia: nomeFantasia.trim(),
        descricao: descricao.trim(),
        setor: setor.trim(),
        ...(porte ? { porte } : {}),
        site: site.trim(),
        cidade: cidade.trim(),
        estado: estado.trim() ? estado.trim().toUpperCase() : undefined,
        endereco: endereco.trim(),
        cep: cep.trim(),
        culturaInclusiva: culturaInclusiva.trim(),
      });
      onAtualizado(atualizada);
      setSucesso(true);
    } catch (erroRequisicao) {
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível salvar agora."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Cartao elevacao="sm" style={{ gap: tema.spacing.md }}>
      <CampoTexto rotulo="Razão social" value={razaoSocial} onChangeText={setRazaoSocial} editable={!salvando} />
      <CampoTexto rotulo="Nome fantasia" value={nomeFantasia} onChangeText={setNomeFantasia} editable={!salvando} />
      <CampoTexto
        rotulo="Descrição"
        value={descricao}
        onChangeText={setDescricao}
        editable={!salvando}
        multiline
        style={{ minHeight: 96, textAlignVertical: "top" }}
      />
      <CampoTexto rotulo="Setor" value={setor} onChangeText={setSetor} editable={!salvando} />
      <ControleSegmentado
        rotulo="Porte"
        value={porte || "micro"}
        onChange={(valor) => setPorte(valor)}
        opcoes={(Object.keys(ROTULOS_PORTE) as PorteEmpresa[]).map((valor) => ({ rotulo: ROTULOS_PORTE[valor], value: valor }))}
      />
      <CampoTexto rotulo="Site" value={site} onChangeText={setSite} editable={!salvando} autoCapitalize="none" keyboardType="url" />
      <View style={{ flexDirection: "row", gap: tema.spacing.sm }}>
        <View style={{ flex: 2 }}>
          <CampoTexto rotulo="Cidade" value={cidade} onChangeText={setCidade} editable={!salvando} />
        </View>
        <View style={{ flex: 1 }}>
          <CampoTexto rotulo="UF" value={estado} onChangeText={setEstado} editable={!salvando} maxLength={2} autoCapitalize="characters" />
        </View>
      </View>
      <CampoTexto rotulo="Endereço" value={endereco} onChangeText={setEndereco} editable={!salvando} />
      <CampoTexto rotulo="CEP" value={cep} onChangeText={setCep} editable={!salvando} keyboardType="number-pad" maxLength={8} textoAjuda="Só números, 8 dígitos." />
      <CampoTexto
        rotulo="Cultura inclusiva"
        value={culturaInclusiva}
        onChangeText={setCulturaInclusiva}
        editable={!salvando}
        multiline
        style={{ minHeight: 96, textAlignVertical: "top" }}
        textoAjuda="O que sua empresa faz para ser um ambiente de trabalho inclusivo."
      />

      {sucesso ? (
        <Text accessibilityLiveRegion="polite" style={[tema.typography.bodySmall, { color: tema.colors.success.solid }]}>
          Perfil da empresa atualizado.
        </Text>
      ) : null}
      {erro ? (
        <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[tema.typography.caption, { color: tema.colors.error.solid }]}>
          {erro}
        </Text>
      ) : null}

      <Botao onPress={() => void salvar()} carregando={salvando} disabled={salvando}>
        Salvar alterações
      </Botao>
    </Cartao>
  );
}
