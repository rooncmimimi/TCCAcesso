import { useRef, useState } from "react";
import { FileUp, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Campo } from "@/components/cadastro/Campo";
import { descricao } from "@/components/cadastro/descricao";
import type { TextosCadastro } from "@/components/cadastro/idioma";
import { perfilService } from "@/services/perfil.service";
import { extrairMensagemErro } from "@/services/api";
import type { RascunhoCurriculo } from "@/types";

const ESCOLARIDADES = [
  "Ensino fundamental",
  "Ensino médio",
  "Ensino técnico",
  "Ensino superior cursando",
  "Ensino superior completo",
  "Pós-graduação",
  "Mestrado",
  "Doutorado",
] as const;

const MAX_ARQUIVO_BYTES = 5 * 1024 * 1024;
const TIPOS_ACEITOS = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

type ItemExperiencia = { cargo: string; empresa: string; dataInicio: string; dataFim: string; descricao: string };
type ItemFormacao = { instituicao: string; curso: string; dataFim: string; descricao: string };

const experienciaVazia = (): ItemExperiencia => ({
  cargo: "",
  empresa: "",
  dataInicio: "",
  dataFim: "",
  descricao: "",
});
const formacaoVazia = (): ItemFormacao => ({ instituicao: "", curso: "", dataFim: "", descricao: "" });

/**
 * Etapa 3: currículo (opcional) e perfil profissional.
 *
 * O currículo reaproveita o importador que já existe (`POST /candidatos/:id/curriculo/importar`),
 * que extrai texto sem IA e devolve um **rascunho** — nunca grava nada sozinho. O arquivo só vira
 * currículo oficial (`PATCH /candidatos/:id/curriculo`) no fim, junto do resto, e sempre vinculado
 * ao `candidatoId` desta sessão.
 *
 * Três regras que o importador precisa respeitar e que estão implementadas aqui:
 *
 * - **Nada é sobrescrito em silêncio.** A importação só preenche campo que está vazio; o que a
 *   pessoa já digitou fica como está, e ela vê tudo antes de salvar.
 * - **Nada é duplicado.** Importar de novo substitui as listas em vez de somar a elas, e a gravação
 *   acontece uma única vez, ao continuar — não a cada importação.
 * - **Nada é inventado.** O parser devolve os blocos de texto que achou; cargo, empresa e datas
 *   ficam em branco para a pessoa preencher, porque adivinhar isso erraria.
 *
 * Quem não tem experiência profissional marca a caixa correspondente em vez de inventar histórico.
 */
export function EtapaCurriculoPerfil({
  candidatoId,
  t,
  aoConcluir,
}: {
  candidatoId: string | null;
  t: TextosCadastro;
  aoConcluir: () => void;
}) {
  const campoArquivoRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [rascunho, setRascunho] = useState<RascunhoCurriculo | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [tituloProfissional, setTituloProfissional] = useState("");
  const [escolaridade, setEscolaridade] = useState("");
  const [biografia, setBiografia] = useState("");
  const [semExperiencia, setSemExperiencia] = useState(false);
  const [experiencias, setExperiencias] = useState<ItemExperiencia[]>([]);
  const [formacoes, setFormacoes] = useState<ItemFormacao[]>([]);
  const [habilidades, setHabilidades] = useState("");

  async function importar(arquivoEscolhido: File) {
    if (!candidatoId) return;

    if (!TIPOS_ACEITOS.includes(arquivoEscolhido.type)) {
      toast.error(t.curriculoFormatos);
      return;
    }
    if (arquivoEscolhido.size > MAX_ARQUIVO_BYTES) {
      toast.error(t.curriculoFormatos);
      return;
    }

    setArquivo(arquivoEscolhido);
    setImportando(true);
    try {
      const extraido = await perfilService.importarCurriculo(candidatoId, arquivoEscolhido);
      setRascunho(extraido);

      // Só preenche o que está vazio: o que a pessoa já escreveu nunca é sobrescrito em silêncio.
      if (extraido.resumo && !biografia.trim()) setBiografia(extraido.resumo);
      if (extraido.habilidades.length && !habilidades.trim()) {
        setHabilidades(extraido.habilidades.join(", "));
      }

      // Substitui as listas em vez de somar: importar duas vezes não duplica nada.
      setExperiencias(
        extraido.experiencias.map((e) => ({
          cargo: e.cargo ?? "",
          empresa: e.empresa ?? "",
          dataInicio: "",
          dataFim: "",
          descricao: e.descricaoSugerida ?? "",
        })),
      );
      setFormacoes(
        extraido.formacoes.map((f) => ({
          instituicao: f.instituicao ?? "",
          curso: f.curso ?? "",
          dataFim: "",
          descricao: f.descricaoSugerida ?? "",
        })),
      );
    } catch (erro) {
      setArquivo(null);
      toast.error(extrairMensagemErro(erro, t.erroCurriculo));
    } finally {
      setImportando(false);
    }
  }


  /** Só grava item completo; item pela metade é ignorado em vez de virar erro de API. */
  const experienciasCompletas = experiencias.filter(
    (e) => e.cargo.trim() && e.empresa.trim() && e.dataInicio,
  );
  const formacoesCompletas = formacoes.filter((f) => f.instituicao.trim() && f.curso.trim());

  async function continuar() {
    if (salvando || !candidatoId) return;
    setSalvando(true);
    try {
      await perfilService.atualizarCandidato(candidatoId, {
        tituloProfissional: tituloProfissional.trim(),
        escolaridade,
        biografia: biografia.trim(),
        ...(rascunho?.linkedin ? { linkedin: rascunho.linkedin } : {}),
        ...(rascunho?.github ? { github: rascunho.github } : {}),
      });

      // Gravação única, aqui no fim: nada é criado a cada importação, então reimportar o mesmo
      // currículo não gera experiência, curso nem habilidade repetida.
      for (const e of experienciasCompletas) {
        await perfilService.criarRecurso("experiencias", {
          cargo: e.cargo.trim(),
          empresa: e.empresa.trim(),
          dataInicio: e.dataInicio,
          ...(e.dataFim ? { dataFim: e.dataFim } : { atual: true }),
          ...(e.descricao.trim() ? { descricao: e.descricao.trim().slice(0, 2000) } : {}),
        });
      }

      for (const f of formacoesCompletas) {
        await perfilService.criarRecurso("formacoes", {
          instituicao: f.instituicao.trim(),
          curso: f.curso.trim(),
          ...(f.dataFim ? { dataFim: f.dataFim } : { emAndamento: true }),
          ...(f.descricao.trim() ? { descricao: f.descricao.trim().slice(0, 2000) } : {}),
        });
      }

      const nomesHabilidades = [...new Set(
        habilidades
          .split(",")
          .map((h) => h.trim())
          .filter((h) => h.length >= 2 && h.length <= 80),
      )];
      for (const nome of nomesHabilidades) {
        await perfilService.criarRecurso("habilidades", { nome });
      }

      // O arquivo vira currículo oficial só agora, e só se houver um.
      if (arquivo) {
        await perfilService.enviarCurriculo(candidatoId, arquivo);
      }

      aoConcluir();
    } catch (erro) {
      toast.error(extrairMensagemErro(erro, t.erroPerfilGenerico));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Currículo: opcional, e nunca a única forma de preencher o perfil. */}
      <div className="rounded-xl border-2 border-dashed border-border p-5">
        <input
          ref={campoArquivoRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          onChange={(e) => {
            const escolhido = e.target.files?.[0];
            if (escolhido) void importar(escolhido);
            e.target.value = "";
          }}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 gap-2"
            disabled={importando || !candidatoId}
            onClick={() => campoArquivoRef.current?.click()}
          >
            {importando ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" /> {t.lendoCurriculo}
              </>
            ) : (
              <>
                <FileUp aria-hidden="true" /> {arquivo ? t.trocarArquivo : t.anexarCurriculo}
              </>
            )}
          </Button>
          {arquivo && <span className="text-sm text-muted-foreground">{arquivo.name}</span>}
        </div>

        <p className="mt-3 text-sm text-muted-foreground">{t.curriculoFormatos}</p>

        {rascunho && (
          <p role="status" className="mt-3 rounded-lg bg-primary-soft px-3 py-2 text-sm">
            {rascunho.experiencias.length || rascunho.formacoes.length || rascunho.resumo
              ? t.curriculoLido
              : t.curriculoNadaExtraido}
          </p>
        )}
      </div>

      <div className="space-y-5">
        <Campo
          id="titulo-profissional"
          rotulo={t.tituloProfissional}
          ajuda={t.tituloProfissionalAjuda}
        >
          <Input
            id="titulo-profissional"
            maxLength={150}
            className="min-h-12"
            value={tituloProfissional}
            onChange={(e) => setTituloProfissional(e.target.value)}
            aria-describedby={descricao("titulo-profissional", true, false)}
          />
        </Campo>

        <Campo id="escolaridade" rotulo={t.escolaridade}>
          <Select value={escolaridade} onValueChange={setEscolaridade}>
            <SelectTrigger
              id="escolaridade"
              className="min-h-12 w-full"
              aria-describedby={descricao("escolaridade", false, false)}
            >
              <SelectValue placeholder={t.escolaridadeSelecione} />
            </SelectTrigger>
            <SelectContent>
              {ESCOLARIDADES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>

        <Campo
          id="biografia"
          rotulo={t.biografia}
          ajuda={t.biografiaAjuda}
        >
          <Textarea
            id="biografia"
            rows={5}
            maxLength={2000}
            value={biografia}
            onChange={(e) => setBiografia(e.target.value)}
            aria-describedby={descricao("biografia", true, false)}
          />
        </Campo>
      </div>

      {/* Experiências: opcionais, com alternativa legítima para quem está começando. */}
      <section aria-labelledby="titulo-experiencias" className="space-y-3">
        <h2 id="titulo-experiencias" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {t.experiencias}
        </h2>

        <div className="flex items-start gap-3">
          <Checkbox
            id="sem-experiencia"
            checked={semExperiencia}
            onCheckedChange={(valor) => {
              const marcado = valor === true;
              setSemExperiencia(marcado);
              if (marcado) setExperiencias([]);
            }}
            className="mt-1"
            aria-describedby="sem-experiencia-ajuda"
          />
          <div>
            <Label htmlFor="sem-experiencia" className="text-sm font-normal">
              {t.semExperiencia}
            </Label>
            <p id="sem-experiencia-ajuda" className="mt-1 text-xs text-muted-foreground">
              {t.semExperienciaAjuda}
            </p>
          </div>
        </div>

        {!semExperiencia && (
          <>
            {experiencias.map((item, indice) => (
              <ItemEditavel
                key={`exp-${indice}`}
                aoRemover={() => setExperiencias(experiencias.filter((_, i) => i !== indice))}
                rotuloRemover={t.removerItem}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <CampoSimples
                    id={`exp-cargo-${indice}`}
                    rotulo={t.cargo}
                    valor={item.cargo}
                    aoMudar={(v) => atualizarLista(setExperiencias, experiencias, indice, { cargo: v })}
                  />
                  <CampoSimples
                    id={`exp-empresa-${indice}`}
                    rotulo={t.empresaItem}
                    valor={item.empresa}
                    aoMudar={(v) => atualizarLista(setExperiencias, experiencias, indice, { empresa: v })}
                  />
                  <CampoSimples
                    id={`exp-inicio-${indice}`}
                    rotulo={`${t.periodo} — ${t.periodoInicio}`}
                    tipo="date"
                    valor={item.dataInicio}
                    aoMudar={(v) => atualizarLista(setExperiencias, experiencias, indice, { dataInicio: v })}
                  />
                  <CampoSimples
                    id={`exp-fim-${indice}`}
                    rotulo={`${t.periodo} — ${t.periodoFim}`}
                    tipo="date"
                    valor={item.dataFim}
                    aoMudar={(v) => atualizarLista(setExperiencias, experiencias, indice, { dataFim: v })}
                  />
                </div>
                <Textarea
                  rows={3}
                  className="mt-3"
                  maxLength={2000}
                  aria-label={`${t.experiencias} ${indice + 1}`}
                  value={item.descricao}
                  onChange={(e) =>
                    atualizarLista(setExperiencias, experiencias, indice, { descricao: e.target.value })
                  }
                />
              </ItemEditavel>
            ))}

            <Button
              type="button"
              variant="outline"
              className="min-h-11 gap-2"
              onClick={() => setExperiencias([...experiencias, experienciaVazia()])}
            >
              <Plus aria-hidden="true" /> {t.adicionarExperiencia}
            </Button>
          </>
        )}
      </section>

      <section aria-labelledby="titulo-formacoes" className="space-y-3">
        <h2 id="titulo-formacoes" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {t.formacoes}
        </h2>

        {formacoes.map((item, indice) => (
          <ItemEditavel
            key={`form-${indice}`}
            aoRemover={() => setFormacoes(formacoes.filter((_, i) => i !== indice))}
            rotuloRemover={t.removerItem}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <CampoSimples
                id={`form-inst-${indice}`}
                rotulo={t.instituicao}
                valor={item.instituicao}
                aoMudar={(v) => atualizarLista(setFormacoes, formacoes, indice, { instituicao: v })}
              />
              <CampoSimples
                id={`form-curso-${indice}`}
                rotulo={t.curso}
                valor={item.curso}
                aoMudar={(v) => atualizarLista(setFormacoes, formacoes, indice, { curso: v })}
              />
            </div>
          </ItemEditavel>
        ))}

        <Button
          type="button"
          variant="outline"
          className="min-h-11 gap-2"
          onClick={() => setFormacoes([...formacoes, formacaoVazia()])}
        >
          <Plus aria-hidden="true" /> {t.adicionarFormacao}
        </Button>
      </section>

      <Campo id="habilidades" rotulo={t.habilidades} ajuda={t.habilidadesAjuda}>
        <Input
          id="habilidades"
          className="min-h-12"
          value={habilidades}
          onChange={(e) => setHabilidades(e.target.value)}
          aria-describedby="habilidades-ajuda"
        />
      </Campo>

      <p className="rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground">
        {t.complementarDepois}
      </p>

      <div className="space-y-3">
        <Button type="button" className="min-h-12 w-full text-base" disabled={salvando} onClick={continuar}>
          {salvando ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" /> {t.enviando}
            </>
          ) : (
            t.continuar
          )}
        </Button>

        {!arquivo && (
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 w-full"
            disabled={salvando}
            onClick={continuar}
          >
            {t.continuarSemCurriculo}
          </Button>
        )}
      </div>
    </div>
  );
}

function atualizarLista<T>(
  definir: (itens: T[]) => void,
  itens: T[],
  indice: number,
  patch: Partial<T>,
) {
  definir(itens.map((item, i) => (i === indice ? { ...item, ...patch } : item)));
}

function ItemEditavel({
  children,
  aoRemover,
  rotuloRemover,
}: {
  children: React.ReactNode;
  aoRemover: () => void;
  rotuloRemover: string;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      {children}
      <Button type="button" variant="ghost" className="mt-3 min-h-9 gap-2 text-sm" onClick={aoRemover}>
        <Trash2 className="size-4" aria-hidden="true" /> {rotuloRemover}
      </Button>
    </div>
  );
}

function CampoSimples({
  id,
  rotulo,
  valor,
  aoMudar,
  tipo = "text",
}: {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  tipo?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
        {rotulo}
      </Label>
      <Input id={id} type={tipo} value={valor} onChange={(e) => aoMudar(e.target.value)} className="min-h-11" />
    </div>
  );
}
