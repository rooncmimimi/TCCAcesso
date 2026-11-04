package com.acesso.app.telas;

import android.os.Bundle;
import android.view.View;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;
import androidx.fragment.app.FragmentTransaction;
import androidx.lifecycle.ViewModelProvider;

import com.acesso.app.R;
import com.acesso.app.databinding.TelaPrincipalBinding;
import com.acesso.app.fragmentos.FragmentoCriar;
import com.acesso.app.fragmentos.FragmentoInicio;
import com.acesso.app.fragmentos.FragmentoNotificacoes;
import com.acesso.app.fragmentos.FragmentoOportunidades;
import com.acesso.app.fragmentos.FragmentoPerfil;
import com.acesso.app.modelos.SessaoUsuario;
import com.acesso.app.repositorios.FabricaRepositorios;
import com.acesso.app.utilitarios.MargensSistema;
import com.acesso.app.utilitarios.Navegacao;
import com.acesso.app.utilitarios.Rotulos;
import com.acesso.app.viewmodels.ViewModelContadores;
import com.acesso.app.viewmodels.ViewModelSessao;
import com.google.android.material.badge.BadgeDrawable;

/**
 * Área logada (pessoa ou empresa aprovada), organizada como uma rede profissional: cabeçalho com o avatar
 * (abre o Perfil), o campo de busca (abre a Pesquisa) e o ícone de Mensagens com as não lidas; embaixo, as
 * abas Início, Vagas, Publicar, Notificações e Perfil.
 * Só abre com sessão: sem ela, ou com a sessão encerrada, volta para a apresentação.
 * Para empresa, a aba Vagas vira "Painel" (como /dashboard/empresa no site).
 *
 * As abas ficam todas no FragmentManager e só são mostradas ou escondidas: trocar de aba não recria a
 * tela, então rolagem, texto digitado e resultados da pesquisa continuam como estavam.
 */
public class TelaPrincipal extends AppCompatActivity {

    private TelaPrincipalBinding componentes;
    private ViewModelSessao viewModelSessao;
    private ViewModelContadores contadores;
    /**
     * Pedido feito por outra aba: abrir a aba Criar já no formulário de vaga ("Publicar nova vaga") ou de
     * publicação ("Escrever publicação"). Nulo quando a pessoa só tocou na aba, que mantém o que estava aberto.
     */
    private Boolean pedidoDeCriacao;
    private int abaAtual = R.id.aba_inicio;
    private boolean tecladoAberto;

    @Override
    protected void onCreate(Bundle estadoSalvo) {
        super.onCreate(estadoSalvo);

        viewModelSessao = new ViewModelProvider(this).get(ViewModelSessao.class);
        SessaoUsuario sessao = viewModelSessao.getSessao().getValue();
        Navegacao.Destino destino = Navegacao.destinoPara(sessao);
        if (destino == Navegacao.Destino.APRESENTACAO) {
            Navegacao.voltarParaApresentacao(this, null);
            return;
        }
        if (destino == Navegacao.Destino.EMPRESA_EM_ANALISE) {
            Navegacao.abrirAreaAutenticada(this, sessao);
            return;
        }

        componentes = TelaPrincipalBinding.inflate(getLayoutInflater());
        setContentView(componentes.getRoot());
        // Com o teclado aberto a barra de abas some, para sobrar espaço ao campo e ao botão de enviar.
        MargensSistema.aplicar(this, componentes.raiz, aberto -> {
            tecladoAberto = aberto;
            componentes.navegacaoInferior.setVisibility(aberto ? View.GONE : View.VISIBLE);
            atualizarCabecalho();
        });

        componentes.avisoDemonstracao.getRoot().setVisibility(
                FabricaRepositorios.modoDemonstracao() ? View.VISIBLE : View.GONE);
        // Versão curta: o aviso fica em todas as abas e não deve tomar o espaço do conteúdo.
        componentes.avisoDemonstracao.getRoot().setText(R.string.aviso_modo_demonstracao_curto);
        if (sessao.ehEmpresa()) {
            componentes.navegacaoInferior.getMenu().findItem(R.id.aba_oportunidades).setTitle(R.string.aba_painel);
        }

        // Cabeçalho compacto: o avatar leva ao Perfil, o campo de busca à Pesquisa e o ícone às Mensagens.
        componentes.botaoAvatar.setOnClickListener(v ->
                componentes.navegacaoInferior.setSelectedItemId(R.id.aba_perfil));
        componentes.botaoBuscaRapida.setOnClickListener(v -> TelaPesquisa.abrir(this));
        componentes.botaoMensagens.setOnClickListener(v -> TelaConversas.abrir(this));

        contadores = new ViewModelProvider(this).get(ViewModelContadores.class);
        contadores.getMensagensNaoLidas().observe(this, this::mostrarMensagensNaoLidas);
        contadores.getNotificacoesNaoLidas().observe(this, this::mostrarNotificacoesNaoLidas);

        componentes.navegacaoInferior.setOnItemSelectedListener(item -> {
            mostrarAba(item.getItemId());
            return true;
        });
        // Tocar de novo na aba atual não recarrega nada.
        componentes.navegacaoInferior.setOnItemReselectedListener(item -> { });

        // Voltar numa aba que não é a Início leva à Início; na Início, sai do app.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (componentes.navegacaoInferior.getSelectedItemId() != R.id.aba_inicio) {
                    componentes.navegacaoInferior.setSelectedItemId(R.id.aba_inicio);
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });

        viewModelSessao.getSessaoEncerrada().observe(this, aviso ->
                Navegacao.voltarParaApresentacao(this, aviso == null || aviso.isEmpty() ? null : aviso));
        viewModelSessao.getSessao().observe(this, atualizada -> {
            if (atualizada != null) {
                String nome = atualizada.getNome() != null && !atualizada.getNome().trim().isEmpty()
                        ? atualizada.getNome() : atualizada.getEmail();
                componentes.botaoAvatar.setText(Rotulos.iniciais(nome));
            }
            // A renovação pode trazer outro status de empresa (ex.: suspensa).
            if (Navegacao.destinoPara(atualizada) == Navegacao.Destino.EMPRESA_EM_ANALISE) {
                Navegacao.abrirAreaAutenticada(this, atualizada);
            }
        });

        // A Início já vem marcada; setSelectedItemId nela contaria como "tocar de novo" e não
        // abriria nada. Por isso o primeiro fragmento é mostrado direto.
        if (estadoSalvo == null) {
            mostrarAba(R.id.aba_inicio);
        }
    }

    /** Chamado quando a própria conta aparece num cartão (ex.: autor de uma publicação). */
    public void abrirPerfil() {
        componentes.navegacaoInferior.setSelectedItemId(R.id.aba_perfil);
    }

    /** Chamado por Início ("Escrever publicação") e pelo Painel ("Publicar nova vaga"). */
    public void abrirCriacao(boolean vaga) {
        pedidoDeCriacao = vaga;
        if (componentes.navegacaoInferior.getSelectedItemId() == R.id.aba_criar) {
            mostrarAba(R.id.aba_criar);
        } else {
            componentes.navegacaoInferior.setSelectedItemId(R.id.aba_criar);
        }
    }

    private void mostrarAba(int idAba) {
        FragmentManager gerente = getSupportFragmentManager();
        Fragment destino = gerente.findFragmentByTag(etiqueta(idAba));
        FragmentTransaction transacao = gerente.beginTransaction().setReorderingAllowed(true);
        for (Fragment existente : gerente.getFragments()) {
            if (existente != destino) {
                transacao.hide(existente);
            }
        }
        if (destino == null) {
            destino = criarFragmento(idAba);
            transacao.add(R.id.containerFragmentos, destino, etiqueta(idAba));
        } else {
            transacao.show(destino);
        }
        transacao.commit();

        if (destino instanceof FragmentoCriar && pedidoDeCriacao != null) {
            // A aba Criar já existe (e guarda o que a pessoa digitou): só troca o formulário.
            ((FragmentoCriar) destino).abrirFormulario(pedidoDeCriacao);
        }
        pedidoDeCriacao = null;

        abaAtual = idAba;
        WindowCompat.getInsetsController(getWindow(), componentes.getRoot()).hide(WindowInsetsCompat.Type.ime());
        atualizarCabecalho();
    }

    private Fragment criarFragmento(int idAba) {
        if (idAba == R.id.aba_oportunidades) {
            return new FragmentoOportunidades();
        } else if (idAba == R.id.aba_criar) {
            return FragmentoCriar.novaInstancia(Boolean.TRUE.equals(pedidoDeCriacao));
        } else if (idAba == R.id.aba_notificacoes) {
            return new FragmentoNotificacoes();
        } else if (idAba == R.id.aba_perfil) {
            return new FragmentoPerfil();
        }
        return new FragmentoInicio();
    }

    private static String etiqueta(int idAba) {
        return "aba_" + idAba;
    }

    /**
     * O cabeçalho com avatar, busca e mensagens fica nas abas de conteúdo (Início, Vagas, Notificações). Em
     * Publicar o espaço é do formulário, e no Perfil ele repetiria o que a própria tela já mostra.
     */
    private void atualizarCabecalho() {
        boolean tela = abaAtual != R.id.aba_criar && abaAtual != R.id.aba_perfil;
        componentes.cabecalhoPrincipal.setVisibility(tela && !tecladoAberto ? View.VISIBLE : View.GONE);
    }

    /** A cada vez que a tela volta (ex.: depois de ficar em segundo plano), confere a sessão. */
    @Override
    protected void onStart() {
        super.onStart();
        // Depois de recriar a tela (ex.: girar o aparelho), a barra de abas já restaurou a aba escolhida.
        abaAtual = componentes.navegacaoInferior.getSelectedItemId();
        atualizarCabecalho();
        viewModelSessao.verificar();
        contadores.atualizar();
    }

    private void mostrarMensagensNaoLidas(Integer total) {
        int naoLidas = total != null ? total : 0;
        componentes.seloMensagens.setText(Rotulos.contador(naoLidas));
        componentes.seloMensagens.setVisibility(naoLidas > 0 ? View.VISIBLE : View.GONE);
        componentes.botaoMensagens.setContentDescription(naoLidas > 0
                ? getResources().getQuantityString(R.plurals.cabecalho_mensagens_nao_lidas, naoLidas, naoLidas)
                : getString(R.string.cabecalho_mensagens));
    }

    private void mostrarNotificacoesNaoLidas(Integer total) {
        int naoLidas = total != null ? total : 0;
        if (naoLidas > 0) {
            BadgeDrawable selo = componentes.navegacaoInferior.getOrCreateBadge(R.id.aba_notificacoes);
            selo.setBackgroundColor(getColor(R.color.acesso_erro));
            selo.setBadgeTextColor(getColor(R.color.acesso_sobre_primaria));
            selo.setMaxCharacterCount(3);
            selo.setNumber(naoLidas);
        } else {
            componentes.navegacaoInferior.removeBadge(R.id.aba_notificacoes);
        }
    }
}
