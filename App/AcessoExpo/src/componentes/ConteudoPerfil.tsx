import { Linking, StyleSheet, Text, View } from 'react-native';

import type { ItemCurriculo, Perfil } from '../api/leitores';
import { cores, texto } from '../tema';
import { PORTES, STATUS_EMPRESA, rotulo } from '../utilitarios/rotulos';
import { Avatar } from './Avatar';
import { Botao } from './Botao';
import { Cartao } from './Cartao';
import { Titulo } from './Titulo';

/**
 * Cabeçalho, sobre, currículo (pessoa) ou dados da empresa. É o mesmo do meu perfil e do perfil de
 * outra conta; o que muda em volta (seguir, vagas, sair) fica na tela. CPF, CNPJ, endereço e
 * necessidades de acessibilidade nem chegam aqui (leitores.perfil os ignora).
 */
export function ConteudoPerfil({ perfil, nomePadrao, resumo }: { perfil: Perfil; nomePadrao: string; resumo?: string | null }) {
  const empresa = perfil.tipo === 'empresa';
  const nome = perfil.nome ?? nomePadrao;
  return (
    <>
      <View style={estilos.cabecalho}>
        <Avatar nome={nome} url={perfil.fotoUrl} tamanho={88} />
        <Titulo estilo={estilos.centro}>{nome}</Titulo>
        {perfil.detalhe ? <Text style={[texto.corpo, estilos.centro]}>{perfil.detalhe}</Text> : null}
        {empresa ? (
          <Text style={[texto.secundario, estilos.centro]}>
            {[
              perfil.empresaVerificada ? '✓ Empresa verificada' : null,
              perfil.statusEmpresa ? `Cadastro ${rotulo(STATUS_EMPRESA, perfil.statusEmpresa) ?? perfil.statusEmpresa}` : null,
              rotulo(PORTES, perfil.porte),
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        ) : null}
        {resumo ? <Text style={[texto.secundario, estilos.centro]}>{resumo}</Text> : null}
      </View>

      {perfil.sobre ? (
        <Cartao>
          <Titulo nivel={2}>Sobre</Titulo>
          <Text style={texto.corpo}>{perfil.sobre}</Text>
        </Cartao>
      ) : null}
      {empresa && perfil.culturaInclusiva ? (
        <Cartao>
          <Titulo nivel={2}>Cultura inclusiva</Titulo>
          <Text style={texto.corpo}>{perfil.culturaInclusiva}</Text>
        </Cartao>
      ) : null}
      {empresa && perfil.site ? (
        <Botao
          titulo={`Site: ${perfil.site}`}
          rotuloAcessivel={`Abrir o site da empresa, ${perfil.site}`}
          variante="texto"
          onPress={() => void Linking.openURL(perfil.site!).catch(() => undefined)}
        />
      ) : null}
      {!empresa ? (
        <>
          <Secao titulo="Experiência" itens={perfil.experiencias} vazio="Nenhuma experiência cadastrada." />
          <Secao titulo="Formação" itens={perfil.formacoes} vazio="Nenhuma formação cadastrada." />
          <Cartao>
            <Titulo nivel={2}>Competências</Titulo>
            <Text style={texto.corpo}>
              {perfil.habilidades.length > 0 ? perfil.habilidades.join(' · ') : 'Nenhuma competência cadastrada.'}
            </Text>
          </Cartao>
        </>
      ) : null}
    </>
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
