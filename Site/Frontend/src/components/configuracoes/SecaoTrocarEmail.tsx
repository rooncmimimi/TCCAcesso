import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { extrairMensagemErro } from "@/services/api";
import { autenticacaoService } from "@/services/autenticacao.service";
import { useSessao } from "@/hooks/useSessao";
import { useT } from "@/i18n";

/** Troca de e-mail: senha atual + novo e-mail, depois confirma com o código enviado ao novo endereço. */
export function SecaoTrocarEmail() {
  const t = useT();
  const te = t.configuracoes.trocarEmail;
  const { usuario, atualizar } = useSessao();
  const [aberto, setAberto] = useState(false);
  const [etapa, setEtapa] = useState<"pedido" | "confirmar">("pedido");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [codigo, setCodigo] = useState("");

  function reiniciar() {
    setEtapa("pedido");
    setSenhaAtual("");
    setNovoEmail("");
    setCodigo("");
  }

  const solicitar = useMutation({
    mutationFn: () => autenticacaoService.solicitarTrocaEmail(senhaAtual, novoEmail),
    onSuccess: () => {
      toast.success(te.codigoEnviado);
      setEtapa("confirmar");
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, te.erroSolicitar)),
  });

  const confirmar = useMutation({
    mutationFn: () => autenticacaoService.confirmarTrocaEmail(codigo),
    onSuccess: (usuarioAtualizado) => {
      atualizar({ email: usuarioAtualizado.email });
      // O toast já é lido pelo `useLeituraAutomatica`; falar aqui também duplicaria a leitura.
      toast.success(te.atualizado);
      setAberto(false);
      reiniciar();
    },
    onError: (erro) => {
      toast.error(extrairMensagemErro(erro, te.erroCodigo));
      setCodigo("");
    },
  });

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">{te.titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {te.atual} <span className="font-medium text-foreground">{usuario?.email}</span>
        </p>

        <Dialog
          open={aberto}
          onOpenChange={(valor) => {
            setAberto(valor);
            if (!valor) reiniciar();
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" className="min-h-11 gap-2">
              <Mail className="size-4" aria-hidden="true" /> {te.alterar}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            {etapa === "pedido" ? (
              <>
                <DialogHeader>
                  <DialogTitle>{te.dialogTitulo}</DialogTitle>
                  <DialogDescription>{te.dialogTexto}</DialogDescription>
                </DialogHeader>
                <form
                  className="space-y-4"
                  onSubmit={(evento) => {
                    evento.preventDefault();
                    solicitar.mutate();
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="senha-trocar-email">{te.senhaAtual}</Label>
                    <PasswordInput
                      id="senha-trocar-email"
                      autoComplete="current-password"
                      required
                      value={senhaAtual}
                      onChange={(evento) => setSenhaAtual(evento.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="novo-email">{te.novoEmail}</Label>
                    <Input
                      id="novo-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={novoEmail}
                      onChange={(evento) => setNovoEmail(evento.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                      {t.comum.cancelar}
                    </Button>
                    <Button
                      type="submit"
                      disabled={solicitar.isPending || !senhaAtual || !novoEmail}
                      className="min-h-11 gap-2"
                    >
                      {solicitar.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                      {te.enviarCodigo}
                    </Button>
                  </DialogFooter>
                </form>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>{te.confirmeTitulo}</DialogTitle>
                  <DialogDescription>{te.confirmeTexto(novoEmail)}</DialogDescription>
                </DialogHeader>
                <form
                  className="space-y-4"
                  onSubmit={(evento) => {
                    evento.preventDefault();
                    confirmar.mutate();
                  }}
                >
                  <Label htmlFor="codigo-trocar-email">{te.codigo}</Label>
                  <InputOTP id="codigo-trocar-email" maxLength={6} value={codigo} onChange={setCodigo}>
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  <DialogFooter className="pt-2">
                    <Button type="button" variant="outline" onClick={() => setEtapa("pedido")}>
                      {t.comum.voltar}
                    </Button>
                    <Button type="submit" disabled={confirmar.isPending || codigo.length !== 6} className="min-h-11 gap-2">
                      {confirmar.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                      {te.confirmar}
                    </Button>
                  </DialogFooter>
                </form>
              </>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
