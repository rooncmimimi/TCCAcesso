/**
 * Textos do fluxo de cadastro em português, inglês e espanhol.
 *
 * É um dicionário próprio e deliberadamente pequeno, não uma arquitetura de i18n: o projeto não tem
 * nenhuma (nem biblioteca, nem locale, nem contexto de idioma), e montar uma para traduzir só o
 * cadastro seria carregar peso que o resto do site ainda não usa. Quando a tradução do site inteiro
 * entrar, este arquivo vira o primeiro conjunto de chaves dela.
 *
 * O idioma **não** é salvo na conta, por decisão do produto: nada fora do cadastro está traduzido,
 * então uma preferência gravada não teria onde ser honrada depois do login.
 *
 * Hoje o cadastro usa só o português (`textosDoCadastro("pt")`): o seletor de idioma saiu da tela.
 * As versões em inglês e espanhol continuam aqui, sem uso, para quando o seletor ou a tradução do
 * site voltarem — mantê-las exige acompanhar as chaves novas do português.
 *
 * As mensagens de erro moram aqui junto dos rótulos de propósito. Traduzir só o rótulo e deixar o
 * erro em português deixaria a tela meio traduzida justamente na hora em que a pessoa mais precisa
 * entender o que fazer.
 */
export const IDIOMAS = [
  { codigo: "pt", nome: "Português" },
  { codigo: "en", nome: "English" },
  { codigo: "es", nome: "Español" },
] as const;

export type CodigoIdioma = (typeof IDIOMAS)[number]["codigo"];

const pt = {
  htmlLang: "pt-BR",
  legendaObrigatorio: "Campo obrigatório",
  dicaObrigatorio: "Campo obrigatório",

  tipoConta: "Você está criando uma conta de",
  pessoaCandidata: "Pessoa candidata",
  empresa: "Empresa",

  passos: ["Conta", "Dados pessoais", "Perfil", "Acessibilidade"],
  etapa: (n: number, total: number, nome: string) => `Etapa ${n} de ${total} — ${nome}`,
  etapaConcluida: "concluída",
  etapaAtual: "etapa atual",
  etapaPendente: "ainda não preenchida",

  voltar: "Voltar",
  continuar: "Continuar",
  criarConta: "Criar conta",
  finalizar: "Finalizar cadastro",
  enviando: "Enviando…",
  finalizando: "Finalizando…",
  jaTemConta: "Já tem uma conta?",
  entrar: "Entrar",
  acessibilidade: "Acessibilidade",

  contaTitulo: "Crie sua conta",
  contaDescricao: "Só o essencial para começar. Os dados do seu perfil vêm depois.",
  email: "E-mail",
  emailAjuda: "Use um e-mail que você acessa: é por ele que você entra na plataforma.",
  cpf: "CPF",
  cpfAjuda: "Guardado cifrado, só para evitar contas duplicadas. Nunca aparece no seu perfil público.",
  senha: "Senha",
  mostrarSenha: "Mostrar senha",
  termosAntes: "Li e aceito os",
  termosLinkUso: "Termos de Uso",
  termosEntre: "e a",
  termosLinkPrivacidade: "Política de Privacidade",
  termosDepois: "do ACESSO.",
  abrirDocumento: "abrir para ler",

  requisitos: [
    "Pelo menos 8 caracteres",
    "Uma letra maiúscula",
    "Uma letra minúscula",
    "Um número",
    "Um caractere especial",
  ],
  requisitoAtendido: "atendido",
  requisitoPendente: "ainda não atendido",

  dadosTitulo: "Informações pessoais",
  dadosDescricao: "É assim que as empresas vão te reconhecer na plataforma.",
  nome: "Nome completo",
  telefone: "Telefone",
  telefoneAjuda: "Com DDD. Só aparece para empresas que avançarem com a sua candidatura.",
  dataNascimento: "Data de nascimento",
  dataNascimentoAjuda: "Ajuda a mostrar vagas afirmativas para pessoas 50+ quando for o seu caso.",
  cidade: "Cidade",
  estado: "Estado (UF)",

  perfilTitulo: "Vamos completar seu perfil profissional",
  perfilDescricao:
    "Envie seu currículo para preencher automaticamente algumas informações do seu perfil. Você poderá revisar, corrigir e complementar os dados antes de continuar.",
  anexarCurriculo: "Anexar currículo",
  curriculoFormatos: "PDF ou DOCX, até 5 MB. O envio é opcional.",
  continuarSemCurriculo: "Continuar sem currículo",
  lendoCurriculo: "Lendo seu currículo…",
  curriculoLido: "Encontramos estas informações. Revise, corrija e complete antes de salvar.",
  curriculoNadaExtraido:
    "Não foi possível extrair texto deste arquivo (pode ser um PDF digitalizado). Preencha os campos abaixo manualmente.",
  trocarArquivo: "Trocar arquivo",
  tituloProfissional: "Título profissional",
  tituloProfissionalAjuda: "Como você se apresenta profissionalmente. Ex.: Analista de Marketing.",
  escolaridade: "Escolaridade",
  escolaridadeSelecione: "Selecione",
  biografia: "Resumo profissional",
  biografiaAjuda: "Alguns parágrafos sobre sua trajetória, o que você faz e o que procura.",
  experiencias: "Experiências profissionais",
  semExperiencia: "Ainda não tenho experiência profissional",
  semExperienciaAjuda:
    "Marque se você está começando agora. Nada de inventar histórico — isso não atrapalha suas candidaturas.",
  adicionarExperiencia: "Adicionar experiência",
  removerItem: "Remover",
  cargo: "Cargo",
  empresaItem: "Empresa",
  periodo: "Período",
  periodoInicio: "Início",
  periodoFim: "Fim",
  formacoes: "Formação acadêmica",
  adicionarFormacao: "Adicionar formação",
  instituicao: "Instituição",
  curso: "Curso",
  habilidades: "Habilidades",
  habilidadesAjuda: "Separe por vírgula. Ex.: Excel, atendimento ao cliente, Libras.",
  complementarDepois: "Você pode complementar tudo isso depois, no seu perfil.",

  acessTitulo: "Deixe o ACESSO do seu jeito",
  acessDescricao:
    "Ajuste o que precisar e veja o resultado na hora. Você pode mudar tudo depois, em Configurações. Nada aqui é obrigatório.",

  erroEmail: "Informe seu e-mail.",
  erroEmailFormato: "Digite um endereço de e-mail válido.",
  erroCpf: "Informe seu CPF.",
  erroCpfFormato: "Digite um CPF válido, com 11 números.",
  erroSenha: "A senha deve ter entre 8 e 72 caracteres.",
  erroSenhaMinuscula: "A senha deve conter ao menos uma letra minúscula.",
  erroSenhaMaiuscula: "A senha deve conter ao menos uma letra maiúscula.",
  erroSenhaNumero: "A senha deve conter ao menos um número.",
  erroSenhaEspecial: "A senha deve conter ao menos um caractere especial.",
  erroTermos: "É preciso aceitar os Termos de Uso e a Política de Privacidade para criar a conta.",
  erroNome: "Informe seu nome completo (ao menos 3 caracteres).",
  erroTelefone: "Informe seu telefone.",
  erroTelefoneFormato: "Digite um telefone válido, com DDD.",
  erroDataNascimento: "Informe sua data de nascimento.",
  erroDataFutura: "A data de nascimento não pode estar no futuro.",
  erroCidade: "Informe a cidade onde você mora.",
  erroEstado: "Informe a UF com 2 letras.",
  erroTitulo: "Informe seu título profissional.",
  erroEscolaridade: "Escolha sua escolaridade.",
  erroBiografia: "Escreva um resumo profissional (ao menos 20 caracteres).",
  erroContaGenerico: "Não foi possível criar sua conta agora.",
  erroPerfilGenerico: "Não foi possível salvar seu perfil agora.",
  erroCurriculo: "Não foi possível ler este arquivo. Tente outro, ou preencha manualmente.",
};

/** O dicionário de português define a forma; inglês e espanhol precisam ter exatamente as mesmas chaves. */
type Textos = typeof pt;

const en: Textos = {
  htmlLang: "en",
  legendaObrigatorio: "Required field",
  dicaObrigatorio: "Required field",

  tipoConta: "You are creating an account as",
  pessoaCandidata: "Job seeker",
  empresa: "Company",

  passos: ["Account", "Personal details", "Profile", "Accessibility"],
  etapa: (n, total, nome) => `Step ${n} of ${total} — ${nome}`,
  etapaConcluida: "completed",
  etapaAtual: "current step",
  etapaPendente: "not filled in yet",

  voltar: "Back",
  continuar: "Continue",
  criarConta: "Create account",
  finalizar: "Finish signing up",
  enviando: "Submitting…",
  finalizando: "Finishing…",
  jaTemConta: "Already have an account?",
  entrar: "Sign in",
  acessibilidade: "Accessibility",

  contaTitulo: "Create your account",
  contaDescricao: "Just the essentials to get started. Your profile details come next.",
  email: "Email",
  emailAjuda: "Use an email you can access: it is how you sign in to the platform.",
  cpf: "CPF (Brazilian tax ID)",
  cpfAjuda: "Stored encrypted, only to prevent duplicate accounts. It never appears on your public profile.",
  senha: "Password",
  mostrarSenha: "Show password",
  termosAntes: "I have read and accept the",
  termosLinkUso: "Terms of Use",
  termosEntre: "and the",
  termosLinkPrivacidade: "Privacy Policy",
  termosDepois: "of ACESSO.",
  abrirDocumento: "open to read",

  requisitos: [
    "At least 8 characters",
    "One uppercase letter",
    "One lowercase letter",
    "One number",
    "One special character",
  ],
  requisitoAtendido: "met",
  requisitoPendente: "not met yet",

  dadosTitulo: "Personal details",
  dadosDescricao: "This is how companies will recognise you on the platform.",
  nome: "Full name",
  telefone: "Phone",
  telefoneAjuda: "Including area code. Only companies that move your application forward can see it.",
  dataNascimento: "Date of birth",
  dataNascimentoAjuda: "Helps us show affirmative-action jobs for people aged 50+ when that applies to you.",
  cidade: "City",
  estado: "State",

  perfilTitulo: "Let's complete your professional profile",
  perfilDescricao:
    "Upload your CV to fill in some of your profile automatically. You will be able to review, correct and complete the data before continuing.",
  anexarCurriculo: "Attach CV",
  curriculoFormatos: "PDF or DOCX, up to 5 MB. Uploading is optional.",
  continuarSemCurriculo: "Continue without a CV",
  lendoCurriculo: "Reading your CV…",
  curriculoLido: "We found this information. Review, correct and complete it before saving.",
  curriculoNadaExtraido:
    "We could not extract text from this file (it may be a scanned PDF). Please fill in the fields below manually.",
  trocarArquivo: "Choose another file",
  tituloProfissional: "Professional title",
  tituloProfissionalAjuda: "How you introduce yourself professionally. E.g. Marketing Analyst.",
  escolaridade: "Education level",
  escolaridadeSelecione: "Select",
  biografia: "Professional summary",
  biografiaAjuda: "A few lines about your background, what you do and what you are looking for.",
  experiencias: "Work experience",
  semExperiencia: "I do not have work experience yet",
  semExperienciaAjuda:
    "Tick this if you are just starting out. Do not make up a history — this will not hurt your applications.",
  adicionarExperiencia: "Add experience",
  removerItem: "Remove",
  cargo: "Job title",
  empresaItem: "Company",
  periodo: "Period",
  periodoInicio: "Start",
  periodoFim: "End",
  formacoes: "Education",
  adicionarFormacao: "Add education",
  instituicao: "Institution",
  curso: "Course",
  habilidades: "Skills",
  habilidadesAjuda: "Separate with commas. E.g. Excel, customer service, sign language.",
  complementarDepois: "You can complete all of this later on your profile.",

  acessTitulo: "Make ACESSO work the way you need",
  acessDescricao:
    "Adjust whatever you need and see the result right away. You can change everything later in Settings. Nothing here is required.",

  erroEmail: "Enter your email.",
  erroEmailFormato: "Enter a valid email address.",
  erroCpf: "Enter your CPF.",
  erroCpfFormato: "Enter a valid CPF, with 11 digits.",
  erroSenha: "The password must be between 8 and 72 characters.",
  erroSenhaMinuscula: "The password must contain at least one lowercase letter.",
  erroSenhaMaiuscula: "The password must contain at least one uppercase letter.",
  erroSenhaNumero: "The password must contain at least one number.",
  erroSenhaEspecial: "The password must contain at least one special character.",
  erroTermos: "You must accept the Terms of Use and the Privacy Policy to create an account.",
  erroNome: "Enter your full name (at least 3 characters).",
  erroTelefone: "Enter your phone number.",
  erroTelefoneFormato: "Enter a valid phone number, including area code.",
  erroDataNascimento: "Enter your date of birth.",
  erroDataFutura: "The date of birth cannot be in the future.",
  erroCidade: "Enter the city where you live.",
  erroEstado: "Enter the 2-letter state code.",
  erroTitulo: "Enter your professional title.",
  erroEscolaridade: "Choose your education level.",
  erroBiografia: "Write a professional summary (at least 20 characters).",
  erroContaGenerico: "We could not create your account right now.",
  erroPerfilGenerico: "We could not save your profile right now.",
  erroCurriculo: "We could not read this file. Try another one, or fill in the fields manually.",
};

const es: Textos = {
  htmlLang: "es",
  legendaObrigatorio: "Campo obligatorio",
  dicaObrigatorio: "Campo obligatorio",

  tipoConta: "Estás creando una cuenta de",
  pessoaCandidata: "Persona candidata",
  empresa: "Empresa",

  passos: ["Cuenta", "Datos personales", "Perfil", "Accesibilidad"],
  etapa: (n, total, nome) => `Paso ${n} de ${total} — ${nome}`,
  etapaConcluida: "completado",
  etapaAtual: "paso actual",
  etapaPendente: "aún sin completar",

  voltar: "Volver",
  continuar: "Continuar",
  criarConta: "Crear cuenta",
  finalizar: "Finalizar registro",
  enviando: "Enviando…",
  finalizando: "Finalizando…",
  jaTemConta: "¿Ya tienes una cuenta?",
  entrar: "Iniciar sesión",
  acessibilidade: "Accesibilidad",

  contaTitulo: "Crea tu cuenta",
  contaDescricao: "Solo lo esencial para empezar. Los datos de tu perfil vienen después.",
  email: "Correo electrónico",
  emailAjuda: "Usa un correo al que tengas acceso: es con él que entras en la plataforma.",
  cpf: "CPF (identificación fiscal brasileña)",
  cpfAjuda: "Se guarda cifrado, solo para evitar cuentas duplicadas. Nunca aparece en tu perfil público.",
  senha: "Contraseña",
  mostrarSenha: "Mostrar contraseña",
  termosAntes: "He leído y acepto los",
  termosLinkUso: "Términos de Uso",
  termosEntre: "y la",
  termosLinkPrivacidade: "Política de Privacidad",
  termosDepois: "de ACESSO.",
  abrirDocumento: "abrir para leer",

  requisitos: [
    "Al menos 8 caracteres",
    "Una letra mayúscula",
    "Una letra minúscula",
    "Un número",
    "Un carácter especial",
  ],
  requisitoAtendido: "cumplido",
  requisitoPendente: "aún no cumplido",

  dadosTitulo: "Datos personales",
  dadosDescricao: "Así es como las empresas te reconocerán en la plataforma.",
  nome: "Nombre completo",
  telefone: "Teléfono",
  telefoneAjuda: "Con prefijo. Solo lo ven las empresas que avancen con tu candidatura.",
  dataNascimento: "Fecha de nacimiento",
  dataNascimentoAjuda: "Ayuda a mostrar vacantes afirmativas para personas de 50+ cuando sea tu caso.",
  cidade: "Ciudad",
  estado: "Estado",

  perfilTitulo: "Vamos a completar tu perfil profesional",
  perfilDescricao:
    "Envía tu currículum para rellenar automáticamente parte de tu perfil. Podrás revisar, corregir y completar los datos antes de continuar.",
  anexarCurriculo: "Adjuntar currículum",
  curriculoFormatos: "PDF o DOCX, hasta 5 MB. El envío es opcional.",
  continuarSemCurriculo: "Continuar sin currículum",
  lendoCurriculo: "Leyendo tu currículum…",
  curriculoLido: "Encontramos esta información. Revísala, corrígela y complétala antes de guardar.",
  curriculoNadaExtraido:
    "No fue posible extraer texto de este archivo (puede ser un PDF escaneado). Completa los campos manualmente.",
  trocarArquivo: "Cambiar archivo",
  tituloProfissional: "Título profesional",
  tituloProfissionalAjuda: "Cómo te presentas profesionalmente. Ej.: Analista de Marketing.",
  escolaridade: "Nivel de estudios",
  escolaridadeSelecione: "Selecciona",
  biografia: "Resumen profesional",
  biografiaAjuda: "Unas líneas sobre tu trayectoria, lo que haces y lo que buscas.",
  experiencias: "Experiencia laboral",
  semExperiencia: "Todavía no tengo experiencia laboral",
  semExperienciaAjuda:
    "Márcalo si estás empezando. No inventes un historial — esto no perjudica tus candidaturas.",
  adicionarExperiencia: "Añadir experiencia",
  removerItem: "Quitar",
  cargo: "Puesto",
  empresaItem: "Empresa",
  periodo: "Período",
  periodoInicio: "Inicio",
  periodoFim: "Fin",
  formacoes: "Formación académica",
  adicionarFormacao: "Añadir formación",
  instituicao: "Institución",
  curso: "Curso",
  habilidades: "Habilidades",
  habilidadesAjuda: "Sepáralas con comas. Ej.: Excel, atención al cliente, lengua de signos.",
  complementarDepois: "Puedes completar todo esto después, en tu perfil.",

  acessTitulo: "Deja ACESSO a tu manera",
  acessDescricao:
    "Ajusta lo que necesites y mira el resultado al instante. Puedes cambiarlo todo después, en Configuración. Nada aquí es obligatorio.",

  erroEmail: "Introduce tu correo electrónico.",
  erroEmailFormato: "Introduce una dirección de correo válida.",
  erroCpf: "Introduce tu CPF.",
  erroCpfFormato: "Introduce un CPF válido, con 11 números.",
  erroSenha: "La contraseña debe tener entre 8 y 72 caracteres.",
  erroSenhaMinuscula: "La contraseña debe contener al menos una letra minúscula.",
  erroSenhaMaiuscula: "La contraseña debe contener al menos una letra mayúscula.",
  erroSenhaNumero: "La contraseña debe contener al menos un número.",
  erroSenhaEspecial: "La contraseña debe contener al menos un carácter especial.",
  erroTermos: "Debes aceptar los Términos de Uso y la Política de Privacidad para crear la cuenta.",
  erroNome: "Introduce tu nombre completo (al menos 3 caracteres).",
  erroTelefone: "Introduce tu teléfono.",
  erroTelefoneFormato: "Introduce un teléfono válido, con prefijo.",
  erroDataNascimento: "Introduce tu fecha de nacimiento.",
  erroDataFutura: "La fecha de nacimiento no puede estar en el futuro.",
  erroCidade: "Introduce la ciudad donde vives.",
  erroEstado: "Introduce el código de estado con 2 letras.",
  erroTitulo: "Introduce tu título profesional.",
  erroEscolaridade: "Elige tu nivel de estudios.",
  erroBiografia: "Escribe un resumen profesional (al menos 20 caracteres).",
  erroContaGenerico: "No fue posible crear tu cuenta ahora.",
  erroPerfilGenerico: "No fue posible guardar tu perfil ahora.",
  erroCurriculo: "No fue posible leer este archivo. Prueba con otro o completa los campos manualmente.",
};

const DICIONARIOS: Record<CodigoIdioma, Textos> = { pt, en, es };

export function textosDoCadastro(idioma: CodigoIdioma): Textos {
  return DICIONARIOS[idioma] ?? pt;
}

export type TextosCadastro = Textos;
