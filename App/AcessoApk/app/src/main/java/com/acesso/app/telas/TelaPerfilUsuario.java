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
import com.acesso.app.modelos.ResumoSeguidores;
import com.acesso.app.modelos.TipoConta;
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
        viewModel.getResumo().observe(this, this::mostrarResumo);
        viewModel.getAlternando().observe(this, alternando -> componentes.botaoSeguir.setEnabled(!alternando));
        componentes.botaoSeguir.setOnClickListener(v -> alternarSeguir());
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
        ExibidorPerfil.imagens(componentes.cabecalho, perfil.fotoUrl, perfil.capaUrl);
        mostrarResumo(viewModel.getResumo().getValue());
        ExibidorPerfil.secoes(componentes.secoes, perfil, ehOProprio(), getLayoutInflater(),
                vaga -> TelaVaga.abrir(this, vaga.id));
    }

    /** Contadores no cabeçalho e o botão Seguir, conforme a relação com este perfil. */
    private void mostrarResumo(EstadoConteudo<ResumoSeguidores> estado) {
        EstadoConteudo<PerfilConta> estadoPerfil = viewModel.getPerfil().getValue();
        PerfilConta perfil = estadoPerfil == null ? null : estadoPerfil.dados;
        ResumoSeguidores resumo = estado == null ? null : estado.dados;
        if (perfil == null) {
            return;
        }
        boolean alvoEmpresa = perfil.tipoConta == TipoConta.EMPRESA;
        ExibidorPerfil.seguidores(componentes.cabecalho, resumo, alvoEmpresa);
        // Só candidatos seguem empresas (a API recusa as outras contas); perfis bloqueados não mostram o botão.
        boolean pode = resumo != null && !resumo.bloqueado && !ehOProprio() && !(alvoEmpresa && sessao.ehEmpresa());
        componentes.botaoSeguir.setVisibility(pode ? View.VISIBLE : View.GONE);
        componentes.textoPerfilPrivado.setVisibility(pode && resumo.perfilPrivado && !resumo.seguindo ? View.VISIBLE : View.GONE);
        if (!pode) {
            return;
        }
        String nome = perfil.nome;
        if (resumo.seguindo) {
            componentes.botaoSeguir.setText(R.string.perfil_seguindo);
            componentes.botaoSeguir.setContentDescription(getString(R.string.perfil_deixar_de_seguir_a, nome));
        } else if (resumo.solicitacaoPendente) {
            componentes.botaoSeguir.setText(R.string.perfil_solicitacao_enviada);
            componentes.botaoSeguir.setContentDescription(getString(R.string.perfil_cancelar_pedido_a, nome));
        } else {
            componentes.botaoSeguir.setText(resumo.perfilPrivado ? R.string.perfil_solicitar_seguir : R.string.perfil_seguir);
            componentes.botaoSeguir.setContentDescription(getString(R.string.perfil_seguir_a, nome));
        }
    }

    private void alternarSeguir() {
        EstadoConteudo<PerfilConta> estadoPerfil = viewModel.getPerfil().getValue();
        if (estadoPerfil == null || estadoPerfil.dados == null) {
            return;
        }
        String nome = estadoPerfil.dados.nome;
        MensagemStatus.esconder(componentes.mensagemStatus);
        viewModel.alternarSeguir((antes, depois) -> {
            String frase;
            if (depois.seguindo && !antes.seguindo) {
                frase = getString(R.string.perfil_seguiu, nome);
            } else if (!depois.seguindo && antes.seguindo) {
                frase = getString(R.string.perfil_deixou_de_seguir, nome);
            } else if (depois.solicitacaoPendente) {
                frase = getString(R.string.perfil_pedido_enviado, nome);
            } else {
                frase = getString(R.string.perfil_pedido_cancelado);
            }
            MensagemStatus.mostrarSucesso(componentes.mensagemStatus, frase);
        }, erro -> MensagemStatus.mostrarErro(componentes.mensagemStatus, erro));
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
