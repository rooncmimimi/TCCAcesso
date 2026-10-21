package com.acesso.app.telas;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;

import androidx.lifecycle.ViewModelProvider;

import com.acesso.app.R;
import com.acesso.app.databinding.ItemMensagemBinding;
import com.acesso.app.databinding.TelaConversaBinding;
import com.acesso.app.modelos.Conversa;
import com.acesso.app.modelos.Mensagem;
import com.acesso.app.modelos.TipoConta;
import com.acesso.app.utilitarios.ExibidorEstado;
import com.acesso.app.utilitarios.MargensSistema;
import com.acesso.app.utilitarios.MensagemStatus;
import com.acesso.app.viewmodels.EstadoConteudo;
import com.acesso.app.viewmodels.ViewModelConversa;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * Conversa aberta, com as mensagens guardadas no banco pela API (POST/GET /api/conversas/:id/mensagens).
 *
 * Atualização: enquanto a tela está visível, busca mensagens novas a cada {@value #INTERVALO_ATUALIZACAO_MS}
 * ms. O site recebe em tempo real pelo Socket.IO; no app, a consulta periódica usa as mesmas rotas REST, sem
 * biblioteca nova, e para assim que a tela sai de vista (economia de bateria e dados).
 */
public class TelaConversa extends TelaAutenticada {

    private static final String EXTRA_CONVERSA_ID = "conversa_id";
    private static final long INTERVALO_ATUALIZACAO_MS = 5_000;

    private TelaConversaBinding componentes;
    private ViewModelConversa viewModel;
    private final Handler relogio = new Handler(Looper.getMainLooper());
    private final Runnable atualizacao = new Runnable() {
        @Override
        public void run() {
            viewModel.atualizar();
            relogio.postDelayed(this, INTERVALO_ATUALIZACAO_MS);
        }
    };
    private boolean somenteLeitura;
    private int totalMostrado;

    public static void abrir(Context contexto, String conversaId) {
        if (conversaId == null) {
            return;
        }
        contexto.startActivity(new Intent(contexto, TelaConversa.class).putExtra(EXTRA_CONVERSA_ID, conversaId));
    }

    @Override
    protected void onCreate(Bundle estadoSalvo) {
        super.onCreate(estadoSalvo);
        String conversaId = getIntent().getStringExtra(EXTRA_CONVERSA_ID);
        if (!sessaoValida() || conversaId == null) {
            finish();
            return;
        }
        componentes = TelaConversaBinding.inflate(getLayoutInflater());
        setContentView(componentes.getRoot());
        // Com o teclado aberto, a raiz ganha a altura dele embaixo: a barra de escrever fica visível.
        MargensSistema.aplicar(this, componentes.raiz, aberto -> {
            if (aberto) {
                rolarParaOFim();
            }
        });
        componentes.barraSuperior.setNavigationOnClickListener(v -> finish());

        viewModel = new ViewModelProvider(this).get(ViewModelConversa.class);
        viewModel.getConversa().observe(this, this::mostrarConversa);
        viewModel.getMensagens().observe(this, this::mostrarMensagens);
        viewModel.getEnviando().observe(this, enviando -> atualizarBotaoEnviar());
        viewModel.getErroEnvio().observe(this, erro -> {
            if (erro == null) {
                MensagemStatus.esconder(componentes.mensagemStatus);
            } else {
                MensagemStatus.mostrarErro(componentes.mensagemStatus, erro);
            }
        });

        componentes.entradaMensagem.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence texto, int inicio, int quantos, int depois) {
            }

            @Override
            public void onTextChanged(CharSequence texto, int inicio, int antes, int quantos) {
                atualizarBotaoEnviar();
                // O contador de caracteres só aparece perto do limite, para não ocupar espaço à toa.
                componentes.campoMensagem.setCounterEnabled(texto.length() > 1800);
            }

            @Override
            public void afterTextChanged(Editable texto) {
            }
        });
        componentes.botaoEnviar.setOnClickListener(v -> viewModel.enviar(
                String.valueOf(componentes.entradaMensagem.getText()),
                () -> componentes.entradaMensagem.setText(null)));

        viewModel.iniciar(conversaId);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (viewModel != null) {
            relogio.postDelayed(atualizacao, INTERVALO_ATUALIZACAO_MS);
        }
    }

    @Override
    protected void onPause() {
        relogio.removeCallbacks(atualizacao);
        super.onPause();
    }

    private void mostrarConversa(EstadoConteudo<Conversa> estado) {
        if (estado == null || estado.dados == null) {
            return;
        }
        Conversa conversa = estado.dados;
        String nome = conversa.outroRemovido() || conversa.nomeOutro == null
                ? getString(R.string.mensagens_usuario_removido) : conversa.nomeOutro;
        componentes.barraSuperior.setTitle(nome);
        if (conversa.tipoOutro != null) {
            componentes.barraSuperior.setSubtitle(conversa.tipoOutro == TipoConta.EMPRESA
                    ? R.string.tipo_conta_empresa : R.string.tipo_conta_pessoa);
        }
        if (!conversa.outroRemovido()) {
            // Tocar no nome, como em redes profissionais, abre o perfil de quem está do outro lado.
            componentes.barraSuperior.setOnClickListener(v -> TelaPerfilUsuario.abrir(this, conversa.outroUsuarioId));
            componentes.barraSuperior.setContentDescription(getString(R.string.conversa_abrir_perfil, nome));
        }
        somenteLeitura = conversa.outroRemovido();
        componentes.avisoSomenteLeitura.setVisibility(somenteLeitura ? View.VISIBLE : View.GONE);
        componentes.barraEnvio.setVisibility(somenteLeitura ? View.GONE : View.VISIBLE);
    }

    private void mostrarMensagens(EstadoConteudo<List<Mensagem>> estado) {
        boolean vazio = estado != null && estado.dados != null && estado.dados.isEmpty();
        boolean temItens = ExibidorEstado.mostrar(componentes.estado, estado, vazio,
                getString(R.string.conversa_vazia), viewModel::tentarDeNovo);
        componentes.listaMensagens.removeAllViews();
        if (!temItens) {
            totalMostrado = 0;
            return;
        }
        // Só desce até o fim quando chegou mensagem nova (ou na primeira carga): quem está lendo o histórico
        // não é puxado para baixo a cada atualização.
        boolean chegouNova = estado.dados.size() > totalMostrado;
        totalMostrado = estado.dados.size();
        String meuId = viewModel.getMeuId();
        for (int i = 0; i < estado.dados.size(); i++) {
            Mensagem mensagem = estado.dados.get(i);
            boolean minha = mensagem.remetenteId != null && mensagem.remetenteId.equalsIgnoreCase(meuId);
            boolean ultimaMinha = minha && i == estado.dados.size() - 1;
            componentes.listaMensagens.addView(criarBalao(mensagem, minha, ultimaMinha));
        }
        if (chegouNova) {
            rolarParaOFim();
        }
    }

    private View criarBalao(Mensagem mensagem, boolean minha, boolean mostrarLeitura) {
        ItemMensagemBinding item = ItemMensagemBinding.inflate(getLayoutInflater(), componentes.listaMensagens, false);
        item.raizMensagem.setGravity(minha ? Gravity.END : Gravity.START);
        item.textoMensagem.setText(mensagem.conteudo);
        item.textoMensagem.setBackgroundResource(minha ? R.drawable.fundo_balao_meu : R.drawable.fundo_balao_outro);
        item.textoMensagem.setTextColor(getColor(minha ? R.color.acesso_sobre_primaria : R.color.acesso_texto));
        String hora = formatarHora(mensagem.enviadaEm);
        if (mostrarLeitura) {
            String leitura = getString(mensagem.lida ? R.string.conversa_lida : R.string.conversa_enviada);
            hora = hora.isEmpty() ? leitura : hora + " · " + leitura;
        }
        item.textoHora.setText(hora);
        item.textoHora.setVisibility(hora.isEmpty() ? View.GONE : View.VISIBLE);
        LinearLayout.LayoutParams posicao = (LinearLayout.LayoutParams) item.textoHora.getLayoutParams();
        posicao.gravity = minha ? Gravity.END : Gravity.START;
        // O TalkBack lê "Você: texto, 14:05" ou "Nome: texto, 14:05".
        String autor = minha ? getString(R.string.conversa_voce) : String.valueOf(componentes.barraSuperior.getTitle());
        item.raizMensagem.setContentDescription(autor + ": " + mensagem.conteudo + (hora.isEmpty() ? "" : ", " + hora));
        item.raizMensagem.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_YES);
        item.textoMensagem.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        item.textoHora.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        return item.getRoot();
    }

    /** "14:05" para hoje; "21/10, 14:05" para outros dias. */
    private static String formatarHora(long momento) {
        if (momento <= 0) {
            return "";
        }
        Calendar agora = Calendar.getInstance();
        Calendar enviada = Calendar.getInstance();
        enviada.setTimeInMillis(momento);
        boolean hoje = agora.get(Calendar.YEAR) == enviada.get(Calendar.YEAR)
                && agora.get(Calendar.DAY_OF_YEAR) == enviada.get(Calendar.DAY_OF_YEAR);
        String formato = hoje ? "HH:mm" : "dd/MM, HH:mm";
        return new SimpleDateFormat(formato, new Locale("pt", "BR")).format(new Date(momento));
    }

    private void atualizarBotaoEnviar() {
        boolean temTexto = componentes.entradaMensagem.getText() != null
                && componentes.entradaMensagem.getText().toString().trim().length() > 0;
        boolean enviando = Boolean.TRUE.equals(viewModel.getEnviando().getValue());
        componentes.botaoEnviar.setEnabled(temTexto && !enviando && !somenteLeitura);
    }

    private void rolarParaOFim() {
        componentes.rolagemMensagens.post(() -> componentes.rolagemMensagens.fullScroll(View.FOCUS_DOWN));
    }
}
