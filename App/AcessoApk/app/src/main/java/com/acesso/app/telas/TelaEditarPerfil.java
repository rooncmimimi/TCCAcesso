package com.acesso.app.telas;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.EditText;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.PickVisualMediaRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.lifecycle.ViewModelProvider;

import com.google.android.material.textfield.TextInputLayout;

import com.acesso.app.R;
import com.acesso.app.databinding.TelaEditarPerfilBinding;
import com.acesso.app.modelos.EdicaoPerfil;
import com.acesso.app.modelos.PerfilConta;
import com.acesso.app.modelos.TipoConta;
import com.acesso.app.repositorios.RepositorioSocial;
import com.acesso.app.utilitarios.ExibidorEstado;
import com.acesso.app.utilitarios.ExibidorImagem;
import com.acesso.app.utilitarios.MargensSistema;
import com.acesso.app.utilitarios.MensagemStatus;
import com.acesso.app.utilitarios.Rotulos;
import com.acesso.app.viewmodels.EstadoConteudo;
import com.acesso.app.viewmodels.ViewModelEditarPerfil;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import java.util.regex.Pattern;

/**
 * Editar o próprio perfil, como o diálogo do site: foto (logo, na empresa) e capa são enviadas assim que a pessoa
 * escolhe a imagem na galeria; os dados do perfil são enviados em "Salvar alterações". Sair com campos alterados
 * pergunta antes de descartar.
 */
public class TelaEditarPerfil extends TelaAutenticada {

    private static final String ESTADO_IMAGEM = "imagem_escolhida";
    private static final Pattern SITE = Pattern.compile("^(https?://)?[^\\s/]+\\.[^\\s]+$", Pattern.CASE_INSENSITIVE);

    private TelaEditarPerfilBinding componentes;
    private ViewModelEditarPerfil viewModel;
    private boolean empresa;
    private boolean formularioPreenchido;
    /** Valores do formulário ao abrir, para saber se há alterações a perder. */
    private String instantaneoInicial;
    /** Imagem para a qual a galeria foi aberta (a resposta chega depois). */
    private RepositorioSocial.Imagem imagemEscolhida;

    private final ActivityResultLauncher<PickVisualMediaRequest> galeria = registerForActivityResult(
            new ActivityResultContracts.PickVisualMedia(), this::aoEscolherImagem);

    public static void abrir(Context contexto) {
        contexto.startActivity(new Intent(contexto, TelaEditarPerfil.class));
    }

    @Override
    protected void onCreate(Bundle estadoSalvo) {
        super.onCreate(estadoSalvo);
        if (!sessaoValida()) {
            return;
        }
        empresa = sessao.ehEmpresa();
        componentes = TelaEditarPerfilBinding.inflate(getLayoutInflater());
        setContentView(componentes.getRoot());
        MargensSistema.aplicar(this, componentes.raiz);
        if (estadoSalvo != null && estadoSalvo.getString(ESTADO_IMAGEM) != null) {
            imagemEscolhida = RepositorioSocial.Imagem.valueOf(estadoSalvo.getString(ESTADO_IMAGEM));
        }

        configurarTipoDeConta();
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                sair();
            }
        });
        componentes.barraSuperior.setNavigationOnClickListener(v -> sair());
        componentes.botaoAlterarCapa.setOnClickListener(v ->
                escolherImagem(empresa ? RepositorioSocial.Imagem.CAPA_EMPRESA : RepositorioSocial.Imagem.CAPA_PERFIL));
        componentes.botaoAlterarFoto.setOnClickListener(v ->
                escolherImagem(empresa ? RepositorioSocial.Imagem.LOGO_EMPRESA : RepositorioSocial.Imagem.FOTO_PERFIL));
        componentes.botaoSalvar.setOnClickListener(v -> salvar());

        viewModel = new ViewModelProvider(this).get(ViewModelEditarPerfil.class);
        viewModel.getPerfil().observe(this, this::mostrarPerfil);
        viewModel.getEnvio().observe(this, this::mostrarEnvio);
        viewModel.getSalvamento().observe(this, this::mostrarSalvamento);
        viewModel.carregarSeNecessario();
    }

    @Override
    protected void onSaveInstanceState(Bundle estado) {
        super.onSaveInstanceState(estado);
        if (imagemEscolhida != null) {
            estado.putString(ESTADO_IMAGEM, imagemEscolhida.name());
        }
    }

    private void configurarTipoDeConta() {
        componentes.campoNome.setHint(getString(empresa ? R.string.editar_nome_fantasia : R.string.editar_nome));
        componentes.campoTitulo.setVisibility(empresa ? View.GONE : View.VISIBLE);
        componentes.campoSetor.setVisibility(empresa ? View.VISIBLE : View.GONE);
        componentes.campoCultura.setVisibility(empresa ? View.VISIBLE : View.GONE);
        componentes.campoSite.setVisibility(empresa ? View.VISIBLE : View.GONE);
        componentes.campoSobre.setHint(getString(empresa ? R.string.editar_sobre_empresa : R.string.editar_sobre_pessoa));
        componentes.campoSobre.setCounterMaxLength(empresa ? 4000 : 2000);
        componentes.botaoAlterarFoto.setText(empresa ? R.string.editar_logo : R.string.editar_foto);
        componentes.imagemAvatar.setContentDescription(getString(empresa ? R.string.editar_logo_atual : R.string.editar_foto_atual));
    }

    // --- Mostrar o perfil carregado ---

    private void mostrarPerfil(EstadoConteudo<PerfilConta> estado) {
        boolean pronto = ExibidorEstado.mostrar(componentes.estado, estado, false, null, viewModel::carregar);
        componentes.conteudo.setVisibility(pronto ? View.VISIBLE : View.GONE);
        if (!pronto) {
            return;
        }
        PerfilConta perfil = estado.dados;
        componentes.textoIniciais.setText(Rotulos.iniciais(perfil.nome));
        float densidade = getResources().getDisplayMetrics().density;
        ExibidorImagem.avatar(componentes.imagemAvatar, perfil.fotoUrl, (int) (96 * densidade));
        ExibidorImagem.capa(componentes.imagemCapa, perfil.capaUrl, getResources().getDisplayMetrics().widthPixels);
        if (!formularioPreenchido) {
            formularioPreenchido = true;
            preencherFormulario(perfil);
        }
    }

    private void preencherFormulario(PerfilConta perfil) {
        componentes.entradaNome.setText(perfil.nomeEditavel);
        componentes.entradaTitulo.setText(perfil.tituloProfissional);
        componentes.entradaSetor.setText(perfil.setor);
        componentes.entradaSobre.setText(perfil.sobre);
        componentes.entradaCultura.setText(perfil.culturaInclusiva);
        componentes.entradaSite.setText(perfil.site);
        componentes.entradaCidade.setText(perfil.cidade);
        componentes.entradaEstado.setText(perfil.estado);
        instantaneoInicial = instantaneo();
    }

    private String instantaneo() {
        return String.join("\u0001", texto(componentes.entradaNome), texto(componentes.entradaTitulo),
                texto(componentes.entradaSetor), texto(componentes.entradaSobre), texto(componentes.entradaCultura),
                texto(componentes.entradaSite), texto(componentes.entradaCidade), texto(componentes.entradaEstado));
    }

    private static String texto(EditText campo) {
        return campo.getText() == null ? "" : campo.getText().toString().trim();
    }

    // --- Imagens ---

    private void escolherImagem(RepositorioSocial.Imagem imagem) {
        PerfilConta perfil = perfilCarregado();
        if (perfil == null) {
            return;
        }
        imagemEscolhida = imagem;
        MensagemStatus.esconder(componentes.mensagemImagem);
        galeria.launch(new PickVisualMediaRequest.Builder()
                .setMediaType(ActivityResultContracts.PickVisualMedia.ImageOnly.INSTANCE)
                .build());
    }

    private void aoEscolherImagem(Uri uri) {
        RepositorioSocial.Imagem imagem = imagemEscolhida;
        imagemEscolhida = null;
        PerfilConta perfil = perfilCarregado();
        if (uri == null || imagem == null || perfil == null) {
            return;
        }
        boolean daEmpresa = imagem == RepositorioSocial.Imagem.LOGO_EMPRESA
                || imagem == RepositorioSocial.Imagem.CAPA_EMPRESA;
        String destino = daEmpresa ? perfil.registroId : perfil.usuarioId;
        viewModel.enviarImagem(imagem, uri, destino);
    }

    private void mostrarEnvio(ViewModelEditarPerfil.Operacao operacao) {
        if (operacao == null) {
            return;
        }
        boolean andamento = operacao.fase == ViewModelEditarPerfil.Operacao.Fase.ANDAMENTO;
        componentes.botaoAlterarCapa.setEnabled(!andamento);
        componentes.botaoAlterarFoto.setEnabled(!andamento);
        switch (operacao.fase) {
            case ANDAMENTO:
                MensagemStatus.mostrarAndamento(componentes.mensagemImagem, getString(R.string.editar_enviando));
                break;
            case CONCLUIDA:
                MensagemStatus.mostrarSucesso(componentes.mensagemImagem, getString(sucessoDaImagem(operacao.imagem)));
                break;
            default:
                MensagemStatus.mostrarErro(componentes.mensagemImagem, operacao.mensagem);
                break;
        }
    }

    private static int sucessoDaImagem(RepositorioSocial.Imagem imagem) {
        switch (imagem) {
            case LOGO_EMPRESA:
                return R.string.editar_logo_sucesso;
            case FOTO_PERFIL:
                return R.string.editar_foto_sucesso;
            default:
                return R.string.editar_capa_sucesso;
        }
    }

    // --- Salvar ---

    private void salvar() {
        PerfilConta perfil = perfilCarregado();
        if (perfil == null || !validar()) {
            return;
        }
        EdicaoPerfil edicao = new EdicaoPerfil();
        edicao.usuarioId = perfil.usuarioId;
        edicao.registroId = perfil.registroId;
        edicao.tipoConta = empresa ? TipoConta.EMPRESA : TipoConta.PESSOA;
        edicao.nome = texto(componentes.entradaNome);
        edicao.tituloProfissional = texto(componentes.entradaTitulo);
        edicao.setor = texto(componentes.entradaSetor);
        edicao.sobre = texto(componentes.entradaSobre);
        edicao.culturaInclusiva = texto(componentes.entradaCultura);
        edicao.site = texto(componentes.entradaSite);
        edicao.cidade = texto(componentes.entradaCidade);
        edicao.estado = texto(componentes.entradaEstado);
        MensagemStatus.esconder(componentes.mensagemStatus);
        viewModel.salvar(edicao);
    }

    /** Mostra o erro de cada campo e leva o foco ao primeiro com problema. */
    private boolean validar() {
        TextInputLayout primeiro = null;
        String nome = texto(componentes.entradaNome);
        primeiro = erro(componentes.campoNome, !empresa && nome.length() < 3 ? getString(R.string.editar_erro_nome) : null, primeiro);
        String estado = texto(componentes.entradaEstado);
        primeiro = erro(componentes.campoEstado,
                !estado.isEmpty() && !estado.matches("[A-Za-z]{2}") ? getString(R.string.editar_erro_estado) : null, primeiro);
        String site = texto(componentes.entradaSite);
        primeiro = erro(componentes.campoSite,
                empresa && !site.isEmpty() && !SITE.matcher(site).matches() ? getString(R.string.editar_erro_site) : null, primeiro);
        if (primeiro != null) {
            primeiro.requestFocus();
            return false;
        }
        return true;
    }

    private static TextInputLayout erro(TextInputLayout campo, String mensagem, TextInputLayout primeiro) {
        campo.setError(mensagem);
        return mensagem != null && primeiro == null ? campo : primeiro;
    }

    private void mostrarSalvamento(ViewModelEditarPerfil.Operacao operacao) {
        if (operacao == null) {
            return;
        }
        boolean andamento = operacao.fase == ViewModelEditarPerfil.Operacao.Fase.ANDAMENTO;
        componentes.botaoSalvar.setEnabled(!andamento);
        componentes.botaoSalvar.setText(andamento ? R.string.editar_salvando : R.string.editar_salvar);
        switch (operacao.fase) {
            case CONCLUIDA:
                // Atualiza a base de comparação: salvou, não há mais o que descartar.
                instantaneoInicial = instantaneo();
                MensagemStatus.mostrarSucesso(componentes.mensagemStatus, getString(R.string.editar_sucesso));
                break;
            case FALHOU:
                MensagemStatus.mostrarErro(componentes.mensagemStatus, operacao.mensagem);
                break;
            default:
                break;
        }
    }

    // --- Sair ---

    private void sair() {
        boolean alterado = formularioPreenchido && instantaneoInicial != null && !instantaneoInicial.equals(instantaneo());
        if (!alterado) {
            finish();
            return;
        }
        new MaterialAlertDialogBuilder(this)
                .setTitle(R.string.editar_descartar_titulo)
                .setMessage(R.string.editar_descartar_mensagem)
                .setNegativeButton(R.string.editar_continuar, null)
                .setPositiveButton(R.string.editar_descartar, (dialogo, botao) -> finish())
                .show();
    }

    private PerfilConta perfilCarregado() {
        EstadoConteudo<PerfilConta> estado = viewModel == null ? null : viewModel.getPerfil().getValue();
        return estado == null ? null : estado.dados;
    }
}
