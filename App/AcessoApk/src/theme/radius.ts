/** Escala de raio de borda. `pill` é só para casos redondos de propósito
 * (badge, chip) — a maioria dos componentes usa `md`/`lg`, para não virar
 * uma interface onde tudo parece uma pílula. */
export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radius;
