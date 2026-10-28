/**
 * Aviso simples entre telas que não se conhecem (ex.: a lista de notificações marcou como lidas e
 * o selo da aba precisa ser atualizado).
 */
type Ouvinte = () => void;

const ouvintes = new Map<string, Set<Ouvinte>>();

type Evento = 'notificacoes' | 'publicacoes' | 'vagas' | 'perfil';

export function emitir(evento: Evento): void {
  ouvintes.get(evento)?.forEach((ouvinte) => ouvinte());
}

export function ouvir(evento: Evento, ouvinte: Ouvinte): () => void {
  const lista = ouvintes.get(evento) ?? new Set<Ouvinte>();
  lista.add(ouvinte);
  ouvintes.set(evento, lista);
  return () => {
    lista.delete(ouvinte);
  };
}
