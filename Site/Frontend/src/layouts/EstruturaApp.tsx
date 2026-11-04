import type { ReactNode } from "react";
import { CabecalhoApp } from "./CabecalhoApp";
import { TelaStatusEmpresa } from "./TelaStatusEmpresa";
import { SuporteRodape } from "@/components/SuporteRodape";
import { ConsentimentoVozDialog } from "@/components/acessibilidade/ConsentimentoVozDialog";
import { useSessao } from "@/hooks/useSessao";

/**
 * Estrutura das páginas do app: link para pular ao conteúdo, cabeçalho, conteúdo e rodapé de
 * suporte. Também mostra o consentimento de voz e troca o app pela `TelaStatusEmpresa` enquanto a
 * empresa não está aprovada.
 */
export function EstruturaApp({ children }: { children: ReactNode }) {
  const { usuario } = useSessao();

  // Empresa pendente, reprovada ou suspensa nunca vê o app por trás desta tela: nem os links do
  // `CabecalhoApp`, nem o conteúdo da rota. A checagem fica neste ponto único, por onde passam
  // todas as páginas autenticadas, e cuida só da experiência; a proteção real é do backend
  // (`garantirEmpresaAprovada` e `garantirEmpresaAprovadaSeForEmpresa`). Sem `usuario.empresa`
  // carregado, não bloqueia.
  if (usuario?.tipo === "empresa" && usuario.empresa && usuario.empresa.statusAprovacao !== "aprovada") {
    return <TelaStatusEmpresa empresa={usuario.empresa} />;
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* A página inicial também mostra este diálogo, mas só para quem visita `/` sem sessão;
          quem entra por `/entrar` ou acabou de se cadastrar vai direto para uma rota
          autenticada. Aqui a pergunta de primeiro acesso alcança todo mundo com conta, e o
          componente só pergunta quando `voiceConsent` ainda é `null`. */}
      <ConsentimentoVozDialog />
      <a
        href="#conteudo"
        className="sr-only-focusable absolute left-4 top-4 z-50 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Pular para o conteúdo principal
      </a>
      <CabecalhoApp />
      <main id="conteudo" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>
      <SuporteRodape />
    </div>
  );
}
