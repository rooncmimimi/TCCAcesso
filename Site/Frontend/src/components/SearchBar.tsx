import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Briefcase, Building2, Clock, FileText, Search } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/contexts/SessionContext";
import { urlArquivo } from "@/services/uploads.service";
import { buscaService } from "@/services/publico.service";

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
    // localStorage indisponível (modo privado, storage cheio) — busca recente é só conveniência, nunca crítico.
  }
}

/**
 * Busca global do ACESSO: pessoas, empresas, vagas e publicações.
 * Reaproveita o endpoint `GET /busca` (já existente) e o primitivo
 * `Command`/`cmdk` (já instalado, nunca usado) — dá o comportamento de
 * combobox acessível (teclado, ARIA, Esc/Enter) sem reimplementar nada.
 */
export function SearchBar() {
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
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Pesquisar pessoas, empresas ou vagas no ACESSO"
        className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full border border-border bg-secondary/60 px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary md:w-28 md:justify-start md:px-4 lg:w-64"
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="hidden truncate md:inline">Pesquisar pessoas, empresas ou vagas…</span>
      </button>

      <CommandDialog open={aberto} onOpenChange={setAberto}>
        <CommandInput
          value={termo}
          onValueChange={setTermo}
          placeholder="Pesquisar pessoas, empresas ou vagas…"
          aria-label="Termo de pesquisa"
        />
        <CommandList aria-live="polite">
          {!habilitada && buscasRecentes.length > 0 && (
            <CommandGroup heading="Buscas recentes">
              {buscasRecentes.map((recente) => (
                <CommandItem key={recente} value={`recente-${recente}`} onSelect={() => setTermo(recente)}>
                  <Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate">{recente}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!habilitada ? (
            buscasRecentes.length === 0 && <CommandEmpty>Digite ao menos 2 caracteres para pesquisar.</CommandEmpty>
          ) : isError ? (
            <div role="alert" className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground">
              <p>Não foi possível pesquisar agora.</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                Tentar novamente
              </button>
            </div>
          ) : semResultados ? (
            <CommandEmpty>
              Não encontramos resultados para "{termoBuscado}". Tente pesquisar por outro nome, empresa, vaga ou
              palavra-chave.
            </CommandEmpty>
          ) : null}

          {usuarios.length > 0 && (
            <CommandGroup heading="Pessoas">
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
                    <AvatarFallback className="text-[10px]">{initials(pessoa.nome)}</AvatarFallback>
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
            <CommandGroup heading="Empresas">
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
                    <span className="inline-flex shrink-0 items-center text-primary" title="Empresa verificada pelo ACESSO">
                      <BadgeCheck className="size-3.5" aria-hidden="true" />
                      <span className="sr-only">Empresa verificada</span>
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {vagas.length > 0 && (
            <CommandGroup heading="Vagas">
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
            <CommandGroup heading="Publicações">
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
      </CommandDialog>
    </>
  );
}
