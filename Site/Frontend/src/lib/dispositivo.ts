/**
 * Como o Site descreve um dispositivo a partir do `user-agent` que o servidor guardou na sessão, sem biblioteca
 * nova. É uma descrição para a pessoa reconhecer o aparelho ("Chrome · Windows"), não uma identificação precisa:
 * o `user-agent` é informado pelo próprio cliente e pode ser qualquer texto.
 */

export type TipoDeDispositivo = "celular" | "tablet" | "computador" | "aplicativo" | "desconhecido";

export type DescricaoDoDispositivo = {
  navegador: string;
  sistema: string;
  tipo: TipoDeDispositivo;
  /** O texto curto para a lista: "Chrome · Windows", "Aplicativo ACESSO · Android". */
  rotulo: string;
};

const APLICATIVO = /okhttp|react-native|expo|cfnetwork|dalvik|acessoapk/i;

function sistemaDe(ua: string): string {
  // Android antes de Linux (o user-agent do Android contém "Linux"), e iOS antes de macOS (contém "like Mac OS X").
  if (ua.includes("android")) return "Android";
  if (/iphone|ipad|ipod/.test(ua)) return "iOS";
  if (ua.includes("cros")) return "ChromeOS";
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("mac os") || ua.includes("macintosh")) return "macOS";
  if (ua.includes("linux")) return "Linux";
  return "";
}

function navegadorDe(ua: string): string {
  // A ordem importa: Edge e Opera dizem também "Chrome"; o Chrome diz também "Safari".
  if (ua.includes("edg/") || ua.includes("edga/") || ua.includes("edgios/")) return "Edge";
  if (ua.includes("opr/") || ua.includes("opera")) return "Opera";
  if (ua.includes("samsungbrowser")) return "Samsung Internet";
  if (ua.includes("firefox/") || ua.includes("fxios/")) return "Firefox";
  if (ua.includes("chrome/") || ua.includes("crios/")) return "Chrome";
  if (ua.includes("safari/")) return "Safari";
  return "Navegador";
}

function tipoDe(ua: string, sistema: string): TipoDeDispositivo {
  if (ua.includes("ipad") || ua.includes("tablet")) return "tablet";
  // Android sem a palavra "mobile" é tablet.
  if (sistema === "Android") return ua.includes("mobile") ? "celular" : "tablet";
  if (sistema === "iOS" || ua.includes("mobile")) return "celular";
  return "computador";
}

export function descreverDispositivo(userAgent?: string | null): DescricaoDoDispositivo {
  if (!userAgent || !userAgent.trim()) {
    return { navegador: "", sistema: "", tipo: "desconhecido", rotulo: "Dispositivo desconhecido" };
  }

  const ua = userAgent.toLowerCase();
  const sistema = sistemaDe(ua);

  if (APLICATIVO.test(userAgent)) {
    return { navegador: "Aplicativo ACESSO", sistema, tipo: "aplicativo", rotulo: sistema ? `Aplicativo ACESSO · ${sistema}` : "Aplicativo ACESSO" };
  }

  const navegador = navegadorDe(ua);

  return { navegador, sistema, tipo: tipoDe(ua, sistema), rotulo: sistema ? `${navegador} · ${sistema}` : navegador };
}

/**
 * "há 5 minutos", "ontem", "há 3 dias". Abaixo de 1 minuto, "há menos de um minuto". Datas inválidas viram texto vazio, para
 * a tela nunca mostrar "NaN".
 */
export function tempoRelativo(iso: string | null | undefined, agora: number = Date.now()): string {
  if (!iso) return "";

  const instante = new Date(iso).getTime();
  if (Number.isNaN(instante)) return "";

  const segundos = Math.round((instante - agora) / 1000);
  const formatador = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

  if (Math.abs(segundos) < 60) return "há menos de um minuto";

  const minutos = Math.round(segundos / 60);
  if (Math.abs(minutos) < 60) return formatador.format(minutos, "minute");

  const horas = Math.round(minutos / 60);
  if (Math.abs(horas) < 24) return formatador.format(horas, "hour");

  const dias = Math.round(horas / 24);
  if (Math.abs(dias) < 30) return formatador.format(dias, "day");

  const meses = Math.round(dias / 30);
  return formatador.format(meses, "month");
}

export function dataHoraCurta(iso: string | null | undefined): string {
  if (!iso) return "";

  try {
    const data = new Date(iso);
    if (Number.isNaN(data.getTime())) return "";

    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(data);
  } catch {
    return "";
  }
}
