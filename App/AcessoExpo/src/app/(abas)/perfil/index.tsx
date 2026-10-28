import { router } from 'expo-router';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';

import { carregarMeuPerfil } from '@/api/conteudo';
import type { ItemCurriculo } from '@/api/leitores';
import { Avatar } from '@/componentes/Avatar';
import { Botao } from '@/componentes/Botao';
import { Cartao } from '@/componentes/Cartao';
import { EstadoConteudo } from '@/componentes/EstadoConteudo';
import { Tela } from '@/componentes/Tela';
import { Titulo } from '@/componentes/Titulo';
import { useSessao } from '@/sessao/ProvedorSessao';
import { cores, texto } from '@/tema';
import { PORTES, STATUS_EMPRESA, rotulo } from '@/utilitarios/rotulos';
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
          <View style={estilos.cabecalho}>
            <Avatar nome={dados.nome ?? sessao?.nome ?? null} url={dados.fotoUrl} tamanho={88} />
            <Titulo estilo={estilos.centro}>{dados.nome ?? sessao?.nome ?? 'Seu perfil'}</Titulo>
            {dados.detalhe ? <Text style={[texto.corpo, estilos.centro]}>{dados.detalhe}</Text> : null}
            {empresa ? (
              <Text style={[texto.secundario, estilos.centro]}>
                {[
                  dados.empresaVerificada ? '✓ Empresa verificada' : null,
                  dados.statusEmpresa ? `Cadastro ${rotulo(STATUS_EMPRESA, dados.statusEmpresa) ?? dados.statusEmpresa}` : null,
                  rotulo(PORTES, dados.porte),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            ) : null}
          </View>

          {dados.sobre ? (
            <Cartao>
              <Titulo nivel={2}>Sobre</Titulo>
              <Text style={texto.corpo}>{dados.sobre}</Text>
            </Cartao>
          ) : null}
          {empresa && dados.culturaInclusiva ? (
            <Cartao>
              <Titulo nivel={2}>Cultura inclusiva</Titulo>
              <Text style={texto.corpo}>{dados.culturaInclusiva}</Text>
            </Cartao>
          ) : null}
          {empresa && dados.site ? (
            <Botao
              titulo={`Site: ${dados.site}`}
              rotuloAcessivel={`Abrir o site da empresa, ${dados.site}`}
              variante="texto"
              onPress={() => void Linking.openURL(dados.site!).catch(() => undefined)}
            />
          ) : null}
          {!empresa ? (
            <>
              <Secao titulo="Experiência" itens={dados.experiencias} vazio="Nenhuma experiência cadastrada." />
              <Secao titulo="Formação" itens={dados.formacoes} vazio="Nenhuma formação cadastrada." />
              <Cartao>
                <Titulo nivel={2}>Competências</Titulo>
                <Text style={texto.corpo}>
                  {dados.habilidades.length > 0 ? dados.habilidades.join(' · ') : 'Nenhuma competência cadastrada.'}
                </Text>
              </Cartao>
            </>
          ) : null}
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

function Secao({ titulo, itens, vazio }: { titulo: string; itens: ItemCurriculo[]; vazio: string }) {
  return (
    <Cartao>
      <Titulo nivel={2}>{titulo}</Titulo>
      {itens.length === 0 ? <Text style={texto.secundario}>{vazio}</Text> : null}
      {itens.map((item, indice) => (
        <View key={indice} style={estilos.item}>
          {item.titulo ? <Text style={texto.rotulo}>{item.titulo}</Text> : null}
          {item.subtitulo ? <Text style={texto.corpo}>{item.subtitulo}</Text> : null}
          {item.periodo ? <Text style={texto.secundario}>{item.periodo}</Text> : null}
          {item.descricao ? <Text style={texto.corpo}>{item.descricao}</Text> : null}
        </View>
      ))}
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  cabecalho: { alignItems: 'center', gap: 8 },
  centro: { textAlign: 'center' },
  item: { gap: 2, paddingVertical: 6, borderTopWidth: 1, borderTopColor: cores.fundoSecundario },
});
