import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Briefcase, Building2, Clock, FileText, Search } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { iniciaisDoNome } from "@/utils/formatacao";
import { urlArquivo } from "@/utils/arquivos";
import { buscaService } from "@/services/publico.service";
import { useT } from "@/i18n";

const CHAVE_BUSCAS_RECENTES = "acesso:buscas-recentes";
const MAX_BUSCAS_RECENTES = 5;

function lerBuscasRecentes(): string[] {
  try {
    const bruto = window.localStorage.getItem(CHAVE_BUSCAS_RECENTES);
    const lista = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(lista) ? lista.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function salvarBuscaRecente(termo: string) {
  try {
    const atual = lerBuscasRecentes().filter((item) => item.toLowerCase() !== termo.toLowerCase());
    const atualizado = [termo, ...atual].slice(0, MAX_BUSCAS_RECENTES);
    window.localStorage.setItem(CHAVE_BUSCAS_RECENTES, JSON.stringify(atualizado));
  } catch {
    // localStorage indisponível (modo privado, storage cheio): busca recente é só conveniência, nunca crítico.
  }
}

/**
 * Busca global do ACESSO: pessoas, empresas, vagas e publicações. Usa o `GET /busca` e o `Command`
 * (`cmdk`), que já entrega o comportamento de combobox acessível (teclado, ARIA, Esc e Enter).
 */
export function BarraBusca() {
  const t = useT();
  const tb = t.busca;
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");
  const [termoBuscado, setTermoBuscado] = useState("");
  const [buscasRecentes, setBuscasRecentes] = useState<string[]>([]);

  useEffect(() => {
    const id = setTimeout(() => setTermoBuscado(termo.trim()), 300);
    return () => clearTimeout(id);
  }, [termo]);

  useEffect(() => {
    if (aberto) {
      setBuscasRecentes(lerBuscasRecentes());
    } else {
      setTermo("");
      setTermoBuscado("");
    }
  }, [aberto]);

  const habilitada = termoBuscado.length >= 2;

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["busca-global", termoBuscado],
    queryFn: () => buscaService.global(termoBuscado, { tipo: "tudo" }),
    enabled: habilitada,
    staleTime: 30_000,
  });

  const usuarios = data?.resultados.usuarios ?? [];
  const empresas = data?.resultados.empresas ?? [];
  const vagas = data?.resultados.vagas ?? [];
  const postagens = data?.resultados.postagens ?? [];
  const semResultados =
    habilitada && !isFetching && !isError && usuarios.length === 0 && empresas.length === 0 && vagas.length === 0 && postagens.length === 0;

  function irPara(destino: () => void) {
    if (termoBuscado.length >= 2) salvarBuscaRecente(termoBuscado);
    destino();
    setAberto(false);
  }

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={tb.abrirAria}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full border border-border bg-secondary/60 px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary md:w-28 md:justify-start md:px-4 lg:w-64"
        >
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <span className="hidden truncate md:inline">{tb.placeholder}</span>
        </button>
      </PopoverTrigger>

      {/* Dropdown preso ao campo, e não um modal: o resultado aparece logo abaixo da busca,
          onde o olhar já está. O foco inicial fica com o padrão do Radix Popover (o primeiro
          elemento focável, o próprio campo). Focar manualmente por `id` não funcionaria, porque
          o `cmdk` gera o próprio `id` do input e ignora um `id` externo. */}
      <PopoverContent align="start" className="w-[min(26rem,calc(100vw-2rem))] overflow-hidden p-0">
        <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2">
        <CommandInput
          value={termo}
          onValueChange={setTermo}
          placeholder={tb.placeholder}
          aria-label={tb.termoAria}
        />
        <CommandList aria-live="polite">
          {!habilitada && buscasRecentes.length > 0 && (
            <CommandGroup heading={tb.recentes}>
              {buscasRecentes.map((recente) => (
                <CommandItem key={recente} value={`recente-${recente}`} onSelect={() => setTermo(recente)}>
                  <Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate">{recente}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!habilitada ? (
            buscasRecentes.length === 0 && <CommandEmpty>{tb.minimoCaracteres}</CommandEmpty>
          ) : isError ? (
            <div role="alert" className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground">
              <p>{tb.erro}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                {t.comum.tentarNovamente}
              </button>
            </div>
          ) : semResultados ? (
            <CommandEmpty>{tb.semResultados(termoBuscado)}</CommandEmpty>
          ) : null}

          {usuarios.length > 0 && (
            <CommandGroup heading={tb.pessoas}>
              {usuarios.map((pessoa) => (
                <CommandItem
                  key={pessoa.id}
                  value={`pessoa-${pessoa.id}-${pessoa.nome}`}
                  onSelect={() =>
                    irPara(() => navigate({ to: "/perfil/$usuarioId", params: { usuarioId: pessoa.id } }))
                  }
                >
                  <Avatar className="size-6">
                    <AvatarImage src={urlArquivo(pessoa.fotoPerfil)} alt="" />
                    <AvatarFallback className="text-[10px]">{iniciaisDoNome(pessoa.nome)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{pessoa.nome}</span>
                  {pessoa.candidato?.tituloProfissional && (
                    <span className="truncate text-xs text-muted-foreground">
                      {pessoa.candidato.tituloProfissional}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {empresas.length > 0 && (
            <CommandGroup heading={tb.empresas}>
              {empresas.map((empresa) => (
                <CommandItem
                  key={empresa.id}
                  value={`empresa-${empresa.id}-${empresa.nomeFantasia ?? empresa.razaoSocial}`}
                  onSelect={() =>
                    irPara(() =>
                      navigate({ to: "/perfil/$usuarioId", params: { usuarioId: empresa.usuarioId } }),
                    )
                  }
                >
                  <Avatar className="size-6">
                    <AvatarImage src={urlArquivo(empresa.logo)} alt="" />
                    <AvatarFallback className="text-[10px]">
                      <Building2 className="size-3.5" aria-hidden="true" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{empresa.nomeFantasia ?? empresa.razaoSocial}</span>
                  {empresa.empresaVerificada && (
                    <span className="inline-flex shrink-0 items-center text-primary" title={t.comum.empresaVerificadaTitulo}>
                      <BadgeCheck className="size-3.5" aria-hidden="true" />
                      <span className="sr-only">{t.comum.empresaVerificada}</span>
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {vagas.length > 0 && (
            <CommandGroup heading={tb.vagas}>
              {vagas.map((vaga) => (
                <CommandItem
                  key={vaga.id}
                  value={`vaga-${vaga.id}-${vaga.titulo}`}
                  onSelect={() =>
                    irPara(() => navigate({ to: "/vaga/$vagaId", params: { vagaId: vaga.id } }))
                  }
                >
                  <Briefcase className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate">{vaga.titulo}</span>
                  {vaga.empresa?.nomeFantasia && (
                    <span className="truncate text-xs text-muted-foreground">{vaga.empresa.nomeFantasia}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {postagens.length > 0 && (
            <CommandGroup heading={tb.publicacoes}>
              {postagens.map((postagem) => (
                <CommandItem
                  key={postagem.id}
                  value={`postagem-${postagem.id}`}
                  onSelect={() =>
                    irPara(() =>
                      navigate({ to: "/postagem/$postagemId", params: { postagemId: postagem.id } }),
                    )
                  }
                >
                  <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate">
                    {postagem.usuario?.nome ? `${postagem.usuario.nome}: ` : ""}
                    {postagem.conteudo}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
