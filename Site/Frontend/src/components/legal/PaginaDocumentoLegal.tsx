import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CorpoDocumento } from "@/components/legal/DocumentoLegalDialog";
import { VERSAO_DOCUMENTOS, type DocumentoLegal } from "@/dados/documentosLegais";

/**
 * Página inteira de um documento legal, para quem chega por link direto, abre em outra aba ou quer
 * ler sem o cadastro em volta. O mesmo corpo do diálogo, para os dois nunca divergirem.
 */
export function PaginaDocumentoLegal({ doc }: { doc: DocumentoLegal }) {
  return (
    <div className="min-h-dvh bg-secondary">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link to="/" aria-label="Voltar para a página inicial" className="inline-flex">
            <Logo />
          </Link>
          <Button asChild variant="ghost" className="min-h-11 gap-1.5">
            <Link to="/">
              <ArrowLeft aria-hidden="true" /> Início
            </Link>
          </Button>
        </div>
      </header>

      <main id="conteudo" tabIndex={-1} className="mx-auto max-w-3xl px-4 py-10 outline-none">
        <h1 className="text-3xl font-extrabold">{doc.titulo}</h1>
        <p className="mt-2 text-muted-foreground">{doc.resumo}</p>
        <p className="mt-1 text-sm text-muted-foreground">Versão {VERSAO_DOCUMENTOS}</p>

        <Card className="mt-8 shadow-card">
          <CardContent className="p-6 sm:p-8">
            <CorpoDocumento doc={doc} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
