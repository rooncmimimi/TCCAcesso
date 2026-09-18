import { createContext } from "react";

import type { AcessibilidadeContextValue } from "./types";

export const AcessibilidadeContext = createContext<AcessibilidadeContextValue | null>(null);
