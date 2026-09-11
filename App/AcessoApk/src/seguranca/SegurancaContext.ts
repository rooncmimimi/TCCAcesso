import { createContext } from "react";

import type { EstadoBloqueioBiometrico } from "./useBloqueioBiometrico";

export const SegurancaContext = createContext<EstadoBloqueioBiometrico | null>(null);
