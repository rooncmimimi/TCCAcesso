import { router } from 'expo-router';
import { useEffect } from 'react';
import { Text } from 'react-native';

import { curtir, listarPublicacoes } from '@/api/conteudo';
import type { Publicacao } from '@/api/leitores';
import { Botao } from '@/componentes/Botao';
import { CartaoPublicacao } from '@/componentes/CartaoPublicacao';
import { EstadoConteudo } from '@/componentes/EstadoConteudo';
import { Icone } from '@/componentes/Icone';
import { Tela } from '@/componentes/Tela';
import { useSessao } from '@/sessao/ProvedorSessao';
import { cores, texto } from '@/tema';
import { ouvir } from '@/utilitarios/eventos';
import { primeiroNome } from '@/utilitarios/rotulos';
import { useCarregar } from '@/utilitarios/useCarregar';

/** Feed (FragmentoInicio no Android): publicações da rede, com curtir e publicar. */
export default function Inicio() {
  const { sessao } = useSessao();
  const feed = useCarregar(listarPublicacoes);
  const { recarregar, atualizarLocal } = feed;

  // Depois de publicar, a lista volta atualizada.
  useEffect(() => ouvir('publicacoes', () => void recarregar()), [recarregar]);

  async function alternarCurtida(publicacao: Publicacao) {
    const resultado = await curtir(publicacao.id);
    atualizarLocal((lista) =>
      lista.map((item) => (item.id === publicacao.id ? { ...item, curtidoPorMim: resultado.curtido, curtidas: resultado.total } : item)),
    );
    return resultado;
  }

  const nome = primeiroNome(sessao?.nome);
  return (
    <Tela aoAtualizar={() => void recarregar()} atualizando={feed.atualizando}>
      <Text style={texto.subtitulo}>{nome ? `Olá, ${nome}!` : 'Olá!'}</Text>
      <Botao
        titulo="Escrever uma publicação"
        variante="secundario"
        onPress={() => router.push('/inicio/publicar')}
        icone={<Icone sf="square.and.pencil" md="edit_note" cor={cores.primaria} tamanho={20} />}
      />
      <EstadoConteudo
        carregando={feed.carregando}
        erro={feed.erro}
        vazio={feed.dados?.length === 0}
        mensagemVazio="Ainda não há publicações. Que tal escrever a primeira?"
        aoTentarDeNovo={() => void recarregar()}
        textoCarregando="Carregando publicações… A primeira vez pode levar até um minuto."
      />
      {feed.dados?.map((publicacao) => (
        <CartaoPublicacao key={publicacao.id} publicacao={publicacao} aoCurtir={alternarCurtida} />
      ))}
      {feed.dados && feed.dados.length > 0 ? (
        <Botao titulo="Atualizar publicações" variante="texto" carregando={feed.atualizando} onPress={() => void recarregar()} />
      ) : null}
    </Tela>
  );
}
