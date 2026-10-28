import { router } from 'expo-router';
import { useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text } from 'react-native';

import { buscar } from '@/api/conteudo';
import type { CategoriaBusca, ItemBusca } from '@/api/leitores';
import { Botao } from '@/componentes/Botao';
import { Campo } from '@/componentes/Campo';
import { EstadoConteudo } from '@/componentes/EstadoConteudo';
import { Opcoes } from '@/componentes/Opcoes';
import { Tela } from '@/componentes/Tela';
import { mensagemDe } from '@/servicos/erros';
import { cores, texto } from '@/tema';

const CATEGORIAS = [
  { valor: 'pessoas', texto: 'Pessoas' },
  { valor: 'empresas', texto: 'Empresas' },
  { valor: 'vagas', texto: 'Vagas' },
] as const;

interface Resultado {
  termo: string;
  categoria: CategoriaBusca;
  itens: ItemBusca[];
}

/** Pesquisar pessoas, empresas e vagas (TelaPesquisa no Android). */
export default function Pesquisa() {
  const [termo, setTermo] = useState('');
  const [categoria, setCategoria] = useState<CategoriaBusca>('pessoas');
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function pesquisar(novaCategoria: CategoriaBusca = categoria) {
    const limpo = termo.trim();
    if (!limpo) {
      setAviso('Digite o que você procura.');
      return;
    }
    setAviso(null);
    setErro(null);
    setCarregando(true);
    try {
      const itens = await buscar(limpo, novaCategoria);
      setResultado({ termo: limpo, categoria: novaCategoria, itens });
      AccessibilityInfo.announceForAccessibility(
        itens.length === 0 ? 'Nada encontrado.' : `${itens.length} ${itens.length === 1 ? 'resultado' : 'resultados'}.`,
      );
    } catch (falha) {
      setErro(mensagemDe(falha));
    } finally {
      setCarregando(false);
    }
  }

  function abrir(item: ItemBusca) {
    if (item.categoria === 'vagas') {
      router.push({ pathname: '/vagas/[id]', params: { id: item.id } });
    } else {
      router.push({ pathname: '/usuario/[id]', params: { id: item.id } });
    }
  }

  return (
    <Tela>
      <Campo
        rotulo="Nome, cargo, empresa ou vaga"
        value={termo}
        onChangeText={(valor) => {
          setTermo(valor);
          if (aviso) setAviso(null);
        }}
        erro={aviso}
        returnKeyType="search"
        autoCorrect={false}
        autoFocus
        onSubmitEditing={() => void pesquisar()}
      />
      <Opcoes
        rotulo="O que você procura"
        opcoes={CATEGORIAS}
        valor={categoria}
        aoMudar={(valor) => {
          const nova = valor ?? 'pessoas';
          setCategoria(nova);
          if (resultado) void pesquisar(nova);
        }}
      />
      <Botao titulo="Buscar" carregando={carregando} onPress={() => void pesquisar()} />

      {!resultado && !carregando && !erro ? <Text style={texto.secundario}>Digite o que procura e toque em Buscar.</Text> : null}
      <EstadoConteudo
        carregando={false}
        erro={erro}
        vazio={!!resultado && !carregando && resultado.itens.length === 0}
        mensagemVazio="Nada encontrado para essa pesquisa."
        aoTentarDeNovo={() => void pesquisar()}
      />
      {resultado && !carregando
        ? resultado.itens.map((item) => (
            <Pressable
              key={`${item.categoria}-${item.id}`}
              onPress={() => abrir(item)}
              accessibilityRole="button"
              accessibilityLabel={[item.titulo, item.subtitulo].filter(Boolean).join('. ')}
              accessibilityHint={item.categoria === 'vagas' ? 'Abre a vaga' : 'Abre o perfil'}
              style={({ pressed }) => [estilos.item, pressed && estilos.pressionado]}
            >
              <Text style={texto.subtitulo}>{item.titulo}</Text>
              {item.subtitulo ? <Text style={texto.secundario}>{item.subtitulo}</Text> : null}
            </Pressable>
          ))
        : null}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  item: { backgroundColor: cores.superficie, borderRadius: 14, borderWidth: 1, borderColor: cores.borda, padding: 16, gap: 2, minHeight: 48 },
  pressionado: { backgroundColor: cores.fundoSecundario },
});
