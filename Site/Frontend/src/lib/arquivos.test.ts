import { describe, it, expect } from "vitest";
import { textosDoCadastro } from "@/components/cadastro/idioma";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  EXTENSOES_IMPORTAVEIS,
  LIMITE_BYTES,
  MB,
  TIPOS_IMPORTAVEIS,
  TIPOS_MIME,
  atributoAccept,
  categoriaDoArquivo,
  limiteEmMb,
  verificarArquivo,
} from "./arquivos";

const arq = (type: string, size: number) => ({ type, size });

describe("limites e tipos", () => {
  it("imagem e documento: 5 MB; vídeo: 50 MB", () => {
    expect(limiteEmMb("imagem")).toBe(5);
    expect(limiteEmMb("documento")).toBe(5);
    expect(limiteEmMb("video")).toBe(50);
  });

  it("classifica pelo tipo declarado e não conhece o que nenhuma tela aceita", () => {
    expect(categoriaDoArquivo(arq("image/png", 1))).toBe("imagem");
    expect(categoriaDoArquivo(arq("video/webm", 1))).toBe("video");
    expect(categoriaDoArquivo(arq("application/pdf", 1))).toBe("documento");
    expect(categoriaDoArquivo(arq("image/gif", 1))).toBeNull();
    expect(categoriaDoArquivo(arq("", 1))).toBeNull();
  });
});

describe("verificarArquivo", () => {
  it("aceita imagem dentro do limite e de exatamente 5 MB", () => {
    expect(verificarArquivo(arq("image/png", 1 * MB), ["imagem"])).toEqual({ ok: true });
    expect(verificarArquivo(arq("image/jpeg", 5 * MB), ["imagem"])).toEqual({ ok: true });
  });

  it("recusa imagem acima de 5 MB dizendo o tamanho do arquivo e o limite", () => {
    const r = verificarArquivo(arq("image/png", 6 * MB), ["imagem"]);

    expect(r).toMatchObject({ ok: false, motivo: "tamanho" });
    expect(r.ok === false && r.mensagem).toBe("Imagem muito grande (6.0 MB). O limite é 5 MB.");
  });

  it("vídeo vai até 50 MB; acima disso é recusado", () => {
    expect(verificarArquivo(arq("video/mp4", 49 * MB), ["imagem", "video"])).toEqual({ ok: true });
    expect(verificarArquivo(arq("video/mp4", 50 * MB), ["imagem", "video"])).toEqual({ ok: true });

    const r = verificarArquivo(arq("video/mp4", 51 * MB), ["imagem", "video"]);
    expect(r.ok === false && r.mensagem).toBe("Vídeo muito grande (51 MB). O limite é 50 MB.");
  });

  it("numa tela que aceita imagem e vídeo, a imagem continua limitada a 5 MB", () => {
    expect(verificarArquivo(arq("image/png", 6 * MB), ["imagem", "video"])).toMatchObject({ ok: false, motivo: "tamanho" });
  });

  it("recusa o tipo que a tela não aceita, com mensagem do que enviar", () => {
    const foto = verificarArquivo(arq("application/pdf", MB), ["imagem"]);
    expect(foto.ok === false && foto.mensagem).toBe("Formato inválido. Envie uma imagem PNG, JPEG ou WEBP.");

    const anexo = verificarArquivo(arq("application/pdf", MB), ["imagem", "video"]);
    expect(anexo.ok === false && anexo.mensagem).toBe("Formato inválido. Envie imagens (PNG, JPEG ou WEBP) ou vídeos (MP4 ou WEBM).");

    const doc = verificarArquivo(arq("image/png", MB), ["documento"]);
    expect(doc.ok === false && doc.mensagem).toBe("Formato inválido. Envie um arquivo PDF, DOC ou DOCX.");
  });

  it("recusa arquivo vazio", () => {
    expect(verificarArquivo(arq("image/png", 0), ["imagem"])).toMatchObject({ ok: false, motivo: "vazio" });
  });

  it("para importar currículo, só PDF e DOCX (o .doc antigo é recusado)", () => {
    const opcoes = { tipos: TIPOS_IMPORTAVEIS, formatos: "um arquivo PDF ou DOCX" };

    expect(verificarArquivo(arq("application/pdf", MB), ["documento"], opcoes)).toEqual({ ok: true });
    expect(
      verificarArquivo(arq("application/vnd.openxmlformats-officedocument.wordprocessingml.document", MB), ["documento"], opcoes),
    ).toEqual({ ok: true });

    const doc = verificarArquivo(arq("application/msword", MB), ["documento"], opcoes);
    expect(doc.ok === false && doc.mensagem).toBe("Formato inválido. Envie um arquivo PDF ou DOCX.");
  });
});

describe("atributoAccept", () => {
  it("junta tipos e extensões da categoria", () => {
    expect(atributoAccept(["imagem"])).toBe("image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp");
    expect(atributoAccept(["documento"], { tipos: TIPOS_IMPORTAVEIS, extensoes: EXTENSOES_IMPORTAVEIS })).toBe(
      "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.docx",
    );
  });
});

describe("coerência com o servidor", () => {
  const servidor = readFileSync(resolve(__dirname, "../../../Backend/src/config/env.js"), "utf8");
  const middleware = readFileSync(resolve(__dirname, "../../../Backend/src/middlewares/uploadMiddleware.js"), "utf8");

  it("os limites padrão do servidor são os do Site", () => {
    expect(servidor).toContain("MAX_UPLOAD_BYTES) || 5 * 1024 * 1024");
    expect(servidor).toContain("MAX_VIDEO_UPLOAD_BYTES) || 50 * 1024 * 1024");
    expect(LIMITE_BYTES.imagem).toBe(5 * 1024 * 1024);
    expect(LIMITE_BYTES.video).toBe(50 * 1024 * 1024);
  });

  it("o servidor aceita exatamente os tipos que o Site oferece", () => {
    const tiposDoServidor = (nome: string): string[] => {
      const bloco = middleware.match(new RegExp(`export const ${nome} = \\{([\\s\\S]*?)\\};`));
      if (!bloco) throw new Error(`${nome} não encontrado no servidor`);

      return [...bloco[1].matchAll(/"([a-z]+\/[^"]+)":/g)].map((m) => m[1]);
    };

    expect(tiposDoServidor("MIME_IMAGENS").sort()).toEqual([...TIPOS_MIME.imagem].sort());
    expect(tiposDoServidor("MIME_VIDEOS").sort()).toEqual([...TIPOS_MIME.video].sort());
    expect(tiposDoServidor("MIME_DOCUMENTOS").sort()).toEqual([...TIPOS_MIME.documento].sort());
    expect(tiposDoServidor("MIME_IMPORTAVEIS").sort()).toEqual([...TIPOS_IMPORTAVEIS].sort());
  });
});

describe("textos que citam o limite", () => {
  it.each(["pt", "en", "es"] as const)("o texto do currículo no cadastro (%s) diz o limite real de documento", (idioma) => {
    expect(textosDoCadastro(idioma).curriculoFormatos).toContain(`${limiteEmMb("documento")} MB`);
  });
});
