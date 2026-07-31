import {
    Usuario,
    Candidato,
    Empresa,
    Administrador,
    Vaga,
    Candidatura,
    EmpresaSeguida,
    FavoritoVaga,
    Postagem,
    Comentario,
    Curtida,
    Notificacao,
    Conversa,
    Mensagem
} from "./models/index.js";

console.log("\n===== MODELS =====");

console.log(Usuario.name);
console.log(Candidato.name);
console.log(Empresa.name);
console.log(Administrador.name);
console.log(Vaga.name);
console.log(Candidatura.name);
console.log(EmpresaSeguida.name);
console.log(FavoritoVaga.name);
console.log(Postagem.name);
console.log(Comentario.name);
console.log(Curtida.name);
console.log(Notificacao.name);
console.log(Conversa.name);
console.log(Mensagem.name);

console.log("\n===== ASSOCIAÇÕES =====");

console.log(Usuario.associations);
console.log(Empresa.associations);
console.log(Candidato.associations);
console.log(Postagem.associations);

console.log("\nTudo carregado com sucesso.");