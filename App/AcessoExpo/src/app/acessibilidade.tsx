import { StyleSheet, Text } from 'react-native';

import { Cartao } from '@/componentes/Cartao';
import { Tela } from '@/componentes/Tela';
import { Titulo } from '@/componentes/Titulo';
import { cores, texto } from '@/tema';

/**
 * Guia dos recursos de acessibilidade do próprio iPhone (a TelaAcessibilidade do Android, com os
 * recursos do iOS). O app não refaz o que o sistema já oferece: ele funciona com esses recursos e
 * ajuda a encontrá-los. O iOS não deixa um app abrir direto o menu Acessibilidade dos Ajustes, por
 * isso cada item diz o caminho.
 */
const RECURSOS = [
  {
    nome: 'Atalho de Acessibilidade',
    descricao: 'Liga e desliga o recurso que você mais usa com três cliques no botão lateral (ou no botão de início).',
    caminho: 'Ajustes › Acessibilidade › Atalho de Acessibilidade',
  },
  {
    nome: 'VoiceOver (leitor de tela)',
    descricao: 'Lê a tela em voz alta. Toque uma vez para ouvir, toque duas vezes para ativar e deslize para o lado para ir ao próximo item.',
    caminho: 'Ajustes › Acessibilidade › VoiceOver',
  },
  {
    nome: 'Texto Maior',
    descricao: 'Aumenta as letras em todos os apps, inclusive no ACESSO. Para tamanhos ainda maiores, ative "Tamanhos Maiores de Acessibilidade".',
    caminho: 'Ajustes › Acessibilidade › Tela e Tamanho do Texto › Texto Maior',
  },
  {
    nome: 'Texto em Negrito e Aumentar Contraste',
    descricao: 'Deixa as letras mais grossas e as cores mais fortes.',
    caminho: 'Ajustes › Acessibilidade › Tela e Tamanho do Texto',
  },
  {
    nome: 'Filtros de Cor e Inversão Inteligente',
    descricao: 'Ajusta as cores para daltonismo ou inverte as cores da tela.',
    caminho: 'Ajustes › Acessibilidade › Tela e Tamanho do Texto',
  },
  {
    nome: 'Zoom',
    descricao: 'Lupa para a tela inteira ou parte dela. Toque duas vezes com três dedos para ligar.',
    caminho: 'Ajustes › Acessibilidade › Zoom',
  },
  {
    nome: 'Reduzir Movimento',
    descricao: 'Diminui animações e efeitos de movimento da tela.',
    caminho: 'Ajustes › Acessibilidade › Movimento',
  },
  {
    nome: 'Conteúdo Falado',
    descricao: 'Lê em voz alta o texto que você selecionar ("Falar Seleção") ou a tela toda ao deslizar dois dedos de cima para baixo ("Falar Tela"), sem precisar do VoiceOver.',
    caminho: 'Ajustes › Acessibilidade › Conteúdo Falado',
  },
  {
    nome: 'Controle por Voz',
    descricao: 'Controla o iPhone falando. Por exemplo: "Toque em Entrar" ou "Toque em Curtir".',
    caminho: 'Ajustes › Acessibilidade › Controle por Voz',
  },
  {
    nome: 'AssistiveTouch',
    descricao: 'Botão na tela que substitui gestos e botões físicos difíceis de usar.',
    caminho: 'Ajustes › Acessibilidade › Toque › AssistiveTouch',
  },
  {
    nome: 'Controle Assistivo e Acesso Total ao Teclado',
    descricao: 'Usa o iPhone com interruptores, com movimentos da cabeça ou com um teclado conectado.',
    caminho: 'Ajustes › Acessibilidade › Controle Assistivo  •  Ajustes › Acessibilidade › Teclados',
  },
  {
    nome: 'Legendas ao Vivo e Reconhecimento de Sons',
    descricao: 'Legendas do que toca no iPhone e avisos de sons ao redor (campainha, alarme). As Legendas ao Vivo podem não estar disponíveis em português.',
    caminho: 'Ajustes › Acessibilidade › Legendas ao Vivo  •  Ajustes › Acessibilidade › Reconhecimento de Sons',
  },
];

export default function Acessibilidade() {
  return (
    <Tela>
      <Text style={texto.corpo}>
        O iPhone já vem com leitor de tela, letras maiores, lupa, contraste e controle por voz. O ACESSO funciona com
        todos eles; veja abaixo o que cada um faz e onde ativar.
      </Text>
      {RECURSOS.map((recurso) => (
        <Cartao key={recurso.nome}>
          <Titulo nivel={2}>{recurso.nome}</Titulo>
          <Text style={texto.corpo}>{recurso.descricao}</Text>
          <Text style={estilos.caminho}>Onde ativar: {recurso.caminho}</Text>
        </Cartao>
      ))}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  caminho: { fontSize: 15, lineHeight: 21, color: cores.sobreContainerPrimaria, fontWeight: '600' },
});
