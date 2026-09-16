import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";

import { Button, Card, ErrorState, Input, LoadingState, ScreenContainer, SegmentedControl, iniciaisDoNome } from "../components/ui";
import { EmpresaService } from "../empresas";
import type { EmpresaResumo, PorteEmpresa } from "../empresas";
import type { ProfileStackParamList } from "../navigation/types";
import { getFriendlyErrorMessage } from "../services/api/errors";
import { useTheme } from "../theme";
import type { Theme } from "../theme";

const LABEL_PORTE: Record<PorteEmpresa, string> = {
  MEI: "MEI",
  Micro: "Microempresa",
  Pequena: "Pequena",
  Media: "Média",
  Grande: "Grande",
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
 * Perfil da empresa (Fase 18 — Modo Empresa) — `MyProfileScreen.tsx`
 * renderiza este componente em vez do próprio quando `tipoUsuario ===
 * "empresa"`. Antes desta fase, uma conta empresa que tocasse "Meu perfil"
 * caía direto na tela de candidato (`PerfilService.meuCandidato()` — 404,
 * já que não existe registro `candidatos` para ela): achado real da
 * auditoria, não uma limitação já documentada em fase anterior.
 *
 * Só campos de TEXTO do perfil — logo/capa (upload multipart) ficam de fora
 * de propósito (ver comentário em `empresas/types.ts`: reservado para a
 * Fase 20, mídia). Editar exige `statusAprovacao === "aprovada"`
 * (`garantirEmpresaAprovada` no backend, para TODA ação de auto-gestão da
 * empresa) — os outros 3 estados mostram um aviso em vez do formulário,
 * usando a MESMA mensagem que o backend já usa (nunca inventar um texto
 * diferente do que a API realmente devolveria no 403).
 */
export function EmpresaProfileScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();

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
        setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar o perfil da empresa."));
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
    return <LoadingState />;
  }

  if (erro && !empresa) {
    return (
      <ErrorState title="Não foi possível carregar o perfil da empresa" message={erro} onRetry={tentarNovamente} />
    );
  }

  if (!empresa) return null;

  const aprovada = empresa.statusAprovacao === "aprovada";

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ gap: theme.spacing.lg, paddingVertical: theme.spacing.lg }}>
        <EmpresaHeader empresa={empresa} theme={theme} />

        {/* Atalhos para telas que já existem no app (Fase 18: "Minhas Vagas" e
            "Atividades" já são itens do menu do Perfil) — trazidos para cá
            para o perfil da empresa funcionar como um hub da identidade dela,
            igual ao pedido do redesign (item 10: "vagas; atividades"). Nenhuma
            tela nova, nenhuma regra de acesso nova: são as mesmas rotas do
            `ProfileNavigator`, com a mesma regra de acesso que já tinham. */}
        <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button variant="outline" size="small" onPress={() => navigation.navigate("MyJobs")}>
              Minhas vagas
            </Button>
          </View>
          <View style={{ flex: 1 }}>
            <Button variant="outline" size="small" onPress={() => navigation.navigate("Activities")}>
              Atividades
            </Button>
          </View>
        </View>

        {!aprovada ? (
          <Card elevation="sm" style={{ gap: theme.spacing.xs, borderColor: theme.colors.warning.solid }}>
            <Text style={[theme.typography.label, { color: theme.colors.textPrimary }]}>
              {empresa.razaoSocial}
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>
              {(MENSAGEM_STATUS[empresa.statusAprovacao ?? "pendente"] ?? MENSAGEM_STATUS.pendente)(empresa)}
            </Text>
          </Card>
        ) : (
          <FormularioEmpresa empresa={empresa} theme={theme} onAtualizado={setEmpresa} />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

/**
 * Identidade visual da empresa (redesign, item 10: "não tratar empresa como
 * se fosse um candidato") — antes desta fase, o perfil de empresa era só um
 * formulário (`FormularioEmpresa`, abaixo), sem nenhuma composição visual:
 * nem logo, nem nome em destaque, nada que lembrasse um perfil de verdade.
 *
 * Diferenciação deliberada do cabeçalho de candidato (`PerfilHeader` em
 * `MyProfileScreen.tsx`): logo em caixa arredondada (não círculo — logos são
 * retangulares/quadrados por natureza, avatar de pessoa é redondo) e layout
 * em linha (logo ao lado do nome), não coluna centralizada. A mesma
 * distinção visual que o próprio contrato de API já reforça: candidato tem
 * `fotoPerfil`, empresa tem `logo`/`capa` — nomes diferentes para conceitos
 * diferentes.
 */
function EmpresaHeader({ empresa, theme }: { empresa: EmpresaResumo; theme: Theme }) {
  const nome = empresa.nomeFantasia || empresa.razaoSocial;
  const localizacao = [empresa.cidade, empresa.estado].filter(Boolean).join(" - ");
  const logoTamanho = theme.sizes.avatarXLarge;

  return (
    <Card elevation="sm" style={{ gap: theme.spacing.sm, padding: 0, overflow: "hidden" }}>
      {/* Capa (Fase 20 de mídia reserva o upload — mas o backend já expõe o
          campo, e se uma empresa já tiver uma capa cadastrada, mostrar o que
          já existe não é inventar dado nenhum). Sem placeholder quando não
          há capa: um bloco de cor genérico ali não representaria nada real. */}
      {empresa.capa ? (
        <Image
          accessible={false}
          source={{ uri: empresa.capa, cacheKey: empresa.capa }}
          style={{ width: "100%", height: 96 }}
          contentFit="cover"
        />
      ) : null}
      <View style={{ flexDirection: "row", gap: theme.spacing.md, alignItems: "center", padding: theme.spacing.md }}>
        {/* Mesmo raciocínio de `Avatar.tsx` (`accessible={false}`): o nome já
            aparece como texto ao lado — a caixa do logo nunca deveria ser o
            único portador do nome acessível nem duplicar o anúncio dele. */}
        <View
          accessible={false}
          style={{
            width: logoTamanho,
            height: logoTamanho,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.primary.soft,
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
            <Text style={[theme.typography.heading, { color: theme.colors.primary.onSoft }]}>
              {iniciaisDoNome(nome)}
            </Text>
          )}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
            <Text
              accessibilityRole="header"
              style={[theme.typography.heading, { color: theme.colors.textPrimary, flexShrink: 1 }]}
              numberOfLines={2}
            >
              {nome}
            </Text>
            {empresa.empresaVerificada ? (
              <Ionicons
                name="checkmark-circle"
                size={theme.sizes.iconSmall}
                color={theme.colors.primary.solid}
                accessibilityLabel="Empresa verificada"
              />
            ) : null}
          </View>
          {empresa.setor ? (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{empresa.setor}</Text>
          ) : null}
          {localizacao ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="location-outline" size={theme.sizes.iconSmall} color={theme.colors.textMuted} />
              <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>{localizacao}</Text>
            </View>
          ) : null}
        </View>
      </View>
      {empresa.descricao ? (
        <Text
          style={[
            theme.typography.body,
            { color: theme.colors.textSecondary, paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.md },
          ]}
        >
          {empresa.descricao}
        </Text>
      ) : null}
    </Card>
  );
}

function FormularioEmpresa({
  empresa,
  theme,
  onAtualizado,
}: {
  empresa: EmpresaResumo;
  theme: Theme;
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
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível salvar agora."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card elevation="sm" style={{ gap: theme.spacing.md }}>
      <Input label="Razão social" value={razaoSocial} onChangeText={setRazaoSocial} editable={!salvando} />
      <Input label="Nome fantasia" value={nomeFantasia} onChangeText={setNomeFantasia} editable={!salvando} />
      <Input
        label="Descrição"
        value={descricao}
        onChangeText={setDescricao}
        editable={!salvando}
        multiline
        style={{ minHeight: 96, textAlignVertical: "top" }}
      />
      <Input label="Setor" value={setor} onChangeText={setSetor} editable={!salvando} />
      <SegmentedControl
        label="Porte"
        value={porte || "Micro"}
        onChange={(valor) => setPorte(valor)}
        options={(Object.keys(LABEL_PORTE) as PorteEmpresa[]).map((valor) => ({ label: LABEL_PORTE[valor], value: valor }))}
      />
      <Input label="Site" value={site} onChangeText={setSite} editable={!salvando} autoCapitalize="none" keyboardType="url" />
      <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
        <View style={{ flex: 2 }}>
          <Input label="Cidade" value={cidade} onChangeText={setCidade} editable={!salvando} />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="UF" value={estado} onChangeText={setEstado} editable={!salvando} maxLength={2} autoCapitalize="characters" />
        </View>
      </View>
      <Input label="Endereço" value={endereco} onChangeText={setEndereco} editable={!salvando} />
      <Input label="CEP" value={cep} onChangeText={setCep} editable={!salvando} keyboardType="number-pad" maxLength={8} helperText="Só números, 8 dígitos." />
      <Input
        label="Cultura inclusiva"
        value={culturaInclusiva}
        onChangeText={setCulturaInclusiva}
        editable={!salvando}
        multiline
        style={{ minHeight: 96, textAlignVertical: "top" }}
        helperText="O que sua empresa faz para ser um ambiente de trabalho inclusivo."
      />

      {sucesso ? (
        <Text accessibilityLiveRegion="polite" style={[theme.typography.bodySmall, { color: theme.colors.success.solid }]}>
          Perfil da empresa atualizado.
        </Text>
      ) : null}
      {erro ? (
        <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[theme.typography.caption, { color: theme.colors.error.solid }]}>
          {erro}
        </Text>
      ) : null}

      <Button onPress={() => void salvar()} loading={salvando} disabled={salvando}>
        Salvar alterações
      </Button>
    </Card>
  );
}
