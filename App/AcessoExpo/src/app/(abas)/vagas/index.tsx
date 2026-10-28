import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { carregarResumoEmpresa, listarVagas } from '@/api/conteudo';
import { Botao } from '@/componentes/Botao';
import { Campo } from '@/componentes/Campo';
import { Cartao } from '@/componentes/Cartao';
import { CartaoVaga } from '@/componentes/CartaoVaga';
import { EstadoConteudo } from '@/componentes/EstadoConteudo';
import { Opcoes } from '@/componentes/Opcoes';
import { Tela } from '@/componentes/Tela';
import { Titulo } from '@/componentes/Titulo';
import { useSessao } from '@/sessao/ProvedorSessao';
import { cores, texto } from '@/tema';
import { ouvir } from '@/utilitarios/eventos';
import { useCarregar } from '@/utilitarios/useCarregar';

const MODALIDADES = [
  { valor: null, texto: 'Todas' },
  { valor: 'presencial', texto: 'Presencial' },
  { valor: 'hibrido', texto: 'Híbrido' },
  { valor: 'remoto', texto: 'Remoto' },
] as const;

const PUBLICOS = [
  { valor: null, texto: 'Todos os públicos' },
  { valor: 'pcd', texto: 'Exclusiva PCD' },
  { valor: 'cinquenta_mais', texto: 'Exclusiva 50+' },
  { valor: 'pcd_cinquenta_mais', texto: 'PCD e 50+' },
] as const;

/** Aba Vagas: busca de vagas para pessoas; painel com as vagas da empresa para empresas. */
export default function AbaVagas() {
  const { sessao } = useSessao();
  return sessao?.tipo === 'empresa' ? <PainelEmpresa /> : <BuscaVagas />;
}

function BuscaVagas() {
  const [termo, setTermo] = useState('');
  const [busca, setBusca] = useState('');
  const [modalidade, setModalidade] = useState<string | null>(null);
  const [publico, setPublico] = useState<string | null>(null);
  const vagas = useCarregar(() => listarVagas({ busca, modalidade, publicoAlvo: publico }), [busca, modalidade, publico]);

  const total = vagas.dados?.length ?? 0;
  return (
    <Tela aoAtualizar={() => void vagas.recarregar()} atualizando={vagas.atualizando}>
      <View style={estilos.busca}>
        <Campo
          rotulo="Buscar vagas"
          value={termo}
          onChangeText={setTermo}
          placeholder="Cargo, área ou palavra-chave"
          returnKeyType="search"
          autoCorrect={false}
          onSubmitEditing={() => setBusca(termo.trim())}
        />
        <Botao titulo="Buscar" onPress={() => setBusca(termo.trim())} />
      </View>
      <Opcoes rotulo="Modalidade" opcoes={MODALIDADES} valor={modalidade} aoMudar={setModalidade} />
      <Opcoes rotulo="Público da vaga" opcoes={PUBLICOS} valor={publico} aoMudar={setPublico} />

      <EstadoConteudo
        carregando={vagas.carregando}
        erro={vagas.erro}
        vazio={total === 0}
        mensagemVazio="Nenhuma vaga encontrada com esses filtros."
        aoTentarDeNovo={() => void vagas.recarregar()}
        textoCarregando="Buscando vagas… A primeira vez pode levar até um minuto."
      />
      {total > 0 && !vagas.carregando ? (
        <Text style={texto.secundario} accessibilityLiveRegion="polite">
          {total === 1 ? '1 vaga encontrada' : `${total} vagas encontradas`}
        </Text>
      ) : null}
      {!vagas.carregando &&
        vagas.dados?.map((vaga) => (
          <CartaoVaga key={vaga.id} vaga={vaga} aoAbrir={() => router.push({ pathname: '/vagas/[id]', params: { id: vaga.id } })} />
        ))}
    </Tela>
  );
}

function PainelEmpresa() {
  const resumo = useCarregar(carregarResumoEmpresa);
  const dados = resumo.dados;
  const { recarregar } = resumo;
  // Depois de publicar uma vaga, o painel volta atualizado.
  useEffect(() => ouvir('vagas', () => void recarregar()), [recarregar]);
  const metricas = dados
    ? [
        { nome: 'Vagas publicadas', valor: dados.vagasPublicadas },
        { nome: 'Vagas abertas', valor: dados.vagasAbertas },
        { nome: 'Candidaturas', valor: dados.candidaturas },
        { nome: 'Seguidores', valor: dados.seguidores },
      ]
    : [];

  return (
    <Tela aoAtualizar={() => void resumo.recarregar()} atualizando={resumo.atualizando}>
      <EstadoConteudo
        carregando={resumo.carregando}
        erro={resumo.erro}
        vazio={false}
        mensagemVazio=""
        aoTentarDeNovo={() => void resumo.recarregar()}
        textoCarregando="Carregando o painel… A primeira vez pode levar até um minuto."
      />
      {dados ? (
        <>
          <View style={estilos.metricas}>
            {metricas.map((metrica) => (
              <Cartao key={metrica.nome} estilo={estilos.metrica}>
                <View accessible accessibilityLabel={`${metrica.nome}: ${metrica.valor}`}>
                  <Text style={estilos.numero}>{metrica.valor}</Text>
                  <Text style={texto.secundario}>{metrica.nome}</Text>
                </View>
              </Cartao>
            ))}
          </View>
          <Botao titulo="Publicar uma vaga" onPress={() => router.push('/vagas/nova')} />
          <Titulo nivel={2}>Suas vagas</Titulo>
          {dados.vagas.length === 0 ? (
            <Text style={texto.corpo}>Você ainda não publicou vagas.</Text>
          ) : (
            dados.vagas.map((vaga) => (
              <CartaoVaga
                key={vaga.id}
                vaga={vaga}
                mostrarStatus
                aoAbrir={() => router.push({ pathname: '/vagas/[id]', params: { id: vaga.id } })}
              />
            ))
          )}
          <Botao titulo="Atualizar painel" variante="texto" carregando={resumo.atualizando} onPress={() => void resumo.recarregar()} />
        </>
      ) : null}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  busca: { gap: 10 },
  metricas: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metrica: { flexGrow: 1, flexBasis: 140 },
  numero: { fontSize: 28, fontWeight: '800', color: cores.primaria },
});
