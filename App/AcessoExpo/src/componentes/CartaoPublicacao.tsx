import { Image } from 'expo-image';
import { useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';

import type { Publicacao } from '../api/leitores';
import { resolverUrl } from '../servicos/config';
import { cores, texto } from '../tema';
import { Avatar } from './Avatar';
import { Botao } from './Botao';
import { Cartao } from './Cartao';
import { Icone } from './Icone';

interface Props {
  publicacao: Publicacao;
  aoCurtir: (publicacao: Publicacao) => Promise<{ curtido: boolean; total: number }>;
}

/** Uma publicação do feed. O estado "curtido" aparece no texto e no ícone, não só na cor. */
export function CartaoPublicacao({ publicacao, aoCurtir }: Props) {
  const [curtindo, setCurtindo] = useState(false);
  const empresa = publicacao.tipoAutor === 'empresa';

  async function curtir() {
    setCurtindo(true);
    try {
      const resultado = await aoCurtir(publicacao);
      AccessibilityInfo.announceForAccessibility(resultado.curtido ? 'Publicação curtida' : 'Curtida removida');
    } catch {
      AccessibilityInfo.announceForAccessibility('Não foi possível curtir agora. Tente de novo.');
    } finally {
      setCurtindo(false);
    }
  }

  const contagem = [
    publicacao.curtidas > 0 ? `${publicacao.curtidas} ${publicacao.curtidas === 1 ? 'curtida' : 'curtidas'}` : null,
    publicacao.comentarios > 0 ? `${publicacao.comentarios} ${publicacao.comentarios === 1 ? 'comentário' : 'comentários'}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <Cartao>
      <View
        style={estilos.autor}
        accessible
        accessibilityLabel={[publicacao.nomeAutor, empresa ? 'empresa' : null, publicacao.quando, publicacao.editada ? 'editada' : null]
          .filter(Boolean)
          .join(', ')}
      >
        <Avatar nome={publicacao.nomeAutor} url={publicacao.fotoAutorUrl} />
        <View style={estilos.flex}>
          <Text style={texto.rotulo}>{publicacao.nomeAutor}</Text>
          <Text style={texto.secundario}>
            {[empresa ? 'Empresa' : null, publicacao.quando, publicacao.editada ? 'editada' : null].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>
      {publicacao.conteudo ? <Text style={texto.corpo}>{publicacao.conteudo}</Text> : null}
      {publicacao.anexos.map((anexo, indice) => {
        const url = resolverUrl(anexo.url);
        return url ? (
          <Image
            key={anexo.id ?? indice}
            source={{ uri: url }}
            style={estilos.imagem}
            contentFit="cover"
            accessible
            accessibilityRole="image"
            accessibilityLabel={anexo.descricao?.trim() ? anexo.descricao : 'Imagem sem descrição'}
          />
        ) : null;
      })}
      {contagem ? <Text style={texto.secundario}>{contagem}</Text> : null}
      <View style={estilos.acoes}>
        <Botao
          titulo={publicacao.curtidoPorMim ? 'Curtido' : 'Curtir'}
          rotuloAcessivel={publicacao.curtidoPorMim ? `Curtido. Publicação de ${publicacao.nomeAutor}` : `Curtir publicação de ${publicacao.nomeAutor}`}
          dica={publicacao.curtidoPorMim ? 'Toque duas vezes para remover a curtida' : undefined}
          variante={publicacao.curtidoPorMim ? 'primario' : 'secundario'}
          selecionado={publicacao.curtidoPorMim}
          carregando={curtindo}
          onPress={() => void curtir()}
          icone={
            <Icone
              sf={publicacao.curtidoPorMim ? 'hand.thumbsup.fill' : 'hand.thumbsup'}
              md={publicacao.curtidoPorMim ? 'thumb_up' : 'thumb_up_off_alt'}
              tamanho={18}
              cor={publicacao.curtidoPorMim ? cores.sobrePrimaria : cores.primaria}
            />
          }
        />
      </View>
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  autor: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  flex: { flex: 1 },
  imagem: { width: '100%', aspectRatio: 4 / 3, borderRadius: 10, backgroundColor: cores.fundoSecundario },
  acoes: { flexDirection: 'row', gap: 8 },
});
