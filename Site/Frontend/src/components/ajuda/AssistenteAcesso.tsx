import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, Loader2, Send, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { chatbotService } from "@/services/acessibilidade.service";
import { extrairMensagemErro } from "@/services/api";
import { useSpeech } from "@/contexts/SpeechContext";
import type { ChatbotMensagem } from "@/types";

const SAUDACAO: ChatbotMensagem = {
  id: "saudacao",
  conversaId: "",
  papel: "assistente",
  conteudo:
    "Olá! Sou o assistente do ACESSO. Posso ajudar com dúvidas sobre conta, perfil, vagas, candidaturas, mensagens e acessibilidade. O que você quer saber?",
};

/**
 * Assistente do ACESSO — embutido na página de Ajuda (nunca flutuante).
 * Usa o `ChatbotService` já existente no backend: respostas determinísticas
 * baseadas em palavras-chave sobre o funcionamento real da plataforma,
 * nunca inventadas. Disponível apenas para usuários autenticados, porque
 * `/chatbot/*` exige sessão (ver `chatbotRoutes.js`) — para visitantes, a
 * própria página de Ajuda já cobre as mesmas dúvidas em formato de FAQ.
 */
export function AssistenteAcesso() {
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<ChatbotMensagem[]>([SAUDACAO]);
  const [texto, setTexto] = useState("");
  const listaRef = useRef<HTMLDivElement>(null);
  const { speak } = useSpeech();
  const queryClient = useQueryClient();

  const enviar = useMutation({
    mutationFn: (conteudo: string) => chatbotService.enviar(conteudo, conversaId),
    onSuccess: (dados) => {
      setConversaId(dados.conversa.id);
      setMensagens((atuais) => [...atuais, dados.resposta]);
      speak(dados.resposta.conteudo, { interrupt: false });
      void queryClient.invalidateQueries({ queryKey: ["chatbot", "conversas"] });
    },
    onError: (erro) => {
      setMensagens((atuais) => [
        ...atuais,
        {
          id: `erro-${Date.now()}`,
          conversaId: conversaId ?? "",
          papel: "assistente",
          conteudo: extrairMensagemErro(
            erro,
            "Não consegui responder agora. Tente novamente em instantes.",
          ),
        },
      ]);
    },
  });

  useEffect(() => {
    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: "smooth" });
  }, [mensagens]);

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const conteudo = texto.trim();
    if (!conteudo || enviar.isPending) return;

    setMensagens((atuais) => [
      ...atuais,
      { id: `usuario-${Date.now()}`, conversaId: conversaId ?? "", papel: "usuario", conteudo },
    ]);
    setTexto("");
    enviar.mutate(conteudo);
  }

  return (
    <Card className="shadow-card">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"
          >
            <Bot className="size-5" />
          </span>
          <div>
            <h3 className="font-bold">Assistente do ACESSO</h3>
            <p className="text-xs text-muted-foreground">Respostas sobre como usar a plataforma</p>
          </div>
        </div>

        <div
          ref={listaRef}
          role="log"
          aria-live="polite"
          aria-label="Conversa com o assistente do ACESSO"
          className="mt-4 max-h-80 space-y-3 overflow-y-auto rounded-lg border border-border bg-secondary/40 p-3"
        >
          {mensagens.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-2 ${m.papel === "usuario" ? "flex-row-reverse text-right" : ""}`}
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${
                  m.papel === "usuario" ? "bg-primary text-primary-foreground" : "bg-card text-primary"
                }`}
              >
                {m.papel === "usuario" ? <User className="size-4" /> : <Bot className="size-4" />}
              </span>
              <p
                className={`min-w-0 rounded-xl px-3 py-2 text-sm ${
                  m.papel === "usuario"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground"
                }`}
              >
                <span className="sr-only">{m.papel === "usuario" ? "Você: " : "Assistente: "}</span>
                {m.conteudo}
              </p>
            </div>
          ))}
          {enviar.isPending && (
            <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> O assistente está digitando…
            </p>
          )}
        </div>

        <form onSubmit={aoEnviar} className="mt-3 flex gap-2">
          <Label htmlFor="pergunta-assistente" className="sr-only">
            Escreva sua pergunta para o assistente
          </Label>
          <Input
            id="pergunta-assistente"
            className="min-h-11"
            placeholder="Ex.: como ativo o leitor de voz?"
            value={texto}
            maxLength={1000}
            onChange={(e) => setTexto(e.target.value)}
          />
          <Button type="submit" className="min-h-11 shrink-0" disabled={!texto.trim() || enviar.isPending}>
            <Send className="size-4" aria-hidden="true" />
            <span className="sr-only">Enviar pergunta</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default AssistenteAcesso;
