/**
 * Términos de Uso y Aviso de Privacidad en español.
 *
 * Traducción de `documentosLegais.ts`, que es el texto que vale. Mantén las mismas secciones y
 * párrafos, en el mismo orden: `documentosLegais.test.ts` los compara.
 */
import type { DocumentoLegal } from "./documentosLegais";

export const documentosEmEspanhol = (versao: string): Record<DocumentoLegal["chave"], DocumentoLegal> => ({
  termos: {
    chave: "termos",
    titulo: "Términos de Uso",
    resumo: `Las reglas de uso de la plataforma ACESSO. Versión ${versao}.`,
    secoes: [
      {
        titulo: "1. Qué es ACESSO",
        paragrafos: [
          "ACESSO es una red profesional orientada a la inclusión en el mercado laboral, hecha para personas con discapacidad, profesionales de 50 años o más y empresas que practican la contratación inclusiva.",
          "La plataforma conecta a personas candidatas y empresas: permite crear un perfil profesional, publicar y buscar vacantes, postularse, intercambiar mensajes y publicar contenido en la comunidad.",
          "ACESSO no es una agencia de empleo ni participa en la relación laboral entre quien contrata y quien es contratado. La decisión de contratar, y todo lo que de ella se deriva, es de la empresa.",
          "El uso de la plataforma es gratuito para personas candidatas y para empresas.",
        ],
      },
      {
        titulo: "2. Quién puede crear una cuenta",
        paragrafos: [
          "Para crear una cuenta hay que tener 16 años o más y dar información verdadera sobre uno mismo.",
          "Cuenta de persona candidata: creada por una persona física, para sí misma. Cada persona debe tener una sola cuenta.",
          "Cuenta de empresa: creada a partir de una cuenta de persona candidata ya existente, por alguien autorizado a representar a la empresa. Las dos cuentas quedan vinculadas, pero permanecen separadas, con accesos propios.",
          "La cuenta de empresa pasa por una revisión del equipo de ACESSO antes de poder publicar vacantes. La revisión comprueba que la empresa existe y que el registro es coherente; puede ser rechazada, y se informa el motivo.",
          "Eres responsable de mantener tu contraseña en secreto y de todo lo que ocurra en tu cuenta. Si sospechas un acceso indebido, cambia la contraseña y cierra las demás sesiones en Configuración.",
        ],
      },
      {
        titulo: "3. Lo que puedes hacer",
        paragrafos: [
          "Persona candidata: crear y editar un perfil profesional, enviar el currículum, declarar una discapacidad, postularse a vacantes, seguir a personas y empresas, intercambiar mensajes, publicar en la comunidad y ajustar las preferencias de accesibilidad.",
          "Empresa: mantener un perfil institucional, publicar y gestionar vacantes, ver y responder candidaturas, intercambiar mensajes con personas candidatas y publicar en la comunidad.",
          "Conservas la titularidad del contenido que publicas. Al publicar, autorizas a ACESSO a mostrar ese contenido en la plataforma a quienes tu configuración de privacidad lo permita — nada más.",
        ],
      },
      {
        titulo: "4. Lo que no está permitido",
        paragrafos: [
          "Publicar una vacante con una exigencia discriminatoria, o usar la plataforma para discriminar por discapacidad, edad, raza, color, etnia, sexo, orientación sexual, identidad de género, religión, origen o condición social.",
          "Hacerse pasar por otra persona o empresa, usar datos de terceros, o crear una cuenta de empresa sin autorización para representarla.",
          "Publicar una vacante inexistente, cobrar cualquier importe a las personas candidatas, o pedir datos bancarios, documentos de pago o contraseñas a través de la plataforma.",
          "Acosar, amenazar, difamar o importunar a otras personas; publicar contenido ilegal, violento o sexual.",
          "Recoger datos de otras personas por medios automatizados, intentar eludir los controles de acceso de la plataforma o atacar la disponibilidad del servicio.",
          "Usar currículos o datos de contacto obtenidos aquí para una finalidad distinta de un proceso de selección.",
        ],
      },
      {
        titulo: "5. Moderación",
        paragrafos: [
          "Cualquier persona puede denunciar un contenido o una cuenta desde la propia plataforma. El equipo de ACESSO analiza las denuncias.",
          "El contenido que viole estos Términos puede eliminarse. Las cuentas pueden bloquearse, y las empresas pueden ser suspendidas o tener el registro rechazado. En esos casos el motivo se registra y se informa a la persona afectada.",
          "La decisión puede impugnarse por el canal de contacto indicado en el punto 9.",
        ],
      },
      {
        titulo: "6. Cerrar la cuenta",
        paragrafos: [
          "Puedes pausar la cuenta en cualquier momento: deja de mostrarse a otras personas y se reactiva cuando vuelves a entrar y confirmas.",
          "También puedes eliminar la cuenta definitivamente. La eliminación borra tu perfil, currículum, candidaturas, publicaciones, mensajes y preferencias. Es irreversible.",
          "Pueden conservarse, durante el tiempo necesario: registros que la ley obligue a guardar y datos estrictamente necesarios para la defensa en un proceso. El detalle está en el Aviso de Privacidad.",
        ],
      },
      {
        titulo: "7. Disponibilidad y límites de responsabilidad",
        paragrafos: [
          "ACESSO se ofrece tal como está. La plataforma puede quedar no disponible por mantenimiento, por un fallo técnico o por la indisponibilidad de los servicios de infraestructura de los que depende.",
          "ACESSO no garantiza que una candidatura termine en contratación, ni responde por las decisiones, conductas o información de empresas y personas candidatas.",
          "El contenido publicado por quienes usan la plataforma es responsabilidad de quien lo publicó. ACESSO actúa sobre ese contenido cuando es denunciado o cuando tiene conocimiento de él, conforme al punto 5.",
          "La plataforma verifica la existencia de la empresa en el registro, pero eso no es garantía sobre su idoneidad ni sobre la veracidad de cada vacante. Desconfía de pedidos de dinero o de datos sensibles y denúncialos.",
        ],
      },
      {
        titulo: "8. Cambios en estos Términos",
        paragrafos: [
          "Estos Términos pueden cambiar. Cada versión tiene un identificador, y ACESSO registra qué versión aceptaste y cuándo.",
          "Cuando haya un cambio relevante, ACESSO avisará a los usuarios antes de que empiece a regir.",
          "Seguir usando la plataforma después del aviso significa estar de acuerdo con la nueva versión.",
        ],
      },
      {
        titulo: "9. Contacto y jurisdicción",
        paragrafos: [
          "Dudas, denuncias y solicitudes sobre estos Términos: por el formulario Contáctanos, en el pie de página de ACESSO, o por el correo projetoacessoinclusivo@gmail.com.",
          "Estos Términos se rigen por las leyes brasileñas. Es competente el tribunal del domicilio del usuario para resolver controversias, conforme al Código de Defensa del Consumidor de Brasil.",
        ],
      },
    ],
  },
  privacidade: {
    chave: "privacidade",
    titulo: "Aviso de Privacidad",
    resumo: `Cómo trata ACESSO tus datos personales. Versión ${versao}.`,
    secoes: [
      {
        titulo: "1. Quién trata tus datos",
        paragrafos: [
          "ACESSO es el responsable de los datos personales tratados en la plataforma, en los términos de la Ley General de Protección de Datos de Brasil (LGPD, Ley 13.709/2018).",
          "Contacto para asuntos de privacidad, incluido el ejercicio de tus derechos: por el formulario Contáctanos (elige el asunto \"Privacidad y datos personales (LGPD)\") o por el correo projetoacessoinclusivo@gmail.com.",
        ],
      },
      {
        titulo: "2. Qué datos se recogen",
        paragrafos: [
          "Al crear la cuenta: nombre completo, correo, teléfono, CPF (número fiscal brasileño), país, fecha de nacimiento, ciudad y estado, además de la contraseña, que se guarda solo como hash y nunca como texto.",
          "En el perfil profesional, si quieres completarlo: título profesional, escolaridad, resumen, experiencias, formación, habilidades, certificados, LinkedIn, GitHub, disponibilidad, pretensión salarial, foto y portada.",
          "Currículum: el archivo que envíes, cuando lo envíes. Es opcional.",
          "Declaración de discapacidad y necesidades de accesibilidad, si quieres declararlas. Son datos sensibles y reciben el tratamiento descrito en el punto 4.",
          "Perfil de adaptaciones y preferencias de comunicación (Mi Accesibilidad) y borradores de candidatura, si usas esas funciones. Son privados y se tratan como datos sensibles, como se describe en el punto 4.",
          "Uso de la plataforma: candidaturas, vacantes guardadas, publicaciones, comentarios, me gusta, contenidos compartidos, mensajes, personas y empresas que sigues, bloqueos y denuncias que hagas.",
          "Preferencias de accesibilidad y de notificación, para que la plataforma se abra como la configuraste.",
          "Seguridad y funcionamiento: sesiones activas con dispositivo y dirección IP, registros de auditoría de acciones sensibles, y el identificador de tu cuenta de Google si entras con ella — nunca tu contraseña de Google.",
          "De empresas: CNPJ (número de empresa brasileño), razón social, nombre comercial, sector, tamaño, dirección, sitio web, descripción institucional, cultura inclusiva, logotipo y portada, además de los datos de quien responde por la cuenta.",
        ],
      },
      {
        titulo: "3. Por qué se pide cada dato y con qué base legal",
        paragrafos: [
          "Ejecutar el contrato (art. 7, V): nombre, correo, contraseña, teléfono, ubicación, perfil profesional, currículum, candidaturas y mensajes. Sin ellos la plataforma no funciona.",
          "Cumplir una obligación legal y prevenir el fraude (art. 7, II y art. 11, II, 'g'): CPF y CNPJ, guardados cifrados, para evitar cuentas duplicadas y confirmar que la empresa existe.",
          "Consentimiento (art. 7, I y art. 11, I): declaración de discapacidad, necesidades de accesibilidad y fecha de nacimiento cuando se usa para vacantes de acción afirmativa. Tú decides informarlos y puedes retirarlos en cualquier momento.",
          "Interés legítimo (art. 7, IX): seguridad de la cuenta, moderación de contenido, registros de auditoría y mejora de la plataforma.",
        ],
      },
      {
        titulo: "4. Datos sensibles: discapacidad y accesibilidad",
        paragrafos: [
          "Declarar una discapacidad siempre es opcional. La plataforma funciona sin esa información.",
          "La declaración sirve para cruzar tu perfil con vacantes de acción afirmativa y para adaptar la experiencia a tus necesidades. No se usa para puntuar, clasificar ni restringir tu acceso a nada.",
          "Las necesidades de accesibilidad que escribas, las observaciones sobre cada discapacidad, tu fecha de nacimiento, tu perfil de adaptaciones y tus preferencias de comunicación son privados: solo tú y el equipo de moderación pueden verlos. Una empresa solo recibe información de accesibilidad si la eliges y la autorizas, candidatura por candidatura.",
          "La categoría de discapacidad que declares (por ejemplo, \"Discapacidad visual\") es privada por defecto. Solo aparece en tu perfil público si activas esa opción en Mi Accesibilidad, y activarla no libera ninguna otra información. También puedes elegir compartirla en una candidatura concreta, que es una decisión aparte. Las empresas no pueden buscar candidatos por discapacidad.",
          "Puedes quitar la declaración en cualquier momento en tu perfil, y deja de tenerse en cuenta de inmediato.",
          "Autorización por candidatura: al postularte, ves una vista previa de lo que recibirá la empresa y eliges, elemento por elemento, qué información de accesibilidad compartir. Enviar la candidatura no autoriza por sí solo compartir nada. ACESSO guarda una copia solo de lo que autorizaste, para esa empresa y ese proceso de selección, y registra la fecha y la finalidad de la autorización. Cambiar tu perfil después no altera lo que ya autorizaste.",
          "Retirar la autorización: puedes retirarla cuando quieras. La empresa deja de poder consultar la información y ACESSO borra el contenido de la copia, conservando solo un registro mínimo (fechas y cantidad de elementos) para comprobar la operación. No es posible borrar de la memoria de quien ya vio, copió o descargó la información antes del retiro. Por eso, comparte solo lo necesario para participar en el proceso.",
        ],
      },
      {
        titulo: "5. Qué es público y qué es privado en tu perfil",
        paragrafos: [
          "Público, para quien pueda ver tu perfil (lo ajustas en Configuración › Privacidad y seguridad): nombre, foto de perfil, portada, título profesional, resumen, escolaridad, ciudad, estado, país, disponibilidad, enlaces de LinkedIn y GitHub, experiencias, formación, habilidades, certificados (título, institución y enlace, sin el archivo) y, solo si activas esa opción, la categoría de discapacidad que declaraste.",
          "Privado, visible solo para ti y para el equipo de moderación: correo, teléfono, CPF, fecha de nacimiento, género, dirección, código postal, pretensión salarial, necesidades de accesibilidad, observaciones sobre la discapacidad, perfil de adaptaciones, preferencias de comunicación y el archivo del currículum.",
          "Al postularte, la empresa de la vacante recibe tu perfil público, tu correo de contacto y tu currículum mientras la candidatura esté activa (pierde el acceso si cancelas la candidatura o si es rechazada). El CPF, la dirección, la fecha de nacimiento y la demás información privada no se envían. Una empresa sin una candidatura tuya ve solo la parte pública, y ningún dato privado aparece en listados abiertos.",
        ],
      },
      {
        titulo: "6. Con quién se comparten los datos",
        paragrafos: [
          "Empresas: cuando te postulas a una vacante, la empresa de esa vacante recibe tu perfil público, el correo de contacto, el currículum y, solo si lo autorizas, la información de accesibilidad que elijas. Sin candidatura, una empresa ve solo lo que tu perfil muestra públicamente.",
          "Otras personas: lo que publicas en la comunidad y tu perfil público son visibles para quienes tu configuración de privacidad lo permita. Lo controlas en Configuración › Privacidad y seguridad.",
          "Proveedores de infraestructura, que tratan datos solo para operar el servicio: Supabase (base de datos y almacenamiento de archivos), Render (servidor de la aplicación), Vercel (alojamiento del sitio), Brevo (envío de correos de confirmación y recuperación de contraseña) y Expo (entrega de notificaciones push). Los servidores de algunos de estos proveedores están fuera de Brasil (la base de datos, por ejemplo, está en Canadá).",
          "Google: solo si decides entrar con una cuenta de Google. ACESSO recibe de Google el identificador de la cuenta, el correo y el nombre, y le envía solo lo necesario para la autenticación.",
          "IBGE: la lista de ciudades se consulta en el servicio público del IBGE (instituto de estadística de Brasil) para completar la ubicación. En esa consulta no se envía ningún dato tuyo.",
          "Descripción automática de imágenes: si pides una sugerencia de texto alternativo para una imagen, esa imagen se envía a un servicio externo de inteligencia artificial (OpenRouter) solo para generar la sugerencia. Es una acción tuya, nunca automática, y ningún otro dato de tu perfil acompaña a la imagen.",
          "Dictado por voz: si usas el dictado, el reconocimiento de voz lo hace el servicio de tu navegador. En navegadores como Chrome y Edge, el audio puede enviarse al fabricante del navegador y se necesita internet. ACESSO recibe solo el texto, después de que lo revises y confirmes, y no graba audio.",
          "Autoridades: mediante orden judicial o requerimiento legal, en la medida exigida.",
          "ACESSO no vende datos personales ni los comparte para publicidad.",
        ],
      },
      {
        titulo: "7. Cuánto tiempo se guardan los datos",
        paragrafos: [
          "Mientras exista tu cuenta, los datos de tu perfil se guardan para que la plataforma funcione.",
          "Cuenta pausada: los datos se conservan y dejan de mostrarse a otras personas hasta que la reactives.",
          "Borradores de candidatura: se guardan hasta 30 días sin cambios y después se borran. La empresa nunca los ve.",
          "Información de accesibilidad compartida en una candidatura: se borra cuando retiras la autorización o cancelas la candidatura. Queda solo un registro mínimo de la operación, sin el contenido.",
          "Cuenta eliminada: el perfil, el currículum, las candidaturas, las publicaciones, los mensajes y las preferencias se borran, y el archivo del currículum se elimina del almacenamiento.",
          "Pueden conservarse después de la eliminación: registros de auditoría de acciones sensibles y datos necesarios para cumplir una obligación legal o para la defensa en un proceso, durante el plazo legal aplicable.",
        ],
      },
      {
        titulo: "8. Seguridad",
        paragrafos: [
          "Las contraseñas se guardan solo como hash, con un algoritmo propio para ello. Nadie en ACESSO puede leer tu contraseña.",
          "El CPF y el CNPJ se guardan cifrados, con un hash separado que se usa solo para detectar duplicados.",
          "Los currículos están en un almacenamiento privado y solo se accede a ellos mediante un enlace temporal y firmado, generado después de verificar quién puede verlos. No existe un enlace público de currículum.",
          "El acceso se hace con una sesión autenticada, con renovación automática y la posibilidad de cerrar las sesiones de otros dispositivos.",
          "Ningún sistema es inmune a incidentes. Si ocurre un incidente de seguridad con riesgo relevante para ti, ACESSO te lo comunicará a ti y a la Autoridad Nacional de Protección de Datos de Brasil, como exige la LGPD.",
        ],
      },
      {
        titulo: "9. Tus derechos",
        paragrafos: [
          "Puedes: confirmar que tratamos tus datos y acceder a ellos; corregir datos incompletos o desactualizados; pedir la anonimización, el bloqueo o la eliminación de datos innecesarios o tratados fuera de la ley; pedir la portabilidad; saber con quién los compartimos; revocar el consentimiento; y oponerte a un tratamiento basado en el interés legítimo.",
          "Buena parte de esto está en la propia plataforma: editar y borrar datos en el perfil, ajustar la visibilidad en Configuración › Privacidad y seguridad, quitar la declaración de discapacidad, y pausar o eliminar la cuenta en Configuración › Cuenta.",
          "Para lo que no esté en la plataforma, usa el formulario Contáctanos (asunto \"Privacidad y datos personales (LGPD)\") o escribe a projetoacessoinclusivo@gmail.com. Respondemos en el menor plazo posible, respetando el plazo legal.",
          "También puedes presentar una reclamación ante la Autoridad Nacional de Protección de Datos de Brasil (ANPD).",
        ],
      },
      {
        titulo: "10. Cookies y almacenamiento en el navegador",
        paragrafos: [
          "ACESSO no usa cookies de publicidad ni de rastreo, y no comparte datos con redes de anuncios.",
          "El navegador guarda localmente solo lo necesario para que sigas conectado y para mantener tus preferencias de accesibilidad. Borrar los datos del sitio cierra la sesión y restaura las preferencias predeterminadas.",
        ],
      },
      {
        titulo: "11. Cambios en este Aviso",
        paragrafos: [
          "Este Aviso puede cambiar. Cada versión tiene un identificador, y ACESSO registra qué versión aceptaste y cuándo.",
          "ACESSO comunicará a los usuarios los cambios relevantes antes de que empiecen a regir.",
        ],
      },
    ],
  },
});
