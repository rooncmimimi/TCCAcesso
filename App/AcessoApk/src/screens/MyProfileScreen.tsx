import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";

import { useAuth } from "../auth";
import { Button, Card, Input, ScreenContainer, ToggleRow } from "../components/ui";
import { CurriculoSecao } from "./CurriculoSecao";
import { EmpresaProfileScreen } from "./EmpresaProfileScreen";
import type {
  Candidato,
  Certificado,
  CertificadoDados,
  Deficiencia,
  Experiencia,
  ExperienciaDados,
  Formacao,
  FormacaoDados,
  Habilidade,
  HabilidadeDados,
} from "../perfil";
import { PerfilService } from "../perfil";
import { getFriendlyErrorMessage } from "../services/api/errors";
import { useTheme } from "../theme";
import type { Theme } from "../theme";

/**
 * Perfil completo do candidato (Fase 12) — substitui o placeholder das fases
 * anteriores. Uma única tela com seções (mesmo padrão de página longa que
 * `AccessibilityScreen.tsx` já usa), não um sub-navigator com 6 telas: os 6
 * "mini-CRUDs" aqui (dados pessoais, experiências, formações, certificados,
 * habilidades, deficiências) são todos escopados ao próprio candidato
 * autenticado, sem necessidade de rota própria com parâmetro de navegação.
 *
 * Foto de perfil fica de fora desta fase — precisaria de `expo-image-picker`
 * (dependência nova, câmera/galeria), consistente com a Fase de mídia do
 * roadmap (upload de arquivo é tratado ali, não aqui). O backend também
 * expõe `fotoPerfil`/`capaPerfil` como STRING crua em `PUT /usuarios/:id`,
 * mas usar isso aqui seria inventar um jeito de trocar a foto sem upload de
 * verdade — não implementado de propósito.
 */

/**
 * "Meu perfil" — uma ÚNICA rota (`MyProfile`) para os dois tipos de conta;
 * o roteamento por `tipoUsuario` acontece aqui, não em duas telas
 * separadas (Fase 18). Antes desta fase, a tela sempre presumia candidato
 * (chamava `PerfilService.meuCandidato()` incondicionalmente) — uma conta
 * empresa caía direto no estado de erro (404, sem registro `candidatos`
 * para ela): achado real da auditoria, corrigido aqui.
 */
export function MyProfileScreen() {
  const { user } = useAuth();
  if (user?.tipoUsuario === "empresa") return <EmpresaProfileScreen />;
  return <CandidatoProfileScreen />;
}

function CandidatoProfileScreen() {
  const { theme } = useTheme();

  const [candidato, setCandidato] = useState<Candidato | null>(null);
  const [experiencias, setExperiencias] = useState<Experiencia[]>([]);
  const [formacoes, setFormacoes] = useState<Formacao[]>([]);
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [habilidades, setHabilidades] = useState<Habilidade[]>([]);
  const [catalogoDeficiencias, setCatalogoDeficiencias] = useState<Deficiencia[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  // Função inline dentro do próprio efeito (mesmo padrão de
  // `AuthProvider.tsx`/`JobsScreen.tsx`) — evita o lint
  // `react-hooks/set-state-in-effect`. As 6 buscas disparam juntas
  // (`Promise.all`): é UM perfil só, não faz sentido mostrar 6 estados de
  // erro/loading independentes para a mesma tela de "meu perfil".
  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        const [candidatoRes, experienciasRes, formacoesRes, certificadosRes, habilidadesRes, deficienciasRes] =
          await Promise.all([
            PerfilService.meuCandidato(),
            PerfilService.listarExperiencias(),
            PerfilService.listarFormacoes(),
            PerfilService.listarCertificados(),
            PerfilService.listarHabilidades(),
            PerfilService.listarDeficiencias(),
          ]);
        if (cancelado) return;
        setCandidato(candidatoRes);
        setExperiencias(experienciasRes);
        setFormacoes(formacoesRes);
        setCertificados(certificadosRes);
        setHabilidades(habilidadesRes);
        setCatalogoDeficiencias(deficienciasRes);
      } catch (erroRequisicao) {
        if (cancelado) return;
        setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar seu perfil."));
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

  if (erro && !candidato) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Card elevation="md" style={{ gap: theme.spacing.sm }}>
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[theme.typography.title, { color: theme.colors.textPrimary }]}
            >
              Não foi possível carregar seu perfil
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{erro}</Text>
            <Button onPress={tentarNovamente}>Tentar novamente</Button>
          </Card>
        </View>
      </ScreenContainer>
    );
  }

  if (!candidato) return null;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ gap: theme.spacing.xl, paddingVertical: theme.spacing.lg }}>
        <DadosPessoaisSecao candidato={candidato} theme={theme} onAtualizado={setCandidato} />

        <CurriculoSecao candidato={candidato} onAtualizado={setCandidato} />

        <SecaoExperiencias theme={theme} itens={experiencias} onAtualizarLista={setExperiencias} />
        <SecaoFormacoes theme={theme} itens={formacoes} onAtualizarLista={setFormacoes} />
        <SecaoCertificados theme={theme} itens={certificados} onAtualizarLista={setCertificados} />
        <SecaoHabilidades theme={theme} itens={habilidades} onAtualizarLista={setHabilidades} />

        <SecaoDeficiencias
          theme={theme}
          candidato={candidato}
          catalogo={catalogoDeficiencias}
          onAtualizado={setCandidato}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

function SectionHeader({ title, theme }: { title: string; theme: Theme }) {
  return (
    <Text accessibilityRole="header" style={[theme.typography.title, { color: theme.colors.textPrimary }]}>
      {title}
    </Text>
  );
}

/** Erro de uma ação (salvar/excluir), mostrado logo abaixo do controle que a disparou — mesma política de acessibilidade do resto do app (`assertive`, nunca erro técnico). */
function ErroAcao({ mensagem, theme }: { mensagem: string; theme: Theme }) {
  return (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={[theme.typography.caption, { color: theme.colors.error.solid }]}
    >
      {mensagem}
    </Text>
  );
}

/**
 * As 4 seções de CRUD (experiências/formações/certificados/habilidades) têm
 * a mesma forma de estado — "nada aberto" / "formulário de item novo" /
 * "formulário editando um item existente" — mesmo sem compartilhar
 * componente (cada seção tem campos próprios, ver comentário de
 * `SecaoExperiencias`). Só o TIPO é compartilhado.
 */
type EstadoFormulario<T> = { modo: "novo" } | { modo: "editar"; item: T } | null;

/** Confirmação nativa antes de excluir — mesmo mecanismo que `AccessibilityScreen.tsx` já usa para "Restaurar padrões" (`Alert.alert`), aqui para qualquer exclusão desta tela. */
function confirmarExclusao(titulo: string, mensagem: string, aoConfirmar: () => void) {
  Alert.alert(titulo, mensagem, [
    { text: "Cancelar", style: "cancel" },
    { text: "Excluir", style: "destructive", onPress: aoConfirmar },
  ]);
}

/**
 * Dados pessoais — spans `Usuario` (nome, telefone) e `Candidato` (todo o
 * resto). Sempre envia os DOIS PUTs ao salvar (não diferencia o que mudou):
 * o backend já trata isso como atualização idempotente de todos os campos
 * enviados, e diferenciar aqui só adicionaria complexidade sem benefício
 * real para um formulário que já parte dos valores atuais.
 */
function DadosPessoaisSecao({
  candidato,
  theme,
  onAtualizado,
}: {
  candidato: Candidato;
  theme: Theme;
  onAtualizado: (candidato: Candidato) => void;
}) {
  const usuario = candidato.usuario;
  const { refreshUser } = useAuth();
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState(usuario?.nome ?? "");
  const [telefone, setTelefone] = useState(usuario?.telefone ?? "");
  const [tituloProfissional, setTituloProfissional] = useState(candidato.tituloProfissional ?? "");
  const [biografia, setBiografia] = useState(candidato.biografia ?? "");
  const [cidade, setCidade] = useState(candidato.cidade ?? "");
  const [estado, setEstado] = useState(candidato.estado ?? "");
  const [endereco, setEndereco] = useState(candidato.endereco ?? "");
  const [cep, setCep] = useState(candidato.cep ?? "");
  const [escolaridade, setEscolaridade] = useState(candidato.escolaridade ?? "");
  const [linkedin, setLinkedin] = useState(candidato.linkedin ?? "");
  const [github, setGithub] = useState(candidato.github ?? "");
  const [disponibilidade, setDisponibilidade] = useState(candidato.disponibilidade ?? "");
  const [pretensaoSalarial, setPretensaoSalarial] = useState(
    candidato.pretensaoSalarial !== null && candidato.pretensaoSalarial !== undefined
      ? String(candidato.pretensaoSalarial)
      : "",
  );
  const [cpf, setCpf] = useState(candidato.cpf ?? "");
  const [dataNascimento, setDataNascimento] = useState(candidato.dataNascimento ?? "");
  const [genero, setGenero] = useState(candidato.genero ?? "");
  const [necessidadesAcessibilidade, setNecessidadesAcessibilidade] = useState(
    candidato.necessidadesAcessibilidade ?? "",
  );

  function cancelar() {
    setEditando(false);
    setErro(null);
    // Volta os campos para os valores atuais do candidato — descarta qualquer edição não salva.
    setNome(usuario?.nome ?? "");
    setTelefone(usuario?.telefone ?? "");
    setTituloProfissional(candidato.tituloProfissional ?? "");
    setBiografia(candidato.biografia ?? "");
    setCidade(candidato.cidade ?? "");
    setEstado(candidato.estado ?? "");
    setEndereco(candidato.endereco ?? "");
    setCep(candidato.cep ?? "");
    setEscolaridade(candidato.escolaridade ?? "");
    setLinkedin(candidato.linkedin ?? "");
    setGithub(candidato.github ?? "");
    setDisponibilidade(candidato.disponibilidade ?? "");
    setPretensaoSalarial(
      candidato.pretensaoSalarial !== null && candidato.pretensaoSalarial !== undefined
        ? String(candidato.pretensaoSalarial)
        : "",
    );
    setCpf(candidato.cpf ?? "");
    setDataNascimento(candidato.dataNascimento ?? "");
    setGenero(candidato.genero ?? "");
    setNecessidadesAcessibilidade(candidato.necessidadesAcessibilidade ?? "");
  }

  async function salvar() {
    if (salvando || !usuario) return;
    if (!nome.trim()) {
      setErro("O nome não pode ficar vazio.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const usuarioAtualizado = await PerfilService.atualizarUsuario(usuario.id, {
        nome: nome.trim(),
        telefone: telefone.trim() || null,
      });
      const candidatoAtualizado = await PerfilService.atualizarDadosPessoais(candidato.id, {
        tituloProfissional: tituloProfissional.trim() || null,
        biografia: biografia.trim() || null,
        cidade: cidade.trim() || null,
        // Confirmado ao vivo (Fase 12): diferente do cadastro de empresa,
        // `PUT /candidatos/:id` NÃO normaliza a UF — envia exatamente o que
        // vier. Sem isso, digitar "sp" gravaria minúsculo, inconsistente com
        // o resto do app (Vagas sempre mostra UF maiúscula).
        estado: estado.trim() ? estado.trim().toUpperCase() : null,
        endereco: endereco.trim() || null,
        cep: cep.trim() || null,
        escolaridade: escolaridade.trim() || null,
        linkedin: linkedin.trim() || null,
        github: github.trim() || null,
        disponibilidade: disponibilidade.trim() || null,
        pretensaoSalarial: pretensaoSalarial.trim() || null,
        cpf: cpf.trim() || null,
        dataNascimento: dataNascimento.trim() || null,
        genero: genero.trim() || null,
        necessidadesAcessibilidade: necessidadesAcessibilidade.trim() || null,
      });
      // O `usuario` embutido em `candidatoAtualizado` (resposta de `PUT
      // /candidatos/:id`) é o valor de ANTES da troca de nome/telefone —
      // as duas chamadas são independentes. Mescla o `usuario` de verdade
      // (da primeira chamada) por cima, para a tela nunca mostrar um nome
      // desatualizado depois de salvar.
      onAtualizado({ ...candidatoAtualizado, usuario: usuarioAtualizado });
      setEditando(false);
      // Achado na auditoria da Fase 15: sem isto, `HomeScreen`/`ProfileMenuScreen`
      // continuariam mostrando o nome antigo (o `AuthContext` global nunca
      // era atualizado por esta tela). Best-effort — se falhar, a PRÓPRIA
      // tela já está correta; só o resto do app ficaria desatualizado até o
      // próximo refresh natural (login seguinte).
      void refreshUser();
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível salvar seus dados agora."));
    } finally {
      setSalvando(false);
    }
  }

  if (!editando) {
    return (
      <View style={{ gap: theme.spacing.sm }}>
        <SectionHeader title="Dados pessoais" theme={theme} />
        <Card elevation="sm" style={{ gap: theme.spacing.xs }}>
          <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]}>{usuario?.nome}</Text>
          {tituloProfissional ? (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
              {tituloProfissional}
            </Text>
          ) : null}
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]}>{usuario?.email}</Text>
          {telefone ? (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]}>{telefone}</Text>
          ) : null}
          {cidade || estado ? (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]}>
              {[cidade, estado].filter(Boolean).join(" - ")}
            </Text>
          ) : null}
          {biografia ? (
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{biografia}</Text>
          ) : null}
          {necessidadesAcessibilidade ? (
            <View style={{ gap: 2 }}>
              <Text style={[theme.typography.label, { color: theme.colors.textPrimary }]}>
                Necessidades de acessibilidade
              </Text>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
                {necessidadesAcessibilidade}
              </Text>
            </View>
          ) : null}
          <Button variant="outline" size="small" onPress={() => setEditando(true)}>
            Editar dados pessoais
          </Button>
        </Card>
      </View>
    );
  }

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <SectionHeader title="Editar dados pessoais" theme={theme} />
      <Card elevation="sm" style={{ gap: theme.spacing.md }}>
        <Input label="Nome" value={nome} onChangeText={setNome} editable={!salvando} />
        <Input label="Telefone" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" editable={!salvando} />
        <Input label="Título profissional" value={tituloProfissional} onChangeText={setTituloProfissional} editable={!salvando} helperText="Ex.: Desenvolvedor(a) Front-end" />
        <Input label="Biografia" value={biografia} onChangeText={setBiografia} multiline editable={!salvando} style={{ minHeight: 80, textAlignVertical: "top" }} />
        <Input label="Cidade" value={cidade} onChangeText={setCidade} editable={!salvando} />
        <Input label="Estado" value={estado} onChangeText={setEstado} maxLength={2} autoCapitalize="characters" editable={!salvando} helperText="Sigla, ex.: SP" />
        <Input label="Endereço" value={endereco} onChangeText={setEndereco} editable={!salvando} />
        <Input label="CEP" value={cep} onChangeText={setCep} keyboardType="number-pad" maxLength={8} editable={!salvando} helperText="Somente números." />
        <Input label="Escolaridade" value={escolaridade} onChangeText={setEscolaridade} editable={!salvando} />
        <Input label="LinkedIn" value={linkedin} onChangeText={setLinkedin} autoCapitalize="none" editable={!salvando} helperText="URL completa (https://...)." />
        <Input label="GitHub" value={github} onChangeText={setGithub} autoCapitalize="none" editable={!salvando} helperText="URL completa (https://...)." />
        <Input label="Disponibilidade" value={disponibilidade} onChangeText={setDisponibilidade} editable={!salvando} helperText="Ex.: Imediata, 30 dias" />
        <Input label="Pretensão salarial" value={pretensaoSalarial} onChangeText={setPretensaoSalarial} keyboardType="decimal-pad" editable={!salvando} />
        <Input label="CPF" value={cpf} onChangeText={setCpf} keyboardType="number-pad" maxLength={11} editable={!salvando} helperText="Somente números." />
        <Input label="Data de nascimento" value={dataNascimento} onChangeText={setDataNascimento} editable={!salvando} helperText="Formato AAAA-MM-DD." />
        <Input label="Gênero" value={genero} onChangeText={setGenero} editable={!salvando} />
        <Input
          label="Necessidades de acessibilidade"
          value={necessidadesAcessibilidade}
          onChangeText={setNecessidadesAcessibilidade}
          multiline
          editable={!salvando}
          style={{ minHeight: 80, textAlignVertical: "top" }}
          helperText="Descreva em texto livre — além das deficiências marcadas na seção abaixo."
        />

        {erro ? <ErroAcao mensagem={erro} theme={theme} /> : null}

        <Button onPress={() => void salvar()} loading={salvando} disabled={salvando}>
          Salvar
        </Button>
        <Button variant="ghost" onPress={cancelar} disabled={salvando}>
          Cancelar
        </Button>
      </Card>
    </View>
  );
}

/** Sem biblioteca de data nova (mesmo padrão de `VagaDetailScreen.tsx`) — `Intl.DateTimeFormat` nativo já resolve exibição; a EDIÇÃO usa texto livre em formato AAAA-MM-DD (com `helperText`), já que não há nenhum date picker instalado no projeto. */
function formatarMesAno(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(data);
}

function SecaoExperiencias({
  theme,
  itens,
  onAtualizarLista,
}: {
  theme: Theme;
  itens: Experiencia[];
  onAtualizarLista: (itens: Experiencia[]) => void;
}) {
  const [formulario, setFormulario] = useState<EstadoFormulario<Experiencia>>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);

  async function excluir(item: Experiencia) {
    setExcluindoId(item.id);
    setErroLista(null);
    try {
      await PerfilService.removerExperiencia(item.id);
      onAtualizarLista(itens.filter((atual) => atual.id !== item.id));
    } catch (erroRequisicao) {
      setErroLista(getFriendlyErrorMessage(erroRequisicao, "Não foi possível excluir esta experiência agora."));
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <SectionHeader title="Experiência profissional" theme={theme} />

      {itens.length === 0 ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]}>
          Nenhuma experiência cadastrada ainda.
        </Text>
      ) : (
        <View style={{ gap: theme.spacing.sm }}>
          {itens.map((item) => (
            <Card key={item.id} elevation="sm" style={{ gap: theme.spacing.xs }}>
              <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]}>{item.cargo}</Text>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{item.empresa}</Text>
              <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
                {formatarMesAno(item.dataInicio)} — {item.atual ? "atual" : formatarMesAno(item.dataFim) ?? "—"}
                {item.local ? ` · ${item.local}` : ""}
                {item.modalidade ? ` · ${item.modalidade}` : ""}
              </Text>
              {item.descricao ? (
                <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{item.descricao}</Text>
              ) : null}
              <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
                <Button variant="outline" size="small" onPress={() => setFormulario({ modo: "editar", item })}>
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="small"
                  loading={excluindoId === item.id}
                  disabled={excluindoId !== null}
                  onPress={() =>
                    confirmarExclusao(
                      "Excluir experiência",
                      `Remover "${item.cargo}" do seu perfil?`,
                      () => void excluir(item),
                    )
                  }
                >
                  Excluir
                </Button>
              </View>
            </Card>
          ))}
        </View>
      )}

      {erroLista ? <ErroAcao mensagem={erroLista} theme={theme} /> : null}

      {formulario ? (
        <FormularioExperiencia
          theme={theme}
          inicial={formulario.modo === "editar" ? formulario.item : null}
          onCancelar={() => setFormulario(null)}
          onSalvo={(item) => {
            if (formulario.modo === "editar") {
              onAtualizarLista(itens.map((atual) => (atual.id === item.id ? item : atual)));
            } else {
              onAtualizarLista([...itens, item]);
            }
            setFormulario(null);
          }}
        />
      ) : (
        <Button variant="outline" onPress={() => setFormulario({ modo: "novo" })}>
          Adicionar experiência
        </Button>
      )}
    </View>
  );
}

function FormularioExperiencia({
  theme,
  inicial,
  onCancelar,
  onSalvo,
}: {
  theme: Theme;
  inicial: Experiencia | null;
  onCancelar: () => void;
  onSalvo: (item: Experiencia) => void;
}) {
  const [cargo, setCargo] = useState(inicial?.cargo ?? "");
  const [empresa, setEmpresa] = useState(inicial?.empresa ?? "");
  const [local, setLocal] = useState(inicial?.local ?? "");
  const [modalidade, setModalidade] = useState(inicial?.modalidade ?? "");
  const [dataInicio, setDataInicio] = useState(inicial?.dataInicio ?? "");
  const [dataFim, setDataFim] = useState(inicial?.dataFim ?? "");
  const [atual, setAtual] = useState(inicial?.atual ?? false);
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (salvando) return;
    if (!cargo.trim() || !empresa.trim() || !dataInicio.trim()) {
      setErro("Preencha cargo, empresa e data de início.");
      return;
    }
    setSalvando(true);
    setErro(null);
    const dados: ExperienciaDados = {
      cargo: cargo.trim(),
      empresa: empresa.trim(),
      local: local.trim() || undefined,
      modalidade: modalidade.trim() || undefined,
      dataInicio: dataInicio.trim(),
      dataFim: atual ? undefined : dataFim.trim() || undefined,
      atual,
      descricao: descricao.trim() || undefined,
    };
    try {
      const item = inicial
        ? await PerfilService.atualizarExperiencia(inicial.id, dados)
        : await PerfilService.criarExperiencia(dados);
      onSalvo(item);
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível salvar esta experiência agora."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card elevation="sm" style={{ gap: theme.spacing.md }}>
      <Input label="Cargo" value={cargo} onChangeText={setCargo} editable={!salvando} />
      <Input label="Empresa" value={empresa} onChangeText={setEmpresa} editable={!salvando} />
      <Input label="Local" value={local} onChangeText={setLocal} editable={!salvando} helperText="Opcional." />
      <Input label="Modalidade" value={modalidade} onChangeText={setModalidade} editable={!salvando} helperText="Ex.: Remoto, Híbrido, Presencial." />
      <Input label="Data de início" value={dataInicio} onChangeText={setDataInicio} editable={!salvando} helperText="Formato AAAA-MM-DD." />
      <ToggleRow label="Este é meu emprego atual" value={atual} onValueChange={setAtual} />
      {!atual ? (
        <Input label="Data de término" value={dataFim} onChangeText={setDataFim} editable={!salvando} helperText="Formato AAAA-MM-DD." />
      ) : null}
      <Input
        label="Descrição"
        value={descricao}
        onChangeText={setDescricao}
        multiline
        editable={!salvando}
        style={{ minHeight: 80, textAlignVertical: "top" }}
      />
      {erro ? <ErroAcao mensagem={erro} theme={theme} /> : null}
      <Button onPress={() => void salvar()} loading={salvando} disabled={salvando}>
        Salvar experiência
      </Button>
      <Button variant="ghost" onPress={onCancelar} disabled={salvando}>
        Cancelar
      </Button>
    </Card>
  );
}

function SecaoFormacoes({
  theme,
  itens,
  onAtualizarLista,
}: {
  theme: Theme;
  itens: Formacao[];
  onAtualizarLista: (itens: Formacao[]) => void;
}) {
  const [formulario, setFormulario] = useState<EstadoFormulario<Formacao>>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);

  async function excluir(item: Formacao) {
    setExcluindoId(item.id);
    setErroLista(null);
    try {
      await PerfilService.removerFormacao(item.id);
      onAtualizarLista(itens.filter((atual) => atual.id !== item.id));
    } catch (erroRequisicao) {
      setErroLista(getFriendlyErrorMessage(erroRequisicao, "Não foi possível excluir esta formação agora."));
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <SectionHeader title="Formação acadêmica" theme={theme} />

      {itens.length === 0 ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]}>
          Nenhuma formação cadastrada ainda.
        </Text>
      ) : (
        <View style={{ gap: theme.spacing.sm }}>
          {itens.map((item) => (
            <Card key={item.id} elevation="sm" style={{ gap: theme.spacing.xs }}>
              <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]}>{item.curso}</Text>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
                {item.instituicao}
              </Text>
              <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
                {[item.nivel, formatarMesAno(item.dataInicio), item.emAndamento ? "em andamento" : formatarMesAno(item.dataFim)]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              {item.descricao ? (
                <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{item.descricao}</Text>
              ) : null}
              <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
                <Button variant="outline" size="small" onPress={() => setFormulario({ modo: "editar", item })}>
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="small"
                  loading={excluindoId === item.id}
                  disabled={excluindoId !== null}
                  onPress={() =>
                    confirmarExclusao("Excluir formação", `Remover "${item.curso}" do seu perfil?`, () => void excluir(item))
                  }
                >
                  Excluir
                </Button>
              </View>
            </Card>
          ))}
        </View>
      )}

      {erroLista ? <ErroAcao mensagem={erroLista} theme={theme} /> : null}

      {formulario ? (
        <FormularioFormacao
          theme={theme}
          inicial={formulario.modo === "editar" ? formulario.item : null}
          onCancelar={() => setFormulario(null)}
          onSalvo={(item) => {
            if (formulario.modo === "editar") {
              onAtualizarLista(itens.map((atual) => (atual.id === item.id ? item : atual)));
            } else {
              onAtualizarLista([...itens, item]);
            }
            setFormulario(null);
          }}
        />
      ) : (
        <Button variant="outline" onPress={() => setFormulario({ modo: "novo" })}>
          Adicionar formação
        </Button>
      )}
    </View>
  );
}

function FormularioFormacao({
  theme,
  inicial,
  onCancelar,
  onSalvo,
}: {
  theme: Theme;
  inicial: Formacao | null;
  onCancelar: () => void;
  onSalvo: (item: Formacao) => void;
}) {
  const [instituicao, setInstituicao] = useState(inicial?.instituicao ?? "");
  const [curso, setCurso] = useState(inicial?.curso ?? "");
  const [nivel, setNivel] = useState(inicial?.nivel ?? "");
  const [dataInicio, setDataInicio] = useState(inicial?.dataInicio ?? "");
  const [dataFim, setDataFim] = useState(inicial?.dataFim ?? "");
  const [emAndamento, setEmAndamento] = useState(inicial?.emAndamento ?? false);
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (salvando) return;
    if (!instituicao.trim() || !curso.trim()) {
      setErro("Preencha a instituição e o curso.");
      return;
    }
    setSalvando(true);
    setErro(null);
    const dados: FormacaoDados = {
      instituicao: instituicao.trim(),
      curso: curso.trim(),
      nivel: nivel.trim() || undefined,
      dataInicio: dataInicio.trim() || undefined,
      dataFim: emAndamento ? undefined : dataFim.trim() || undefined,
      emAndamento,
      descricao: descricao.trim() || undefined,
    };
    try {
      const item = inicial
        ? await PerfilService.atualizarFormacao(inicial.id, dados)
        : await PerfilService.criarFormacao(dados);
      onSalvo(item);
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível salvar esta formação agora."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card elevation="sm" style={{ gap: theme.spacing.md }}>
      <Input label="Instituição" value={instituicao} onChangeText={setInstituicao} editable={!salvando} />
      <Input label="Curso" value={curso} onChangeText={setCurso} editable={!salvando} />
      <Input label="Nível" value={nivel} onChangeText={setNivel} editable={!salvando} helperText="Ex.: Graduação, Técnico, Pós-graduação." />
      <Input label="Data de início" value={dataInicio} onChangeText={setDataInicio} editable={!salvando} helperText="Formato AAAA-MM-DD, opcional." />
      <ToggleRow label="Em andamento" value={emAndamento} onValueChange={setEmAndamento} />
      {!emAndamento ? (
        <Input label="Data de término" value={dataFim} onChangeText={setDataFim} editable={!salvando} helperText="Formato AAAA-MM-DD." />
      ) : null}
      <Input
        label="Descrição"
        value={descricao}
        onChangeText={setDescricao}
        multiline
        editable={!salvando}
        style={{ minHeight: 80, textAlignVertical: "top" }}
      />
      {erro ? <ErroAcao mensagem={erro} theme={theme} /> : null}
      <Button onPress={() => void salvar()} loading={salvando} disabled={salvando}>
        Salvar formação
      </Button>
      <Button variant="ghost" onPress={onCancelar} disabled={salvando}>
        Cancelar
      </Button>
    </Card>
  );
}

function SecaoCertificados({
  theme,
  itens,
  onAtualizarLista,
}: {
  theme: Theme;
  itens: Certificado[];
  onAtualizarLista: (itens: Certificado[]) => void;
}) {
  const [formulario, setFormulario] = useState<EstadoFormulario<Certificado>>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);

  async function excluir(item: Certificado) {
    setExcluindoId(item.id);
    setErroLista(null);
    try {
      await PerfilService.removerCertificado(item.id);
      onAtualizarLista(itens.filter((atual) => atual.id !== item.id));
    } catch (erroRequisicao) {
      setErroLista(getFriendlyErrorMessage(erroRequisicao, "Não foi possível excluir este certificado agora."));
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <SectionHeader title="Certificados" theme={theme} />

      {itens.length === 0 ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]}>
          Nenhum certificado cadastrado ainda.
        </Text>
      ) : (
        <View style={{ gap: theme.spacing.sm }}>
          {itens.map((item) => (
            <Card key={item.id} elevation="sm" style={{ gap: theme.spacing.xs }}>
              <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]}>{item.titulo}</Text>
              {item.instituicao ? (
                <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
                  {item.instituicao}
                </Text>
              ) : null}
              {item.emitidoEm ? (
                <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
                  Emitido em {formatarMesAno(item.emitidoEm)}
                  {item.expiraEm ? ` · Expira em ${formatarMesAno(item.expiraEm)}` : ""}
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
                <Button variant="outline" size="small" onPress={() => setFormulario({ modo: "editar", item })}>
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="small"
                  loading={excluindoId === item.id}
                  disabled={excluindoId !== null}
                  onPress={() =>
                    confirmarExclusao("Excluir certificado", `Remover "${item.titulo}" do seu perfil?`, () => void excluir(item))
                  }
                >
                  Excluir
                </Button>
              </View>
            </Card>
          ))}
        </View>
      )}

      {erroLista ? <ErroAcao mensagem={erroLista} theme={theme} /> : null}

      {formulario ? (
        <FormularioCertificado
          theme={theme}
          inicial={formulario.modo === "editar" ? formulario.item : null}
          onCancelar={() => setFormulario(null)}
          onSalvo={(item) => {
            if (formulario.modo === "editar") {
              onAtualizarLista(itens.map((atual) => (atual.id === item.id ? item : atual)));
            } else {
              onAtualizarLista([...itens, item]);
            }
            setFormulario(null);
          }}
        />
      ) : (
        <Button variant="outline" onPress={() => setFormulario({ modo: "novo" })}>
          Adicionar certificado
        </Button>
      )}
    </View>
  );
}

function FormularioCertificado({
  theme,
  inicial,
  onCancelar,
  onSalvo,
}: {
  theme: Theme;
  inicial: Certificado | null;
  onCancelar: () => void;
  onSalvo: (item: Certificado) => void;
}) {
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [instituicao, setInstituicao] = useState(inicial?.instituicao ?? "");
  const [emitidoEm, setEmitidoEm] = useState(inicial?.emitidoEm ?? "");
  const [expiraEm, setExpiraEm] = useState(inicial?.expiraEm ?? "");
  const [credencialUrl, setCredencialUrl] = useState(inicial?.credencialUrl ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (salvando) return;
    if (!titulo.trim()) {
      setErro("Preencha o título do certificado.");
      return;
    }
    setSalvando(true);
    setErro(null);
    const dados: CertificadoDados = {
      titulo: titulo.trim(),
      instituicao: instituicao.trim() || undefined,
      emitidoEm: emitidoEm.trim() || undefined,
      expiraEm: expiraEm.trim() || undefined,
      credencialUrl: credencialUrl.trim() || undefined,
    };
    try {
      const item = inicial
        ? await PerfilService.atualizarCertificado(inicial.id, dados)
        : await PerfilService.criarCertificado(dados);
      onSalvo(item);
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível salvar este certificado agora."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card elevation="sm" style={{ gap: theme.spacing.md }}>
      <Input label="Título" value={titulo} onChangeText={setTitulo} editable={!salvando} />
      <Input label="Instituição" value={instituicao} onChangeText={setInstituicao} editable={!salvando} helperText="Opcional." />
      <Input label="Emitido em" value={emitidoEm} onChangeText={setEmitidoEm} editable={!salvando} helperText="Formato AAAA-MM-DD, opcional." />
      <Input label="Expira em" value={expiraEm} onChangeText={setExpiraEm} editable={!salvando} helperText="Formato AAAA-MM-DD, opcional." />
      <Input label="URL da credencial" value={credencialUrl} onChangeText={setCredencialUrl} autoCapitalize="none" editable={!salvando} helperText="Opcional — link para verificar o certificado." />
      {erro ? <ErroAcao mensagem={erro} theme={theme} /> : null}
      <Button onPress={() => void salvar()} loading={salvando} disabled={salvando}>
        Salvar certificado
      </Button>
      <Button variant="ghost" onPress={onCancelar} disabled={salvando}>
        Cancelar
      </Button>
    </Card>
  );
}

function SecaoHabilidades({
  theme,
  itens,
  onAtualizarLista,
}: {
  theme: Theme;
  itens: Habilidade[];
  onAtualizarLista: (itens: Habilidade[]) => void;
}) {
  const [formulario, setFormulario] = useState<EstadoFormulario<Habilidade>>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);

  async function excluir(item: Habilidade) {
    setExcluindoId(item.id);
    setErroLista(null);
    try {
      await PerfilService.removerHabilidade(item.id);
      onAtualizarLista(itens.filter((atual) => atual.id !== item.id));
    } catch (erroRequisicao) {
      setErroLista(getFriendlyErrorMessage(erroRequisicao, "Não foi possível excluir esta habilidade agora."));
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <SectionHeader title="Habilidades" theme={theme} />

      {itens.length === 0 ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]}>
          Nenhuma habilidade cadastrada ainda.
        </Text>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
          {itens.map((item) => (
            <View
              key={item.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.xs,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.pill,
                paddingLeft: theme.spacing.md,
                paddingRight: theme.spacing.xs,
                paddingVertical: theme.spacing.xs,
              }}
            >
              {/* Tocar no texto EDITA (nível é o único campo que faz sentido mudar); o "×" ao lado EXCLUI — duas ações, dois alvos de toque, sem ambiguidade para o TalkBack. */}
              <Pressable
                onPress={() => setFormulario({ modo: "editar", item })}
                accessibilityRole="button"
                accessibilityLabel={`Editar habilidade ${item.nome}`}
                // Rodada 2 — 6 → 8 (mesmo mínimo usado em outros textos
                // curtos e compactos do app, ex.: "Remover notificação" em
                // `NotificationsScreen.tsx`). Ainda não fecha os 48dp
                // completos (o texto sozinho tem ~20dp de altura — chegar a
                // 48dp exigiria aumentar a altura do chip inteiro, uma
                // mudança visual maior, fora do escopo deste ajuste
                // pontual); ver relatório da Rodada 2.
                hitSlop={8}
              >
                <Text style={[theme.typography.bodySmall, { color: theme.colors.textPrimary }]}>
                  {item.nome}
                  {item.nivel ? ` · ${item.nivel}` : ""}
                </Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  confirmarExclusao("Excluir habilidade", `Remover "${item.nome}" do seu perfil?`, () => void excluir(item))
                }
                disabled={excluindoId !== null}
                accessibilityRole="button"
                accessibilityLabel={`Remover habilidade ${item.nome}`}
                // Rodada 2 — a área VISÍVEL (24×24, metade do touchTarget de
                // 48) precisa continuar pequena para caber no chip, mas a
                // área de TOQUE aceita precisa bater os 48dp (mesma técnica
                // já usada em `LoginScreen.tsx`/`RegisterScreen.tsx` para
                // "Mostrar senha"): 24 + 12 de cada lado = 48. Antes era
                // hitSlop={10} (24 + 20 = 44dp, abaixo do padrão do app).
                hitSlop={12}
                style={{
                  width: theme.sizes.touchTarget / 2,
                  height: theme.sizes.touchTarget / 2,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={[theme.typography.body, { color: theme.colors.textMuted }]}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {erroLista ? <ErroAcao mensagem={erroLista} theme={theme} /> : null}

      {formulario ? (
        <FormularioHabilidade
          theme={theme}
          inicial={formulario.modo === "editar" ? formulario.item : null}
          onCancelar={() => setFormulario(null)}
          onSalvo={(item) => {
            if (formulario.modo === "editar") {
              onAtualizarLista(itens.map((atual) => (atual.id === item.id ? item : atual)));
            } else {
              onAtualizarLista([...itens, item]);
            }
            setFormulario(null);
          }}
        />
      ) : (
        <Button variant="outline" onPress={() => setFormulario({ modo: "novo" })}>
          Adicionar habilidade
        </Button>
      )}
    </View>
  );
}

function FormularioHabilidade({
  theme,
  onCancelar,
  inicial,
  onSalvo,
}: {
  theme: Theme;
  inicial: Habilidade | null;
  onCancelar: () => void;
  onSalvo: (item: Habilidade) => void;
}) {
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [nivel, setNivel] = useState(inicial?.nivel ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (salvando) return;
    if (!nome.trim()) {
      setErro("Informe o nome da habilidade.");
      return;
    }
    setSalvando(true);
    setErro(null);
    const dados: HabilidadeDados = { nome: nome.trim(), nivel: nivel.trim() || undefined };
    try {
      const item = inicial
        ? await PerfilService.atualizarHabilidade(inicial.id, dados)
        : await PerfilService.criarHabilidade(dados);
      onSalvo(item);
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível salvar esta habilidade agora."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card elevation="sm" style={{ gap: theme.spacing.md }}>
      <Input label="Habilidade" value={nome} onChangeText={setNome} editable={!salvando} helperText="Ex.: React, Libras, Gestão de projetos." />
      <Input label="Nível" value={nivel} onChangeText={setNivel} editable={!salvando} helperText="Opcional — ex.: Básico, Intermediário, Avançado." />
      {erro ? <ErroAcao mensagem={erro} theme={theme} /> : null}
      <Button onPress={() => void salvar()} loading={salvando} disabled={salvando}>
        Salvar habilidade
      </Button>
      <Button variant="ghost" onPress={onCancelar} disabled={salvando}>
        Cancelar
      </Button>
    </Card>
  );
}

/**
 * Marcar deficiências é central ao propósito do ACESSO (matching de vaga ×
 * recurso de acessibilidade) — por isso fica em destaque, não escondida
 * atrás de mais um formulário. `POST /candidatos/:id/deficiencias` já é
 * idempotente no servidor (Fase 12: confirmado por auditoria), então
 * "marcar"/"desmarcar" é só vincular/desvincular, sem estado de rascunho
 * complicado. Sem optimistic update (mesma política de curtir/favoritar já
 * usada em Feed/Vagas): o Switch só reflete o estado real depois que o
 * servidor confirmar.
 */
function SecaoDeficiencias({
  theme,
  candidato,
  catalogo,
  onAtualizado,
}: {
  theme: Theme;
  candidato: Candidato;
  catalogo: Deficiencia[];
  onAtualizado: (candidato: Candidato) => void;
}) {
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [observacoesRascunho, setObservacoesRascunho] = useState<Record<string, string>>({});

  const vinculadas = candidato.deficiencias ?? [];

  async function alternar(deficiencia: Deficiencia) {
    if (processandoId) return;
    setProcessandoId(deficiencia.id);
    setErro(null);
    const vinculada = vinculadas.find((atual) => atual.id === deficiencia.id);
    try {
      if (vinculada) {
        await PerfilService.desvincularDeficiencia(candidato.id, deficiencia.id);
        onAtualizado({ ...candidato, deficiencias: vinculadas.filter((atual) => atual.id !== deficiencia.id) });
      } else {
        await PerfilService.vincularDeficiencia(candidato.id, deficiencia.id);
        onAtualizado({
          ...candidato,
          deficiencias: [...vinculadas, { ...deficiencia, CandidatoDeficiencia: { observacoes: null } }],
        });
      }
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível atualizar suas deficiências agora."));
    } finally {
      setProcessandoId(null);
    }
  }

  async function salvarObservacao(deficienciaId: string) {
    const texto = observacoesRascunho[deficienciaId];
    if (texto === undefined || processandoId) return;
    setProcessandoId(deficienciaId);
    setErro(null);
    try {
      await PerfilService.vincularDeficiencia(candidato.id, deficienciaId, texto.trim() || undefined);
      onAtualizado({
        ...candidato,
        deficiencias: vinculadas.map((atual) =>
          atual.id === deficienciaId ? { ...atual, CandidatoDeficiencia: { observacoes: texto.trim() || null } } : atual,
        ),
      });
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível salvar a observação agora."));
    } finally {
      setProcessandoId(null);
    }
  }

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <SectionHeader title="Deficiências" theme={theme} />
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
        Marcar suas deficiências ajuda o ACESSO a te mostrar vagas com os recursos de acessibilidade certos para
        você.
      </Text>

      {catalogo.length === 0 ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]}>
          Nenhuma deficiência cadastrada no catálogo no momento.
        </Text>
      ) : (
        <View style={{ gap: theme.spacing.sm }}>
          {catalogo.map((deficiencia) => {
            const vinculada = vinculadas.find((atual) => atual.id === deficiencia.id);
            return (
              <Card key={deficiencia.id} elevation="sm" style={{ gap: theme.spacing.xs }}>
                <ToggleRow
                  label={deficiencia.nome}
                  description={deficiencia.descricao ?? undefined}
                  value={Boolean(vinculada)}
                  onValueChange={() => void alternar(deficiencia)}
                />
                {vinculada ? (
                  <View style={{ gap: theme.spacing.xs }}>
                    <Input
                      label="Observações"
                      value={observacoesRascunho[deficiencia.id] ?? vinculada.CandidatoDeficiencia?.observacoes ?? ""}
                      onChangeText={(texto) =>
                        setObservacoesRascunho((atual) => ({ ...atual, [deficiencia.id]: texto }))
                      }
                      editable={processandoId !== deficiencia.id}
                      helperText="Opcional — conte mais sobre sua necessidade específica."
                    />
                    <Button
                      variant="outline"
                      size="small"
                      onPress={() => void salvarObservacao(deficiencia.id)}
                      loading={processandoId === deficiencia.id}
                      disabled={processandoId !== null || observacoesRascunho[deficiencia.id] === undefined}
                    >
                      Salvar observação
                    </Button>
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      )}

      {erro ? <ErroAcao mensagem={erro} theme={theme} /> : null}
    </View>
  );
}
