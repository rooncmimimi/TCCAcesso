# Acessibilidade avançada: Bloco 3 (empresas e ambientes)

Auditoria e **proposta** de modelo de dados. Nada foi implementado nem aplicado: aguarda a validação do modelo
(migration `0013`). Complementa [acessibilidade-avancada.md](acessibilidade-avancada.md) e
[acessibilidade-avancada-bloco2.md](acessibilidade-avancada-bloco2.md).

## 1. Auditoria

| Item | O que existe hoje | Consequência para o Bloco 3 |
|---|---|---|
| `Vaga` (`models/Vaga.js`) | título, descrição, `requisitos` (texto único), benefícios, salário, modalidade, contrato, cidade/estado, `cargaHoraria` (texto), `publicoAlvo`, `acessibilidade` (texto livre), `recursosAcessibilidade` (lista fechada de 8 chaves, uma delas `interprete_libras`), status. | Não existem: ambiente sensorial, mapa de acessibilidade física, adaptações da entrevista, mídia da vaga, atividades separadas, requisito obrigatório x desejável, etapas da seleção. Hoje o resumo da vaga diz "não informado" nesses casos. |
| Edição de vaga | `NovaVagaDialog`, `EditarVagaDialog`; o backend aceita só os campos de `CAMPOS_EDITAVEIS` (allowlist) e valida em `vagaValidator.js`. | Campos novos entram na allowlist e no validador; os formulários ganham seções. |
| Upload e mídia | `uploadMiddleware.js`: tipo por allowlist, **assinatura binária conferida** (mp4 e webm), limite por tipo (vídeo 50 MB, `MAX_VIDEO_UPLOAD_BYTES`). Vídeo de postagem fica no **bucket privado** e a URL assinada é resolvida sob demanda (`PostagemAnexo`). Não existe tipo de arquivo de legenda (`.vtt`). | O vídeo da vaga reaproveita o mesmo caminho e os mesmos limites. Legenda `.vtt` exige um tipo novo, com conferência de conteúdo. |
| Player de vídeo | só `<video controls>` simples na prévia da postagem. Sem legendas, sem transcrição. | Player acessível novo. |
| Texto alternativo | Campo, orientação, aviso e "decorativa" no momento de publicar (Bloco 2). Edição posterior existe em `GaleriaAnexos`. | A revisão é um painel que lista as **minhas** imagens sem descrição e leva à edição que já existe. Sem schema novo. |
| Glossário e competências | `dados/glossario.ts` tem termos de contrato e modalidade; **não** tem "boa comunicação", "proatividade" etc. | A explicação de requisitos amplia o glossário com competências e formas alternativas de demonstrá-las. Sem schema. |
| Comparação | Não existe. A busca de vagas devolve a lista. | Tela nova. O detalhe da vaga já devolve os campos que vão ser comparados. |
| Respostas da empresa a pedidos de adaptação | Existem (Bloco 2): quatro respostas, por candidatura. | A "entrevista adaptável" declara o que a **vaga** oferece de antemão; a resposta por candidatura continua valendo. |

## 2. Modelo proposto (migration `0013`)

Tudo é informação **sobre a vaga, escrita pela empresa**, sem dado pessoal de ninguém. Todas as colunas novas
são opcionais: vaga sem preenchimento aparece como "a empresa não informou", nunca inventada.

| Recurso | Armazenamento | Observação |
|---|---|---|
| Entrevista adaptável | `vagas.entrevista_adaptacoes text[]` (chaves do mesmo catálogo de adaptações do Bloco 2, as de processo seletivo e comunicação) e `vagas.entrevista_observacao varchar(500)`. | A candidatura mostra "esta vaga oferece" ao lado do que a pessoa pede. |
| Prévia sensorial | `vagas.ambiente_sensorial jsonb` com chaves fechadas: ruído, iluminação, espaço (individual ou compartilhado), interrupções, pausas, comunicação predominante e rotina (texto curto). Cada chave vem de uma lista fechada; ausente = não informado. | JSONB porque são poucas chaves de lista fechada que nunca são filtradas no banco. Validado na aplicação. |
| Mapa de acessibilidade física | `vagas.acessibilidade_fisica jsonb`: por item (rampa, elevador, banheiro acessível, entrada sem degraus, estacionamento, piso tátil, sinalização, circulação, local da entrevista) uma `situacao` (sim, parcial, não, não informado), a `origem` (declarado ou verificado) e um detalhe curto. | "Verificado" não pode ser dito pela própria empresa. |
| Vídeo da vaga em Libras, legendas e transcrição | Tabela nova `vaga_midias` (1 vídeo por vaga): caminho do vídeo e da legenda `.vtt` no bucket privado, tipo, **transcrição** (texto), descrição curta, quem enviou e quando. `ON DELETE CASCADE` da vaga. | Nada é traduzido automaticamente para Libras. A transcrição é obrigatória para publicar o vídeo; a legenda `.vtt` é opcional e recomendada. |
| Avaliador de acessibilidade da vaga | Sem schema. Regras determinísticas no navegador, antes de publicar, com orientação de melhoria. | **Não é certificação legal** e não bloqueia a publicação. |
| Linguagem potencialmente restritiva | Lista de expressões, no avaliador. | Aponta e explica; quem decide é a empresa. |
| Explicação de requisitos | Sem schema. Dicionário de competências no glossário. | Não presume que a competência só se demonstra falando ou presencialmente. |
| Comparador de vagas | Sem schema. Tela `/comparar` (até 3 vagas), sem classificar nenhuma como adequada ou inadequada. | |
| Revisão de texto alternativo | Sem schema. | Só as imagens da própria pessoa. |
| Vagas mais completas (lacuna do Bloco 1) | Colunas `atividades`, `requisitos_desejaveis` e `etapas_selecao` (texto). `requisitos` passa a ser lido como "obrigatórios". | Faz o resumo em linguagem simples e o avaliador usarem dados reais em vez de "não informado". |

Todas as tabelas novas: RLS, sem acesso para `anon` e `authenticated`, gatilho de `atualizado_em`. A migration só
acrescenta, e o cabeçalho traz a ordem de implantação e como voltar atrás.

## 3. Decisões que dependem de você

1. **Quem marca "verificado" no mapa físico.** Proposta: só a moderação do ACESSO, por uma rota de administrador, com data;
   a empresa apenas declara. Sem uma verificação real, o selo seria enganoso.
2. **Onde o mapa físico mora.** Proposta: por vaga (o local pode mudar de uma vaga para outra).
3. **Vídeo em Libras:** exigir a transcrição para publicar, aceitar mp4 e webm até 50 MB, e guardar no bucket privado com
   URL assinada, como o vídeo de postagem.
4. **As três colunas de texto novas** (`atividades`, `requisitos_desejaveis`, `etapas_selecao`).
5. **Banco para testar a `0013`:** o projeto `acesso-desenvolvimento` (hoje pausado) serve de banco descartável.
