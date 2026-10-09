package com.acesso.app.telas;

import android.content.Intent;
import android.os.Bundle;
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

import com.acesso.app.R;
import com.acesso.app.databinding.TelaApresentacaoBinding;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.utilitarios.AtalhosSistema;
import com.acesso.app.utilitarios.GerenciadorSessao;
import com.acesso.app.utilitarios.Navegacao;

/**
 * Porta de entrada do app. Com sessão salva, segue direto para a área da conta
 * (a apresentação não aparece para quem já entrou). Sem sessão, sempre aparece,
 * com os caminhos para entrar ou criar conta.
 *
 * Login e cadastro abrem por cima dela (sem finish): Voltar retorna para cá.
 */
public class TelaApresentacao extends AppCompatActivity {

    private static final float ESCALA_MAXIMA_TITULO = 1.3f;

    @Override
    protected void onCreate(Bundle estadoSalvo) {
        super.onCreate(estadoSalvo);

        SessaoUsuario sessao = new GerenciadorSessao(this).obter();
        if (sessao != null) {
            Navegacao.abrirAreaAutenticada(this, sessao);
            return;
        }

        TelaApresentacaoBinding componentes = TelaApresentacaoBinding.inflate(getLayoutInflater());
        setContentView(componentes.getRoot());
        aplicarMargensSistema(componentes);

        componentes.titulo.setText(colorirDestaques(getText(R.string.apresentacao_titulo)));
        limitarCrescimentoTitulo(componentes.titulo);

        String aviso = getIntent().getStringExtra(Navegacao.EXTRA_AVISO);
        if (aviso != null && !aviso.isEmpty()) {
            componentes.textoAviso.setText(aviso);
            componentes.textoAviso.setVisibility(View.VISIBLE);
        }

        componentes.botaoEntrar.setOnClickListener(v -> startActivity(new Intent(this, TelaLogin.class)));
        componentes.botaoCriarConta.setOnClickListener(v -> startActivities(Navegacao.loginECadastro(this, false)));
        componentes.botaoQueroVagas.setOnClickListener(v -> startActivities(Navegacao.loginECadastro(this, false)));
        // "Sou empresa" abre o cadastro já com "Empresa" escolhido.
        componentes.botaoSouEmpresa.setOnClickListener(v -> startActivities(Navegacao.loginECadastro(this, true)));
        componentes.botaoConfigurarAcessibilidade.setOnClickListener(v ->
                AtalhosSistema.abrirConfiguracoesAcessibilidade(this));
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
