import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, Globe } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PAIS_POR_CODIGO, PAISES } from "@/dados/paises";
import { normalizarParaBusca } from "@/utils/texto";

const MAX_SUGESTOES = 8;

/**
 * Campo de país: a pessoa digita e escolhe, e o que sai é o código ISO (`BR`), não o texto.
 *
 * Diferente do `CidadeAutocomplete`, aqui texto livre não serve: o banco guarda um código de dois
 * caracteres com `CHECK`, então só vale país escolhido da lista. Por isso digitar limpa a seleção
 * anterior, e sair do campo sem escolher devolve o texto ao país que estava selecionado — assim
 * nunca fica na tela um nome pela metade parecendo que algo foi escolhido.
 *
 * A lista não fica aberta o tempo todo: abre no foco mostrando as primeiras opções e vai filtrando
 * conforme a digitação, no máximo oito por vez.
 *
 * Acessibilidade: é um combobox de verdade — `role="combobox"`, `aria-expanded`, `aria-controls`,
 * `aria-autocomplete="list"` e `aria-activedescendant` apontando para a opção em destaque, que as
 * setas percorrem sem o foco sair do campo (padrão ARIA de combobox). A opção escolhida tem ✓ e
 * `aria-selected`, nunca só cor.
 */
export function PaisAutocomplete({
  id,
  valor,
  aoMudar,
  temErro,
  descrito,
  desabilitado,
  placeholder = "Digite para buscar",
}: {
  id: string;
  /** Código ISO 3166-1 alpha-2 já escolhido, ou "" quando não há escolha. */
  valor: string;
  aoMudar: (codigo: string) => void;
  temErro?: boolean;
  /** Valor de `aria-describedby` do campo. */
  descrito?: string;
  desabilitado?: boolean;
  /** Texto de exemplo, no idioma escolhido. */
  placeholder?: string;
}) {
  const listboxId = useId();
  const [texto, setTexto] = useState(() => PAIS_POR_CODIGO.get(valor) ?? "");
  const [aberto, setAberto] = useState(false);
  // Só filtra depois que a pessoa digita. Sem isso, abrir o campo com um país já escolhido mostrava
  // só aquele país — o texto da seleção servia de filtro e escondia os outros 238.
  const [filtrando, setFiltrando] = useState(false);
  const [indiceAtivo, setIndiceAtivo] = useState(-1);
  const campoRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);

  // Mantém o texto em dia quando o país vem de fora (rascunho restaurado, voltar de etapa).
  //
  // Só quando há país: digitar zera a escolha de propósito (`onChange`), e sincronizar nessa hora
  // apagaria justamente o que acabou de ser digitado — o campo nunca filtraria nada. Quando o país
  // é limpo, quem cuida do texto é o `onBlur`.
  useEffect(() => {
    if (!valor) return;
    setTexto(PAIS_POR_CODIGO.get(valor) ?? "");
  }, [valor]);

  const sugestoes = useMemo(() => {
    const termo = filtrando ? normalizarParaBusca(texto).trim() : "";
    // Sem digitação, a lista inteira: ela rola dentro da caixa, então ver todos os países é só
    // questão de rolar. Digitando, corta nas primeiras opções, que é o que ajuda a escolher rápido.
    if (!termo) return PAISES;
    return PAISES.filter(
      (p) => normalizarParaBusca(p.nome).includes(termo) || p.codigo === texto.trim().toUpperCase(),
    ).slice(0, MAX_SUGESTOES);
  }, [texto, filtrando]);

  // Ao abrir com um país já escolhido, rola até ele em vez de deixar a lista no topo (em "Afeganistão").
  useEffect(() => {
    if (!aberto || filtrando || !valor) return;
    const indice = sugestoes.findIndex((p) => p.codigo === valor);
    if (indice < 0) return;
    listaRef.current?.children[indice]?.scrollIntoView({ block: "center" });
  }, [aberto, filtrando, valor, sugestoes]);

  function escolher(codigo: string) {
    aoMudar(codigo);
    setTexto(PAIS_POR_CODIGO.get(codigo) ?? "");
    setAberto(false);
    setFiltrando(false);
    setIndiceAtivo(-1);
  }

  function aoTeclar(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown" && !aberto) {
      evento.preventDefault();
      setAberto(true);
      setIndiceAtivo(0);
      return;
    }

    if (!aberto || sugestoes.length === 0) return;

    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setIndiceAtivo((atual) => (atual + 1) % sugestoes.length);
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setIndiceAtivo((atual) => (atual <= 0 ? sugestoes.length - 1 : atual - 1));
    } else if (evento.key === "Enter" && indiceAtivo >= 0) {
      // Só engole o Enter quando há opção em destaque; senão o formulário avança normalmente.
      evento.preventDefault();
      escolher(sugestoes[indiceAtivo].codigo);
    } else if (evento.key === "Escape") {
      evento.preventDefault();
      setAberto(false);
      setIndiceAtivo(-1);
    }
  }

  const mostrarLista = aberto && sugestoes.length > 0;

  return (
    <div className="relative">
      <div className="relative">
        <Globe
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id={id}
          ref={campoRef}
          role="combobox"
          aria-expanded={mostrarLista}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={indiceAtivo >= 0 ? `${listboxId}-${indiceAtivo}` : undefined}
          aria-invalid={temErro}
          aria-describedby={descrito}
          autoComplete="country-name"
          disabled={desabilitado}
          value={texto}
          placeholder={placeholder}
          className="min-h-12 pl-9"
          onChange={(evento) => {
            setTexto(evento.target.value);
            setAberto(true);
            setFiltrando(true);
            setIndiceAtivo(-1);
            // Digitar invalida a escolha anterior: o formulário fica sem país até escolher de novo.
            if (valor) aoMudar("");
          }}
          onFocus={() => {
            setAberto(true);
            setFiltrando(false);
          }}
          onBlur={() => {
            setAberto(false);
            setFiltrando(false);
            setIndiceAtivo(-1);
            // Texto solto não vira país: volta para o que está escolhido (ou esvazia).
            setTexto(PAIS_POR_CODIGO.get(valor) ?? "");
          }}
          onKeyDown={aoTeclar}
        />
      </div>

      {mostrarLista && (
        <ul
          ref={listaRef}
          id={listboxId}
          role="listbox"
          aria-label="Países"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {sugestoes.map((pais, indice) => {
            const escolhido = pais.codigo === valor;

            return (
              <li key={pais.codigo} role="presentation">
                <button
                  type="button"
                  id={`${listboxId}-${indice}`}
                  role="option"
                  aria-selected={escolhido}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm",
                    indice === indiceAtivo ? "bg-accent text-accent-foreground" : "hover:bg-secondary",
                  )}
                  onMouseDown={(evento) => evento.preventDefault()}
                  onMouseEnter={() => setIndiceAtivo(indice)}
                  onClick={() => escolher(pais.codigo)}
                >
                  <Check
                    className={cn("size-4 shrink-0", escolhido ? "opacity-100" : "opacity-0")}
                    aria-hidden="true"
                  />
                  <span className="truncate">{pais.nome}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">{pais.codigo}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
