import { useState } from "react";
import { Text, View } from "react-native";

import { Botao, Cartao, CampoTexto, LinhaInterruptor, CabecalhoSecao, ErroAcao } from "../../components/ui";
import type { Experiencia, ExperienciaDados } from "../../perfil";
import { PerfilService } from "../../perfil";
import { extrairMensagemErro } from "../../services/api/erros";
import type { Tema } from "../../tema";
import { confirmarExclusao } from "../../utils/confirmarExclusao";
import { type EstadoFormulario } from "./types";
import { formatarMesAno } from "../../utils/formatacao";

/** Experiências profissionais do candidato: lista, criação, edição e exclusão. */
export function SecaoExperiencias({
  tema,
  itens,
  onAtualizarLista,
}: {
  tema: Tema;
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
      setErroLista(extrairMensagemErro(erroRequisicao, "Não foi possível excluir esta experiência agora."));
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <View style={{ gap: tema.spacing.sm }}>
      <CabecalhoSecao titulo="Experiência profissional" icone="briefcase-outline" />

      {itens.length === 0 ? (
        <Text style={[tema.typography.bodySmall, { color: tema.colors.textMuted }]}>
          Nenhuma experiência cadastrada ainda.
        </Text>
      ) : (
        <View style={{ gap: tema.spacing.sm }}>
          {itens.map((item) => (
            <Cartao key={item.id} elevacao="sm" style={{ gap: tema.spacing.xs }}>
              <Text style={[tema.typography.title, { color: tema.colors.textPrimary }]}>{item.cargo}</Text>
              <Text style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]}>{item.empresa}</Text>
              <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>
                {formatarMesAno(item.dataInicio)} — {item.atual ? "atual" : formatarMesAno(item.dataFim) ?? "—"}
                {item.local ? ` · ${item.local}` : ""}
                {item.modalidade ? ` · ${item.modalidade}` : ""}
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
                    confirmarExclusao(
                      "Excluir experiência",
                      `Remover "${item.cargo}" do seu perfil?`,
                      () => void excluir(item),
                    )
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
        <FormularioExperiencia
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
          Adicionar experiência
        </Botao>
      )}
    </View>
  );
}

function FormularioExperiencia({
  tema,
  inicial,
  onCancelar,
  onSalvo,
}: {
  tema: Tema;
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
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível salvar esta experiência agora."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Cartao elevacao="sm" style={{ gap: tema.spacing.md }}>
      <CampoTexto rotulo="Cargo" value={cargo} onChangeText={setCargo} editable={!salvando} />
      <CampoTexto rotulo="Empresa" value={empresa} onChangeText={setEmpresa} editable={!salvando} />
      <CampoTexto rotulo="Local" value={local} onChangeText={setLocal} editable={!salvando} textoAjuda="Opcional." />
      <CampoTexto rotulo="Modalidade" value={modalidade} onChangeText={setModalidade} editable={!salvando} textoAjuda="Ex.: Remoto, Híbrido, Presencial." />
      <CampoTexto rotulo="Data de início" value={dataInicio} onChangeText={setDataInicio} editable={!salvando} textoAjuda="Formato AAAA-MM-DD." />
      <LinhaInterruptor rotulo="Este é meu emprego atual" value={atual} onValueChange={setAtual} />
      {!atual ? (
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
        Salvar experiência
      </Botao>
      <Botao variant="ghost" onPress={onCancelar} disabled={salvando}>
        Cancelar
      </Botao>
    </Cartao>
  );
}
