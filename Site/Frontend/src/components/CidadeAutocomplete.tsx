import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { buscarCidadesPorUf, buscarTodasAsCidades } from "@/services/ibge.service";

const MAX_SUGESTOES = 8;

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Campo de cidade com sugestões do IBGE — sempre texto livre por baixo:
 * nunca bloqueia digitação, nunca apaga ou substitui o que a pessoa já
 * escreveu se a cidade não for encontrada na lista (ex.: grafia diferente,
 * distrito não listado, cidade de outro país). A sugestão é só uma ajuda.
 *
 * Com `estado` (UF de 2 letras) informado, busca só as cidades daquela UF
 * (endpoint leve). Sem `estado` — como no filtro de vagas, que não tem
 * campo de UF —, busca a lista completa do Brasil sob demanda, uma única
 * vez por sessão (endpoint pesado, por isso nunca é buscado automaticamente
 * nem em todo carregamento de página).
 */
export function CidadeAutocomplete({
  id,
  name,
  value,
  onChange,
  estado,
  placeholder,
  className,
  "aria-label": ariaLabel,
  autoComplete = "off",
  onEnterSemSelecao,
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (valor: string) => void;
  estado?: string;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
  autoComplete?: string;
  /** Chamado quando Enter é pressionado sem nenhuma sugestão destacada — ex.: disparar a busca de um filtro. */
  onEnterSemSelecao?: () => void;
}) {
  const listboxId = useId();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [cidades, setCidades] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [sugestoesFiltradas, setSugestoesFiltradas] = useState<string[]>([]);
  const [indiceAtivo, setIndiceAtivo] = useState(-1);

  const ufValida = useMemo(() => {
    const sigla = (estado ?? "").trim().toUpperCase();
    return /^[A-Z]{2}$/.test(sigla) ? sigla : null;
  }, [estado]);

  const usaListaGlobal = estado === undefined;

  // Carrega a lista de cidades (por UF, ou global sob demanda) sempre que a UF muda.
  useEffect(() => {
    let cancelado = false;
    if (!usaListaGlobal && !ufValida) {
      setCidades([]);
      return;
    }

    setCarregando(true);
    setErro(false);
    const busca = ufValida ? buscarCidadesPorUf(ufValida) : buscarTodasAsCidades();
    busca
      .then((lista) => {
        if (!cancelado) setCidades(lista);
      })
      .catch(() => {
        if (!cancelado) setErro(true);
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [ufValida, usaListaGlobal]);

  // Filtra as sugestões com um pequeno debounce — a digitação em si nunca é atrasada.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const termo = normalizar(value);
    if (!termo || cidades.length === 0) {
      setSugestoesFiltradas([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const filtradas = cidades.filter((cidade) => normalizar(cidade).includes(termo)).slice(0, MAX_SUGESTOES);
      setSugestoesFiltradas(filtradas);
      setIndiceAtivo(-1);
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, cidades]);

  function escolher(cidade: string) {
    onChange(cidade);
    setAberto(false);
    setIndiceAtivo(-1);
  }

  function aoTeclar(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (!aberto || sugestoesFiltradas.length === 0) {
      if (evento.key === "Enter") onEnterSemSelecao?.();
      return;
    }

    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setIndiceAtivo((atual) => (atual + 1) % sugestoesFiltradas.length);
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setIndiceAtivo((atual) => (atual <= 0 ? sugestoesFiltradas.length - 1 : atual - 1));
    } else if (evento.key === "Enter" && indiceAtivo >= 0) {
      evento.preventDefault();
      escolher(sugestoesFiltradas[indiceAtivo]);
    } else if (evento.key === "Enter") {
      onEnterSemSelecao?.();
    } else if (evento.key === "Escape") {
      setAberto(false);
      setIndiceAtivo(-1);
    }
  }

  const mostrarLista = aberto && sugestoesFiltradas.length > 0;
  const mostrarDica =
    aberto &&
    !mostrarLista &&
    !carregando &&
    value.trim().length > 0 &&
    cidades.length > 0 &&
    !erro;

  return (
    <div className="relative">
      <div className="relative">
        <Input
          id={id}
          name={name}
          role="combobox"
          aria-expanded={mostrarLista}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={indiceAtivo >= 0 ? `${listboxId}-${indiceAtivo}` : undefined}
          aria-label={ariaLabel}
          autoComplete={autoComplete}
          value={value}
          placeholder={placeholder}
          className={cn(carregando && "pr-9", className)}
          onChange={(evento) => {
            onChange(evento.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          onBlur={() => setAberto(false)}
          onKeyDown={aoTeclar}
        />
        {carregando && (
          <Loader2
            className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </div>

      {mostrarLista && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Sugestões de cidade"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {sugestoesFiltradas.map((cidade, indice) => (
            <li key={cidade} role="presentation">
              <button
                type="button"
                id={`${listboxId}-${indice}`}
                role="option"
                aria-selected={indice === indiceAtivo}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                  indice === indiceAtivo ? "bg-accent text-accent-foreground" : "hover:bg-secondary",
                )}
                onMouseDown={(evento) => evento.preventDefault()}
                onMouseEnter={() => setIndiceAtivo(indice)}
                onClick={() => escolher(cidade)}
              >
                <MapPin className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="truncate">{cidade}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Nunca substitui nem apaga o texto digitado — só avisa que não bateu com nenhuma sugestão. */}
      {mostrarDica && (
        <p className="mt-1 text-xs text-muted-foreground">
          Nenhuma sugestão encontrada — o texto digitado será salvo como está.
        </p>
      )}
      {aberto && erro && (
        <p className="mt-1 text-xs text-muted-foreground">
          Não foi possível carregar sugestões de cidade agora. Você ainda pode digitar normalmente.
        </p>
      )}
    </div>
  );
}
