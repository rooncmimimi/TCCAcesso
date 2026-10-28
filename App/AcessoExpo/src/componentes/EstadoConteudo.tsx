import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { cores, texto } from '../tema';
import { Aviso } from './Aviso';
import { Botao } from './Botao';

interface PropsEstado {
  carregando: boolean;
  erro: string | null;
  vazio: boolean;
  mensagemVazio: string;
  aoTentarDeNovo: () => void;
  textoCarregando?: string;
}

/**
 * Carregando, erro (com "Tentar de novo") ou lista vazia. Devolve null quando há conteúdo para
 * mostrar. A primeira chamada à API publicada pode demorar (o servidor gratuito "acorda"), por isso
 * o texto avisa.
 */
export function EstadoConteudo({ carregando, erro, vazio, mensagemVazio, aoTentarDeNovo, textoCarregando }: PropsEstado) {
  if (carregando) {
    return (
      <View style={estilos.centro} accessible accessibilityRole="progressbar" accessibilityLabel={textoCarregando ?? 'Carregando'}>
        <ActivityIndicator size="large" color={cores.primaria} />
        <Text style={texto.secundario}>{textoCarregando ?? 'Carregando…'}</Text>
      </View>
    );
  }
  if (erro) {
    return (
      <View style={estilos.bloco}>
        <Aviso tipo="erro" mensagem={erro} />
        <Botao titulo="Tentar de novo" variante="secundario" onPress={aoTentarDeNovo} />
      </View>
    );
  }
  if (vazio) {
    return (
      <View style={estilos.bloco}>
        <Text style={[texto.corpo, estilos.vazio]}>{mensagemVazio}</Text>
        <Botao titulo="Atualizar" variante="secundario" onPress={aoTentarDeNovo} />
      </View>
    );
  }
  return null;
}

const estilos = StyleSheet.create({
  centro: { alignItems: 'center', gap: 12, paddingVertical: 32 },
  bloco: { gap: 12 },
  vazio: { textAlign: 'center', color: cores.textoSecundario },
});
