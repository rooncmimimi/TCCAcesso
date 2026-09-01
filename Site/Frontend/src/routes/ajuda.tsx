import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import {
  Accessibility,
  Bell,
  Briefcase,
  Building2,
  ChevronDown,
  FileText,
  Lock,
  Mail,
  MessageSquare,
  Search,
  User,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

import { AppShell } from "@/layouts/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AssistenteAcesso } from "@/components/ajuda/AssistenteAcesso";
import { useSession } from "@/contexts/SessionContext";

export const Route = createFileRoute("/ajuda")({
  validateSearch: z.object({ central: z.enum(["candidato", "empresa"]).optional() }),
  head: () => ({
    meta: [
      { title: "Central de ajuda — ACESSO" },
      {
        name: "description",
        content: "Tire dúvidas sobre conta, perfil, vagas, candidaturas, mensagens, notificações, acessibilidade e privacidade no ACESSO.",
      },
      { property: "og:title", content: "Central de ajuda — ACESSO" },
      { property: "og:description", content: "Respostas reais para usar o ACESSO com tranquilidade." },
    ],
  }),
  component: Ajuda,
});

interface Artigo {
  pergunta: string;
  resposta: string;
}

interface Categoria {
  id: string;
  titulo: string;
  icon: LucideIcon;
  artigos: Artigo[];
}

/**
 * Conteúdo real da central de ajuda — cada resposta reflete uma
 * funcionalidade que já existe na plataforma (nada inventado). Fica
 * inline no próprio arquivo da rota, seguindo o mesmo padrão já usado
 * em `index.tsx`/`sobre-nos.tsx` para conteúdo estático da página.
 */
const CATEGORIAS_CANDIDATO: Categoria[] = [
  {
    id: "conta",
    titulo: "Conta",
    icon: UserCog,
    artigos: [
      {
        pergunta: "Como crio minha conta?",
        resposta:
          "Na tela de Cadastro, escolha se você é candidato ou empresa e preencha os dados solicitados. O acesso é liberado imediatamente após o cadastro.",
      },
      {
        pergunta: "Esqueci minha senha, e agora?",
        resposta:
          "Na tela de Entrar, toque em \"Esqueci minha senha\". Você recebe um código de 6 dígitos por e-mail, válido por 15 minutos, para definir uma nova senha.",
      },
      {
        pergunta: "Como altero minha senha ou e-mail?",
        resposta:
          "Em Configurações > Segurança você altera a senha. A troca de e-mail fica em Configurações > Conta e exige confirmação por um código enviado ao novo endereço.",
      },
      {
        pergunta: "Como ativo a verificação em duas etapas?",
        resposta:
          "Em Configurações > Segurança, ative a autenticação em duas etapas: escaneie o QR code com um aplicativo autenticador e confirme com o código gerado.",
      },
      {
        pergunta: "Como pauso ou excluo minha conta?",
        resposta:
          "Em Configurações > Conta você encontra as opções de pausar (reversível, basta entrar de novo) ou excluir sua conta (permanente, pede sua senha atual).",
      },
    ],
  },
  {
    id: "perfil",
    titulo: "Perfil",
    icon: User,
    artigos: [
      {
        pergunta: "Como edito meu perfil?",
        resposta: "No seu perfil, toque em \"Editar perfil\" para atualizar foto, capa, biografia, título profissional e localização.",
      },
      {
        pergunta: "Como adiciono experiências, formação, cursos e habilidades?",
        resposta: "Cada seção do perfil profissional tem um botão \"Adicionar\" próprio — experiências, formação, certificados e habilidades são independentes entre si.",
      },
      {
        pergunta: "Como anexo ou atualizo meu currículo?",
        resposta: "Em \"Editar perfil\", envie seu currículo em PDF ou DOCX. O arquivo fica em armazenamento privado: só você, a equipe do ACESSO e empresas com uma candidatura sua conseguem acessá-lo, nunca com um link público permanente.",
      },
      {
        pergunta: "Quem vê minhas informações de deficiência?",
        resposta: "Nunca ficam públicas por padrão. Só você e, quando aplicável, uma empresa com candidatura legítima sua (ou a equipe administrativa) podem ver esses dados.",
      },
    ],
  },
  {
    id: "vagas",
    titulo: "Vagas",
    icon: Briefcase,
    artigos: [
      {
        pergunta: "Como busco e filtro vagas?",
        resposta: "Na página Vagas, use a busca por palavra-chave e os filtros de cidade, modalidade, público-alvo e recursos de acessibilidade.",
      },
      {
        pergunta: "O que significam os públicos \"PCD\", \"50+\" e \"PCD e 50+\"?",
        resposta: "Toda vaga declara para quem ela é: exclusiva para pessoas com deficiência, exclusiva para pessoas 50+, aberta aos dois públicos, ou geral.",
      },
      {
        pergunta: "O que são os selos de recursos de acessibilidade da vaga?",
        resposta: "São badges declarados pela empresa, como intérprete de Libras, tecnologia assistiva, ambiente físico acessível ou jornada adaptável — aparecem no card e na página da vaga.",
      },
      {
        pergunta: "O que significa \"Empresa verificada\"?",
        resposta: "É um selo de confiança concedido pela equipe do ACESSO, diferente de \"aprovada\" (que só permite publicar vagas). Uma empresa pode estar aprovada sem ainda ser verificada.",
      },
      {
        pergunta: "Como favorito uma vaga?",
        resposta: "Toque no ícone de coração no card da vaga ou na página de detalhes. Suas vagas favoritas ficam disponíveis no seu painel.",
      },
    ],
  },
  {
    id: "candidaturas",
    titulo: "Candidaturas",
    icon: FileText,
    artigos: [
      {
        pergunta: "Como me candidato a uma vaga?",
        resposta: "Na página da vaga, toque em \"Candidatar-se\". Sua candidatura usa os dados já cadastrados no seu perfil.",
      },
      {
        pergunta: "Como acompanho minhas candidaturas?",
        resposta: "No seu painel de candidato você vê o status de cada candidatura (em análise, aprovada, recusada) e recebe uma notificação a cada mudança.",
      },
      {
        pergunta: "Posso cancelar uma candidatura?",
        resposta: "Sim. No painel de candidaturas, abra a candidatura desejada e escolha cancelar.",
      },
    ],
  },
  {
    id: "mensagens",
    titulo: "Mensagens",
    icon: MessageSquare,
    artigos: [
      {
        pergunta: "Como envio mensagem para uma empresa?",
        resposta: "Pelo perfil da empresa ou diretamente na página de uma vaga, use o botão \"Conversar com a empresa\".",
      },
      {
        pergunta: "Como sei se tenho mensagens novas?",
        resposta: "O ícone de Mensagens no menu mostra um contador de não lidas, atualizado em tempo real.",
      },
    ],
  },
  {
    id: "notificacoes",
    titulo: "Notificações",
    icon: Bell,
    artigos: [
      {
        pergunta: "Como escolho quais notificações recebo?",
        resposta: "Em Configurações > Notificações você liga ou desliga notificações por categoria: vagas e candidaturas, mensagens, publicações e comentários, e rede/seguidores.",
      },
      {
        pergunta: "Por que recebi uma notificação sobre minha candidatura?",
        resposta: "Toda mudança de status de uma candidatura (em análise, aprovada, recusada) gera uma notificação automática.",
      },
    ],
  },
  {
    id: "acessibilidade",
    titulo: "Acessibilidade",
    icon: Accessibility,
    artigos: [
      {
        pergunta: "Como ativo a leitura por voz?",
        resposta: "No primeiro acesso, o ACESSO pergunta se você quer ativar a leitura por voz. Você também pode ligar ou desligar isso a qualquer momento em Configurações > Acessibilidade.",
      },
      {
        pergunta: "Como ajusto contraste, fonte e espaçamento?",
        resposta: "Em Configurações > Acessibilidade você ajusta alto contraste, tamanho de fonte, espaçamento de texto, fonte para dislexia e redução de animações — com uma prévia em tempo real antes de salvar.",
      },
      {
        pergunta: "Como ativo o VLibras?",
        resposta: "O ícone do VLibras fica disponível no canto da tela em todas as páginas; também pode ser ativado ou desativado em Configurações > Acessibilidade.",
      },
      {
        pergunta: "O ACESSO funciona com leitores de tela como NVDA, JAWS, VoiceOver ou TalkBack?",
        resposta: "Sim. A leitura por voz do ACESSO é complementar, não substitui leitores de tela nativos — a plataforma segue WCAG 2.2 e funciona normalmente com eles ativos.",
      },
      {
        pergunta: "Consigo navegar só pelo teclado?",
        resposta: "Sim, toda a plataforma pode ser usada por teclado (Tab, Shift+Tab, Enter, Esc), com foco sempre visível.",
      },
    ],
  },
  {
    id: "privacidade",
    titulo: "Privacidade e segurança",
    icon: Lock,
    artigos: [
      {
        pergunta: "Como denuncio uma publicação, comentário ou perfil?",
        resposta: "Toque no menu de opções (⋮) do conteúdo e escolha \"Denunciar\". A equipe do ACESSO analisa cada denúncia.",
      },
      {
        pergunta: "Como bloqueio alguém?",
        resposta: "No perfil da pessoa, use o menu de opções para bloquear. Um usuário bloqueado não vê seu perfil nem consegue te enviar mensagens. Veja sua lista de bloqueados em Configurações > Privacidade.",
      },
      {
        pergunta: "Quem tem acesso às minhas mensagens?",
        resposta: "Só você e a outra pessoa da conversa. A equipe administrativa só acessa o conteúdo de uma mensagem específica quando ela é denunciada, e esse acesso fica registrado.",
      },
      {
        pergunta: "Como controlo a visibilidade do meu perfil?",
        resposta: "Em Configurações > Privacidade você ajusta quem vê seus dados de contato e outras informações do perfil.",
      },
    ],
  },
];

/**
 * Categorias específicas para empresas — conteúdo diferente do candidato
 * (cadastro em seções, gestão de vagas e candidaturas, perfil empresarial).
 * Cada resposta reflete uma tela/ação que já existe (nada inventado):
 * confirmei os rótulos exatos direto no código de `dashboard/empresa.tsx`,
 * `CardVagaEmpresa.tsx` e `CandidaturasDaVaga.tsx` antes de escrever.
 */
const CATEGORIAS_EMPRESA: Categoria[] = [
  {
    id: "conta-empresarial",
    titulo: "Conta empresarial",
    icon: UserCog,
    artigos: [
      {
        pergunta: "Como cadastro minha empresa?",
        resposta:
          "Na tela de Cadastro, escolha \"Empresa\" e preencha os dados em seções: dados da empresa (razão social, nome fantasia, CNPJ, e-mail, telefone), localização e informações profissionais (setor, porte, site, descrição) são opcionais nessa etapa e podem ser completados depois em Editar perfil.",
      },
      {
        pergunta: "Preciso confirmar o e-mail da empresa?",
        resposta:
          "Sim, quando a confirmação por e-mail estiver ativa: depois do cadastro você recebe um link de confirmação. Sem confirmar, o login fica bloqueado até você confirmar ou pedir um novo e-mail.",
      },
      {
        pergunta: "Como altero senha ou e-mail da empresa?",
        resposta:
          "Em Configurações > Segurança você altera a senha. A troca de e-mail fica em Configurações > Conta e exige confirmação por um código enviado ao novo endereço — os mesmos fluxos usados por contas de candidato.",
      },
      {
        pergunta: "Minha empresa precisa de aprovação para publicar vagas?",
        resposta:
          "Sim. Toda empresa nova entra com status \"pendente\" e só pode publicar vagas depois de aprovada pela equipe do ACESSO. O \"selo de verificação\" é diferente e adicional: uma empresa pode estar aprovada sem ainda ter o selo.",
      },
    ],
  },
  {
    id: "perfil-empresarial",
    titulo: "Perfil empresarial",
    icon: Building2,
    artigos: [
      {
        pergunta: "Como edito o perfil da empresa?",
        resposta:
          "No perfil da empresa, toque em \"Editar perfil\" para atualizar razão social, nome fantasia, descrição, cultura de inclusão, setor, porte, site, cidade, estado, endereço e CEP.",
      },
      {
        pergunta: "Como adiciono ou troco o logo e o banner?",
        resposta:
          "Em \"Editar perfil\", a seção Logo e a seção Banner têm um botão próprio de upload — o tamanho recomendado (400×400 px para o logo, 1584×396 px para o banner) e o tamanho máximo do arquivo aparecem ali mesmo.",
      },
      {
        pergunta: "Onde escrevo sobre a cultura de inclusão da empresa?",
        resposta:
          "Em \"Editar perfil\", o campo \"Cultura de inclusão\" é o lugar certo para descrever como a empresa apoia profissionais PCD e pessoas 50+ — esse texto aparece no perfil público.",
      },
    ],
  },
  {
    id: "vagas-empresa",
    titulo: "Vagas",
    icon: Briefcase,
    artigos: [
      {
        pergunta: "Como crio uma vaga?",
        resposta: "No seu painel, use o botão de nova vaga e preencha cargo, descrição, localização, modalidade, público-alvo e recursos de acessibilidade oferecidos.",
      },
      {
        pergunta: "Como edito uma vaga já publicada?",
        resposta: "No painel, abra a vaga desejada e escolha \"Editar\" para atualizar qualquer informação.",
      },
      {
        pergunta: "Como pauso ou encerro uma vaga?",
        resposta:
          "No painel, cada vaga tem ações de pausar, reabrir, encerrar ou excluir. Vagas ficam organizadas em três grupos: Aberta, Pausada e Encerrada.",
      },
      {
        pergunta: "Como vejo as candidaturas recebidas?",
        resposta:
          "No seu painel, selecione uma vaga para ver a lista de candidaturas recebidas para ela, junto com um resumo por status.",
      },
      {
        pergunta: "Como analiso e atualizo o status de uma candidatura?",
        resposta:
          "Na lista de candidaturas de uma vaga, cada candidatura tem um seletor de status: Pendente, Em análise, Aprovada ou Rejeitada. O candidato recebe uma notificação a cada mudança.",
      },
    ],
  },
  {
    id: "candidatos",
    titulo: "Candidatos",
    icon: Users,
    artigos: [
      {
        pergunta: "Como vejo o perfil de quem se candidatou a uma vaga?",
        resposta: "Na lista de candidaturas da vaga, toque no nome do candidato para abrir o perfil público dele.",
      },
      {
        pergunta: "Como envio mensagem para um candidato?",
        resposta: "No perfil do candidato, use o botão \"Enviar mensagem\" para iniciar uma conversa.",
      },
      {
        pergunta: "Consigo pesquisar candidatos diretamente, sem esperar uma candidatura?",
        resposta: "Essa funcionalidade ainda não está disponível no ACESSO.",
      },
      {
        pergunta: "Como bloqueio ou denuncio um candidato?",
        resposta:
          "No perfil da pessoa, use o menu de opções para bloquear ou denunciar — os mesmos recursos disponíveis para qualquer conta no ACESSO.",
      },
    ],
  },
  {
    id: "configuracoes-empresa",
    titulo: "Configurações",
    icon: Lock,
    artigos: [
      {
        pergunta: "Como ajusto notificações da empresa?",
        resposta: "Em Configurações > Notificações você liga ou desliga notificações por categoria: candidaturas recebidas, mensagens, publicações e rede/seguidores.",
      },
      {
        pergunta: "Como controlo a privacidade da conta empresarial?",
        resposta: "Em Configurações > Privacidade você ajusta a visibilidade de dados de contato e gerencia a lista de contas bloqueadas.",
      },
      {
        pergunta: "As preferências de acessibilidade também valem para quem acessa como empresa?",
        resposta: "Sim — alto contraste, tamanho de fonte, espaçamento, redução de animações, VLibras e leitura por voz funcionam da mesma forma para qualquer tipo de conta.",
      },
    ],
  },
];

// Faixa Unicode dos sinais diacríticos combinantes (acentos) — U+0300 a
// U+036F, a mesma usada em `Backend/src/services/ChatbotService.js`.
// Construída por código de caractere (não como range literal no source)
// para nunca depender de um caractere combinante sobreviver intacto numa
// edição futura do arquivo.
const DIACRITICOS = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, "g");

function normalizar(texto: string) {
  return texto.toLowerCase().normalize("NFD").replace(DIACRITICOS, "");
}

function Ajuda() {
  const { autenticado, user } = useSession();
  const { central: centralNaUrl } = Route.useSearch();
  const [busca, setBusca] = useState("");
  const [central, setCentral] = useState<"candidato" | "empresa">(centralNaUrl ?? "candidato");

  // Identifica o tipo de usuário automaticamente quando logado — a pessoa
  // sempre pode trocar manualmente pelo alternador abaixo (ex.: um
  // candidato querendo ver como funciona para empresas, ou uma empresa
  // ainda não cadastrada explorando antes de criar conta). Um link direto
  // com `?central=empresa` (ex.: rodapé de suporte) tem prioridade sobre
  // a detecção automática pelo tipo de conta.
  useEffect(() => {
    if (centralNaUrl) {
      setCentral(centralNaUrl);
    } else if (user?.tipo === "empresa") {
      setCentral("empresa");
    } else if (user?.tipo === "candidato") {
      setCentral("candidato");
    }
  }, [centralNaUrl, user?.tipo]);

  const CATEGORIAS = central === "empresa" ? CATEGORIAS_EMPRESA : CATEGORIAS_CANDIDATO;

  const termo = normalizar(busca.trim());

  const resultados = useMemo(() => {
    if (!termo) return null;
    return CATEGORIAS.flatMap((categoria) =>
      categoria.artigos
        .filter(
          (a) => normalizar(a.pergunta).includes(termo) || normalizar(a.resposta).includes(termo),
        )
        .map((artigo) => ({ categoria: categoria.titulo, ...artigo })),
    );
  }, [termo, CATEGORIAS]);

  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold">Olá! Como podemos ajudar?</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        {central === "empresa"
          ? "Respostas rápidas sobre conta empresarial, perfil, vagas, candidatos, mensagens e configurações."
          : "Respostas rápidas sobre conta, perfil, vagas, candidaturas, mensagens, notificações, acessibilidade e privacidade."}
      </p>

      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-bold">Central de ajuda para</legend>
        <div className="flex gap-2">
          {(
            [
              { valor: "candidato", label: "Candidatos", icon: User },
              { valor: "empresa", label: "Empresas", icon: Building2 },
            ] as const
          ).map((op) => (
            <button
              key={op.valor}
              type="button"
              aria-pressed={central === op.valor}
              onClick={() => setCentral(op.valor)}
              className={`flex min-h-11 items-center gap-2 rounded-full border-2 px-4 text-sm font-semibold transition-colors ${
                central === op.valor
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              <op.icon className="size-4 shrink-0" aria-hidden="true" />
              {op.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 max-w-xl">
        <Label htmlFor="busca-ajuda" className="sr-only">
          Pesquisar na Ajuda
        </Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="busca-ajuda"
            className="min-h-12 pl-10"
            placeholder="Ex.: como ativo o leitor de voz?"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      {resultados ? (
        <section aria-labelledby="resultados-busca" className="mt-8">
          <h2 id="resultados-busca" className="text-lg font-bold" aria-live="polite">
            {resultados.length > 0
              ? `${resultados.length} resultado${resultados.length === 1 ? "" : "s"} para "${busca}"`
              : `Nenhum resultado para "${busca}"`}
          </h2>
          {resultados.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Tente outro termo, navegue pelas categorias abaixo ou fale com o assistente do ACESSO.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {resultados.map((r) => (
                <li key={r.pergunta}>
                  <Card className="shadow-none">
                    <CardContent className="p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-primary">{r.categoria}</p>
                      <h3 className="mt-1 font-bold">{r.pergunta}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{r.resposta}</p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          <section aria-labelledby="categorias" className="mt-10">
            <h2 id="categorias" className="text-xl font-bold">
              Categorias
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {CATEGORIAS.map((categoria) => (
                <li key={categoria.id}>
                  <a
                    href={`#${categoria.id}`}
                    className="flex min-h-16 items-center gap-3 rounded-xl border border-border bg-card p-4 font-semibold transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span
                      aria-hidden="true"
                      className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"
                    >
                      <categoria.icon className="size-5" />
                    </span>
                    <span className="min-w-0 truncate">{categoria.titulo}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="perguntas-frequentes" className="mt-10">
            <h2 id="perguntas-frequentes" className="text-xl font-bold">
              Perguntas frequentes
            </h2>
            <div className="mt-4 space-y-8">
              {CATEGORIAS.map((categoria) => (
                <div key={categoria.id} id={categoria.id} className="scroll-mt-20">
                  <h3 className="flex items-center gap-2 text-base font-bold">
                    <categoria.icon className="size-4 text-primary" aria-hidden="true" />
                    {categoria.titulo}
                  </h3>
                  <div className="mt-2 divide-y divide-border rounded-lg border border-border">
                    {categoria.artigos.map((artigo) => (
                      <details key={artigo.pergunta} className="group p-4">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          {artigo.pergunta}
                          <ChevronDown
                            className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                            aria-hidden="true"
                          />
                        </summary>
                        <p className="mt-2 text-sm text-muted-foreground">{artigo.resposta}</p>
                      </details>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <section aria-labelledby="mais-ajuda" className="mt-10">
        <h2 id="mais-ajuda" className="text-xl font-bold">
          Precisa de mais ajuda?
        </h2>
        <div className="mt-4 max-w-xl">
          {autenticado ? (
            <AssistenteAcesso />
          ) : (
            <Card className="shadow-card">
              <CardContent className="space-y-4 p-5">
                <p className="text-sm text-muted-foreground">
                  Entre ou crie sua conta para conversar com o assistente do ACESSO — ele responde
                  dúvidas sobre a plataforma na hora.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild className="min-h-11">
                    <Link to="/entrar">Entrar</Link>
                  </Button>
                  <Button asChild variant="outline" className="min-h-11">
                    <Link to="/cadastro">Criar conta</Link>
                  </Button>
                </div>
                <p className="flex items-center gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
                  <Mail className="size-4 shrink-0" aria-hidden="true" />
                  Prefere falar direto com a gente?{" "}
                  <a href="mailto:projetoacessoinclusivo@gmail.com" className="font-semibold text-primary underline">
                    projetoacessoinclusivo@gmail.com
                  </a>
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </AppShell>
  );
}
