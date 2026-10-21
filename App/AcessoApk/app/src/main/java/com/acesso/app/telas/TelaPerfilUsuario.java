package com.acesso.app.telas;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;

import androidx.lifecycle.ViewModelProvider;

import com.acesso.app.R;
import com.acesso.app.databinding.TelaPerfilUsuarioBinding;
import com.acesso.app.modelos.Conversa;
import com.acesso.app.modelos.PerfilConta;
import com.acesso.app.modelos.PermissaoConversa;
import com.acesso.app.utilitarios.ExibidorEstado;
import com.acesso.app.utilitarios.ExibidorPerfil;
import com.acesso.app.utilitarios.MargensSistema;
import com.acesso.app.utilitarios.MensagemStatus;
import com.acesso.app.viewmodels.EstadoConteudo;
import com.acesso.app.viewmodels.ViewModelPerfilUsuario;

/**
 * Perfil de outra pessoa ou empresa (página /perfil/:usuarioId do site): cabeçalho, seções profissionais e
 * o botão "Mensagem", que abre (ou retoma) a conversa pela API. Se a pessoa não aceita mensagens de quem
 * está logado, o botão fica desativado com o motivo dado pela API.
 */
public class TelaPerfilUsuario extends TelaAutenticada {

    private static final String EXTRA_USUARIO_ID = "usuario_id";

    private TelaPerfilUsuarioBinding componentes;
    private ViewModelPerfilUsuario viewModel;
    private String usuarioId;

    public static void abrir(Context contexto, String usuarioId) {
        if (usuarioId == null) {
            return;
        }
        contexto.startActivity(new Intent(contexto, TelaPerfilUsuario.class).putExtra(EXTRA_USUARIO_ID, usuarioId));
    }

    @Override
    protected void onCreate(Bundle estadoSalvo) {
        super.onCreate(estadoSalvo);
        usuarioId = getIntent().getStringExtra(EXTRA_USUARIO_ID);
        if (!sessaoValida() || usuarioId == null) {
            finish();
            return;
        }
        componentes = TelaPerfilUsuarioBinding.inflate(getLayoutInflater());
        setContentView(componentes.getRoot());
        MargensSistema.aplicar(this, componentes.getRoot());
        componentes.barraSuperior.setNavigationOnClickListener(v -> finish());

        viewModel = new ViewModelProvider(this).get(ViewModelPerfilUsuario.class);
        viewModel.getPerfil().observe(this, this::mostrarPerfil);
        viewModel.getPermissao().observe(this, this::mostrarPermissao);
        viewModel.getConversaAberta().observe(this, this::aoAbrirConversa);
        componentes.botaoMensagem.setOnClickListener(v -> viewModel.abrirConversa());
        viewModel.carregar(usuarioId);
    }

    private boolean ehOProprio() {
        return usuarioId.equalsIgnoreCase(sessao.getIdUsuario());
    }

    private void mostrarPerfil(EstadoConteudo<PerfilConta> estado) {
        boolean pronto = ExibidorEstado.mostrar(componentes.estado, estado, false, null, viewModel::recarregar);
        componentes.conteudo.setVisibility(pronto ? View.VISIBLE : View.GONE);
        if (!pronto) {
            return;
        }
        PerfilConta perfil = estado.dados;
        componentes.barraSuperior.setTitle(perfil.nome);
        // Situação de aprovação é assunto da própria empresa: aqui não aparece.
        ExibidorPerfil.cabecalho(componentes.cabecalho, perfil.nome, perfil.detalhe, null, perfil.tipoConta, null);
        ExibidorPerfil.secoes(componentes.secoes, perfil, ehOProprio(), getLayoutInflater(),
                vaga -> TelaVaga.abrir(this, vaga.id));
    }

    private void mostrarPermissao(PermissaoConversa permissao) {
        if (permissao == null || ehOProprio()) {
            componentes.botaoMensagem.setVisibility(View.GONE);
            componentes.textoMotivoMensagem.setVisibility(View.GONE);
            return;
        }
        componentes.botaoMensagem.setVisibility(View.VISIBLE);
        componentes.botaoMensagem.setEnabled(permissao.permitido);
        boolean temMotivo = !permissao.permitido && permissao.motivo != null;
        componentes.textoMotivoMensagem.setText(temMotivo ? permissao.motivo : null);
        componentes.textoMotivoMensagem.setVisibility(temMotivo ? View.VISIBLE : View.GONE);
    }

    private void aoAbrirConversa(EstadoConteudo<Conversa> estado) {
        if (estado == null) {
            return;
        }
        if (estado.carregando) {
            componentes.botaoMensagem.setEnabled(false);
            MensagemStatus.mostrarAndamento(componentes.mensagemStatus, getString(R.string.perfil_abrindo_conversa));
            return;
        }
        componentes.botaoMensagem.setEnabled(true);
        if (estado.dados != null) {
            MensagemStatus.esconder(componentes.mensagemStatus);
            TelaConversa.abrir(this, estado.dados.id);
        } else {
            MensagemStatus.mostrarErro(componentes.mensagemStatus, estado.mensagem);
        }
        viewModel.conversaTratada();
    }
}
