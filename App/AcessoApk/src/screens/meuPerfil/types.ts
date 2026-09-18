/**
 * Estado do formulário das seções de experiências, formações, certificados e habilidades: nada
 * aberto (`null`), criando um item novo ou editando um existente. Cada seção tem campos próprios,
 * então só o tipo é compartilhado.
 */
export type EstadoFormulario<T> = { modo: "novo" } | { modo: "editar"; item: T } | null;
