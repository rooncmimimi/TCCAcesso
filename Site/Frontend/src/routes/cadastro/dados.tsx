import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Logo } from "@/components/Logo";
import { AutenticacaoLayout } from "@/layouts/AutenticacaoLayout";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CidadeAutocomplete } from "@/components/CidadeAutocomplete";
import { Campo } from "@/components/cadastro/Campo";
import { descricao } from "@/components/cadastro/descricao";
import { criarEsquemaCandidato } from "@/components/cadastro/esquemaCandidato";
import { textosDoCadastro } from "@/components/cadastro/idioma";
import { LegendaObrigatorio } from "@/components/cadastro/MarcaObrigatorio";
import { PaisAutocomplete } from "@/components/cadastro/PaisAutocomplete";
import { useSessao } from "@/hooks/useSessao";
import { formatarCpf, formatarTelefone, somenteDigitos } from "@/lib/mascaras";
import { extrairMensagemErro } from "@/services/api";
import { perfilService } from "@/services/perfil.service";

/**
 * Dados pessoais de quem criou a conta direto pelo Google (etapa 6 da auditoria).
 *
 * A conta já existe e está aberta; faltam o que o cadastro por formulário pede antes de criá-la:
 * país, CPF, telefone, data de nascimento, cidade e estado. Todos obrigatórios, com as mesmas regras
 * e mensagens do cadastro (`criarEsquemaCandidato`). Em seguida a pessoa segue para as etapas de
 * perfil e de acessibilidade do cadastro, que já existem.
 *
 * Quem abre esta tela sem ter nada pendente (já completou, ou digitou o endereço) é levado adiante,
 * e o login manda para cá quem ainda tem pendência (`destinoAposEntrar`).
 */
export const Route = createFileRoute("/cadastro/dados")({
  validateSearch: z.object({
    /** `?depois=empresa`: quem veio por "Sou empresa" segue para o cadastro institucional ao final. */
    depois: z.enum(["empresa"]).optional(),
  }),
  head: () => ({ meta: [{ title: "Complete seus dados — ACESSO" }] }),
  component: () => (
    <GuardaAcesso tipos={["candidato"]}>
      <CompletarDados />
    </GuardaAcesso>
  ),
});

const t = textosDoCadastro("pt");
const esquema = criarEsquemaCandidato(t).pick({
  pais: true,
  cpf: true,
  telefone: true,
  dataNascimento: true,
  cidade: true,
  estado: true,
});
type Formulario = z.infer<typeof esquema>;

function CompletarDados() {
  const { depois } = Route.useSearch();
  const navigate = useNavigate();
  const { usuario, recarregar } = useSessao();
  const [enviando, setEnviando] = useState(false);
  const tituloRef = useRef<HTMLHeadingElement>(null);

  // A tela troca inteira ao chegar (vem de outra), então o foco vai para o título.
  useEffect(() => {
    tituloRef.current?.focus();
  }, []);

  const { data: candidato } = useQuery({
    queryKey: ["candidato", "eu"],
    queryFn: () => perfilService.meuCandidato(),
  });

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    mode: "onTouched",
    defaultValues: {
      pais: "BR",
      cpf: "",
      telefone: usuario?.telefone ? formatarTelefone(usuario.telefone) : "",
      dataNascimento: "",
      cidade: "",
      estado: "",
    },
  });

  // Nada pendente (ou terminou de salvar e a sessão foi recarregada): segue para o resto do cadastro.
  // `replace`, para o botão "voltar" não reabrir uma tela que já não serve.
  useEffect(() => {
    if (usuario && !usuario.dadosPessoaisPendentes && !enviando) {
      void navigate({ to: "/cadastro/candidato", search: { retomar: true, depois }, replace: true });
    }
  }, [usuario, enviando, navigate, depois]);

  const aoEnviar = useMemo(
    () =>
      handleSubmit(async (valores) => {
        if (!usuario || !candidato) return;
        setEnviando(true);

        try {
          await perfilService.atualizarCandidato(candidato.id, {
            cpf: somenteDigitos(valores.cpf),
            pais: valores.pais,
            dataNascimento: valores.dataNascimento,
            cidade: valores.cidade,
            estado: valores.estado.toUpperCase(),
          });
          await perfilService.atualizarUsuario(usuario.id, { telefone: somenteDigitos(valores.telefone) });

          // A sessão passa a saber que não há mais pendência; o efeito acima leva adiante.
          await recarregar();
        } catch (erro) {
          const mensagem = extrairMensagemErro(erro, "Não foi possível salvar seus dados agora. Tente novamente.");
          // CPF repetido é o único erro que aponta para um campo; o resto fica no aviso.
          if (/CPF/i.test(mensagem)) setError("cpf", { message: mensagem });
          toast.error(mensagem);
        } finally {
          setEnviando(false);
        }
      }),
    [handleSubmit, usuario, candidato, recarregar, setError],
  );

  const erros = errors;

  return (
    <AutenticacaoLayout className="max-w-lg">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" aria-label="Voltar para a página inicial" className="inline-flex">
          <Logo />
        </Link>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={aoEnviar} noValidate className="space-y-5">
            <div>
              <h1 ref={tituloRef} tabIndex={-1} className="text-2xl font-extrabold outline-none">
                Complete seus dados
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Sua conta com o Google já está criada. Falta só o que a plataforma precisa para te apresentar às empresas.
              </p>
            </div>

            <LegendaObrigatorio texto={t.legendaObrigatorio} />

            <Campo id="pais" rotulo={t.pais} ajuda={t.paisAjuda} erro={erros.pais?.message} obrigatorio>
              <PaisAutocomplete
                id="pais"
                valor={watch("pais") ?? ""}
                aoMudar={(codigo) => setValue("pais", codigo, { shouldValidate: true })}
                temErro={Boolean(erros.pais)}
                descrito={descricao("pais", true, Boolean(erros.pais))}
                desabilitado={enviando}
                placeholder={t.paisBuscar}
              />
            </Campo>

            <Campo id="cpf" rotulo={t.cpf} ajuda={t.cpfAjuda} erro={erros.cpf?.message} obrigatorio>
              <Input
                id="cpf"
                required
                inputMode="numeric"
                placeholder="000.000.000-00"
                maxLength={14}
                className="min-h-12"
                autoComplete="off"
                aria-invalid={Boolean(erros.cpf)}
                aria-describedby={descricao("cpf", true, Boolean(erros.cpf))}
                {...register("cpf", {
                  onChange: (e) => setValue("cpf", formatarCpf(e.target.value), { shouldValidate: false }),
                })}
              />
            </Campo>

            <Campo
              id="telefone"
              rotulo={t.telefone}
              ajuda={t.telefoneAjuda}
              erro={erros.telefone?.message}
              obrigatorio
              dicaObrigatorio={t.dicaObrigatorio}
            >
              <Input
                id="telefone"
                type="tel"
                required
                inputMode="numeric"
                placeholder="(00) 00000-0000"
                maxLength={15}
                className="min-h-12"
                autoComplete="tel"
                aria-invalid={Boolean(erros.telefone)}
                aria-describedby={descricao("telefone", true, Boolean(erros.telefone))}
                {...register("telefone", {
                  onChange: (e) => setValue("telefone", formatarTelefone(e.target.value), { shouldValidate: false }),
                })}
              />
            </Campo>

            <Campo
              id="data-nascimento"
              rotulo={t.dataNascimento}
              ajuda={t.dataNascimentoAjuda}
              erro={erros.dataNascimento?.message}
              obrigatorio
              dicaObrigatorio={t.dicaObrigatorio}
            >
              <Input
                id="data-nascimento"
                type="date"
                required
                className="min-h-12"
                autoComplete="bday"
                aria-invalid={Boolean(erros.dataNascimento)}
                aria-describedby={descricao("data-nascimento", true, Boolean(erros.dataNascimento))}
                {...register("dataNascimento")}
              />
            </Campo>

            <div className="grid gap-5 sm:grid-cols-[1fr_7rem]">
              <Campo id="cidade" rotulo={t.cidade} erro={erros.cidade?.message} obrigatorio>
                <CidadeAutocomplete
                  id="cidade"
                  name="cidade"
                  value={watch("cidade") ?? ""}
                  onChange={(valor) => setValue("cidade", valor, { shouldValidate: true })}
                  estado={watch("estado") ?? ""}
                  aria-label={t.cidade}
                  aria-invalid={Boolean(erros.cidade)}
                  aria-describedby={descricao("cidade", false, Boolean(erros.cidade))}
                  className="min-h-12"
                />
              </Campo>

              <Campo id="estado" rotulo={t.estado} erro={erros.estado?.message} obrigatorio>
                <Input
                  id="estado"
                  required
                  maxLength={2}
                  className="min-h-12 uppercase"
                  autoComplete="address-level1"
                  aria-invalid={Boolean(erros.estado)}
                  aria-describedby={descricao("estado", false, Boolean(erros.estado))}
                  {...register("estado")}
                />
              </Campo>
            </div>

            <Button type="submit" className="min-h-12 w-full text-base" disabled={enviando || !candidato}>
              {enviando ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" /> {t.enviando}
                </>
              ) : (
                t.continuar
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AutenticacaoLayout>
  );
}
