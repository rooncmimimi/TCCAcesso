import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Vaga } from '../api/leitores';
import { cores, texto } from '../tema';
import { juntar, local } from '../utilitarios/formatacao';
import { CONTRATOS, MODALIDADES, PUBLICOS, STATUS_VAGA, rotulo } from '../utilitarios/rotulos';
import { Avatar } from './Avatar';

/** Resumo de uma vaga na lista. O cartão inteiro é um botão, lido de uma vez pelo VoiceOver. */
export function CartaoVaga({ vaga, aoAbrir, mostrarStatus = false }: { vaga: Vaga; aoAbrir: () => void; mostrarStatus?: boolean }) {
  const detalhes = [
    rotulo(MODALIDADES, vaga.modalidade),
    rotulo(CONTRATOS, vaga.contrato),
    local(vaga.cidade, vaga.estado),
  ].filter(Boolean) as string[];
  const publico = rotulo(PUBLICOS, vaga.publicoAlvo);
  const status = mostrarStatus ? rotulo(STATUS_VAGA, vaga.status) : null;
  const empresa = vaga.nomeEmpresa ? `${vaga.nomeEmpresa}${vaga.empresaVerificada ? ', empresa verificada' : ''}` : null;

  return (
    <Pressable
      onPress={aoAbrir}
      accessibilityRole="button"
      accessibilityLabel={[vaga.titulo, empresa, ...detalhes, publico, vaga.salario, status ? `Situação: ${status}` : null]
        .filter(Boolean)
        .join('. ')}
      accessibilityHint="Abre os detalhes da vaga"
      style={({ pressed }) => [estilos.cartao, pressed && estilos.pressionado]}
    >
      <View style={estilos.topo}>
        {/* No painel da empresa (GET /vagas/minhas) a vaga vem sem a empresa: sem avatar. */}
        {vaga.nomeEmpresa ? <Avatar nome={vaga.nomeEmpresa} url={vaga.logoEmpresaUrl} tamanho={48} /> : null}
        <View style={estilos.flex}>
          <Text style={texto.subtitulo}>{vaga.titulo}</Text>
          {vaga.nomeEmpresa ? (
            <Text style={texto.secundario}>
              {vaga.nomeEmpresa}
              {vaga.empresaVerificada ? ' ✓ verificada' : ''}
            </Text>
          ) : null}
        </View>
      </View>
      {detalhes.length > 0 ? <Text style={texto.corpo}>{detalhes.join(' · ')}</Text> : null}
      <View style={estilos.selos}>
        {publico ? <Text style={estilos.selo}>{publico}</Text> : null}
        {vaga.salario ? <Text style={estilos.selo}>{vaga.salario}</Text> : null}
        {status ? <Text style={estilos.selo}>{juntar('Situação', status, ': ')}</Text> : null}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: 16,
    gap: 10,
  },
  pressionado: { backgroundColor: cores.fundoSecundario },
  topo: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  flex: { flex: 1, gap: 2 },
  selos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selo: {
    fontSize: 14,
    fontWeight: '600',
    color: cores.sobreContainerPrimaria,
    backgroundColor: cores.containerPrimaria,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
  },
});
