import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { TelaStatusEmpresa } from "./TelaStatusEmpresa";
import { SuporteRodape } from "@/components/SuporteRodape";
import { VoiceConsentDialog } from "@/components/accessibility/VoiceConsentDialog";
import { useSession } from "@/contexts/SessionContext";

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useSession();

  // Empresa pendente/reprovada/suspensa nunca vê o app por trás desta
  // tela — nenhum link de feed/vagas/mensagens do AppHeader, nenhum
  // conteúdo empresarial da rota atual. Ponto único (todas as páginas
  // autenticadas passam por `AppShell`) em vez de repetir a checagem em
  // cada rota; o backend continua sendo a autoridade real (ver
  // `garantirEmpresaAprovada`/`garantirEmpresaAprovadaSeForEmpresa`) — isto
  // é só a experiência, nunca a proteção. `user.empresa` ausente (sessão
  // antiga, ainda sem essa associação carregada) não bloqueia: sem dado,
  // sem negação por padrão.
  if (user?.tipo === "empresa" && user.empresa && user.empresa.statusAprovacao !== "aprovada") {
    return <TelaStatusEmpresa empresa={user.empresa} />;
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* A Home (`routes/index.tsx`) também renderiza este diálogo, mas só
          alcança quem visita `/` deslogado — quem entra por `/entrar` (o
          caminho real de login) ou acabou de se cadastrar cai direto numa
          rota autenticada, sem nunca passar por `/`. Ponto único aqui em
          `AppShell` (toda página autenticada passa por ele) garante que a
          pergunta de primeiro acesso realmente aconteça para quem tem
          conta — o componente já é idempotente (só pergunta quando
          `prefs.voiceConsent` ainda é `null`), então não duplica a
          pergunta pra quem já respondeu na Home. */}
      <VoiceConsentDialog />
      <a
        href="#conteudo"
        className="sr-only-focusable absolute left-4 top-4 z-50 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Pular para o conteúdo principal
      </a>
      <AppHeader />
      <main id="conteudo" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>
      <SuporteRodape />
    </div>
  );
}
