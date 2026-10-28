import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { candidatar, obterVaga } from '@/api/conteudo';
import { Aviso } from '@/componentes/Aviso';
import { Botao } from '@/componentes/Botao';
import { Campo } from '@/componentes/Campo';
import { Cartao } from '@/componentes/Cartao';
import { EstadoConteudo } from '@/componentes/EstadoConteudo';
import { Tela } from '@/componentes/Tela';
import { Titulo } from '@/componentes/Titulo';
import { mensagemDe } from '@/servicos/erros';
import { useSessao } from '@/sessao/ProvedorSessao';
import { cores, texto } from '@/tema';
import { local } from '@/utilitarios/formatacao';
import { CONTRATOS, MODALIDADES, PUBLICOS, RECURSOS, STATUS_VAGA, rotulo } from '@/utilitarios/rotulos';
import { useCarregar } from '@/utilitarios/useCarregar';

/** Detalhes da vaga e candidatura em uma confirmação (TelaVaga no Android). */
export default function DetalheVaga() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessao } = useSessao();
  const vaga = useCarregar(() => obterVaga(String(id)), [id]);
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const dados = vaga.dados;
  const pessoa = sessao?.tipo === 'candidato';

  function confirmarCandidatura() {
    if (!dados) return;
    Alert.alert('Enviar candidatura?', `Você vai se candidatar à vaga "${dados.titulo}". A empresa verá seu perfil.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Enviar', onPress: () => void enviarCandidatura() },
    ]);
  }

  async function enviarCandidatura() {
    if (!dados) return;
    setEnviando(true);
    setResultado(null);
    try {
      await candidatar(dados.id, mensagem);
      setResultado({ tipo: 'sucesso', texto: 'Candidatura enviada! Acompanhe em Perfil › Minhas candidaturas.' });
    } catch (erro) {
      setResultado({ tipo: 'erro', texto: mensagemDe(erro) });
    } finally {
      setEnviando(false);
    }
  }

  const informacoes = dados
    ? [
        ['Modalidade', rotulo(MODALIDADES, dados.modalidade)],
        ['Contrato', rotulo(CONTRATOS, dados.contrato)],
        ['Local', local(dados.cidade, dados.estado)],
        ['Público', rotulo(PUBLICOS, dados.publicoAlvo)],
        ['Salário', dados.salario],
        ['Carga horária', dados.cargaHoraria],
        ['Situação', rotulo(STATUS_VAGA, dados.status)],
        ['Publicada', dados.quando],
      ].filter((linha): linha is [string, string] => !!linha[1])
    : [];

  return (
    <>
      {/* O título da vaga já aparece como cabeçalho na tela; a barra só diz onde a pessoa está. */}
      <Stack.Screen options={{ title: 'Detalhes da vaga', headerLargeTitle: false }} />
      <Tela aoAtualizar={() => void vaga.recarregar()} atualizando={vaga.atualizando}>
        <EstadoConteudo
          carregando={vaga.carregando}
          erro={vaga.erro}
          vazio={false}
          mensagemVazio=""
          aoTentarDeNovo={() => void vaga.recarregar()}
        />
        {dados ? (
          <>
            <Titulo>{dados.titulo}</Titulo>
            {dados.nomeEmpresa ? (
              <Text style={texto.corpo}>
                {dados.nomeEmpresa}
                {dados.empresaVerificada ? ' ✓ empresa verificada' : ''}
              </Text>
            ) : null}

            <Cartao>
              {informacoes.map(([nome, valor]) => (
                <View key={nome} style={estilos.linha} accessible accessibilityLabel={`${nome}: ${valor}`}>
                  <Text style={[texto.rotulo, estilos.nome]}>{nome}</Text>
                  <Text style={[texto.corpo, estilos.valor]}>{valor}</Text>
                </View>
              ))}
            </Cartao>

            {dados.recursosAcessibilidade.length > 0 ? (
              <Cartao>
                <Titulo nivel={2}>Recursos de acessibilidade</Titulo>
                {dados.recursosAcessibilidade.map((recurso) => (
                  <Text key={recurso} style={texto.corpo}>
                    • {rotulo(RECURSOS, recurso) ?? recurso}
                  </Text>
                ))}
              </Cartao>
            ) : null}

            {[
              ['Descrição', dados.descricao],
              ['Requisitos', dados.requisitos],
              ['Benefícios', dados.beneficios],
            ].map(([titulo, conteudo]) =>
              conteudo ? (
                <Cartao key={titulo}>
                  <Titulo nivel={2}>{titulo!}</Titulo>
                  <Text style={texto.corpo}>{conteudo}</Text>
                </Cartao>
              ) : null,
            )}

            {pessoa && dados.status !== 'encerrada' && dados.status !== 'pausada' ? (
              <Cartao>
                <Titulo nivel={2}>Candidatar-se</Titulo>
                {resultado?.tipo === 'sucesso' ? (
                  <Aviso tipo="sucesso" mensagem={resultado.texto} />
                ) : (
                  <>
                    <Campo
                      rotulo="Mensagem para a empresa (opcional)"
                      value={mensagem}
                      onChangeText={setMensagem}
                      multiline
                      maxLength={2000}
                      ajuda="Conte por que você tem interesse ou se precisa de alguma adaptação."
                    />
                    <Aviso tipo="erro" mensagem={resultado?.tipo === 'erro' ? resultado.texto : null} />
                    <Botao titulo="Candidatar-se" carregando={enviando} onPress={confirmarCandidatura} />
                  </>
                )}
              </Cartao>
            ) : null}
          </>
        ) : null}
      </Tela>
    </>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: cores.fundoSecundario },
  nome: { minWidth: 120 },
  valor: { flex: 1, minWidth: 140 },
});
