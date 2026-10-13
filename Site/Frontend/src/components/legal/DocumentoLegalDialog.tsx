import { useState, type ReactNode } from "react";
import { AlertTriangle, ExternalLink } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CONTEUDO_PENDENTE, DOCUMENTOS, type DocumentoLegal } from "@/dados/documentosLegais";

/**
 * Abre um documento legal para leitura sem sair do formulário.
 *
 * É diálogo, e não link para outra página, porque o cadastro tem etapas com dados digitados: mandar
 * a pessoa para `/termos` e trazer de volta perderia tudo o que ela preencheu. O diálogo fecha e ela
 * continua exatamente no mesmo ponto, com os campos intactos.
 *
 * Acessibilidade vem do `Dialog` do projeto, que já prende o foco, fecha no Escape e devolve o foco
 * ao gatilho. O que é feito aqui: título e descrição ligados ao diálogo (`DialogTitle` /
 * `DialogDescription`), corpo com rolagem própria e `tabIndex={-1}` para quem usa teclado conseguir
 * rolar o texto, e um link para a página inteira em aba nova, para quem prefere ler fora dali.
 *
 * O gatilho é um `<button>` dentro do rótulo do aceite, nunca o próprio checkbox: abrir o documento
 * não pode marcar o aceite, e marcar o aceite continua sendo um ato separado e explícito.
 */
export function DocumentoLegalDialog({
  documento,
  children,
}: {
  documento: DocumentoLegal["chave"];
  /** O texto clicável que abre o documento. */
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const doc = DOCUMENTOS[documento];

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="font-semibold text-primary underline underline-offset-2 hover:no-underline"
        >
          {children}
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[85dvh] max-w-2xl gap-0 p-0">
        <DialogHeader className="border-b border-border p-6 pb-4 text-left">
          <DialogTitle className="text-xl font-extrabold">{doc.titulo}</DialogTitle>
          <DialogDescription>{doc.resumo}</DialogDescription>
        </DialogHeader>

        {/* `tabIndex={-1}` deixa a região rolável alcançável pelo teclado: sem isso, texto longo
            fica inacessível para quem não usa mouse (WCAG 2.1.1). */}
        <div
          tabIndex={-1}
          className="min-h-0 flex-1 overflow-y-auto px-6 py-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CorpoDocumento doc={doc} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4">
          <Button asChild variant="ghost" className="min-h-11 gap-1.5">
            <a href={`/${doc.chave === "termos" ? "termos" : "privacidade"}`} target="_blank" rel="noreferrer">
              Abrir em nova aba <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          </Button>
          <Button type="button" className="min-h-11" onClick={() => setAberto(false)}>
            Voltar ao cadastro
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Corpo do documento, compartilhado entre o diálogo e a página inteira. */
export function CorpoDocumento({ doc }: { doc: DocumentoLegal }) {
  return (
    <>
      {CONTEUDO_PENDENTE && (
        <div
          role="note"
          className="mb-5 flex gap-3 rounded-lg border-2 border-destructive/40 bg-destructive/5 p-4"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
          <p className="text-sm">
            <strong className="font-bold">Documento ainda não publicado.</strong> O texto oficial do{" "}
            {doc.titulo.toLowerCase()} está em elaboração. O que você lê abaixo é apenas a relação dos
            assuntos que ele vai cobrir — não é um contrato e não tem valor jurídico.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {doc.secoes.map((secao) => (
          <section key={secao.titulo}>
            <h3 className="mb-2 text-base font-bold">{secao.titulo}</h3>
            <div className="space-y-2">
              {secao.paragrafos.map((paragrafo) => (
                <p key={paragrafo} className="text-sm leading-relaxed text-muted-foreground">
                  {paragrafo}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
