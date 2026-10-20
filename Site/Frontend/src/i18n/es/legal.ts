import type { Dicionario } from "../dicionario";

/**
 * Traducción al español de los Términos de Uso y de la Política de Privacidad. El texto en
 * portugués (`pt/legal.ts`) es la versión de referencia; mismas secciones, mismos puntos, mismo orden.
 */
export const legal: Dicionario["legal"] = {
  ui: {
    notaReferencia:
      "Esta es una traducción de cortesía. La versión en portugués es el texto de referencia: si hay alguna diferencia entre las dos, prevalece la versión en portugués.",
    versao: (versao) => `Versión ${versao}`,
    abrirNovaAba: "Abrir en una pestaña nueva",
    voltarCadastro: "Volver al registro",
    voltarInicio: "Volver a la página de inicio",
    inicio: "Inicio",
    pendenteTitulo: "Documento aún no publicado.",
    pendenteTexto: (titulo) =>
      `El texto oficial de «${titulo}» se está elaborando. Lo que lees a continuación es solo la lista de los temas que cubrirá — no es un contrato y no tiene valor jurídico.`,
  },
  termos: {
    meta: { titulo: "Términos de Uso — ACESSO", descricao: "Las reglas de uso de la plataforma ACESSO." },
    titulo: "Términos de Uso",
    resumo: (versao) => `Las reglas de uso de la plataforma ACESSO. Versión ${versao}.`,
    secoes: [
      {
        titulo: "1. Qué es ACESSO",
        paragrafos: [
          "ACESSO es una red profesional orientada a la inclusión en el mercado laboral, hecha para personas con discapacidad, profesionales de 50 años o más y empresas que practican la contratación inclusiva.",
          "La plataforma conecta a personas candidatas y empresas: permite armar un perfil profesional, publicar y buscar vacantes, postularse, intercambiar mensajes y publicar contenido en la comunidad.",
          "ACESSO no es una agencia de empleo ni participa en la relación laboral entre quien contrata y quien es contratado. La decisión de contratar, y todo lo que de ella se derive, es de la empresa.",
          "El uso de la plataforma es gratuito para las personas candidatas y para las empresas.",
        ],
      },
      {
        titulo: "2. Quién puede crear una cuenta",
        paragrafos: [
          "Para crear una cuenta hay que tener 16 años o más y proporcionar información veraz sobre uno mismo.",
          "Cuenta de persona candidata: creada por una persona física, para sí misma. Cada persona debe tener una única cuenta.",
          "Cuenta de empresa: creada a partir de una cuenta de persona candidata ya existente, por alguien autorizado para representar a la empresa. Las dos cuentas quedan vinculadas, pero siguen siendo independientes, con accesos propios.",
          "La cuenta de empresa pasa por un análisis del equipo de ACESSO antes de poder publicar vacantes. El análisis verifica que la empresa exista y que el registro sea coherente; puede ser rechazada, y se informa el motivo.",
          "Eres responsable de mantener tu contraseña en secreto y de todo lo que ocurra en tu cuenta. Si sospechas de un acceso indebido, cambia la contraseña y cierra las demás sesiones en Configuración.",
        ],
      },
      {
        titulo: "3. Qué puedes hacer",
        paragrafos: [
          "Persona candidata: armar y editar un perfil profesional, subir un currículum, declarar una discapacidad, postularse a vacantes, seguir a personas y empresas, intercambiar mensajes, publicar en la comunidad y ajustar las preferencias de accesibilidad.",
          "Empresa: mantener un perfil institucional, publicar y gestionar vacantes, ver y responder postulaciones, intercambiar mensajes con personas candidatas y publicar en la comunidad.",
          "Conservas la titularidad del contenido que publicas. Al publicar, autorizas a ACESSO a mostrar ese contenido en la plataforma a quienes tus ajustes de privacidad permitan — nada más.",
        ],
      },
      {
        titulo: "4. Qué no está permitido",
        paragrafos: [
          "Publicar una vacante con exigencias discriminatorias, o usar la plataforma para discriminar por discapacidad, edad, raza, color, etnia, sexo, orientación sexual, identidad de género, religión, origen o condición social.",
          "Hacerse pasar por otra persona o empresa, usar datos de terceros, o crear una cuenta de empresa sin autorización para representarla.",
          "Publicar una vacante inexistente, cobrar cualquier monto a las personas candidatas, o pedir datos bancarios, documentos de pago o contraseñas a través de la plataforma.",
          "Acosar, amenazar, difamar o importunar a otras personas; publicar contenido ilegal, violento o sexual.",
          "Recopilar datos de otras personas por medios automatizados, intentar eludir los controles de acceso de la plataforma, o atacar la disponibilidad del servicio.",
          "Usar currículums o datos de contacto obtenidos aquí para una finalidad distinta de un proceso de selección.",
        ],
      },
      {
        titulo: "5. Moderación",
        paragrafos: [
          "Cualquier persona puede denunciar contenido o una cuenta desde la propia plataforma. Las denuncias son analizadas por el equipo de ACESSO.",
          "El contenido que infrinja estos Términos puede ser eliminado. Las cuentas pueden ser bloqueadas, y las empresas pueden ser suspendidas o tener su registro rechazado. En esos casos el motivo se registra y se informa a quien fue afectado.",
          "La decisión puede ser impugnada mediante el canal de contacto indicado en el punto 9.",
        ],
      },
      {
        titulo: "6. Cerrar la cuenta",
        paragrafos: [
          "Puedes pausar la cuenta en cualquier momento: deja de aparecer para otras personas y se reactiva cuando vuelvas a iniciar sesión y lo confirmes.",
          "También puedes eliminar la cuenta de forma definitiva. La eliminación borra tu perfil, currículum, postulaciones, publicaciones, mensajes y preferencias. Es irreversible.",
          "Pueden permanecer, por el tiempo necesario: los registros que la ley obligue a conservar, y los datos estrictamente necesarios para la defensa en un proceso. El detalle está en la Política de Privacidad.",
        ],
      },
      {
        titulo: "7. Disponibilidad y límites de responsabilidad",
        paragrafos: [
          "ACESSO se ofrece tal como está. La plataforma puede quedar no disponible por mantenimiento, por una falla técnica o por la indisponibilidad de los servicios de infraestructura de los que depende.",
          "ACESSO no garantiza que una postulación resulte en una contratación, ni responde por las decisiones, conductas o informaciones de las empresas y de las personas candidatas.",
          "El contenido publicado por quienes usan la plataforma es responsabilidad de quien lo publicó. ACESSO actúa sobre ese contenido cuando es denunciado o cuando toma conocimiento de él, conforme al punto 5.",
          "La plataforma verifica la existencia de la empresa en el registro, pero eso no es garantía de su idoneidad ni de la veracidad de cada vacante. Desconfía de las solicitudes de dinero o de datos sensibles y denúncialas.",
        ],
      },
      {
        titulo: "8. Cambios en estos Términos",
        paragrafos: [
          "Estos Términos pueden cambiar. Cada versión tiene un identificador, y ACESSO registra qué versión aceptaste al crear la cuenta y cuándo.",
          "Cuando haya un cambio relevante, ACESSO avisará por el correo electrónico registrado o en la propia plataforma, indicando la fecha en que la nueva versión pasa a regir.",
          "Seguir usando la plataforma después de esa fecha significa estar de acuerdo con la nueva versión. Si no estás de acuerdo, puedes eliminar la cuenta, como se describe en el punto 6.",
        ],
      },
      {
        titulo: "9. Contacto y jurisdicción",
        paragrafos: [
          "Dudas, denuncias y solicitudes sobre estos Términos: projetoacessoinclusivo@gmail.com.",
          "Estos Términos se rigen por las leyes de Brasil. Se elige el fuero del domicilio del usuario para resolver las controversias, conforme al Código de Defensa del Consumidor brasileño (Código de Defesa do Consumidor).",
        ],
      },
    ],
  },
  privacidade: {
    meta: { titulo: "Política de Privacidad — ACESSO", descricao: "Cómo ACESSO trata tus datos personales." },
    titulo: "Política de Privacidad",
    resumo: (versao) => `Cómo ACESSO trata tus datos personales. Versión ${versao}.`,
    secoes: [
      {
        titulo: "1. Quién trata tus datos",
        paragrafos: [
          "ACESSO es el responsable de los datos personales tratados en la plataforma, en los términos de la Ley General de Protección de Datos de Brasil (Lei Geral de Proteção de Dados — Ley n.º 13.709/2018, «LGPD»).",
          "Contacto para asuntos de privacidad, incluido el ejercicio de tus derechos: projetoacessoinclusivo@gmail.com.",
        ],
      },
      {
        titulo: "2. Qué datos se recopilan",
        paragrafos: [
          "Al crear la cuenta: nombre completo, correo electrónico, teléfono, CPF (el número de contribuyente de persona física de Brasil), fecha de nacimiento, ciudad y estado, además de la contraseña, que se guarda solo como hash y nunca como texto. El registro no pregunta el país: ACESSO registra Brasil en todas las cuentas.",
          "En el perfil profesional, si quieres completarlo: título profesional, nivel educativo, resumen, experiencias, formaciones, habilidades, certificados, LinkedIn, GitHub, disponibilidad, pretensión salarial, foto y portada.",
          "Currículum: el archivo que subas, cuando lo subas. Es opcional.",
          "Declaración de discapacidad y necesidades de accesibilidad, si quieres declararlas. Son datos sensibles y reciben el tratamiento descrito en el punto 4.",
          "Uso de la plataforma: postulaciones, vacantes favoritas, publicaciones, comentarios, me gusta, comparticiones, mensajes, personas y empresas que sigues, bloqueos y denuncias que hagas.",
          "Preferencias de accesibilidad y de notificación, para que la plataforma se abra como la configuraste.",
          "Seguridad y funcionamiento: sesiones activas con dispositivo y dirección IP, registros de auditoría de acciones sensibles, y el identificador de tu cuenta de Google si entras con ella — nunca tu contraseña de Google.",
          "De las empresas: CNPJ (el número de registro de empresa de Brasil), razón social, nombre comercial, sector, tamaño, dirección, sitio web, descripción institucional, cultura inclusiva, logo y portada, además de los datos de quien responde por la cuenta.",
        ],
      },
      {
        titulo: "3. Por qué se pide cada dato y con qué base legal",
        paragrafos: [
          "Ejecución del contrato (art. 7, V de la LGPD): nombre, correo electrónico, contraseña, teléfono, fecha de nacimiento, ubicación, perfil profesional, currículum, postulaciones y mensajes. Sin ellos la plataforma no funciona; por eso son obligatorios en el registro los datos de la cuenta y los datos personales, y opcionales el currículum y la foto.",
          "Interés legítimo (art. 7, IX): CPF y CNPJ, guardados cifrados, para evitar cuentas duplicadas y confirmar que la empresa existe; y también la seguridad de la cuenta, la moderación de contenido, los registros de auditoría y la mejora de la plataforma.",
          "Consentimiento (art. 7, I y art. 11, I): la declaración de discapacidad y demás información sensible que elijas poner en el perfil. Tú eliges si la informas, y puedes retirarla en cualquier momento.",
        ],
      },
      {
        titulo: "4. Datos sensibles: discapacidad y accesibilidad",
        paragrafos: [
          "Declarar una discapacidad es siempre opcional. La plataforma funciona sin esa información.",
          "La discapacidad que declaras forma parte de tu perfil: aparece en la sección de discapacidades y es visible para quien pueda ver tu perfil, incluidas las empresas. Si no quieres que aparezca, no la declares, o elimina la declaración.",
          "ACESSO no usa la declaración para puntuar ni clasificar postulaciones.",
          "Las preferencias de accesibilidad de la plataforma (contraste, tamaño de letra, lectura por voz, VLibras y similares) son otra cosa: quedan en tu cuenta solo para que la pantalla se abra como la configuraste, y no se muestran en tu perfil.",
          "Puedes eliminar la declaración de discapacidad en cualquier momento en tu perfil, y deja de aparecer de inmediato.",
        ],
      },
      {
        titulo: "5. Con quién se comparten los datos",
        paragrafos: [
          "Empresas: cuando te postulas a una vacante, la empresa de esa vacante recibe tu perfil, tu currículum y los datos necesarios para el proceso. Sin postulación, una empresa ve solo lo que tu perfil muestra públicamente.",
          "Otras personas: lo que publicas en la comunidad y tu perfil público son visibles para quienes tus ajustes de privacidad permitan. Lo controlas en Configuración › Privacidad.",
          "Proveedores de infraestructura, que tratan datos solo para operar el servicio: Supabase (base de datos y almacenamiento de archivos), Render (servidor de la aplicación), Vercel (alojamiento del Sitio), Brevo (envío de correos de confirmación y de recuperación de contraseña) y Expo (entrega de notificaciones push).",
          "Google (entrar con la cuenta de Google): solo si optas por ese camino. ACESSO recibe de Google el identificador de la cuenta, el correo electrónico y el nombre, y le envía solo lo necesario para la autenticación.",
          "Fuentes tipográficas y VLibras: al abrir el Sitio, tu navegador obtiene las fuentes tipográficas de Google Fonts y la fuente para dislexia de CDNFonts, y esos servicios reciben tu dirección IP y datos técnicos del navegador, como ocurre con cualquier solicitud por internet. Si activas VLibras en las preferencias de accesibilidad, el navegador también carga el traductor de Libras del Gobierno Federal (vlibras.gov.br), que pasa a recibir esos mismos datos técnicos.",
          "IBGE: la lista de ciudades se consulta en el servicio público del IBGE para completar la ubicación. En esa consulta no se envía ningún dato tuyo.",
          "Descripción automática de imágenes: si pides una sugerencia de texto alternativo para una imagen, esa imagen se envía a un servicio externo de inteligencia artificial (OpenRouter) solo para generar la sugerencia. Es una acción tuya, nunca automática, y ningún otro dato de tu perfil acompaña a la imagen.",
          "Autoridades: mediante orden judicial o requerimiento legal, en la medida exigida.",
          "ACESSO no vende datos personales ni los comparte con fines publicitarios.",
        ],
      },
      {
        titulo: "6. Por cuánto tiempo se guardan los datos",
        paragrafos: [
          "Mientras tu cuenta exista, los datos de tu perfil se guardan para que la plataforma funcione.",
          "Cuenta pausada: los datos se conservan y dejan de aparecer para otras personas, hasta que la reactives.",
          "Cuenta eliminada: el perfil, el currículum, las postulaciones, las publicaciones, los mensajes y las preferencias se borran, y el archivo del currículum se elimina del almacenamiento.",
          "Pueden conservarse después de la eliminación: los registros de auditoría de acciones sensibles y los datos necesarios para cumplir una obligación legal o para la defensa en un proceso, durante el plazo legal aplicable.",
        ],
      },
      {
        titulo: "7. Seguridad",
        paragrafos: [
          "Las contraseñas se guardan solo como hash, con un algoritmo diseñado para ello. Nadie en ACESSO puede leer tu contraseña.",
          "El CPF y el CNPJ se guardan cifrados, con un hash separado usado solo para detectar duplicados.",
          "Los currículums se guardan en un almacenamiento privado y solo son accesibles mediante un enlace temporal y firmado, generado después de verificar quién puede verlos. No existe un enlace público al currículum.",
          "El acceso se hace mediante una sesión autenticada, con renovación automática y la posibilidad de cerrar las sesiones de otros dispositivos.",
          "Ningún sistema es inmune a los incidentes. Si ocurre un incidente de seguridad con riesgo relevante para ti, ACESSO te lo comunicará a ti y a la Autoridad Nacional de Protección de Datos de Brasil (ANPD), como exige la LGPD.",
        ],
      },
      {
        titulo: "8. Tus derechos",
        paragrafos: [
          "Puedes: confirmar que tratamos tus datos y acceder a ellos; corregir datos incompletos o desactualizados; solicitar la anonimización, el bloqueo o la eliminación de datos innecesarios o tratados fuera de la ley; solicitar la portabilidad; saber con quién los compartimos; revocar el consentimiento; y oponerte a un tratamiento realizado con base en el interés legítimo.",
          "Buena parte de esto está en la propia plataforma: editar y borrar datos en el perfil, ajustar la visibilidad en Configuración › Privacidad, eliminar la declaración de discapacidad, y pausar o eliminar la cuenta en Configuración › Cuenta.",
          "Para lo que no esté en la plataforma, escribe a projetoacessoinclusivo@gmail.com. Respondemos en el menor plazo posible, respetando el plazo legal.",
          "También puedes presentar una reclamación ante la Autoridad Nacional de Protección de Datos de Brasil (ANPD).",
        ],
      },
      {
        titulo: "9. Cookies y almacenamiento en el navegador",
        paragrafos: [
          "ACESSO no usa cookies de publicidad ni de rastreo, y no comparte datos con redes de anuncios.",
          "El navegador guarda localmente solo lo necesario para que sigas conectado y para mantener tus preferencias de accesibilidad. Borrar los datos del sitio cierra la sesión y restaura las preferencias predeterminadas.",
        ],
      },
      {
        titulo: "10. Cambios en esta Política",
        paragrafos: [
          "Esta Política puede cambiar. Cada versión tiene un identificador, y ACESSO registra qué versión aceptaste al crear la cuenta y cuándo.",
          "Los cambios relevantes se comunican por el correo electrónico registrado o en la plataforma, con la fecha en que pasan a regir.",
        ],
      },
    ],
  },
};
