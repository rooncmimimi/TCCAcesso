import { Text } from 'react-native';

import { Cartao } from '@/componentes/Cartao';
import { Tela } from '@/componentes/Tela';
import { Titulo } from '@/componentes/Titulo';
import { texto } from '@/tema';

/**
 * Termos e Privacidade. Mesmo conteúdo do app Android (termos_texto), com dois pontos acertados para
 * o cadastro atual: a data de nascimento, o CPF e o telefone agora são obrigatórios, e a senha é
 * guardada pela API do ACESSO (bcrypt), não mais pelo Supabase Auth. A equipe deve revisar o texto final.
 */
const SECOES = [
  {
    titulo: 'Quais dados coletamos e por quê',
    itens: [
      'Nome e e-mail: para criar sua conta e identificar você na plataforma.',
      'Telefone e CPF: exigidos no cadastro, para identificar a conta; não aparecem no seu perfil.',
      'Cidade e estado: para mostrar oportunidades perto de você.',
      'Data de nascimento: exigida no cadastro (é preciso ter 14 anos ou mais); nunca é exibida para outras pessoas.',
      'Informações de acessibilidade (opcionais): só são informadas se você quiser, e você decide se elas aparecem no seu perfil.',
    ],
  },
  {
    titulo: 'Como protegemos',
    itens: [
      'Sua senha é guardada de forma criptografada no servidor do ACESSO; nem a equipe tem acesso a ela. Cada pessoa só consegue alterar os próprios dados.',
      'No iPhone, a sessão fica no Keychain, o cofre do próprio aparelho.',
    ],
  },
  {
    titulo: 'Seus direitos (LGPD)',
    itens: ['Você pode consultar, corrigir ou excluir seus dados a qualquer momento falando com a equipe do projeto.'],
  },
  {
    titulo: 'Uso da plataforma',
    itens: ['Não publique conteúdo ofensivo, discriminatório ou dados pessoais de outras pessoas.'],
  },
];

export default function Termos() {
  return (
    <Tela>
      <Text style={texto.corpo}>
        ACESSO é um projeto de TCC que conecta profissionais e oportunidades com foco em acessibilidade e inclusão.
      </Text>
      {SECOES.map((secao) => (
        <Cartao key={secao.titulo}>
          <Titulo nivel={2}>{secao.titulo}</Titulo>
          {secao.itens.map((item) => (
            <Text key={item} style={texto.corpo}>
              • {item}
            </Text>
          ))}
        </Cartao>
      ))}
    </Tela>
  );
}
