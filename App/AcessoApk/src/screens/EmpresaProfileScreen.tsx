import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import { Button, Card, Input, ScreenContainer, SegmentedControl } from "../components/ui";
import { EmpresaService } from "../empresas";
import type { EmpresaResumo, PorteEmpresa } from "../empresas";
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
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={theme.colors.primary.solid} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  if (erro && !empresa) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Card elevation="md" style={{ gap: theme.spacing.sm }}>
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[theme.typography.title, { color: theme.colors.textPrimary }]}
            >
              Não foi possível carregar o perfil da empresa
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{erro}</Text>
            <Button onPress={tentarNovamente}>Tentar novamente</Button>
          </Card>
        </View>
      </ScreenContainer>
    );
  }

  if (!empresa) return null;

  const aprovada = empresa.statusAprovacao === "aprovada";

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ gap: theme.spacing.lg, paddingVertical: theme.spacing.lg }}>
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
