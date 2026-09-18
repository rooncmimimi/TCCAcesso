import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Botao, Cartao, CampoTexto, CabecalhoSecao, ErroAcao } from "../../components/ui";
import type { Habilidade, HabilidadeDados } from "../../perfil";
import { PerfilService } from "../../perfil";
import { extrairMensagemErro } from "../../services/api/erros";
import type { Tema } from "../../tema";
import { confirmarExclusao } from "../../utils/confirmarExclusao";
import { type EstadoFormulario } from "./types";

/** Habilidades do candidato em chips: tocar no texto edita o nível, e o "×" exclui. */
export function SecaoHabilidades({
  tema,
  itens,
  onAtualizarLista,
}: {
  tema: Tema;
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
      setErroLista(extrairMensagemErro(erroRequisicao, "Não foi possível excluir esta habilidade agora."));
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <View style={{ gap: tema.spacing.sm }}>
      <CabecalhoSecao titulo="Habilidades" icone="star-outline" />

      {itens.length === 0 ? (
        <Text style={[tema.typography.bodySmall, { color: tema.colors.textMuted }]}>
          Nenhuma habilidade cadastrada ainda.
        </Text>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: tema.spacing.sm }}>
          {itens.map((item) => (
            <View
              key={item.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: tema.spacing.xs,
                borderWidth: 1,
                borderColor: tema.colors.border,
                borderRadius: tema.radius.pill,
                paddingLeft: tema.spacing.md,
                paddingRight: tema.spacing.xs,
                paddingVertical: tema.spacing.xs,
              }}
            >
              {/* Tocar no texto edita (nível é o único campo que faz sentido mudar); o "×" ao lado exclui: duas ações, dois alvos de toque, sem ambiguidade para o TalkBack. */}
              <Pressable
                onPress={() => setFormulario({ modo: "editar", item })}
                accessibilityRole="button"
                accessibilityLabel={`Editar habilidade ${item.nome}`}
                // Área de toque ampliada em 8 de cada lado. Com o texto de uns 20dp de altura,
                // ainda fica abaixo dos 48dp; chegar lá exigiria aumentar o chip inteiro.
                hitSlop={8}
              >
                <Text style={[tema.typography.bodySmall, { color: tema.colors.textPrimary }]}>
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
                // A área visível (24×24) cabe no chip, e o `hitSlop` de 12 de cada lado leva o
                // toque a 48dp.
                hitSlop={12}
                style={{
                  width: tema.sizes.touchTarget / 2,
                  height: tema.sizes.touchTarget / 2,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={[tema.typography.body, { color: tema.colors.textMuted }]}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {erroLista ? <ErroAcao mensagem={erroLista} /> : null}

      {formulario ? (
        <FormularioHabilidade
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
          Adicionar habilidade
        </Botao>
      )}
    </View>
  );
}

function FormularioHabilidade({
  tema,
  onCancelar,
  inicial,
  onSalvo,
}: {
  tema: Tema;
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
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível salvar esta habilidade agora."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Cartao elevacao="sm" style={{ gap: tema.spacing.md }}>
      <CampoTexto rotulo="Habilidade" value={nome} onChangeText={setNome} editable={!salvando} textoAjuda="Ex.: React, Libras, Gestão de projetos." />
      <CampoTexto rotulo="Nível" value={nivel} onChangeText={setNivel} editable={!salvando} textoAjuda="Opcional — ex.: Básico, Intermediário, Avançado." />
      {erro ? <ErroAcao mensagem={erro} /> : null}
      <Botao onPress={() => void salvar()} carregando={salvando} disabled={salvando}>
        Salvar habilidade
      </Botao>
      <Botao variant="ghost" onPress={onCancelar} disabled={salvando}>
        Cancelar
      </Botao>
    </Cartao>
  );
}
