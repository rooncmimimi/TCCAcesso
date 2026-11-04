/**
 * Contraste de cores no cálculo do WCAG 2.x (1.4.3 e 1.4.11), para a tela de cores personalizadas.
 * Funções puras. Só aceitam `#rrggbb`: é o formato que `<input type="color">` devolve, e o único
 * que vai parar no CSS (`ehCorHex`), o que impede a preferência de carregar CSS arbitrário.
 */

export function ehCorHex(valor: unknown): valor is string {
  return typeof valor === "string" && /^#[0-9a-fA-F]{6}$/.test(valor);
}

function canal(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Luminância relativa (0 a 1) de `#rrggbb`. */
export function luminancia(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** Razão de contraste entre duas cores, de 1 (iguais) a 21 (preto e branco). */
export function razaoDeContraste(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  const [claro, escuro] = la >= lb ? [la, lb] : [lb, la];
  return (claro + 0.05) / (escuro + 0.05);
}

export type NivelDeContraste = "AAA" | "AA" | "insuficiente";

/**
 * Nível do contraste para texto: AAA a partir de 7:1, AA a partir de 4,5:1, abaixo disso é
 * insuficiente. Para elementos que não são texto (contorno de foco), use `minimo` 3.
 */
export function avaliarContraste(frente: string, fundo: string, minimo = 4.5): { razao: number; nivel: NivelDeContraste } {
  const razao = razaoDeContraste(frente, fundo);
  if (minimo === 4.5 && razao >= 7) return { razao, nivel: "AAA" };
  return { razao, nivel: razao >= minimo ? "AA" : "insuficiente" };
}

/** `4.52` vira "4,52:1", no formato brasileiro. */
export function formatarRazao(razao: number): string {
  return `${razao.toFixed(2).replace(".", ",")}:1`;
}
