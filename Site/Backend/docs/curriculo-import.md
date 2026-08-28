# Importação de currículo (PDF/DOCX) — próximos passos

**Status:** não implementado nesta etapa (28/08/2026). Análise de viabilidade concluída
em etapa anterior; decisão explícita do usuário permitia adiar caso o escopo não coubesse
razoavelmente nesta etapa — as demais entregas da etapa (Minha atividade, Descoberta de
pessoas/empresas, autocomplete de cidades, CPF/CNPJ) tomaram a prioridade e o orçamento
de tempo/contexto disponível.

## Por que não é trivial

Importar currículo automaticamente não é um único endpoint — é um fluxo de 4 etapas, cada
uma com superfície de risco própria:

1. **Upload** — reaproveita `uploadMiddleware.js` (já existe), mas precisa de um novo
   `criarProcessadorArmazenamento` apontando para um bucket **privado** (currículo é dado
   sensível), com validação de mimetype (`application/pdf`,
   `application/vnd.openxmlformats-officedocument.wordprocessingml.document`) e tamanho
   máximo (sugestão: 5MB).
2. **Extração de texto** — sem IA, conforme decisão já tomada nesta sessão:
   - PDF: [`pdf-parse`](https://www.npmjs.com/package/pdf-parse) (não instalado ainda).
   - DOCX: [`mammoth`](https://www.npmjs.com/package/mammoth) (não instalado ainda).
   - PDFs escaneados (imagem, sem texto real) não têm solução sem OCR — precisa de uma
     mensagem de erro clara ("não foi possível extrair texto deste arquivo") em vez de
     falhar silenciosamente ou retornar campos vazios sem explicação.
3. **Parsing heurístico → rascunho** — a parte de maior risco de qualidade. Sem IA, a
   extração de campos estruturados (nome, e-mail, telefone, formação, experiências,
   habilidades) a partir de texto livre é feita com regex/heurísticas posicionais
   (ex.: linhas com `@` e formato de e-mail; blocos entre palavras-chave "Experiência"/
   "Formação"/"Habilidades"). Taxa de acerto é inerentemente imperfeita — por isso o
   resultado é sempre um **rascunho**, nunca gravado direto.
4. **Revisão → confirmação → gravação** — tela nova no frontend mostrando o rascunho
   campo a campo, todos editáveis, nada pré-marcado como "correto". Só grava em
   `CandidatoExperiencia`/`CandidatoFormacao`/`CandidatoHabilidade` após confirmação
   explícita do usuário, campo por campo ou em bloco.

## Regra de segurança inegociável (já validada com o usuário)

**CPF (ou qualquer padrão de 11 dígitos) encontrado no texto extraído nunca deve
autopreencher o campo CPF do candidato.** Texto de currículo é entrada não confiável —
mesmo com um regex de CPF "batendo", o número pode estar errado, ser de terceiros (ex.:
currículo cita o CPF de uma referência), ou ser apenas uma sequência numérica coincidente.
Se o parsing encontrar algo parecido com CPF, no máximo pode **sugerir visualmente** ("Este
número parece um CPF — deseja preenchê-lo?") como uma ação manual extra, nunca automática.

## Arquitetura recomendada (quando for retomado)

- Backend: `POST /candidatos/:id/curriculo/importar` — recebe o arquivo, extrai texto,
  roda o parser heurístico, retorna o **rascunho em JSON** (não grava nada ainda).
- Backend: `PATCH /candidatos/:id` (já existe) recebe os campos confirmados/editados pelo
  usuário — reaproveita o fluxo de atualização de perfil já existente, sem endpoint novo
  para a gravação em si.
- Frontend: um diálogo/wizard de 2 passos — "Enviar currículo" → "Revisar e confirmar" —
  populando os mesmos formulários de Experiência/Formação/Habilidades já existentes no
  perfil, pré-preenchidos com o rascunho, mas totalmente editáveis antes de salvar.
- Dependências novas a instalar: `pdf-parse`, `mammoth` (ambas MIT, sem custo, sem
  chamada externa — processamento 100% local, mantendo a mesma filosofia "sem IA paga"
  já usada no chatbot).

## Escopo estimado

Backend (extração + parser + endpoint): médio. Frontend (wizard de revisão reaproveitando
formulários existentes): médio-alto, por ser uma tela nova com bastante estado. Testes
(PDFs variados, DOCX variados, arquivo corrompido, arquivo sem texto extraível, arquivo
malicioso disfarçado de PDF) exigem uma bateria própria antes de considerar pronto.
