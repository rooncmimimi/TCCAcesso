import { useContext } from "react";

import { AccessibilityContext } from "./AccessibilityContext";
import type { AccessibilityContextValue } from "./accessibilityTypes";

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility precisa estar dentro de AccessibilityProvider");
  return ctx;
}
