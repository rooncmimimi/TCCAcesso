import { router } from 'expo-router';
import { Alert, Text } from 'react-native';

import { carregarMeuPerfil } from '@/api/conteudo';
import { Botao } from '@/componentes/Botao';
import { Cartao } from '@/componentes/Cartao';
import { ConteudoPerfil } from '@/componentes/ConteudoPerfil';
import { EstadoConteudo } from '@/componentes/EstadoConteudo';
import { Tela } from '@/componentes/Tela';
import { Titulo } from '@/componentes/Titulo';
import { useSessao } from '@/sessao/ProvedorSessao';
import { texto } from '@/tema';
import { useCarregar } from '@/utilitarios/useCarregar';

/** Perfil da conta logada (FragmentoPerfil no Android), com os atalhos da conta. */
export default function Perfil() {
  const { sessao, sair } = useSessao();
  const tipo = sessao?.tipo ?? 'candidato';
  const perfil = useCarregar(() => carregarMeuPerfil(tipo, sessao?.idUsuario ?? ''), [tipo, sessao?.idUsuario]);
  const dados = perfil.dados;
  const empresa = tipo === 'empresa';

  function confirmarSaida() {
    Alert.alert('Sair da conta?', 'Você vai precisar entrar de novo.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => void sair() },
    ]);
  }

  return (
    <Tela aoAtualizar={() => void perfil.recarregar()} atualizando={perfil.atualizando}>
      <EstadoConteudo
        carregando={perfil.carregando}
        erro={perfil.erro}
        vazio={false}
        mensagemVazio=""
        aoTentarDeNovo={() => void perfil.recarregar()}
      />
      {dados ? (
        <>
          <ConteudoPerfil perfil={dados} nomePadrao={sessao?.nome ?? 'Seu perfil'} />
          <Text style={texto.secundario}>Para editar o perfil, use o site ou o app Android do ACESSO.</Text>
        </>
      ) : null}

      <Cartao>
        <Titulo nivel={2}>Sua conta</Titulo>
        {sessao?.email ? <Text style={texto.secundario}>{sessao.email}</Text> : null}
        {!empresa ? <Botao titulo="Minhas candidaturas" variante="secundario" onPress={() => router.push('/perfil/candidaturas')} /> : null}
        <Botao titulo="Acessibilidade no iPhone" variante="secundario" onPress={() => router.push('/acessibilidade')} />
        <Botao titulo="Termos e privacidade" variante="secundario" onPress={() => router.push('/termos')} />
        <Botao titulo="Sair da conta" variante="perigo" onPress={confirmarSaida} />
      </Cartao>
    </Tela>
  );
}
