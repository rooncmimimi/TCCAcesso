import { ScrollView, Text, View } from "react-native";

import { Cartao, ContainerTela, BotaoOuvir } from "../components/ui";
import { useTema } from "../tema";
import type { Tema } from "../tema";

interface PerguntaResposta {
  pergunta: string;
  resposta: string;
}

interface SecaoAjuda {
  titulo: string;
  perguntas: PerguntaResposta[];
}

/**
 * Perguntas frequentes. Cada resposta descreve só o que existe no app, com os nomes de tela e
 * rótulos usados no menu do Perfil, em Configurações e em Acessibilidade. É conteúdo estático, sem
 * rede, então não há carregamento nem erro.
 */
const SECOES: SecaoAjuda[] = [
  {
    titulo: "Vagas",
    perguntas: [
      {
        pergunta: "Como eu me candidato a uma vaga?",
        resposta:
          'Abra a vaga na aba Vagas e toque em "Candidatar-se". Você pode acompanhar o status de cada candidatura (Pendente, Visualizada, Em análise, Aprovada, Rejeitada ou Cancelada) na tela de Atividades, no menu do Perfil.',
      },
      {
        pergunta: "Como guardo uma vaga para ver depois?",
        resposta:
          "Na tela de detalhes da vaga, toque no botão de favoritar. Todas as vagas que você favoritou aparecem na tela de Atividades.",
      },
    ],
  },
  {
    titulo: "Perfil e currículo",
    perguntas: [
      {
        pergunta: "Como edito meu currículo?",
        resposta:
          'Abra "Meu perfil", no menu do Perfil, para adicionar ou editar experiências, formação, certificados e habilidades.',
      },
      {
        pergunta: "Quem pode ver meu perfil?",
        resposta:
          'A visibilidade do seu perfil (público ou privado) e quem pode te seguir ou enviar mensagens ficam em Configurações, na seção "Privacidade".',
      },
    ],
  },
  {
    titulo: "Feed e rede de conexões",
    perguntas: [
      {
        pergunta: "Como publico algo no Feed?",
        resposta: 'Na aba Home, toque no campo de nova publicação no topo da lista para escrever e publicar.',
      },
      {
        pergunta: "Como sigo outras pessoas ou empresas?",
        resposta:
          'Use "Descobrir", no menu do Perfil, para ver sugestões de pessoas e empresas, ou toque em "Seguir" direto no perfil público de alguém. Quem você segue aparece na tela de Atividades.',
      },
      {
        pergunta: "O que aparece na tela de Atividades?",
        resposta:
          "Um resumo das suas candidaturas, vagas favoritadas, pessoas e empresas que você segue, e suas curtidas, comentários e compartilhamentos no Feed — sempre só a sua própria atividade.",
      },
    ],
  },
  {
    titulo: "Mensagens e notificações",
    perguntas: [
      {
        pergunta: "Quem pode me enviar mensagens?",
        resposta: 'Ajuste isso em Configurações, na opção "Quem pode te enviar mensagens".',
      },
      {
        pergunta: "Como desativo um tipo de notificação?",
        resposta:
          'Em Configurações você encontra alternadores separados para vagas e candidaturas, mensagens, publicações e comentários, e rede (seguidores) — cada um pode ser desligado individualmente.',
      },
    ],
  },
  {
    titulo: "Privacidade e segurança",
    perguntas: [
      {
        pergunta: "Como bloqueio ou denuncio alguém?",
        resposta:
          'No perfil da pessoa, use a opção de bloquear ou denunciar. Quem você já bloqueou fica listado em Configurações, em "Usuários bloqueados", de onde também dá para desbloquear.',
      },
      {
        pergunta: "Como ativo o bloqueio por biometria ao abrir o app?",
        resposta:
          'Em Configurações, ative "Bloqueio por biometria" (disponível se o seu aparelho tiver digital ou reconhecimento facial cadastrado). Isso tranca o conteúdo do app atrás da biometria do aparelho, além do login normal.',
      },
      {
        pergunta: "Como baixo uma cópia dos meus dados?",
        resposta:
          'Em Configurações, toque em "Exportar meus dados" para gerar e compartilhar um arquivo com os seus dados de conta e perfil.',
      },
    ],
  },
  {
    titulo: "Acessibilidade",
    perguntas: [
      {
        pergunta: "Quais preferências de acessibilidade o app tem?",
        resposta:
          "Na tela de Acessibilidade você ajusta tema, alto contraste, tamanho do texto, espaçamento entre letras e linhas, foco ampliado, redução de animações, navegação por teclado e leitor de tela.",
      },
      {
        pergunta: "Como ouço o conteúdo em voz alta?",
        resposta:
          'Ative "Leitura por voz" na tela de Acessibilidade. Com isso ativado, um botão "Ouvir em voz alta" aparece em vagas e publicações — ele lê o conteúdo inteiro de uma vez, mesmo com um leitor de tela como o TalkBack também ativado.',
      },
    ],
  },
  {
    titulo: "Conta",
    perguntas: [
      {
        pergunta: "Como altero meu e-mail ou senha?",
        resposta: "Ambos ficam em Configurações, cada um com sua própria confirmação de segurança.",
      },
      {
        pergunta: "Como pauso ou excluo minha conta?",
        resposta: '"Pausar conta" e "Excluir conta" ficam no final de Configurações, sempre pedindo sua senha para confirmar.',
      },
    ],
  },
];

const TEXTO_PARA_LEITURA = SECOES.flatMap((secao) =>
  secao.perguntas.map((item) => `${item.pergunta}. ${item.resposta}`),
).join(" ");

/** Perguntas frequentes, com o botão de ouvir em voz alta quando a leitura por voz está ligada. */
export function AjudaScreen() {
  const { tema } = useTema();

  return (
    <ContainerTela>
      <ScrollView contentContainerStyle={{ gap: tema.spacing.lg, paddingVertical: tema.spacing.lg }}>
        <View style={{ gap: tema.spacing.xs }}>
          <Text style={[tema.typography.body, { color: tema.colors.textSecondary }]}>
            Respostas para as dúvidas mais comuns sobre o ACESSO.
          </Text>
          <BotaoOuvir texto={TEXTO_PARA_LEITURA} rotulo="as perguntas frequentes" />
        </View>

        {SECOES.map((secao) => (
          <SecaoFaq key={secao.titulo} secao={secao} tema={tema} />
        ))}
      </ScrollView>
    </ContainerTela>
  );
}

function SecaoFaq({ secao, tema }: { secao: SecaoAjuda; tema: Tema }) {
  return (
    <View style={{ gap: tema.spacing.sm }}>
      <Text accessibilityRole="header" style={[tema.typography.title, { color: tema.colors.textPrimary }]}>
        {secao.titulo}
      </Text>
      <Cartao elevacao="sm" style={{ gap: tema.spacing.md }}>
        {secao.perguntas.map((item) => (
          <View key={item.pergunta} style={{ gap: tema.spacing.xs }}>
            <Text style={[tema.typography.label, { color: tema.colors.textPrimary }]}>{item.pergunta}</Text>
            <Text style={[tema.typography.body, { color: tema.colors.textSecondary }]}>{item.resposta}</Text>
          </View>
        ))}
      </Cartao>
    </View>
  );
}
