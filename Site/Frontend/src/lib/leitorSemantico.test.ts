import { describe, it, expect } from "vitest";
import { descreverElemento, obterContextoDialogo, resolverAlvoFalavel } from "./leitorSemantico";

/**
 * `leitorSemantico.ts` lê `el.innerText` (texto como o usuário VÊ, calculado
 * a partir do layout renderizado) — jsdom não faz layout e nunca implementou
 * essa propriedade (limitação documentada do próprio jsdom, não um bug
 * daqui). Define-a manualmente só onde o teste depende de texto visível
 * de outro elemento (aria-describedby/aria-labelledby); os demais testes
 * usam aria-label/placeholder/title/alt, que não dependem disso.
 */
function definirTextoVisivel(el: HTMLElement, texto: string) {
    Object.defineProperty(el, "innerText", { value: texto, configurable: true });
}

describe("descreverElemento", () => {
    it("usa data-speak quando presente, ignorando qualquer outra informação do elemento", () => {
        const botao = document.createElement("button");
        botao.dataset.speak = "Ampliar imagem";
        botao.setAttribute("aria-label", "outro texto, nunca deveria ser lido");

        expect(descreverElemento(botao)).toBe("Ampliar imagem");
    });

    it("descreve uma imagem com alt como 'Imagem: <alt>.'", () => {
        const img = document.createElement("img");
        img.setAttribute("alt", "Foto de perfil de Maria");

        expect(descreverElemento(img)).toBe("Imagem: Foto de perfil de Maria.");
    });

    it("não descreve uma imagem decorativa (alt vazio)", () => {
        const img = document.createElement("img");
        img.setAttribute("alt", "");

        expect(descreverElemento(img)).toBeNull();
    });

    it("combina nome (aria-label) + função para um botão comum", () => {
        const botao = document.createElement("button");
        botao.setAttribute("aria-label", "Salvar alterações");

        expect(descreverElemento(botao)).toBe("Salvar alterações, botão.");
    });

    it("usa a palavra de função certa para um switch (role) em vez da tag nativa", () => {
        const interruptor = document.createElement("button");
        interruptor.setAttribute("role", "switch");
        interruptor.setAttribute("aria-label", "Perfil público");
        interruptor.setAttribute("aria-checked", "true");

        // aria-label já presente: não repete "ativado" (a autora do rótulo já descreveu o estado, ou optou por não fazê-lo)
        expect(descreverElemento(interruptor)).toBe("Perfil público, interruptor.");
    });

    it("fala 'ativado'/'desativado' para um switch sem aria-label, a partir de aria-checked", () => {
        const interruptor = document.createElement("button");
        interruptor.setAttribute("role", "switch");
        interruptor.setAttribute("title", "Notificações por e-mail");
        interruptor.setAttribute("aria-checked", "false");

        expect(descreverElemento(interruptor)).toBe("Notificações por e-mail, interruptor, desativado.");
    });

    it("usa o placeholder como nome quando não há aria-label/label associado", () => {
        const campo = document.createElement("input");
        campo.type = "text";
        campo.placeholder = "Buscar por nome ou cargo";

        expect(descreverElemento(campo)).toBe("Buscar por nome ou cargo, campo de texto.");
    });

    it("marca um campo como 'com erro' e anexa a descrição de aria-describedby", () => {
        const erro = document.createElement("span");
        erro.id = "erro-email";
        definirTextoVisivel(erro, "Informe um e-mail válido.");
        document.body.appendChild(erro);

        const campo = document.createElement("input");
        campo.setAttribute("aria-label", "E-mail");
        campo.setAttribute("aria-invalid", "true");
        campo.setAttribute("aria-describedby", "erro-email");
        document.body.appendChild(campo);

        expect(descreverElemento(campo)).toBe("E-mail, campo de texto, com erro. Erro: Informe um e-mail válido.");

        document.body.removeChild(campo);
        document.body.removeChild(erro);
    });
});

describe("obterContextoDialogo", () => {
    it("junta título (aria-labelledby) e descrição (aria-describedby) do diálogo", () => {
        const titulo = document.createElement("h2");
        titulo.id = "titulo-dialogo";
        definirTextoVisivel(titulo, "Excluir publicação");

        const descricao = document.createElement("p");
        descricao.id = "descricao-dialogo";
        definirTextoVisivel(descricao, "Esta ação não pode ser desfeita.");

        const dialogo = document.createElement("div");
        dialogo.setAttribute("role", "dialog");
        dialogo.setAttribute("aria-labelledby", "titulo-dialogo");
        dialogo.setAttribute("aria-describedby", "descricao-dialogo");
        document.body.append(titulo, descricao, dialogo);

        expect(obterContextoDialogo(dialogo)).toBe("Excluir publicação. Esta ação não pode ser desfeita.");

        document.body.innerHTML = "";
    });

    it("retorna null quando o diálogo não declara aria-labelledby nem aria-describedby", () => {
        const dialogo = document.createElement("div");
        dialogo.setAttribute("role", "dialog");

        expect(obterContextoDialogo(dialogo)).toBeNull();
    });
});

describe("resolverAlvoFalavel", () => {
    it("resolve para o botão, nunca para a imagem que está dentro dele", () => {
        const botao = document.createElement("button");
        const img = document.createElement("img");
        img.setAttribute("alt", "Ampliar");
        botao.appendChild(img);
        document.body.appendChild(botao);

        expect(resolverAlvoFalavel(img)).toBe(botao);

        document.body.removeChild(botao);
    });

    it("resolve para a própria imagem quando ela não está dentro de nenhum controle", () => {
        const img = document.createElement("img");
        img.setAttribute("alt", "Foto ampliada");
        document.body.appendChild(img);

        expect(resolverAlvoFalavel(img)).toBe(img);

        document.body.removeChild(img);
    });

    it("retorna null para um alvo sem nenhum ancestral falável", () => {
        const div = document.createElement("div");
        document.body.appendChild(div);

        expect(resolverAlvoFalavel(div)).toBeNull();

        document.body.removeChild(div);
    });
});
