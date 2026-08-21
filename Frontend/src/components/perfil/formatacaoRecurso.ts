import { formatarData } from "@/utils/format";
import type { RecursoPerfil } from "@/services/perfil.service";
import type { Certificado, Experiencia, Formacao, Habilidade } from "@/types";

export type RegistroPerfil = Experiencia | Formacao | Certificado | Habilidade;

/** Linha principal (título) de um item de experiência/formação/certificado/habilidade. */
export function linhaPrincipal(recurso: RecursoPerfil, item: RegistroPerfil): string {
  if (recurso === "experiencias") return (item as Experiencia).cargo;
  if (recurso === "formacoes") return (item as Formacao).curso;
  if (recurso === "certificados") return (item as Certificado).titulo;
  return (item as Habilidade).nome;
}

/** Linha secundária (contexto) de um item de experiência/formação/certificado/habilidade. */
export function linhaSecundaria(recurso: RecursoPerfil, item: RegistroPerfil): string {
  if (recurso === "experiencias") {
    const e = item as Experiencia;
    const periodo = e.atual
      ? `${formatarData(e.dataInicio)} — atual`
      : `${formatarData(e.dataInicio)} — ${e.dataFim ? formatarData(e.dataFim) : "?"}`;
    return `${e.empresa} · ${periodo}`;
  }
  if (recurso === "formacoes") {
    const f = item as Formacao;
    return [f.instituicao, f.nivel].filter(Boolean).join(" · ");
  }
  if (recurso === "certificados") {
    const c = item as Certificado;
    return [c.instituicao, c.emitidoEm ? formatarData(c.emitidoEm) : null].filter(Boolean).join(" · ");
  }
  const h = item as Habilidade;
  return h.nivel ?? "";
}
