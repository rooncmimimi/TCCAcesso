/**
 * Versões dos Termos de Uso e do Aviso de Privacidade que o ACESSO já publicou.
 *
 * O cadastro grava a versão que a pessoa aceitou (`usuarios.termos_versao`) junto da data
 * (`termos_aceitos_em`), e o servidor só aceita uma versão que exista aqui: o texto que o Site mostrou
 * é o que fica registrado, e um rótulo inventado ou ausente não vira "aceite".
 *
 * Ao mudar o conteúdo em `Frontend/src/dados/documentosLegais.ts`, mude `VERSAO_DOCUMENTOS` lá e
 * acrescente a nova versão aqui. **Não remova versões antigas**: um navegador com o Site em cache ainda
 * pode mostrar a anterior, e ela foi, de fato, o texto exibido. Um teste do Site confere que as duas
 * pontas concordam.
 */
export const VERSAO_DOCUMENTOS_VIGENTE = "2026-11-02";

export const VERSOES_DE_DOCUMENTOS_CONHECIDAS = ["2026-10-13", VERSAO_DOCUMENTOS_VIGENTE];
