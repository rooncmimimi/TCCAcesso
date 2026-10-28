import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';

import { alternarSeguir, carregarPerfilDeUsuario, carregarResumoSeguidores } from '@/api/conteudo';
import type { Perfil, ResumoSeguidores } from '@/api/leitores';
import { Aviso } from '@/componentes/Aviso';
import { Botao } from '@/componentes/Botao';
import { CartaoVaga } from '@/componentes/CartaoVaga';
import { ConteudoPerfil } from '@/componentes/ConteudoPerfil';
import { EstadoConteudo } from '@/componentes/EstadoConteudo';
import { Tela } from '@/componentes/Tela';
import { Titulo } from '@/componentes/Titulo';
import { mensagemDe } from '@/servicos/erros';
import { useSessao } from '@/sessao/ProvedorSessao';
import { texto } from '@/tema';
import { botaoSeguir, textoSeguidores } from '@/utilitarios/seguir';
import { useCarregar } from '@/utilitarios/useCarregar';

interface Dados {
  perfil: Perfil;
  /** null quando o resumo de seguidores não carregou: o perfil aparece mesmo assim, sem o botão de seguir. */
  resumo: ResumoSeguidores | null;
}

/** Perfil de outra pessoa ou empresa (abre do feed, da vaga e da pesquisa), com seguir. */
export default function PerfilDeUsuario() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessao } = useSessao();
  const carregamento = useCarregar<Dados>(async () => {
    const perfil = await carregarPerfilDeUsuario(String(id));
    const resumo = await carregarResumoSeguidores(perfil).catch(() => null);
    return { perfil, resumo };
  }, [id]);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [alternando, setAlternando] = useState(false);
  const dados = carregamento.dados;
  const meuPerfil = !!sessao && String(id).toLowerCase() === sessao.idUsuario.toLowerCase();

  async function alternar() {
    if (!dados?.resumo) return;
    const { perfil, resumo } = dados;
    setMensagem(null);
    setAlternando(true);
    try {
      const novo = await alternarSeguir(perfil, resumo);
      carregamento.atualizarLocal((atual) => ({ ...atual, resumo: novo }));
      const nome = perfil.nome ?? 'esta conta';
      AccessibilityInfo.announceForAccessibility(
        novo.seguindo ? `Você está seguindo ${nome}.` : novo.solicitacaoPendente ? `Pedido para seguir ${nome} enviado.` : `Você deixou de seguir ${nome}.`,
      );
    } catch (erro) {
      setMensagem(mensagemDe(erro));
    } finally {
      setAlternando(false);
    }
  }

  const empresa = dados?.perfil.tipo === 'empresa';
  const nome = dados?.perfil.nome ?? 'esta conta';
  const botao = dados?.resumo ? botaoSeguir(dados.resumo, nome, empresa) : null;
  return (
    <Tela aoAtualizar={() => void carregamento.recarregar()} atualizando={carregamento.atualizando}>
      <EstadoConteudo
        carregando={carregamento.carregando}
        erro={carregamento.erro}
        vazio={false}
        mensagemVazio=""
        aoTentarDeNovo={() => void carregamento.recarregar()}
      />
      {dados ? (
        <>
          <ConteudoPerfil
            perfil={dados.perfil}
            nomePadrao="Perfil"
            resumo={dados.resumo && !dados.resumo.bloqueado ? textoSeguidores(dados.resumo, empresa) : null}
          />
          <Aviso tipo="erro" mensagem={mensagem} />
          {!meuPerfil && dados.resumo?.bloqueado ? (
            <Text style={texto.secundario}>Você não pode seguir esta conta.</Text>
          ) : null}
          {!meuPerfil && botao && !dados.resumo?.bloqueado ? (
            <View style={estilos.seguir}>
              <Botao
                titulo={botao.titulo}
                rotuloAcessivel={botao.rotulo}
                dica={botao.dica}
                variante={botao.ativo ? 'primario' : 'secundario'}
                selecionado={botao.ativo}
                carregando={alternando}
                onPress={() => void alternar()}
              />
              {!empresa && dados.resumo?.perfilPrivado && !dados.resumo.seguindo ? (
                <Text style={texto.secundario}>Este perfil é privado: para seguir, é preciso enviar um pedido.</Text>
              ) : null}
            </View>
          ) : null}
          {empresa ? (
            <>
              <Titulo nivel={2}>Vagas abertas</Titulo>
              {dados.perfil.vagasAbertas.length === 0 ? (
                <Text style={texto.secundario}>Esta empresa não tem vagas abertas agora.</Text>
              ) : (
                dados.perfil.vagasAbertas.map((vaga) => (
                  <CartaoVaga key={vaga.id} vaga={vaga} aoAbrir={() => router.push({ pathname: '/vagas/[id]', params: { id: vaga.id } })} />
                ))
              )}
            </>
          ) : null}
        </>
      ) : null}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  seguir: { gap: 8 },
});
