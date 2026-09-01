import { Send } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { Conversa, Mensagem } from "@/lib/api-types";
import { initials } from "@/lib/session";
import { LinkAutor } from "@/components/perfil/LinkAutor";
import { BolhaMensagem } from "./BolhaMensagem";
import { fotoParticipante, nomeParticipante, participanteOposto } from "./utils";

type JanelaConversaProps = {
  conversa: Conversa;
  usuarioId: string | null;
  mensagens: Mensagem[];
  carregando: boolean;
  erro: boolean;
  mensagemErro?: string;
  enviando: boolean;
  contatoDigitando: boolean;
  onEnviar: (conteudo: string) => void;
  onDigitando: () => void;
};

export function JanelaConversa({
  conversa,
  usuarioId,
  mensagens,
  carregando,
  erro,
  mensagemErro,
  enviando,
  contatoDigitando,
  onEnviar,
  onDigitando,
}: JanelaConversaProps) {
  const [texto, setTexto] = useState("");
  const fimRef = useRef<HTMLDivElement | null>(null);
  const contato = participanteOposto(conversa, usuarioId);
  const nome = nomeParticipante(contato);
  const foto = fotoParticipante(contato);
  // Fase 8: `contato` só é `undefined` quando o outro participante excluiu
  // a conta (backend devolve `usuarioA`/`usuarioB` como `null`) — o
  // histórico continua visível, só a composição de novas mensagens é
  // bloqueada, com o mesmo texto usado pelo backend (defesa em
  // profundidade: mesmo que este aviso falhe, o envio é recusado lá).
  const semParticipante = !contato;
  const avisoSemParticipante =
    "Esta conversa não permite novas mensagens porque o outro usuário foi removido.";

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "end" });
  }, [mensagens.length, contatoDigitando]);

  function handleEnviar(e: FormEvent) {
    e.preventDefault();
    const conteudo = texto.trim();
    if (!conteudo || enviando) return;
    onEnviar(conteudo);
    setTexto("");
  }

  return (
    <section aria-label={`Conversa com ${nome}`} className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-border p-4">
        <LinkAutor autorId={contato?.id} className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="size-10">
            {foto && <AvatarImage src={foto} alt="" />}
            <AvatarFallback className="bg-primary-soft text-sm font-bold text-primary">
              {initials(nome)}
            </AvatarFallback>
          </Avatar>
        </LinkAutor>
        <div className="min-w-0">
          <p className="truncate font-bold">
            <LinkAutor autorId={contato?.id} className="hover:underline focus-visible:underline">
              {nome}
            </LinkAutor>
          </p>
          {contatoDigitando && (
            <p className="text-xs font-medium text-primary" role="status" aria-live="polite">
              digitando…
            </p>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4" aria-live="polite">
        {carregando && (
          <ul className="space-y-3">
            {[1, 2, 3].map((i) => (
              <li key={i} className={i % 2 === 0 ? "flex justify-end" : "flex justify-start"}>
                <Skeleton className="h-12 w-2/3 rounded-2xl" />
              </li>
            ))}
          </ul>
        )}

        {!carregando && erro && (
          <Alert variant="destructive">
            <AlertTitle>Não foi possível carregar as mensagens</AlertTitle>
            <AlertDescription>{mensagemErro ?? "Tente novamente em instantes."}</AlertDescription>
          </Alert>
        )}

        {!carregando && !erro && mensagens.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground" role="status">
            {semParticipante ? avisoSemParticipante : `Nenhuma mensagem ainda. Envie a primeira mensagem para ${nome}.`}
          </p>
        )}

        {!carregando && !erro && mensagens.length > 0 && (
          <ul className="space-y-2">
            {mensagens.map((mensagem) => (
              <BolhaMensagem key={mensagem.id} mensagem={mensagem} propria={mensagem.remetenteId === usuarioId} />
            ))}
          </ul>
        )}
        <div ref={fimRef} />
      </div>

      {semParticipante ? (
        <p role="status" className="border-t border-border bg-muted/40 px-4 py-3 text-center text-sm text-muted-foreground">
          {avisoSemParticipante}
        </p>
      ) : (
        <form onSubmit={handleEnviar} className="flex items-end gap-2 border-t border-border p-3">
          <label htmlFor="mensagem-texto" className="sr-only">
            Escreva uma mensagem
          </label>
          <Textarea
            id="mensagem-texto"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              onDigitando();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleEnviar(e);
              }
            }}
            placeholder="Escreva uma mensagem…"
            className="min-h-12 flex-1 resize-none"
          />
          <Button type="submit" className="h-12 shrink-0" disabled={!texto.trim() || enviando} aria-label="Enviar mensagem">
            <Send aria-hidden="true" />
          </Button>
        </form>
      )}
    </section>
  );
}
