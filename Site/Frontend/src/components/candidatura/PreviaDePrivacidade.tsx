import { CopiaCompartilhadaLista } from "@/components/candidatura/CopiaCompartilhada";
import type { PreviaDaCandidatura } from "@/types/adaptacoes";

/**
 * "O que a empresa receberá?": a prévia, montada pelo servidor com a MESMA função que grava a cópia,
 * então o que aparece aqui é exatamente o que será enviado. Separa os dados profissionais, o currículo
 * e as adaptações autorizadas, e diz o que nunca vai.
 */
export function PreviaDePrivacidade({ previa }: { previa: PreviaDaCandidatura }) {
  const d = previa.dadosProfissionais;
  const local = [d.cidade, d.estado].filter(Boolean).join(" / ");

  return (
    <div className="space-y-5">
      <section aria-labelledby="previa-profissionais" className="space-y-2">
        <h3 id="previa-profissionais" className="text-sm font-bold">
          Dados profissionais
        </h3>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Nome: {d.nome ?? "não informado"}</li>
          <li>E-mail de contato: {d.emailDeContato ?? "não informado"}</li>
          <li>Título profissional: {d.tituloProfissional ?? "não informado"}</li>
          <li>Cidade e estado: {local || "não informado"}</li>
          <li>Escolaridade: {d.escolaridade ?? "não informada"}</li>
        </ul>
      </section>

      <section aria-labelledby="previa-curriculo" className="space-y-2">
        <h3 id="previa-curriculo" className="text-sm font-bold">
          Currículo e perfil
        </h3>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Currículo: {d.curriculo ?? "você ainda não enviou um currículo"}</li>
          <li>Experiências: {d.experiencias}</li>
          <li>Formação: {d.formacoes}</li>
          <li>Habilidades: {d.habilidades}</li>
          <li>Sobre mim: {d.biografia ? "será mostrado" : "não preenchido"}</li>
        </ul>
      </section>

      <section aria-labelledby="previa-adaptacoes" className="space-y-2 rounded-lg border-2 border-primary/40 bg-primary-soft/40 p-3">
        <h3 id="previa-adaptacoes" className="text-sm font-bold">
          Adaptações que você autorizou ({previa.adaptacoes.total})
        </h3>
        <CopiaCompartilhadaLista itens={previa.adaptacoes.itens} />
      </section>

      <section aria-labelledby="previa-nao" className="space-y-2">
        <h3 id="previa-nao" className="text-sm font-bold">
          O que NÃO será compartilhado
        </h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {previa.naoCompartilhado.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
