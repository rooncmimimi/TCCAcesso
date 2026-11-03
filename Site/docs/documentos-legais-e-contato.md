# Documentos legais e Fale conosco

## Termos de Uso e Aviso de Privacidade

- Texto: `Site/Frontend/src/dados/documentosLegais.ts`. Páginas públicas `/termos` e `/privacidade` (acessíveis antes do cadastro, durante e depois, pelo rodapé e por Configurações → Privacidade e Segurança).
- Versão vigente: `2026-11-02`, declarada no Backend (`src/config/documentosLegais.js`) e no Site (`VERSAO_DOCUMENTOS`). Um teste confere que são a mesma.
- Aceite: o cadastro exige a caixa marcada e envia `termosVersao`; o servidor recusa versão ausente ou desconhecida e grava `termos_aceitos_em` e `termos_versao`. A versão e a data aparecem em Configurações → Privacidade e Segurança. Conta anterior ao registro mostra "não há versão aceita registrada" (nada é inventado).
- Ao publicar uma versão nova: altere o texto, `VERSAO_DOCUMENTOS` e `VERSAO_DOCUMENTOS_VIGENTE`, e mantenha a anterior em `VERSOES_DE_DOCUMENTOS_CONHECIDAS` se quiser que clientes antigos ainda cadastrem. **Não existe** fluxo para pedir novo aceite a quem já tem conta; o texto não promete isso.

### Pontos que precisam de validação jurídica (não foram decididos pelo código)

1. Idade mínima de 16 anos (hoje é regra técnica do cadastro, não conselho jurídico).
2. Bases legais da LGPD citadas para cada tratamento.
3. Prazos de retenção e o que acontece com os dados ao excluir a conta.
4. Identificação do controlador e do encarregado (DPO) e o canal oficial.
5. Mecanismo de transferência internacional de dados (servidores fora do Brasil).
6. A categoria de deficiência declarada fica visível no perfil para quem pode ver o perfil; o texto diz isso. Se a decisão do dono do projeto for esconder, é mudança de produto.

## Fale conosco

- Página `/fale-conosco`; API `POST /api/contato` (sem login).
- Validação: nome, e-mail, assunto (lista fixa), mensagem de 10 a 3000 caracteres; os mesmos limites no Site e na API (`config/contato.js` ↔ `dados/assuntosDeContato.ts`, com teste).
- Antispam: campo-isca invisível (`website`) e limite de 5 envios por hora por IP.
- Envio real por e-mail (Brevo) com `Reply-To` para a pessoa; a pessoa recebe um protocolo `ACE-XXXXXXXX` só **depois** de o envio ser confirmado.
- Configuração necessária (sem isso responde **503** e o Site mostra o e-mail de contato como alternativa, sem fingir sucesso):
  - `BREVO_API_KEY` e remetente verificado no Brevo (já usados pelos outros e-mails);
  - `CONTATO_EMAIL_DESTINO`: caixa que recebe as mensagens. Não há valor padrão de propósito. Declarada em `Site/Backend/.env.example` e no `render.yaml` (`sync: false`, preencher no painel do Render).
