/** Tamanhos de elementos recorrentes. `touchTarget`/`buttonHeight`/
 * `inputHeight` em 48 seguem a recomendação do Material Design para
 * Android (que já excede o mínimo AA do WCAG 2.5.5 de 24px, e cobre o
 * nível "enhanced" de 44px). */
export const sizes = {
  touchTarget: 48,
  iconSmall: 16,
  iconMedium: 20,
  iconLarge: 28,
  avatarSmall: 28,
  avatarMedium: 40,
  avatarLarge: 64,
  /** Cabeçalho de perfil (redesign visual) — mesma escala conceitual do
   * `size-24` (96px) que o Site usa por padrão em `FotoUploader.tsx`. */
  avatarXLarge: 96,
  buttonHeight: 48,
  inputHeight: 48,
} as const;

export type SizeToken = keyof typeof sizes;
