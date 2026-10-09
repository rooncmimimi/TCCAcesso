package com.acesso.app.viewmodels;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import com.acesso.app.modelos.DadosCadastroEmpresa;
import com.acesso.app.modelos.DadosCadastroPessoa;
import com.acesso.app.viewmodels.ViewModelCadastro.Campos;

import org.junit.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Map;

/** Dados fictícios: CPF e CNPJ abaixo são números de exemplo válidos só pelo dígito verificador. */
public class ViewModelCadastroTeste {

    private static final LocalDate HOJE = LocalDate.of(2026, 10, 9);

    private static ViewModelCadastro.FormularioPessoa pessoaValida() {
        ViewModelCadastro.FormularioPessoa formulario = new ViewModelCadastro.FormularioPessoa();
        formulario.nome = "  Joana Exemplo ";
        formulario.email = " Joana@Acesso.Test ";
        formulario.senha = "Acesso@2026";
        formulario.confirmacaoSenha = "Acesso@2026";
        formulario.telefone = "(11) 98765-4321";
        formulario.cpf = "529.982.247-25";
        formulario.cidade = " São Paulo ";
        formulario.dataNascimento = "25/09/1970";
        formulario.aceitouTermos = true;
        return formulario;
    }

    private static ViewModelCadastro.FormularioEmpresa empresaValida() {
        ViewModelCadastro.FormularioEmpresa formulario = new ViewModelCadastro.FormularioEmpresa();
        formulario.nome = "Carlos Responsável";
        formulario.razaoSocial = "Empresa Exemplo Ltda";
        formulario.nomeFantasia = "";
        formulario.cnpj = "11.222.333/0001-81";
        formulario.email = "rh@empresa.test";
        formulario.telefone = "";
        formulario.cidade = "Campinas";
        formulario.estado = "sp";
        formulario.endereco = "";
        formulario.cep = "13010-000";
        formulario.setor = "Tecnologia";
        formulario.porte = "pequena";
        formulario.site = "https://empresa.test";
        formulario.descricao = "";
        formulario.senha = "Acesso@2026";
        formulario.confirmacaoSenha = "Acesso@2026";
        formulario.aceitouTermos = true;
        return formulario;
    }

    @Test
    public void pessoaValidaNaoTemErros() {
        assertTrue(ViewModelCadastro.validarPessoa(pessoaValida(), HOJE).isEmpty());
    }

    @Test
    public void pessoaComProblemasApontaCadaCampoNaOrdemDaTela() {
        ViewModelCadastro.FormularioPessoa formulario = pessoaValida();
        formulario.nome = "Joana";
        formulario.cpf = "111.111.111-11";
        formulario.senha = "fraca";
        formulario.aceitouTermos = false;
        Map<String, String> erros = ViewModelCadastro.validarPessoa(formulario, HOJE);

        assertEquals(Arrays.asList(Campos.NOME, Campos.CPF, Campos.SENHA, Campos.CONFIRMACAO_SENHA, Campos.TERMOS),
                new ArrayList<>(erros.keySet()));
    }

    @Test
    public void dadosDaPessoaSaemLimposParaOServidor() {
        DadosCadastroPessoa dados = ViewModelCadastro.montarDadosPessoa(pessoaValida());
        assertEquals("Joana Exemplo", dados.nome);
        assertEquals("joana@acesso.test", dados.email);
        assertEquals("11987654321", dados.telefone);
        assertEquals("52998224725", dados.cpf);
        assertEquals("São Paulo", dados.cidade);
        assertEquals("1970-09-25", dados.dataNascimentoIso);
    }

    @Test
    public void opcionaisVaziosDaPessoaViramNulos() {
        ViewModelCadastro.FormularioPessoa formulario = pessoaValida();
        formulario.telefone = "";
        formulario.cpf = " ";
        formulario.dataNascimento = "";
        DadosCadastroPessoa dados = ViewModelCadastro.montarDadosPessoa(formulario);
        assertNull(dados.telefone);
        assertNull(dados.cpf);
        assertNull(dados.dataNascimentoIso);
    }

    @Test
    public void empresaValidaNaoTemErros() {
        assertTrue(ViewModelCadastro.validarEmpresa(empresaValida()).isEmpty());
    }

    @Test
    public void empresaSemCnpjERazaoSocial() {
        ViewModelCadastro.FormularioEmpresa formulario = empresaValida();
        formulario.cnpj = "";
        formulario.razaoSocial = "AB";
        formulario.estado = "XX";
        Map<String, String> erros = ViewModelCadastro.validarEmpresa(formulario);
        assertTrue(erros.containsKey(Campos.CNPJ));
        assertTrue(erros.containsKey(Campos.RAZAO_SOCIAL));
        assertTrue(erros.containsKey(Campos.ESTADO));
        assertFalse(erros.containsKey(Campos.SITE));
    }

    @Test
    public void dadosDaEmpresaNoFormatoDaApi() {
        DadosCadastroEmpresa dados = ViewModelCadastro.montarDadosEmpresa(empresaValida());
        assertEquals("11222333000181", dados.cnpj);
        assertEquals("SP", dados.estado);
        assertEquals("13010000", dados.cep);
        assertEquals("pequena", dados.porte);
        assertEquals("rh@empresa.test", dados.email);
        assertNull(dados.nomeFantasia);
        assertNull(dados.telefone);
        assertNull(dados.endereco);
        assertNull(dados.descricao);
    }
}
