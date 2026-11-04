package com.acesso.app;

import static org.junit.Assert.assertTrue;

import org.junit.BeforeClass;
import org.junit.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.xml.parsers.DocumentBuilderFactory;

/**
 * Regras de acessibilidade conferidas em todos os layouts (res/layout), para uma tela nova não voltar a
 * ter os problemas que o lint do Android não pega ou só pega em parte:
 * <ul>
 *   <li>imagem precisa de descrição ou ser marcada como decorativa (contentDescription="@null" ou
 *       importantForAccessibility);</li>
 *   <li>botão sem texto (só ícone) precisa de descrição;</li>
 *   <li>tamanho de texto em sp, para acompanhar a fonte escolhida no celular;</li>
 *   <li>área de toque de no mínimo 48dp e botão sem altura fixa (com fonte grande o texto seria cortado);</li>
 *   <li>campo de texto com rótulo (hint próprio ou do TextInputLayout).</li>
 * </ul>
 * Lê os estilos de values/temas.xml, porque muitas dessas propriedades vêm do estilo e não do elemento.
 */
public class LayoutsAcessiveisTeste {

    private static final String ANDROID = "http://schemas.android.com/apk/res/android";
    private static final Pattern DP = Pattern.compile("(\\d+(?:\\.\\d+)?)dp");

    private static File pastaRes;
    private static final Map<String, Map<String, String>> estilos = new HashMap<>();
    private static final Map<String, String> pais = new HashMap<>();
    private static final Map<String, String> dimensoes = new HashMap<>();
    private static final List<Document> layouts = new ArrayList<>();
    private static final List<String> nomesLayouts = new ArrayList<>();

    @BeforeClass
    public static void carregar() throws Exception {
        // Testes de unidade do Android rodam na pasta do módulo (app/); pelo Android Studio pode ser a raiz.
        pastaRes = new File("src/main/res");
        if (!pastaRes.isDirectory()) {
            pastaRes = new File("app/src/main/res");
        }
        assertTrue("pasta res não encontrada a partir de " + new File(".").getAbsolutePath(), pastaRes.isDirectory());

        for (File valores : listar(new File(pastaRes, "values"))) {
            Document doc = ler(valores);
            NodeList estilosXml = doc.getElementsByTagName("style");
            for (int i = 0; i < estilosXml.getLength(); i++) {
                Element estilo = (Element) estilosXml.item(i);
                Map<String, String> itens = new HashMap<>();
                NodeList filhos = estilo.getElementsByTagName("item");
                for (int j = 0; j < filhos.getLength(); j++) {
                    Element item = (Element) filhos.item(j);
                    itens.put(item.getAttribute("name"), item.getTextContent().trim());
                }
                estilos.put(estilo.getAttribute("name"), itens);
                if (estilo.hasAttribute("parent")) {
                    pais.put(estilo.getAttribute("name"), estilo.getAttribute("parent"));
                }
            }
            NodeList dimens = doc.getElementsByTagName("dimen");
            for (int i = 0; i < dimens.getLength(); i++) {
                Element dimen = (Element) dimens.item(i);
                dimensoes.put("@dimen/" + dimen.getAttribute("name"), dimen.getTextContent().trim());
            }
        }
        for (File layout : listar(new File(pastaRes, "layout"))) {
            layouts.add(ler(layout));
            nomesLayouts.add(layout.getName());
        }
        assertTrue("nenhum layout lido", layouts.size() > 30);
    }

    @Test
    public void imagensTemDescricaoOuSaoDecorativas() {
        List<String> problemas = new ArrayList<>();
        percorrer((nome, el) -> {
            if (!tipo(el, "ImageView", "ImageButton", "ShapeableImageView", "FloatingActionButton")) {
                return;
            }
            // contentDescription="@null" é a forma explícita (aceita pelo lint) de dizer "decorativa".
            if (atributo(el, "contentDescription") == null && !decorativo(el)) {
                problemas.add(nome + ": " + identificar(el));
            }
        });
        assertTrue("Imagem sem contentDescription (texto, ou @null se for decorativa) e sem "
                + "importantForAccessibility=\"no\": " + problemas, problemas.isEmpty());
    }

    @Test
    public void botoesSoComIconeTemDescricao() {
        List<String> problemas = new ArrayList<>();
        percorrer((nome, el) -> {
            if (tipo(el, "MaterialButton", "Button") && vazio(atributo(el, "text"))
                    && vazio(atributo(el, "contentDescription")) && !decorativo(el)
                    && el.hasAttribute("app:icon")) {
                problemas.add(nome + ": " + identificar(el));
            }
        });
        assertTrue("Botão só com ícone e sem contentDescription: " + problemas, problemas.isEmpty());
    }

    @Test
    public void textoEmSpAcompanhaAFonteDoCelular() {
        List<String> problemas = new ArrayList<>();
        percorrer((nome, el) -> {
            String tamanho = resolverDimensao(atributo(el, "textSize"));
            if (tamanho != null && !tamanho.startsWith("?") && !tamanho.endsWith("sp")) {
                problemas.add(nome + ": " + identificar(el) + " textSize=" + tamanho);
            }
        });
        for (Map.Entry<String, Map<String, String>> estilo : estilos.entrySet()) {
            String tamanho = resolverDimensao(estilo.getValue().get("android:textSize"));
            if (tamanho != null && !tamanho.startsWith("?") && !tamanho.endsWith("sp")) {
                problemas.add("estilo " + estilo.getKey() + " textSize=" + tamanho);
            }
        }
        assertTrue("textSize fora de sp: " + problemas, problemas.isEmpty());
    }

    @Test
    public void areasDeToqueTemPeloMenos48dpEBotoesNaoTemAlturaFixa() {
        List<String> problemas = new ArrayList<>();
        percorrer((nome, el) -> {
            boolean clicavel = "true".equals(atributo(el, "clickable"))
                    || tipo(el, "Button", "MaterialButton", "ImageButton", "FloatingActionButton");
            if (!clicavel) {
                return;
            }
            for (String lado : new String[]{"layout_width", "layout_height"}) {
                Double medida = emDp(atributo(el, lado));
                if (medida != null && medida > 0 && medida < 48) {
                    problemas.add(nome + ": " + identificar(el) + " " + lado + "=" + medida + "dp");
                }
            }
            if (tipo(el, "Button", "MaterialButton") && emDp(atributo(el, "layout_height")) != null) {
                problemas.add(nome + ": " + identificar(el) + " altura fixa (use wrap_content e minHeight)");
            }
        });
        assertTrue("Área de toque pequena ou altura fixa em botão: " + problemas, problemas.isEmpty());
    }

    @Test
    public void camposDeTextoTemRotulo() {
        List<String> problemas = new ArrayList<>();
        percorrer((nome, el) -> {
            if (!tipo(el, "EditText", "TextInputEditText", "AutoCompleteTextView", "MaterialAutoCompleteTextView")) {
                return;
            }
            if (!vazio(atributo(el, "hint")) || !vazio(atributo(el, "contentDescription"))) {
                return;
            }
            // O TextInputLayout repassa o hint dele ao campo (é o que o TalkBack lê).
            Node pai = el.getParentNode();
            for (int nivel = 0; nivel < 2 && pai instanceof Element; nivel++, pai = pai.getParentNode()) {
                Element elementoPai = (Element) pai;
                if (elementoPai.getTagName().endsWith("TextInputLayout") && !vazio(atributo(elementoPai, "hint"))) {
                    return;
                }
            }
            problemas.add(nome + ": " + identificar(el));
        });
        assertTrue("Campo de texto sem rótulo: " + problemas, problemas.isEmpty());
    }

    // ---------------------------------------------------------------------

    private interface Visitante {
        void visitar(String nomeLayout, Element elemento);
    }

    private static void percorrer(Visitante visitante) {
        for (int i = 0; i < layouts.size(); i++) {
            NodeList todos = layouts.get(i).getElementsByTagName("*");
            for (int j = 0; j < todos.getLength(); j++) {
                visitante.visitar(nomesLayouts.get(i), (Element) todos.item(j));
            }
        }
    }

    private static boolean tipo(Element el, String... nomes) {
        String tag = el.getTagName();
        String simples = tag.substring(tag.lastIndexOf('.') + 1);
        for (String nome : nomes) {
            if (simples.equals(nome)) {
                return true;
            }
        }
        return false;
    }

    /** Decorativo no próprio elemento (ou pelo estilo) ou dentro de um grupo que esconde os filhos do TalkBack. */
    private static boolean decorativo(Element el) {
        String valor = atributo(el, "importantForAccessibility");
        if ("no".equals(valor) || "noHideDescendants".equals(valor)) {
            return true;
        }
        for (Node pai = el.getParentNode(); pai instanceof Element; pai = pai.getParentNode()) {
            if ("noHideDescendants".equals(atributo((Element) pai, "importantForAccessibility"))) {
                return true;
            }
        }
        return false;
    }

    /** Valor do atributo android:nome no elemento ou, se não houver, no estilo dele (e nos estilos-pai). */
    private static String atributo(Element el, String nome) {
        String direto = el.getAttributeNS(ANDROID, nome);
        if (!direto.isEmpty()) {
            return direto;
        }
        String estilo = el.getAttribute("style");
        for (int voltas = 0; estilo != null && estilo.startsWith("@style/") && voltas < 10; voltas++) {
            String nomeEstilo = estilo.substring("@style/".length());
            Map<String, String> itens = estilos.get(nomeEstilo);
            if (itens == null) {
                return null;
            }
            if (itens.containsKey("android:" + nome)) {
                return itens.get("android:" + nome);
            }
            String pai = pais.get(nomeEstilo);
            if (pai == null && nomeEstilo.contains(".")) {
                pai = nomeEstilo.substring(0, nomeEstilo.lastIndexOf('.'));
            }
            estilo = pai == null || pai.isEmpty() ? null : (pai.startsWith("@style/") ? pai : "@style/" + pai);
        }
        return null;
    }

    private static String resolverDimensao(String valor) {
        String atual = valor;
        for (int voltas = 0; atual != null && dimensoes.containsKey(atual) && voltas < 5; voltas++) {
            atual = dimensoes.get(atual);
        }
        return atual;
    }

    private static Double emDp(String valor) {
        String resolvido = resolverDimensao(valor);
        if (resolvido == null) {
            return null;
        }
        Matcher m = DP.matcher(resolvido);
        return m.matches() ? Double.valueOf(m.group(1)) : null;
    }

    private static boolean vazio(String valor) {
        return valor == null || valor.isEmpty();
    }

    private static String identificar(Element el) {
        String id = el.getAttributeNS(ANDROID, "id");
        return el.getTagName() + (id.isEmpty() ? "" : " " + id.replace("@+id/", ""));
    }

    private static List<File> listar(File pasta) {
        List<File> arquivos = new ArrayList<>();
        File[] lista = pasta.listFiles((dir, nome) -> nome.endsWith(".xml"));
        if (lista != null) {
            Arrays.sort(lista);
            Collections.addAll(arquivos, lista);
        }
        return arquivos;
    }

    private static Document ler(File arquivo) throws Exception {
        DocumentBuilderFactory fabrica = DocumentBuilderFactory.newInstance();
        fabrica.setNamespaceAware(true);
        return fabrica.newDocumentBuilder().parse(arquivo);
    }
}
