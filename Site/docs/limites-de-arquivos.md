# Limites de arquivos enviados

Os limites ficam em **um lugar de cada lado** e um teste confere que os dois lados dizem a mesma coisa:

- Backend: `Site/Backend/src/config/env.js` (tamanhos) e `Site/Backend/src/middlewares/uploadMiddleware.js` (tipos e conferência do conteúdo).
- Frontend: `Site/Frontend/src/lib/arquivos.ts`. O teste `arquivos.test.ts` lê o código do Backend e falha se os números ou os tipos divergirem.

O Site avisa antes de enviar (tamanho e tipo), mas **quem decide é o servidor**: o navegador pode ser contornado.

## Valores finais

| Tipo de arquivo | Tamanho máximo | Formatos aceitos | Onde |
| --- | --- | --- | --- |
| Foto de perfil e capa | 5 MB | PNG, JPEG, WEBP | `FotoUploader`, `CapaUploader` |
| Imagem de publicação | 5 MB | PNG, JPEG, WEBP | feed |
| Documento anexado (currículo etc.) | 5 MB | PDF, DOC, DOCX | perfil, publicação |
| Currículo para **importar dados** | 5 MB | PDF, DOCX (o `.doc` antigo é recusado com orientação) | importação |
| Vídeo | 50 MB | MP4, WEBM | feed |
| Anexos por publicação | 4 | — | feed |

Variáveis de ambiente que mudam os tamanhos: `MAX_UPLOAD_BYTES` (imagem e documento, padrão 5 MB) e `MAX_VIDEO_UPLOAD_BYTES` (vídeo, padrão 50 MB). Se mudar, mude também `LIMITE_BYTES` em `lib/arquivos.ts`; o teste de coerência avisa se esquecer.

## O que o servidor confere

1. Tamanho (Multer, `LIMIT_FILE_SIZE`), quantidade e campo inesperado, com mensagem que diz o limite real.
2. Tipo MIME e extensão aceitos para aquele campo.
3. **Assinatura do arquivo** (magic bytes): um texto renomeado para `.png` é recusado.
4. Currículo importado: lido só em memória, nunca gravado; PDF/DOCX corrompido responde 400 com explicação (nunca 500).

## Armazenamento

Em produção os arquivos vão para o Supabase Storage: fotos, capas e logos num bucket público; currículos e anexos de publicação num bucket privado. O limite de **cada bucket** no painel do Supabase precisa ser **igual ou maior** que os valores acima, senão o Storage recusa depois de o servidor aceitar. Confira em Storage → bucket → configurações (não foi possível verificar pelo código).
