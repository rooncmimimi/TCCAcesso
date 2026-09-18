import { useState } from "react";
import { Text, View } from "react-native";

import { Botao, Cartao, CampoTexto, LinhaInterruptor, CabecalhoSecao, ErroAcao } from "../../components/ui";
import type { Candidato, Deficiencia } from "../../perfil";
import { PerfilService } from "../../perfil";
import { extrairMensagemErro } from "../../services/api/erros";
import type { Tema } from "../../tema";

/**
 * Deficiências do candidato, em destaque porque são a base do cruzamento entre vagas e recursos de
 * acessibilidade. Marcar ou desmarcar só vincula ou desvincula (o `POST` é idempotente no backend),
 * e a chave só muda depois da resposta do servidor, sem atualização otimista.
 */
export function SecaoDeficiencias({
  tema,
  candidato,
  catalogo,
  onAtualizado,
}: {
  tema: Tema;
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
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível atualizar suas deficiências agora."));
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
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível salvar a observação agora."));
    } finally {
      setProcessandoId(null);
    }
  }

  return (
    <View style={{ gap: tema.spacing.sm }}>
      <CabecalhoSecao titulo="Deficiências" icone="accessibility-outline" />
      <Text style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]}>
        Marcar suas deficiências ajuda o ACESSO a te mostrar vagas com os recursos de acessibilidade certos para
        você.
      </Text>

      {catalogo.length === 0 ? (
        <Text style={[tema.typography.bodySmall, { color: tema.colors.textMuted }]}>
          Nenhuma deficiência cadastrada no catálogo no momento.
        </Text>
      ) : (
        <View style={{ gap: tema.spacing.sm }}>
          {catalogo.map((deficiencia) => {
            const vinculada = vinculadas.find((atual) => atual.id === deficiencia.id);
            return (
              <Cartao key={deficiencia.id} elevacao="sm" style={{ gap: tema.spacing.xs }}>
                <LinhaInterruptor
                  rotulo={deficiencia.nome}
                  descricao={deficiencia.descricao ?? undefined}
                  value={Boolean(vinculada)}
                  onValueChange={() => void alternar(deficiencia)}
                />
                {vinculada ? (
                  <View style={{ gap: tema.spacing.xs }}>
                    <CampoTexto
                      rotulo="Observações"
                      value={observacoesRascunho[deficiencia.id] ?? vinculada.CandidatoDeficiencia?.observacoes ?? ""}
                      onChangeText={(texto) =>
                        setObservacoesRascunho((atual) => ({ ...atual, [deficiencia.id]: texto }))
                      }
                      editable={processandoId !== deficiencia.id}
                      textoAjuda="Opcional — conte mais sobre sua necessidade específica."
                    />
                    <Botao
                      variant="outline"
                      size="small"
                      onPress={() => void salvarObservacao(deficiencia.id)}
                      carregando={processandoId === deficiencia.id}
                      disabled={processandoId !== null || observacoesRascunho[deficiencia.id] === undefined}
                    >
                      Salvar observação
                    </Botao>
                  </View>
                ) : null}
              </Cartao>
            );
          })}
        </View>
      )}

      {erro ? <ErroAcao mensagem={erro} /> : null}
    </View>
  );
}
