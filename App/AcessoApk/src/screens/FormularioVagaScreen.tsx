import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Botao, Cartao, EstadoErro, CampoTexto, EstadoCarregamento, ContainerTela, ControleSegmentado } from "../components/ui";
import type { PerfilStackParamList } from "../navigation/types";
import { extrairMensagemErro } from "../services/api/erros";
import { useTema } from "../tema";
import type { Tema } from "../tema";
import {
  ROTULOS_CONTRATO,
  ROTULOS_MODALIDADE,
  ROTULOS_PUBLICO_ALVO,
  ROTULOS_RECURSO_ACESSIBILIDADE,
  VagasService,
} from "../vagas";
import type { ContratoVaga, ModalidadeVaga, PublicoAlvoVaga, RecursoAcessibilidadeVaga, Vaga, VagaDados } from "../vagas";

type JobFormScreenProps = NativeStackScreenProps<PerfilStackParamList, "JobForm">;

const OPCOES_MODALIDADE = (Object.keys(ROTULOS_MODALIDADE) as ModalidadeVaga[]).map((valor) => ({
  rotulo: ROTULOS_MODALIDADE[valor],
  value: valor,
}));
const OPCOES_CONTRATO = (Object.keys(ROTULOS_CONTRATO) as ContratoVaga[]).map((valor) => ({
  rotulo: ROTULOS_CONTRATO[valor],
  value: valor,
}));
const OPCOES_PUBLICO_ALVO = (Object.keys(ROTULOS_PUBLICO_ALVO) as PublicoAlvoVaga[]).map((valor) => ({
  rotulo: ROTULOS_PUBLICO_ALVO[valor],
  value: valor,
}));
const OPCOES_RECURSOS = Object.keys(ROTULOS_RECURSO_ACESSIBILIDADE) as RecursoAcessibilidadeVaga[];

/**
 * Criar ou editar vaga na mesma tela: sem `route.params.vagaId` o formulário começa em branco; com
 * ele, os dados vêm de `VagasService.obterPorId`. Mudar o status (pausar, reabrir, encerrar) e
 * excluir ficam em `CandidaturasVagaScreen`, junto das candidaturas, por serem ações mais
 * frequentes que editar o conteúdo.
 */
export function FormularioVagaScreen({ route, navigation }: JobFormScreenProps) {
  const { tema } = useTema();
  const { vagaId } = route.params;
  const editando = Boolean(vagaId);

  const [vagaOriginal, setVagaOriginal] = useState<Vaga | null>(null);
  const [carregando, setCarregando] = useState(editando);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!vagaId) return;
    let cancelado = false;

    async function carregar() {
      try {
        const vaga = await VagasService.obterPorId(vagaId as string);
        if (cancelado) return;
        setVagaOriginal(vaga);
      } catch (erroRequisicao) {
        if (cancelado) return;
        setErroCarregamento(extrairMensagemErro(erroRequisicao, "Não foi possível carregar esta vaga."));
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }

    void carregar();
    return () => {
      cancelado = true;
    };
  }, [vagaId, tentativa]);

  function tentarNovamente() {
    setErroCarregamento(null);
    setCarregando(true);
    setTentativa((valor) => valor + 1);
  }

  if (carregando) {
    return <EstadoCarregamento />;
  }

  if (erroCarregamento && !vagaOriginal) {
    return (
      <EstadoErro titulo="Não foi possível carregar esta vaga" mensagem={erroCarregamento} onTentarNovamente={tentarNovamente} />
    );
  }

  return (
    <ContainerTela>
      <ScrollView contentContainerStyle={{ paddingVertical: tema.spacing.lg }}>
        <Formulario vagaId={vagaId} vagaOriginal={vagaOriginal} tema={tema} onSalvo={() => navigation.goBack()} />
      </ScrollView>
    </ContainerTela>
  );
}

function Formulario({
  vagaId,
  vagaOriginal,
  tema,
  onSalvo,
}: {
  vagaId: string | undefined;
  vagaOriginal: Vaga | null;
  tema: Tema;
  onSalvo: () => void;
}) {
  const [titulo, setTitulo] = useState(vagaOriginal?.titulo ?? "");
  const [descricao, setDescricao] = useState(vagaOriginal?.descricao ?? "");
  const [requisitos, setRequisitos] = useState(vagaOriginal?.requisitos ?? "");
  const [beneficios, setBeneficios] = useState(vagaOriginal?.beneficios ?? "");
  const [salario, setSalario] = useState(vagaOriginal?.salario != null ? String(vagaOriginal.salario) : "");
  const [modalidade, setModalidade] = useState<ModalidadeVaga>(vagaOriginal?.modalidade ?? "remoto");
  const [contrato, setContrato] = useState<ContratoVaga>(vagaOriginal?.contrato ?? "clt");
  const [cidade, setCidade] = useState(vagaOriginal?.cidade ?? "");
  const [estado, setEstado] = useState(vagaOriginal?.estado ?? "");
  const [cargaHoraria, setCargaHoraria] = useState(vagaOriginal?.cargaHoraria ?? "");
  const [publicoAlvo, setPublicoAlvo] = useState<PublicoAlvoVaga>(vagaOriginal?.publicoAlvo ?? "geral");
  const [recursosAcessibilidade, setRecursosAcessibilidade] = useState<RecursoAcessibilidadeVaga[]>(
    vagaOriginal?.recursosAcessibilidade ?? [],
  );
  const [acessibilidade, setAcessibilidade] = useState(vagaOriginal?.acessibilidade ?? "");
  const [dataEncerramento, setDataEncerramento] = useState(vagaOriginal?.dataEncerramento ?? "");

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function alternarRecurso(recurso: RecursoAcessibilidadeVaga) {
    setRecursosAcessibilidade((atual) =>
      atual.includes(recurso) ? atual.filter((item) => item !== recurso) : [...atual, recurso],
    );
  }

  async function salvar() {
    if (salvando) return;
    if (!titulo.trim() || titulo.trim().length < 5) {
      setErro("O título deve ter pelo menos 5 caracteres.");
      return;
    }
    if (!descricao.trim() || descricao.trim().length < 20) {
      setErro("A descrição deve ter pelo menos 20 caracteres.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const dados: VagaDados = {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        requisitos: requisitos.trim(),
        beneficios: beneficios.trim(),
        modalidade,
        contrato,
        cidade: cidade.trim(),
        estado: estado.trim() ? estado.trim().toUpperCase() : undefined,
        cargaHoraria: cargaHoraria.trim(),
        publicoAlvo,
        recursosAcessibilidade,
        acessibilidade: acessibilidade.trim(),
        ...(salario.trim() ? { salario: salario.trim() } : {}),
        ...(dataEncerramento.trim() ? { dataEncerramento: dataEncerramento.trim() } : {}),
      };

      if (vagaId) {
        await VagasService.atualizar(vagaId, dados);
      } else {
        await VagasService.criar(dados);
      }
      onSalvo();
    } catch (erroRequisicao) {
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível salvar a vaga agora."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Cartao elevacao="sm" style={{ gap: tema.spacing.md }}>
      <CampoTexto rotulo="Título" value={titulo} onChangeText={setTitulo} editable={!salvando} textoAjuda="Entre 5 e 200 caracteres." />
      <CampoTexto
        rotulo="Descrição"
        value={descricao}
        onChangeText={setDescricao}
        editable={!salvando}
        multiline
        style={{ minHeight: 120, textAlignVertical: "top" }}
        textoAjuda="No mínimo 20 caracteres."
      />
      <CampoTexto
        rotulo="Requisitos"
        value={requisitos}
        onChangeText={setRequisitos}
        editable={!salvando}
        multiline
        style={{ minHeight: 96, textAlignVertical: "top" }}
      />
      <CampoTexto
        rotulo="Benefícios"
        value={beneficios}
        onChangeText={setBeneficios}
        editable={!salvando}
        multiline
        style={{ minHeight: 96, textAlignVertical: "top" }}
      />
      <CampoTexto
        rotulo="Salário"
        value={salario}
        onChangeText={setSalario}
        editable={!salvando}
        keyboardType="decimal-pad"
        textoAjuda="Opcional. Deixe em branco para não informar."
      />

      <ControleSegmentado rotulo="Modalidade" value={modalidade} onChange={setModalidade} opcoes={OPCOES_MODALIDADE} />
      <ControleSegmentado rotulo="Contrato" value={contrato} onChange={setContrato} opcoes={OPCOES_CONTRATO} />

      <View style={{ flexDirection: "row", gap: tema.spacing.sm }}>
        <View style={{ flex: 2 }}>
          <CampoTexto rotulo="Cidade" value={cidade} onChangeText={setCidade} editable={!salvando} />
        </View>
        <View style={{ flex: 1 }}>
          <CampoTexto rotulo="UF" value={estado} onChangeText={setEstado} editable={!salvando} maxLength={2} autoCapitalize="characters" />
        </View>
      </View>
      <CampoTexto rotulo="Carga horária" value={cargaHoraria} onChangeText={setCargaHoraria} editable={!salvando} placeholder="Ex.: 40h semanais" />

      <ControleSegmentado rotulo="Público-alvo" value={publicoAlvo} onChange={setPublicoAlvo} opcoes={OPCOES_PUBLICO_ALVO} />

      <View style={{ gap: tema.spacing.xs }}>
        <Text style={[tema.typography.label, { color: tema.colors.textSecondary }]}>Recursos de acessibilidade</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: tema.spacing.xs }}>
          {OPCOES_RECURSOS.map((recurso) => {
            const selecionado = recursosAcessibilidade.includes(recurso);
            return (
              <Pressable
                key={recurso}
                onPress={() => alternarRecurso(recurso)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selecionado }}
                accessibilityLabel={ROTULOS_RECURSO_ACESSIBILIDADE[recurso]}
                android_ripple={{ color: tema.colors.divider }}
                style={{
                  minHeight: tema.sizes.touchTarget,
                  paddingHorizontal: tema.spacing.md,
                  borderRadius: tema.radius.md,
                  borderWidth: selecionado ? 2 : 1,
                  borderColor: selecionado ? tema.colors.primary.solid : tema.colors.border,
                  backgroundColor: selecionado ? tema.colors.primary.soft : tema.colors.surface,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={[
                    tema.typography.bodySmall,
                    { color: selecionado ? tema.colors.primary.onSoft : tema.colors.textPrimary, fontWeight: selecionado ? "700" : "400" },
                  ]}
                >
                  {ROTULOS_RECURSO_ACESSIBILIDADE[recurso]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <CampoTexto
        rotulo="Outras informações de acessibilidade"
        value={acessibilidade}
        onChangeText={setAcessibilidade}
        editable={!salvando}
        multiline
        style={{ minHeight: 80, textAlignVertical: "top" }}
      />
      <CampoTexto
        rotulo="Data de encerramento"
        value={dataEncerramento}
        onChangeText={setDataEncerramento}
        editable={!salvando}
        placeholder="AAAA-MM-DD"
        textoAjuda="Opcional."
      />

      {erro ? (
        <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[tema.typography.caption, { color: tema.colors.error.solid }]}>
          {erro}
        </Text>
      ) : null}

      <Botao onPress={() => void salvar()} carregando={salvando} disabled={salvando}>
        {vagaId ? "Salvar alterações" : "Publicar vaga"}
      </Botao>
    </Cartao>
  );
}
