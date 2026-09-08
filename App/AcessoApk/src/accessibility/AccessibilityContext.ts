import { createContext } from "react";

import type { AccessibilityContextValue } from "./accessibilityTypes";

export const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);
