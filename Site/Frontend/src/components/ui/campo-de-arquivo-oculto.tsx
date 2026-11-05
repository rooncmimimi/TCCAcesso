import type { ChangeEvent, Ref } from "react";

type Props = {
  /**
   * O que este campo escolhe, em palavras ("Enviar foto do perfil"). **Obrigatório**: o campo não aparece na tela,
   * mas continua ao alcance de quem navega com leitor de tela, e sem nome ele seria anunciado só como "campo de
   * arquivo", sem dizer de quê.
   */
  rotulo: string;
  /** Usado pelo botão visível para abrir o seletor (`campoRef.current?.click()`). */
  ref?: Ref<HTMLInputElement>;
  id?: string;
  /** Tipos aceitos, no formato do atributo `accept`. */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  aoEscolher: (evento: ChangeEvent<HTMLInputElement>) => void;
};

/**
 * Campo de arquivo escondido, acionado por um botão visível ao lado (o padrão de "enviar foto", "anexar currículo"
 * e "adicionar imagem à publicação"). Existe para que esse padrão tenha **um lugar só**: antes, cada tela repetia o
 * mesmo `<input type="file" className="sr-only">` e três delas esqueciam o nome acessível, o que o axe aponta como
 * falha crítica (campo de formulário sem rótulo).
 *
 * `tabIndex={-1}` tira o campo da ordem do Tab, porque quem navega por teclado usa o botão visível; o campo
 * continua alcançável pela navegação do leitor de tela, e é por isso que o rótulo é obrigatório.
 *
 * Quando houver um `<label for>` de verdade na tela (como no diálogo de importar currículo), use o `<label>`: ele
 * abre o seletor sozinho, sem JavaScript, e é o caminho preferido.
 */
export function CampoDeArquivoOculto({ rotulo, ref, id, accept, multiple, disabled, aoEscolher }: Props) {
  return <input ref={ref} id={id} type="file" tabIndex={-1} className="sr-only" aria-label={rotulo} accept={accept} multiple={multiple} disabled={disabled} onChange={aoEscolher} />;
}
