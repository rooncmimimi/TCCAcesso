import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EXTENSOES_IMPORTAVEIS, TIPOS_IMPORTAVEIS, atributoAccept, verificarArquivo } from "@/lib/arquivos";
import { salvarImportacao } from "@/lib/importacaoCurriculo";
import { AlertTriangle, FileUp, Loader2, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { extrairMensagemErro } from "@/services/api";
import { perfilService } from "@/services/perfil.service";
import type { RascunhoCurriculo } from "@/types";

interface ItemExperiencia {
  incluir: boolean;
  cargo: string;
  empresa: string;
  dataInicio: string;
  dataFim: string;
  atual: boolean;
  descricao: string;
}

interface ItemFormacao {
  incluir: boolean;
  instituicao: string;
  curso: string;
  dataFim: string;
  emAndamento: boolean;
  descricao: string;
}

interface ItemHabilidade {
  incluir: boolean;
  nome: string;
}

/**
 * Importar dados do currículo: extração por palavras-chave (sem IA),
 * sempre em 4 passos obrigatórios: enviar → extrair → revisar/editar →
 * confirmar. Nada é gravado no perfil antes da confirmação explícita, e
 * cada item pode ser desmarcado ou editado livremente. CPF nunca aparece
 * aqui, de propósito: o rascunho nunca traz esse campo.
 */
export function ImportarCurriculoDialog({
  candidatoId,
  children,
}: {
  candidatoId: string;
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState<RascunhoCurriculo | null>(null);
  const [experiencias, setExperiencias] = useState<ItemExperiencia[]>([]);
  const [formacoes, setFormacoes] = useState<ItemFormacao[]>([]);
  const [habilidades, setHabilidades] = useState<ItemHabilidade[]>([]);
  const queryClient = useQueryClient();

  function resetar() {
    setRascunho(null);
    setExperiencias([]);
    setFormacoes([]);
    setHabilidades([]);
  }

  const extrair = useMutation({
    mutationFn: (arquivo: File) => perfilService.importarCurriculo(candidatoId, arquivo),
    onSuccess: (dados) => {
      setRascunho(dados);
      setExperiencias(
        dados.experiencias.map((item) => ({
          incluir: true,
          cargo: "",
          empresa: "",
          dataInicio: "",
          dataFim: "",
          atual: false,
          descricao: item.descricaoSugerida,
        })),
      );
      setFormacoes(
        dados.formacoes.map((item) => ({
          incluir: true,
          instituicao: "",
          curso: "",
          dataFim: "",
          emAndamento: false,
          descricao: item.descricaoSugerida,
        })),
      );
      setHabilidades(dados.habilidades.map((nome) => ({ incluir: true, nome })));
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível extrair o currículo.")),
  });

  const confirmar = useMutation({
    // Grava só o que foi revisado e marcado, sem repetir o que o perfil já tem (`lib/importacaoCurriculo.ts`).
    mutationFn: () =>
      salvarImportacao(
        { experiencias, formacoes, habilidades },
        {
          listar: (recurso) => perfilService.listarRecurso<Record<string, unknown>>(recurso),
          criar: (recurso, dados) => perfilService.criarRecurso(recurso, dados),
        },
      ),
    onSuccess: ({ salvos, ignorados, repetidos }) => {
      void queryClient.invalidateQueries({ queryKey: ["perfil-recurso"] });
      if (salvos === 0) {
        toast.warning(
          repetidos > 0
            ? "Tudo o que você marcou já estava no seu perfil, então nada foi adicionado de novo."
            : "Nada foi salvo — marque ao menos um item e preencha os campos obrigatórios.",
        );
        return;
      }

      const partes = [`${salvos} ${salvos === 1 ? "item adicionado" : "itens adicionados"} ao perfil.`];
      if (repetidos > 0) {
        partes.push(
          `${repetidos} já ${repetidos === 1 ? "estava" : "estavam"} no perfil e ${repetidos === 1 ? "não foi repetido" : "não foram repetidos"}.`,
        );
      }
      if (ignorados > 0) {
        partes.push(
          `${ignorados} ${ignorados === 1 ? "item foi ignorado" : "itens foram ignorados"} por falta de campo obrigatório (cargo/empresa/data ou instituição/curso).`,
        );
      }

      toast.success(partes.join(" "));
      setAberto(false);
      resetar();
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível salvar os itens confirmados.")),
  });

  function aoSelecionarArquivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!arquivo) return;

    // O mesmo conjunto de regras do envio de currículo, restrito ao que a importação sabe ler (PDF e DOCX).
    const verificacao = verificarArquivo(arquivo, ["documento"], {
      tipos: TIPOS_IMPORTAVEIS,
      formatos: "um arquivo PDF ou DOCX",
    });
    if (!verificacao.ok) {
      toast.error(verificacao.mensagem);
      return;
    }

    extrair.mutate(arquivo);
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(valor) => {
        setAberto(valor);
        if (!valor) resetar();
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar dados do currículo</DialogTitle>
          <DialogDescription>
            Extração automática por palavras-chave, sem inteligência artificial. Nada é salvo até você revisar e
            confirmar.
          </DialogDescription>
        </DialogHeader>

        {!rascunho ? (
          <div className="space-y-4">
            <label
              htmlFor="arquivo-curriculo-importar"
              className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input p-6 text-center text-sm text-muted-foreground hover:border-primary hover:text-primary"
            >
              {extrair.isPending ? (
                <>
                  <Loader2 className="size-6 animate-spin" aria-hidden="true" />
                  Extraindo texto do arquivo…
                </>
              ) : (
                <>
                  <FileUp className="size-6" aria-hidden="true" />
                  Clique para escolher um PDF ou DOCX
                </>
              )}
            </label>
            <input
              id="arquivo-curriculo-importar"
              type="file"
              accept={atributoAccept(["documento"], { tipos: TIPOS_IMPORTAVEIS, extensoes: EXTENSOES_IMPORTAVEIS })}
              className="sr-only"
              disabled={extrair.isPending}
              onChange={aoSelecionarArquivo}
            />
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Arquivos .doc (formato antigo do Word) e PDFs escaneados (imagem) não são suportados — use PDF com
              texto selecionável ou DOCX.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="flex items-start gap-2 rounded-lg bg-secondary p-3 text-sm text-secondary-foreground">
              <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {rascunho.aviso}
            </p>

            {(rascunho.email || rascunho.telefone || rascunho.linkedin || rascunho.github) && (
              <div className="text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Contato encontrado (não é salvo automaticamente):</p>
                <ul className="mt-1 space-y-0.5">
                  {rascunho.email && <li>E-mail: {rascunho.email}</li>}
                  {rascunho.telefone && <li>Telefone: {rascunho.telefone}</li>}
                  {rascunho.linkedin && <li>LinkedIn: {rascunho.linkedin}</li>}
                  {rascunho.github && <li>GitHub: {rascunho.github}</li>}
                </ul>
              </div>
            )}

            {experiencias.length > 0 && (
              <fieldset className="space-y-3">
                <legend className="text-sm font-bold">Experiências encontradas</legend>
                {experiencias.map((item, indice) => (
                  <div key={indice} className="space-y-2 rounded-lg border p-3">
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      <Checkbox
                        checked={item.incluir}
                        onCheckedChange={(c) =>
                          setExperiencias((atuais) =>
                            atuais.map((it, i) => (i === indice ? { ...it, incluir: Boolean(c) } : it)),
                          )
                        }
                      />
                      Incluir esta experiência
                    </label>
                    {item.incluir && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          placeholder="Cargo (obrigatório)"
                          value={item.cargo}
                          onChange={(e) =>
                            setExperiencias((atuais) =>
                              atuais.map((it, i) => (i === indice ? { ...it, cargo: e.target.value } : it)),
                            )
                          }
                        />
                        <Input
                          placeholder="Empresa (obrigatório)"
                          value={item.empresa}
                          onChange={(e) =>
                            setExperiencias((atuais) =>
                              atuais.map((it, i) => (i === indice ? { ...it, empresa: e.target.value } : it)),
                            )
                          }
                        />
                        <div className="space-y-1">
                          <Label className="text-xs">Data de início (obrigatório)</Label>
                          <Input
                            type="date"
                            value={item.dataInicio}
                            onChange={(e) =>
                              setExperiencias((atuais) =>
                                atuais.map((it, i) => (i === indice ? { ...it, dataInicio: e.target.value } : it)),
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Data de término</Label>
                          <Input
                            type="date"
                            disabled={item.atual}
                            value={item.dataFim}
                            onChange={(e) =>
                              setExperiencias((atuais) =>
                                atuais.map((it, i) => (i === indice ? { ...it, dataFim: e.target.value } : it)),
                              )
                            }
                          />
                        </div>
                        <label className="flex items-center gap-2 text-sm sm:col-span-2">
                          <Checkbox
                            checked={item.atual}
                            onCheckedChange={(c) =>
                              setExperiencias((atuais) =>
                                atuais.map((it, i) => (i === indice ? { ...it, atual: Boolean(c) } : it)),
                              )
                            }
                          />
                          Emprego atual
                        </label>
                        <Textarea
                          className="sm:col-span-2"
                          rows={2}
                          value={item.descricao}
                          onChange={(e) =>
                            setExperiencias((atuais) =>
                              atuais.map((it, i) => (i === indice ? { ...it, descricao: e.target.value } : it)),
                            )
                          }
                        />
                      </div>
                    )}
                  </div>
                ))}
              </fieldset>
            )}

            {formacoes.length > 0 && (
              <fieldset className="space-y-3">
                <legend className="text-sm font-bold">Formações encontradas</legend>
                {formacoes.map((item, indice) => (
                  <div key={indice} className="space-y-2 rounded-lg border p-3">
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      <Checkbox
                        checked={item.incluir}
                        onCheckedChange={(c) =>
                          setFormacoes((atuais) =>
                            atuais.map((it, i) => (i === indice ? { ...it, incluir: Boolean(c) } : it)),
                          )
                        }
                      />
                      Incluir esta formação
                    </label>
                    {item.incluir && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          placeholder="Instituição (obrigatório)"
                          value={item.instituicao}
                          onChange={(e) =>
                            setFormacoes((atuais) =>
                              atuais.map((it, i) => (i === indice ? { ...it, instituicao: e.target.value } : it)),
                            )
                          }
                        />
                        <Input
                          placeholder="Curso (obrigatório)"
                          value={item.curso}
                          onChange={(e) =>
                            setFormacoes((atuais) =>
                              atuais.map((it, i) => (i === indice ? { ...it, curso: e.target.value } : it)),
                            )
                          }
                        />
                        <div className="space-y-1">
                          <Label className="text-xs">Conclusão (ou prevista)</Label>
                          <Input
                            type="date"
                            disabled={item.emAndamento}
                            value={item.dataFim}
                            onChange={(e) =>
                              setFormacoes((atuais) =>
                                atuais.map((it, i) => (i === indice ? { ...it, dataFim: e.target.value } : it)),
                              )
                            }
                          />
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={item.emAndamento}
                            onCheckedChange={(c) =>
                              setFormacoes((atuais) =>
                                atuais.map((it, i) => (i === indice ? { ...it, emAndamento: Boolean(c) } : it)),
                              )
                            }
                          />
                          Em andamento
                        </label>
                        <Textarea
                          className="sm:col-span-2"
                          rows={2}
                          value={item.descricao}
                          onChange={(e) =>
                            setFormacoes((atuais) =>
                              atuais.map((it, i) => (i === indice ? { ...it, descricao: e.target.value } : it)),
                            )
                          }
                        />
                      </div>
                    )}
                  </div>
                ))}
              </fieldset>
            )}

            {habilidades.length > 0 && (
              <fieldset className="space-y-2">
                <legend className="text-sm font-bold">Habilidades encontradas</legend>
                <ul className="flex flex-wrap gap-2">
                  {habilidades.map((item, indice) => (
                    <li key={indice}>
                      <button
                        type="button"
                        onClick={() =>
                          setHabilidades((atuais) =>
                            atuais.map((it, i) => (i === indice ? { ...it, incluir: !it.incluir } : it)),
                          )
                        }
                        aria-pressed={item.incluir}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${
                          item.incluir
                            ? "border-primary bg-primary-soft text-primary"
                            : "border-input text-muted-foreground line-through"
                        }`}
                      >
                        {item.nome}
                        {item.incluir ? <X className="size-3.5" aria-hidden="true" /> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </fieldset>
            )}

            {experiencias.length === 0 && formacoes.length === 0 && habilidades.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Não foi possível identificar seções de experiência, formação ou habilidades neste arquivo — tente
                um currículo com esses títulos de seção mais explícitos, ou preencha manualmente no perfil.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
          {rascunho && (
            <Button
              type="button"
              disabled={confirmar.isPending}
              className="min-h-11 gap-2"
              onClick={() => confirmar.mutate()}
            >
              {confirmar.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Confirmar e salvar itens marcados
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
