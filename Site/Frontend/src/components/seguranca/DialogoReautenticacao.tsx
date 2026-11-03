import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { Campo } from "@/components/cadastro/Campo";
import { descricao } from "@/components/cadastro/descricao";
import { CampoCodigo } from "@/components/seguranca/CampoCodigo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PasswordInput } from "@/components/ui/password-input";
import { mensagemDeErroTotp, type Reautenticacao } from "@/services/totp.service";

/**
 * Pede de novo a senha (quando a conta tem) e um código antes de uma ação sensível da verificação em duas
 * etapas. Uma sessão aberta não basta: um aparelho esquecido logado não pode desligar nem trocar a proteção.
 * O código pode ser o do aplicativo ou um código de recuperação.
 */
export function DialogoReautenticacao({
  aberto,
  titulo,
  texto,
  rotuloConfirmar,
  destrutivo,
  pedeSenha,
  aoConfirmar,
  aoFechar,
}: {
  aberto: boolean;
  titulo: string;
  texto: string;
  rotuloConfirmar: string;
  destrutivo?: boolean;
  /** Falso na conta que entra só pelo Google e ainda não tem senha. */
  pedeSenha: boolean;
  aoConfirmar: (reautenticacao: Reautenticacao) => Promise<void>;
  aoFechar: () => void;
}) {
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);

  useEffect(() => {
    if (aberto) {
      setSenha("");
      setCodigo("");
      setErro(undefined);
    }
  }, [aberto]);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (enviandoRef.current) return;

    if (pedeSenha && !senha) {
      setErro("Informe a sua senha atual.");
      return;
    }

    if (!codigo.trim()) {
      setErro("Informe o código do aplicativo ou um código de recuperação.");
      return;
    }

    enviandoRef.current = true;
    setEnviando(true);
    setErro(undefined);

    try {
      await aoConfirmar({ ...(pedeSenha ? { senhaAtual: senha } : {}), codigo: codigo.trim() });
    } catch (falha) {
      setErro(mensagemDeErroTotp(falha));
      setCodigo("");
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(valor) => !valor && !enviando && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{texto}</DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-4" noValidate>
          {pedeSenha && (
            <Campo id="reautenticacao-senha" rotulo="Senha atual">
              <PasswordInput
                id="reautenticacao-senha"
                autoComplete="current-password"
                value={senha}
                onChange={(evento) => {
                  setSenha(evento.target.value);
                  setErro(undefined);
                }}
                disabled={enviando}
                aria-describedby={descricao("reautenticacao-senha", false, false)}
              />
            </Campo>
          )}

          <CampoCodigo
            id="reautenticacao-codigo"
            rotulo="Código do aplicativo ou de recuperação"
            valor={codigo}
            aoMudar={(valor) => {
              setCodigo(valor);
              setErro(undefined);
            }}
            erro={erro}
            ajuda="Os 6 números do aplicativo autenticador ou um dos seus códigos de recuperação."
            tipo="recuperacao"
            desabilitado={enviando}
          />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" className="min-h-11" onClick={aoFechar} disabled={enviando}>
              Cancelar
            </Button>
            <Button type="submit" variant={destrutivo ? "destructive" : "default"} className="min-h-11" disabled={enviando}>
              {enviando ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" /> Verificando…
                </>
              ) : (
                rotuloConfirmar
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
