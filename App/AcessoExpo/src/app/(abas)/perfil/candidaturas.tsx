import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { listarCandidaturas } from '@/api/conteudo';
import { EstadoConteudo } from '@/componentes/EstadoConteudo';
import { Tela } from '@/componentes/Tela';
import { cores, texto } from '@/tema';
import { STATUS_CANDIDATURA, rotulo } from '@/utilitarios/rotulos';
import { useCarregar } from '@/utilitarios/useCarregar';

/** Minhas candidaturas (TelaCandidaturas no Android). */
export default function Candidaturas() {
  const lista = useCarregar(listarCandidaturas);
  return (
    <Tela aoAtualizar={() => void lista.recarregar()} atualizando={lista.atualizando}>
      <EstadoConteudo
        carregando={lista.carregando}
        erro={lista.erro}
        vazio={lista.dados?.length === 0}
        mensagemVazio="Você ainda não se candidatou a nenhuma vaga."
        aoTentarDeNovo={() => void lista.recarregar()}
      />
      {lista.dados?.map((item) => {
        const situacao = rotulo(STATUS_CANDIDATURA, item.status) ?? 'enviada';
        return (
          <Pressable
            key={item.id}
            disabled={!item.vagaId}
            onPress={() => item.vagaId && router.push({ pathname: '/vagas/[id]', params: { id: item.vagaId } })}
            accessibilityRole="button"
            accessibilityLabel={[item.tituloVaga ?? 'Vaga', item.nomeEmpresa, `Situação: ${situacao}`, `Enviada ${item.quando}`]
              .filter(Boolean)
              .join('. ')}
            accessibilityHint="Abre a vaga"
            style={({ pressed }) => [estilos.item, pressed && estilos.pressionado]}
          >
            <Text style={texto.subtitulo}>{item.tituloVaga ?? 'Vaga'}</Text>
            {item.nomeEmpresa ? <Text style={texto.corpo}>{item.nomeEmpresa}</Text> : null}
            <Text style={estilos.situacao}>Situação: {situacao}</Text>
            <Text style={texto.secundario}>Enviada {item.quando}</Text>
          </Pressable>
        );
      })}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  item: { backgroundColor: cores.superficie, borderRadius: 14, borderWidth: 1, borderColor: cores.borda, padding: 16, gap: 4 },
  pressionado: { opacity: 0.8 },
  situacao: { fontSize: 16, fontWeight: '700', color: cores.sobreContainerPrimaria },
});
