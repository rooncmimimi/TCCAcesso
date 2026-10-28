import { useState } from 'react';
import { Alert, Linking, Text } from 'react-native';

import { Aviso } from '@/componentes/Aviso';
import { Botao } from '@/componentes/Botao';
import { Tela } from '@/componentes/Tela';
import { Titulo } from '@/componentes/Titulo';
import { mensagemDe } from '@/servicos/erros';
import { useSessao } from '@/sessao/ProvedorSessao';
import { texto } from '@/tema';

const EMAIL_EQUIPE = 'projetoacessoinclusivo@gmail.com';

const SITUACOES = {
  suspensa: {
    titulo: 'Conta empresarial suspensa',
    texto: 'Sua empresa foi suspensa pela moderação do ACESSO. Enquanto a suspensão estiver ativa, o acesso à plataforma permanece bloqueado.',
  },
  reprovada: {
    titulo: 'Seu cadastro empresarial não foi aprovado',
    texto: 'A equipe do ACESSO analisou seu cadastro e ele não foi aprovado. Os recursos empresariais ficam indisponíveis enquanto esse status não mudar.',
  },
  pendente: {
    titulo: 'Sua empresa está em análise',
    texto: 'Seu cadastro foi recebido e está aguardando a aprovação de um administrador do ACESSO. Enquanto isso, publicar vagas, editar o perfil da empresa e ver candidaturas ficam indisponíveis.',
  },
} as const;

/**
 * Empresa logada ainda não aprovada (TelaStatusEmpresa no Android). A liberação de verdade é da API:
 * o app só esconde o que a empresa ainda não pode usar.
 */
export default function StatusEmpresa() {
  const { sessao, sair, atualizarStatusEmpresa } = useSessao();
  const [verificando, setVerificando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const situacao = SITUACOES[sessao?.statusEmpresa as keyof typeof SITUACOES] ?? SITUACOES.pendente;

  async function verificar() {
    setVerificando(true);
    setMensagem(null);
    try {
      await atualizarStatusEmpresa();
      // Se foi aprovada, a navegação troca sozinha para as abas; senão, avisa que nada mudou.
      setMensagem('A situação continua a mesma. Tente de novo mais tarde.');
    } catch (erro) {
      setMensagem(mensagemDe(erro));
    } finally {
      setVerificando(false);
    }
  }

  return (
    <Tela>
      <Titulo>{situacao.titulo}</Titulo>
      <Text style={texto.corpo}>{situacao.texto}</Text>
      <Aviso tipo="info" mensagem={mensagem} />
      <Botao titulo="Verificar de novo" carregando={verificando} onPress={() => void verificar()} />
      <Botao
        titulo="Falar com a equipe"
        variante="secundario"
        dica="Abre o app de e-mail"
        onPress={() => void Linking.openURL(`mailto:${EMAIL_EQUIPE}`).catch(() => setMensagem(`Escreva para ${EMAIL_EQUIPE}.`))}
      />
      <Botao
        titulo="Sair da conta"
        variante="perigo"
        onPress={() =>
          Alert.alert('Sair da conta?', 'Você vai precisar entrar de novo.', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Sair', style: 'destructive', onPress: () => void sair() },
          ])
        }
      />
    </Tela>
  );
}
