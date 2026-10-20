import type { Dicionario } from "../dicionario";

export const boasVindas: Dicionario["boasVindas"] = {
  meta: {
    titulo: "Configura tu accesibilidad — ACESSO",
    descricao: "Primer acceso: ajusta contraste, fuente, voz y Libras y mira cada cambio en tiempo real antes de guardar.",
  },
  passo: "Paso 1 de 1",
  boasVindasNome: (nome) => `¡Te damos la bienvenida, ${nome}!`,
  boasVindas: "¡Te damos la bienvenida a ACESSO!",
  texto:
    "Ajusta cómo quieres ver, oír y navegar. Todo cambia al instante — prueba con libertad y guarda solo cuando esté a tu gusto. Puedes cambiarlo después en el menú de tu perfil.",
  salvarEIr: "Guardar e ir al feed",
  pular: "Omitir por ahora",
  erroSalvar: "No fue posible guardar en tu cuenta. Las preferencias quedaron guardadas en este dispositivo.",
  salvo: "Preferencias guardadas en tu cuenta.",
};
