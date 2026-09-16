/**
 * Tempo relativo ("agora", "há 4 min", "há 2h", "há 3 d") — usado nos
 * cabeçalhos de publicação e vaga (redesign visual, itens 4 e 7: toda
 * publicação/vaga precisa mostrar "quando"). Diferente de `formatarData`
 * (duplicado em várias telas, sempre uma DATA absoluta em `Intl.DateTimeFormat`
 * — o suficiente para notificações/mensagens, que já usam esse padrão e não
 * mudam aqui): feed e vagas seguem o mesmo formato relativo que o Site já
 * usa (`formatarTempoRelativo`, `Site/Frontend/src/utils/format.ts`), parte
 * da identidade visual sendo unificada nesta rodada. Um único util
 * compartilhado (não duplicado por tela) porque a lógica real tem ramos
 * (minutos/horas/dias/data completa), diferente da linha única que
 * `formatarData` é em cada tela que a usa.
 */
export function formatarTempoRelativo(valor: string | null | undefined): string {
  if (!valor) return "";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";

  const diffMs = Date.now() - data.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;

  const diffHoras = Math.floor(diffMin / 60);
  if (diffHoras < 24) return `há ${diffHoras}h`;

  const diffDias = Math.floor(diffHoras / 24);
  if (diffDias < 7) return `há ${diffDias} d`;

  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(data);
}
