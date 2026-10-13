package com.acesso.app.telas;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.os.Bundle;
import android.provider.Settings;
import android.text.Annotation;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.ForegroundColorSpan;
import android.util.TypedValue;
import android.view.View;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.acesso.app.BuildConfig;
import com.acesso.app.R;
import com.acesso.app.databinding.TelaApresentacaoBinding;
import com.acesso.app.utilitarios.GerenciadorApresentacao;
import com.acesso.app.utilitarios.GerenciadorSessao;

/**
 * Primeira tela do app: apresenta o ACESSO na primeira vez que ele é aberto.
 * Depois de concluída (ou se já houver sessão salva), segue direto para a TelaLogin,
 * que continua cuidando do login automático.
 */
public class TelaApresentacao extends AppCompatActivity {

    /**
     * Só no build de debug: força a apresentação mesmo já tendo sido vista.
     * adb shell am start -n com.acesso.app/.telas.TelaApresentacao --ez mostrar_apresentacao true
     */
    public static final String EXTRA_MOSTRAR_APRESENTACAO = "mostrar_apresentacao";

    private static final float ESCALA_MAXIMA_TITULO = 1.3f;

    private GerenciadorApresentacao gerenciadorApresentacao;

    @Override
    protected void onCreate(Bundle estadoSalvo) {
        super.onCreate(estadoSalvo);
        gerenciadorApresentacao = new GerenciadorApresentacao(this);

        boolean forcarApresentacao = BuildConfig.DEBUG
                && getIntent().getBooleanExtra(EXTRA_MOSTRAR_APRESENTACAO, false);
        boolean temSessao = new GerenciadorSessao(this).obter() != null;
        if (!forcarApresentacao && (gerenciadorApresentacao.foiConcluida() || temSessao)) {
            seguirParaApp(false);
            return;
        }

        TelaApresentacaoBinding componentes = TelaApresentacaoBinding.inflate(getLayoutInflater());
        setContentView(componentes.getRoot());
        aplicarMargensSistema(componentes);

        componentes.titulo.setText(colorirDestaques(getText(R.string.apresentacao_titulo)));
        limitarCrescimentoTitulo(componentes.titulo);

        componentes.botaoEntrar.setOnClickListener(v -> seguirParaApp(false));
        componentes.botaoCriarConta.setOnClickListener(v -> seguirParaApp(true));
        componentes.botaoQueroVagas.setOnClickListener(v -> seguirParaApp(true));
        // Ainda não existe cadastro específico de empresa: usa o cadastro atual
        componentes.botaoSouEmpresa.setOnClickListener(v -> seguirParaApp(true));
        componentes.botaoConfigurarAcessibilidade.setOnClickListener(v -> abrirConfiguracoesAcessibilidade());
    }

    /**
     * Marca a apresentação como vista e abre a TelaLogin. Para criar conta, a
     * TelaCadastro abre por cima do login, então "Voltar" leva ao login.
     */
    private void seguirParaApp(boolean abrirCadastro) {
        gerenciadorApresentacao.marcarComoConcluida();
        Intent login = new Intent(this, TelaLogin.class);
        if (abrirCadastro) {
            startActivities(new Intent[]{login, new Intent(this, TelaCadastro.class)});
        } else {
            startActivity(login);
        }
        finish();
    }

    private void abrirConfiguracoesAcessibilidade() {
        try {
            startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS));
        } catch (ActivityNotFoundException semTela) {
            startActivity(new Intent(Settings.ACTION_SETTINGS));
        }
    }

    /**
     * O título já é grande: com a fonte do sistema no máximo ele quebraria as palavras
     * no meio. Como faz o Android 14+ (escala não linear), ele cresce só até 1,3x;
     * os demais textos continuam acompanhando a fonte do celular normalmente.
     */
    private void limitarCrescimentoTitulo(TextView titulo) {
        float escalaFonte = getResources().getConfiguration().fontScale;
        if (escalaFonte > ESCALA_MAXIMA_TITULO) {
            float tamanho = getResources().getDimension(R.dimen.apresentacao_texto_titulo);
            titulo.setTextSize(TypedValue.COMPLEX_UNIT_PX, tamanho / escalaFonte * ESCALA_MAXIMA_TITULO);
        }
    }

    /** Pinta os trechos marcados com <annotation cor="..."> no texto do título. */
    private CharSequence colorirDestaques(CharSequence texto) {
        SpannableString textoColorido = new SpannableString(texto);
        for (Annotation marcacao : textoColorido.getSpans(0, textoColorido.length(), Annotation.class)) {
            if (!"cor".equals(marcacao.getKey())) {
                continue;
            }
            int cor = ContextCompat.getColor(this, "verde".equals(marcacao.getValue())
                    ? R.color.acesso_primaria
                    : R.color.acesso_erro);
            textoColorido.setSpan(new ForegroundColorSpan(cor),
                    textoColorido.getSpanStart(marcacao),
                    textoColorido.getSpanEnd(marcacao),
                    Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        }
        return textoColorido;
    }

    /**
     * A tela desenha atrás da status bar e da barra de navegação: o cabeçalho
     * branco ganha a altura da status bar e o fim da rolagem a da navegação.
     */
    private void aplicarMargensSistema(TelaApresentacaoBinding componentes) {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
                .setAppearanceLightStatusBars(true);

        View cabecalho = componentes.cabecalho;
        View conteudo = componentes.conteudo;
        int topoCabecalho = cabecalho.getPaddingTop();
        int esquerdaCabecalho = cabecalho.getPaddingStart();
        int direitaCabecalho = cabecalho.getPaddingEnd();
        int esquerdaConteudo = conteudo.getPaddingStart();
        int direitaConteudo = conteudo.getPaddingEnd();
        int baseConteudo = conteudo.getPaddingBottom();

        ViewCompat.setOnApplyWindowInsetsListener(componentes.raiz, (raiz, margens) -> {
            Insets barras = margens.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            cabecalho.setPaddingRelative(esquerdaCabecalho + barras.left, topoCabecalho + barras.top,
                    direitaCabecalho + barras.right, cabecalho.getPaddingBottom());
            conteudo.setPaddingRelative(esquerdaConteudo + barras.left, conteudo.getPaddingTop(),
                    direitaConteudo + barras.right, baseConteudo + barras.bottom);
            return WindowInsetsCompat.CONSUMED;
        });
    }
}
