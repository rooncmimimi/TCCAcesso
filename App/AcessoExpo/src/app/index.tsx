import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Aviso } from '@/componentes/Aviso';
import { Botao } from '@/componentes/Botao';
import { Icone } from '@/componentes/Icone';
import { Tela } from '@/componentes/Tela';
import { useSessao } from '@/sessao/ProvedorSessao';
import { cores, texto } from '@/tema';

const RECURSOS = [
  { sf: 'speaker.wave.2.fill', md: 'record_voice_over', texto: 'Compatível com o VoiceOver, o leitor de tela do iPhone' },
  { sf: 'textformat.size', md: 'format_size', texto: 'Textos que acompanham o Texto Maior do iPhone' },
  { sf: 'circle.lefthalf.filled', md: 'contrast', texto: 'Alto contraste e botões fáceis de tocar' },
] as const;

/** Apresentação (TelaApresentacao no Android): primeira tela de quem não está logado. */
export default function Apresentacao() {
  const { aviso, limparAviso } = useSessao();

  return (
    <SafeAreaView style={estilos.area} edges={['top']}>
      <Tela>
        <View style={estilos.marca}>
          {/* Decorativo: o nome ACESSO vem logo abaixo, escrito. */}
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
            <Image source={require('@/assets/images/icon.png')} style={estilos.logo} accessible={false} />
          </View>
          <Text style={estilos.nome} accessibilityRole="header">
            ACESSO
          </Text>
          <Text style={texto.secundario}>Rede profissional inclusiva</Text>
        </View>

        <Aviso tipo="aviso" mensagem={aviso} />

        <Text style={texto.titulo}>Conectando talentos PCD a oportunidades que transformam vidas.</Text>
        <Text style={texto.corpo}>
          O ACESSO é a rede profissional feita para pessoas com deficiência, profissionais 50+ e empresas que levam a
          inclusão a sério.
        </Text>

        <View style={estilos.acoes}>
          <Botao
            titulo="Criar conta"
            onPress={() => {
              limparAviso();
              router.push('/cadastro');
            }}
          />
          <Botao
            titulo="Já tenho conta: entrar"
            variante="secundario"
            onPress={() => {
              limparAviso();
              router.push('/entrar');
            }}
          />
        </View>

        <View style={estilos.recursos}>
          <Text style={texto.subtitulo} accessibilityRole="header">
            Acessibilidade
          </Text>
          {RECURSOS.map((recurso) => (
            <View key={recurso.texto} style={estilos.recurso}>
              <Icone sf={recurso.sf} md={recurso.md} cor={cores.primaria} />
              <Text style={[texto.corpo, estilos.flex]}>{recurso.texto}</Text>
            </View>
          ))}
          <Botao
            titulo="Configurar acessibilidade no iPhone"
            variante="texto"
            onPress={() => router.push('/acessibilidade')}
          />
        </View>

        <Text style={[texto.secundario, estilos.empresa]}>
          É uma empresa? Entre com a conta da empresa. O cadastro de novas empresas ainda é feito pelo site ou pelo
          app Android do ACESSO.
        </Text>
      </Tela>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  area: { flex: 1, backgroundColor: cores.fundo },
  marca: { alignItems: 'center', gap: 6, paddingTop: 8 },
  logo: { width: 72, height: 72, borderRadius: 18 },
  nome: { fontSize: 30, fontWeight: '800', color: cores.primaria, letterSpacing: 1 },
  acoes: { gap: 12 },
  recursos: { gap: 12, backgroundColor: cores.superficie, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: cores.borda },
  recurso: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  flex: { flex: 1 },
  empresa: { textAlign: 'center' },
});
