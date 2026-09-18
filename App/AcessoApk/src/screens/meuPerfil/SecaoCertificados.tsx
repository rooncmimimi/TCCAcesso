import { useState } from "react";
import { Text, View } from "react-native";

import { Botao, Cartao, CampoTexto, CabecalhoSecao, ErroAcao } from "../../components/ui";
import type { Certificado, CertificadoDados } from "../../perfil";
import { PerfilService } from "../../perfil";
import { extrairMensagemErro } from "../../services/api/erros";
import type { Tema } from "../../tema";
import { confirmarExclusao } from "../../utils/confirmarExclusao";
import { type EstadoFormulario } from "./types";
import { formatarMesAno } from "../../utils/formatacao";

/** Certificados do candidato: lista, criação, edição e exclusão. */
export function SecaoCertificados({
  tema,
  itens,
  onAtualizarLista,
}: {
  tema: Tema;
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
      setErroLista(extrairMensagemErro(erroRequisicao, "Não foi possível excluir este certificado agora."));
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <View style={{ gap: tema.spacing.sm }}>
      <CabecalhoSecao titulo="Certificados" icone="ribbon-outline" />

      {itens.length === 0 ? (
        <Text style={[tema.typography.bodySmall, { color: tema.colors.textMuted }]}>
          Nenhum certificado cadastrado ainda.
        </Text>
      ) : (
        <View style={{ gap: tema.spacing.sm }}>
          {itens.map((item) => (
            <Cartao key={item.id} elevacao="sm" style={{ gap: tema.spacing.xs }}>
              <Text style={[tema.typography.title, { color: tema.colors.textPrimary }]}>{item.titulo}</Text>
              {item.instituicao ? (
                <Text style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]}>
                  {item.instituicao}
                </Text>
              ) : null}
              {item.emitidoEm ? (
                <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>
                  Emitido em {formatarMesAno(item.emitidoEm)}
                  {item.expiraEm ? ` · Expira em ${formatarMesAno(item.expiraEm)}` : ""}
                </Text>
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
                    confirmarExclusao("Excluir certificado", `Remover "${item.titulo}" do seu perfil?`, () => void excluir(item))
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
        <FormularioCertificado
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
          Adicionar certificado
        </Botao>
      )}
    </View>
  );
}

function FormularioCertificado({
  tema,
  inicial,
  onCancelar,
  onSalvo,
}: {
  tema: Tema;
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
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível salvar este certificado agora."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Cartao elevacao="sm" style={{ gap: tema.spacing.md }}>
      <CampoTexto rotulo="Título" value={titulo} onChangeText={setTitulo} editable={!salvando} />
      <CampoTexto rotulo="Instituição" value={instituicao} onChangeText={setInstituicao} editable={!salvando} textoAjuda="Opcional." />
      <CampoTexto rotulo="Emitido em" value={emitidoEm} onChangeText={setEmitidoEm} editable={!salvando} textoAjuda="Formato AAAA-MM-DD, opcional." />
      <CampoTexto rotulo="Expira em" value={expiraEm} onChangeText={setExpiraEm} editable={!salvando} textoAjuda="Formato AAAA-MM-DD, opcional." />
      <CampoTexto rotulo="URL da credencial" value={credencialUrl} onChangeText={setCredencialUrl} autoCapitalize="none" editable={!salvando} textoAjuda="Opcional — link para verificar o certificado." />
      {erro ? <ErroAcao mensagem={erro} /> : null}
      <Botao onPress={() => void salvar()} carregando={salvando} disabled={salvando}>
        Salvar certificado
      </Botao>
      <Botao variant="ghost" onPress={onCancelar} disabled={salvando}>
        Cancelar
      </Botao>
    </Cartao>
  );
}
