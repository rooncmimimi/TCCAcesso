import { useState } from "react";
import { Text, View } from "react-native";

import { Botao, Cartao, CampoTexto, LinhaInterruptor, CabecalhoSecao, ErroAcao } from "../../components/ui";
import type { Formacao, FormacaoDados } from "../../perfil";
import { PerfilService } from "../../perfil";
import { extrairMensagemErro } from "../../services/api/erros";
import type { Tema } from "../../tema";
import { confirmarExclusao } from "../../utils/confirmarExclusao";
import { type EstadoFormulario } from "./types";
import { formatarMesAno } from "../../utils/formatacao";

/** Formações do candidato: lista, criação, edição e exclusão. */
export function SecaoFormacoes({
  tema,
  itens,
  onAtualizarLista,
}: {
  tema: Tema;
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
      setErroLista(extrairMensagemErro(erroRequisicao, "Não foi possível excluir esta formação agora."));
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <View style={{ gap: tema.spacing.sm }}>
      <CabecalhoSecao titulo="Formação acadêmica" icone="school-outline" />

      {itens.length === 0 ? (
        <Text style={[tema.typography.bodySmall, { color: tema.colors.textMuted }]}>
          Nenhuma formação cadastrada ainda.
        </Text>
      ) : (
        <View style={{ gap: tema.spacing.sm }}>
          {itens.map((item) => (
            <Cartao key={item.id} elevacao="sm" style={{ gap: tema.spacing.xs }}>
              <Text style={[tema.typography.title, { color: tema.colors.textPrimary }]}>{item.curso}</Text>
              <Text style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]}>
                {item.instituicao}
              </Text>
              <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>
                {[item.nivel, formatarMesAno(item.dataInicio), item.emAndamento ? "em andamento" : formatarMesAno(item.dataFim)]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              {item.descricao ? (
                <Text style={[tema.typography.body, { color: tema.colors.textSecondary }]}>{item.descricao}</Text>
              ) : null}
              <View style={{ flexDirection: "row", gap: tema.spacing.sm }}>
                <Botao variant="outline" size="small" onPress={() => setFormulario({ modo: "editar", item })}>
                  Editar
                </Botao>
                <Botao
                  variant="destructive"
                  size="small"
                  carregando={excluindoId === item.id}
                  disabled={excluindoId !== null}
                  onPress={() =>
                    confirmarExclusao("Excluir formação", `Remover "${item.curso}" do seu perfil?`, () => void excluir(item))
                  }
                >
                  Excluir
                </Botao>
              </View>
            </Cartao>
          ))}
        </View>
      )}

      {erroLista ? <ErroAcao mensagem={erroLista} /> : null}

      {formulario ? (
        <FormularioFormacao
          tema={tema}
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
        <Botao variant="outline" onPress={() => setFormulario({ modo: "novo" })}>
          Adicionar formação
        </Botao>
      )}
    </View>
  );
}

function FormularioFormacao({
  tema,
  inicial,
  onCancelar,
  onSalvo,
}: {
  tema: Tema;
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
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível salvar esta formação agora."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Cartao elevacao="sm" style={{ gap: tema.spacing.md }}>
      <CampoTexto rotulo="Instituição" value={instituicao} onChangeText={setInstituicao} editable={!salvando} />
      <CampoTexto rotulo="Curso" value={curso} onChangeText={setCurso} editable={!salvando} />
      <CampoTexto rotulo="Nível" value={nivel} onChangeText={setNivel} editable={!salvando} textoAjuda="Ex.: Graduação, Técnico, Pós-graduação." />
      <CampoTexto rotulo="Data de início" value={dataInicio} onChangeText={setDataInicio} editable={!salvando} textoAjuda="Formato AAAA-MM-DD, opcional." />
      <LinhaInterruptor rotulo="Em andamento" value={emAndamento} onValueChange={setEmAndamento} />
      {!emAndamento ? (
        <CampoTexto rotulo="Data de término" value={dataFim} onChangeText={setDataFim} editable={!salvando} textoAjuda="Formato AAAA-MM-DD." />
      ) : null}
      <CampoTexto
        rotulo="Descrição"
        value={descricao}
        onChangeText={setDescricao}
        multiline
        editable={!salvando}
        style={{ minHeight: 80, textAlignVertical: "top" }}
      />
      {erro ? <ErroAcao mensagem={erro} /> : null}
      <Botao onPress={() => void salvar()} carregando={salvando} disabled={salvando}>
        Salvar formação
      </Botao>
      <Botao variant="ghost" onPress={onCancelar} disabled={salvando}>
        Cancelar
      </Botao>
    </Cartao>
  );
}
