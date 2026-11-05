import { useId, useState, type FormEvent } from "react";
import { Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CartaoDeComunicacao } from "@/components/comunicacao/CartaoDeComunicacao";
import { CARTOES_PADRAO, GRUPOS_DE_CARTOES } from "@/dados/cartoesDeComunicacao";
import { useVoz } from "@/hooks/useVoz";
import { TAMANHO_MAXIMO_DO_CARTAO, adicionarCartaoPessoal, lerCartoesPessoais, removerCartaoPessoal, type CartaoPessoal } from "@/lib/cartoesPessoais";

/**
 * Central de comunicação alternativa: cartões prontos (em grupos) e cartões da própria pessoa. Cada
 * cartão pode ser mostrado em tela cheia (letra enorme, para a outra pessoa ler), ouvido em voz alta
 * ou copiado. Os cartões criados ficam só neste navegador. Nenhum cartão é enviado por esta tela:
 * para usar numa conversa, a pessoa os encontra também dentro das Mensagens.
 */
export function CentralDeComunicacao() {
  const idBase = useId();
  const { falar } = useVoz();
  const [pessoais, setPessoais] = useState<CartaoPessoal[]>(() => lerCartoesPessoais());
  const [novo, setNovo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [mostrando, setMostrando] = useState<string | null>(null);

  function criar(e: FormEvent) {
    e.preventDefault();

    const r = adicionarCartaoPessoal(novo);

    if (r.ok) {
      setPessoais(r.lista);
      setNovo("");
      setErro(null);
    } else {
      setErro(r.motivo);
    }
  }

  return (
    <div className="mt-6 space-y-8">
      {GRUPOS_DE_CARTOES.map((grupo) => (
        <section key={grupo.id} aria-labelledby={`${idBase}-${grupo.id}`} className="space-y-3">
          <div>
            <h2 id={`${idBase}-${grupo.id}`} className="text-xl font-bold">
              {grupo.titulo}
            </h2>
            <p className="text-sm text-muted-foreground">{grupo.descricao}</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {CARTOES_PADRAO.filter((c) => c.grupo === grupo.id).map((c) => (
              <CartaoDeComunicacao key={c.id} texto={c.texto} aoMostrar={setMostrando} />
            ))}
          </ul>
        </section>
      ))}

      <section aria-labelledby={`${idBase}-meus`} className="space-y-3">
        <div>
          <h2 id={`${idBase}-meus`} className="text-xl font-bold">
            Meus cartões
          </h2>
          <p className="text-sm text-muted-foreground">Crie as frases que você mais usa. Elas ficam só neste navegador: ninguém mais as vê, e somem se você limpar os dados do navegador.</p>
        </div>

        <form onSubmit={criar} className="space-y-2 rounded-xl border border-border p-4">
          <Label htmlFor={`${idBase}-novo`}>Nova frase</Label>
          <Input id={`${idBase}-novo`} value={novo} maxLength={TAMANHO_MAXIMO_DO_CARTAO} onChange={(e) => setNovo(e.target.value)} aria-describedby={erro ? `${idBase}-erro` : undefined} aria-invalid={erro ? true : undefined} placeholder="Ex.: Prefiro receber as perguntas por escrito." />
          {erro ? (
            <p id={`${idBase}-erro`} role="alert" className="text-sm font-medium text-destructive">
              {erro}
            </p>
          ) : null}
          <Button type="submit" className="min-h-11" disabled={!novo.trim()}>
            Criar cartão
          </Button>
        </form>

        {pessoais.length === 0 ? (
          <p role="status" className="text-sm text-muted-foreground">
            Você ainda não criou nenhum cartão.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {pessoais.map((c) => (
              <CartaoDeComunicacao key={c.id} texto={c.texto} aoMostrar={setMostrando} aoRemover={() => setPessoais(removerCartaoPessoal(c.id))} />
            ))}
          </ul>
        )}
      </section>

      <Dialog open={mostrando !== null} onOpenChange={(aberto) => (!aberto ? setMostrando(null) : undefined)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogTitle className="sr-only">Cartão de comunicação</DialogTitle>
          <DialogDescription className="sr-only">A frase em letras grandes, para mostrar à outra pessoa.</DialogDescription>
          <p className="py-8 text-center text-4xl font-extrabold leading-tight sm:text-5xl" lang="pt-BR">
            {mostrando}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={() => mostrando && falar(mostrando)}>
              <Volume2 className="size-4" aria-hidden="true" /> Ouvir
            </Button>
            <Button type="button" className="min-h-11" onClick={() => setMostrando(null)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
