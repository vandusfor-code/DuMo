/**
 * Script oficial: Portabilidad sin Equipo.
 * Fuente: SCRIPT CIERRE 31 JULIO Portabilidad sin Equipo dumo (1).docx
 * Redacción íntegra del documento — solo se reemplazan variables {{...}}.
 */

import type { ScriptBuildContext } from "@/lib/sales-script/context";

export const SCRIPT_TIPO = "PORTABILIDAD_SIN_EQUIPO" as const;

export type OfficialStepTemplate = {
  id: number;
  titulo: string;
  texto: string;
  variables: string[];
  when?: (ctx: ScriptBuildContext) => boolean;
};

export const PORTABILIDAD_SIN_EQUIPO_OFFICIAL: OfficialStepTemplate[] = [
  {
    id: 1,
    titulo: "Introducción",
    variables: ["nombre_ejecutivo", "nombre_cliente"],
    texto: `Hola buenas tardes/dias (según la hora de chile) hablas con {{nombre_ejecutivo}} ( Tengo el gusto de hablar con {{nombre_cliente}} UN GUSTO,  PARA DAR CONTINUIDAD A LO ANTERIORMENTE CONVERSADO  TE INFORMO QUE :`,
  },
  {
    id: 2,
    titulo: "Validación",
    variables: ["nombre_cliente", "rut", "direccion_completa", "correo", "telefono"],
    texto: `Continuamos con un breve resumen de tu contratación:
Tú Nombre Completo es {{nombre_cliente}}, RUT {{rut}}, domiciliado en {{direccion_completa}}, y correo electrónico {{correo}}, tú número de contacto es el {{telefono}}. ¿Son correctos tus datos?
SI: Continuar NO: Corregir.`,
  },
  {
    id: 3,
    titulo: "Resumen contratación",
    variables: [
      "fecha_contratacion",
      "numero_portar",
      "operador_actual",
      "plan",
      "valor_plan",
      "promociones_boletas",
      "valor_linea_principal",
      "valor_linea_adicional",
      "lineas",
    ],
    texto: `Según las condiciones acordadas, aceptas contratar hoy con fecha {{fecha_contratacion}} la portabilidad de tu número "{{numero_portar}}" proveniente de la compañía "{{operador_actual}}" a WOM con el plan "{{plan}}" (Menciona el nombre del plan como aparece en sistemas), por el monto mensual de "{{valor_plan}}". Siempre señala el valor transparente del plan y en caso de aplicar boletas a $0 (3ª y 6ª boleta en portabilidad), indícalo claramente indicando los meses en que aplica{{promociones_boletas}}. Recuerda que si por algún motivo el número no se porta, los beneficios explicados quedarán sin efecto, por eso es importante que cumplas con las condiciones de portabilidad que te explicaré en breve.
{{bloque_planes_mas}}`,
  },
  {
    id: 4,
    titulo: "Beneficios",
    variables: ["beneficios"],
    texto: `Dependiendo del plan que lleve:
{{beneficios}}`,
  },
  {
    id: 5,
    titulo: "Condiciones generales",
    variables: [],
    texto: `CONDICIONES GENERALES PARA TODOS LOS PLANES: Te enviaremos un mail de bienvenida al correo que nos proporcionaste; es muy importante que lo revises, ya que contiene información relevante sobre tu plan contratado y tu ciclo de facturación. Además, te invitamos a visitar wom.cl o ingresar a nuestra APP WOM para conocer todos los detalles sobre el uso y condiciones de tus beneficios libres o controlados, como minutos, SMS, apps libres ya mencionadas y el servicio de roaming internacional vía WhatsApp en más de 100 países. Recuerda que a través de la App también podrás realizar el seguimiento de tu despacho en tiempo real.`,
  },
  {
    id: 6,
    titulo: "Entrega — Despacho a domicilio",
    variables: ["region", "comuna", "direccion", "telefono", "fecha_entrega"],
    when: (c) => c.deliveryIsHome,
    texto: `CIERRE DESPACHO A DOMICILIO:
Tu producto será despachado a la dirección ({{region}}, {{comuna}}, {{direccion}}), y tus números de contactos son: {{telefono}} (2 preferiblemente), registrando la entrega de tus productos para el día {{fecha_entrega}}. (INFORMAR AL CLIENTE LA FECHA EXACTA QUE TE ENTREGA LA CALCULADORA DE FECHAS DE ENTREGA).
Te enviaremos un correo con el asunto "Tu Compra va en Camino" una vez que iniciemos el despacho de tus productos.
CONDICION VALIDA SOLO PARA DESPACHO A DOMICILIO RECIBIENDO TITULAR O TERCERO
Recuerda que tú como titular del servicio puedes recibir el producto, ya que al momento de la entrega debes firmar la solicitud de la portabilidad. Si recibes tu como titular lo puedes hacer con el CÓDIGO OTP o con tu cédula de identidad, si recibe un tercero debe presentar si o si el CÓDIGO OTP que te enviaremos por Whatsapp (RAYO) o SMS (ALAS/SROUTE). Si tu entrega es con despacho Ultra Express (NOMAD 3 horas), el titular o un tercero pueden recibir el producto entregando el código OTP al repartidor enviado solo al whatsapp.`,
  },
  {
    id: 7,
    titulo: "Entrega — Retiro en tienda",
    variables: [
      "nombre_sucursal",
      "direccion_sucursal",
      "horario_sucursal",
      "fecha_entrega",
    ],
    when: (c) => c.deliveryIsStore,
    texto: `CIERRE DESPACHO EN TIENDA:
Tu producto será despachado a nuestra sucursal "{{nombre_sucursal}}" ubicada en "{{direccion_sucursal}}" y podrás retirar tus productos en el horario de "{{horario_sucursal}}" (Indica el horario de atención de la sucursal AQUÍ), registrando la entrega de tus productos para el día {{fecha_entrega}}. (INFORMAR AL CLIENTE LA FECHA EXACTA QUE TE ENTREGA LA CALCULADORA DE FECHAS DE ENTREGA).

Te enviaremos un correo con el asunto "Listo para tu retiro" y adicionalmente un SMS a tu número a portar con un código de verificación de 6 dígitos, a partir de este momento deberás acercarte a la sucursal Wom a retirar tu producto directamente mostrando el código de verificación de 6 dígitos, desde la recepción de este correo podrás realizar el retiro de tus productos hasta un plazo de 7 días continuos. Si tú no puedes retirar tu producto puedes entregar el código de verificación a un tercero para que realice el retiro por ti. El código es válido solo por una vez, por lo tanto si lo entregas es bajo tu responsabilidad.`,
  },
  {
    id: 8,
    titulo: "Portabilidad",
    variables: ["nombre_cliente", "operador_actual"],
    texto: `COMPATIBILIDAD DE EQUIPOS: Te recuerdo que puedes revisar la compatibilidad de tu equipo en nuestra web https://www.wom.cl/sello-multibandas/

CONTRATOS Y ANEXOS: Una vez que recibas tus productos te enviaremos un correo llamado "Bienvenido a Wom" con documentos adjuntos como los contratos de servicios, anexos y detalle de líneas, en el cual podrás identificar tu número asociado a la simcard enviada.
INFORMAR AL CLIENTE PARA TODA PORTABILIDAD (POSTPAGO Y PREPAGO):

{{nombre_cliente}}, Te explico un poco como funciona el proceso de portabilidad.
La portabilidad se realiza de lunes a sábado, sin incluir domingos ni festivos, se ejecuta en la madrugada con la finalidad de no interrumpir el servicio. Cuando recibas tu chip de WOM, NO lo debes colocar en tu celular, ya que como tu número aún no estará portado no tendrás servicio. No Botes el chip de {{operador_actual}} hasta tanto tu portabilidad con WOM no esté 100% realizada. Normalmente la portabilidad demora 1 día hábil en ejecutarse desde que recibas el chip de WOM.
Cuándo recibas el chip de WOM, espera al dia siguiente, debes quedar sin servicio en tu operador actual, eso significa que ya estás portado a WOM y es en ese momento que debes colocar el nuevo chip de WOM en tu celular y probar todos los servicios, valida que sea tu número portado, que puedas hacer llamadas y navegar por internet. Si no pierdes la señal en tu operador, eso significa que aún no estás portado, te pido que en ese caso me puedas escribir para poder validar que pasó con la portabilidad y poder gestionar una solución en caso de error.
Recuerda que no debes tener ningún tipo de deuda con {{operador_actual}} es importante que al momento de recibir tu chip WOM estés al día con tus pagos de boletas o presta lucas. Con deuda, no te puedes portar.

NÚMERO TEMPORAL (PROVISORIO): Mientras tu número no se porte a WOM activaremos el servicio con un número temporal, que es un número distinto al que estás portando, este número será solo temporal hasta tanto podamos portar tu número real, lo importante de esto es que mientras tu número no se porte no perderás el servicio con tu operador, por eso es importante que no cambies el chip hasta que estés portado. Tu primera boleta de cobro será emitida por un proporcional del servicio desde la activación hasta el corte de tu ciclo de facturación, si tu número no se porta igual se te cobrará el servicio activo con el número temporal.

{{nombre_cliente}}, ¿Alguna duda con el proceso de porta? CLIENTE RESPONDE SÍ: Aclarar dudas. CLIENTE RESPONDE NO: Continuar.`,
  },
  {
    id: 9,
    titulo: "Código CAP",
    variables: ["nombre_cliente"],
    when: (c) => c.requiresCapCode,
    texto: `Para portabilidades de PREPAGO A POSTPAGO:
Valida con el cliente la recepción del CAP enviado:
Te envié un SMS al número de teléfono prepago a portar con el código CAP que es un código de 4 dígitos, ¿Puedes validar si lo recibiste? Es necesario este código para poder ejecutar la portabilidad.
Si el cliente brinda el código CAP en el momento de la llamada:
Ya completamos el código. De todas formas te comento que el mismo tiene una vigencia de 5 días y en caso que en este plazo no se haya concretado tu portabilidad, volveremos a enviarte un nuevo código CAP vía SMS para continuar con el proceso.
Si el cliente NO brinda el código en el momento de la llamada:
El código tiene una vigencia de 5 días, por lo que te pido estar atento ya que te contactaremos para solicitarte éste dato. En caso que en este plazo no se haya concretado tu portabilidad, volveremos a enviarte un nuevo código CAP vía SMS para continuar con el proceso.`,
  },
  {
    id: 10,
    titulo: "Chip prepago regalo",
    variables: ["nombre_cliente"],
    texto: `CHIP PREPAGO DE REGALO: {{nombre_cliente}}, te regalamos un chip prepago que si lo prefieres podrás usar o regalar a un familiar o amigo. Este chip viene con beneficios como gigas y minutos que podrán disfrutar con solo activar el chip. El empaque del chip te indicará los beneficios y la forma de activarlo y te lo enviaremos con el resto de tus productos.`,
  },
  {
    id: 11,
    titulo: "Encuesta",
    variables: ["nombre_cliente", "correo"],
    texto: `ENCUESTA NPS: Recuerda que no puedes fomentar una nota sino sólo señala:
{{nombre_cliente}}, ¿Qué te pareció mi atención? (Cliente responde bien): Que bueno que te gusto y en base a eso, te quiero invitar a que puedas responder una encuesta de satisfacción en base a la atención que te ofrecí como ejecutivo, esta encuesta la vas a recibir en tu correo electrónico una vez que recibas tu producto. La encuesta tiene una escala de evaluación del 0 al 10 dónde 0 es la nota mínima y 10 es la nota máxima y la primera pregunta de la encuesta que es "Pensando únicamente en la experiencia de tu compra, qué tan probable es que recomiendes WOM a un familiar o un amigo?, en esa pregunta me evalúas a mi y mi atención, de antemano muchas gracias por responder.`,
  },
  {
    id: 12,
    titulo: "Aceptación",
    variables: ["nombre_cliente", "nombre_ejecutivo", "correo_ejecutivo"],
    texto: `CIERRE: Cliente aceptó? Comienza con el cierre indicando lo siguiente:
Has tomado una gran decisión y como no contamos con letra chica a continuación escucharás una grabación que dura 30 segundos con las condiciones que respaldan tu contratación, por lo que te pido que escuches atentamente y no cortes ya que yo retomaré tu llamado para resolver tus dudas y realizar un breve resumen del producto que te llevas:

¿Tienes alguna duda con el audio que escuchaste? Si el cliente presenta dudas resuélvelas, sino continua con lo siguiente:

ACEPTACIÓN FINAL Y PROCESO DE VALIDACIÓN DE IDENTIDAD:

{{nombre_cliente}} ¿te queda alguna duda con las condiciones entregadas?
SI: Aclarar dudas / No: Seguir con la pregunta de aceptación y proceso de VDI.

Entiendes y en conjunto con iniciar ahora el proceso de Validación de identidad aceptas las condiciones de este contrato, ¿Lo aceptas?

RESPUESTA CLIENTE : SI, en caso contrario gatilla la respuesta consultando si su respuesta se considera un SI.

DESHABILITACIÓN PREFIJO 809: Recuerda que si la contratación del cliente es por línea nueva, debes tomar el nuevo número desde la orden de ZS una vez que generes el folio de MAT y derivar por formulario. Si la contratación es por portabilidad, podrás ingresar el número a portar directo al formulario.

{{nombre_cliente}}, en base a la normativa vigente de la subsecretaría de telecomunicaciones ¿Te gustaría dejar de recibir llamadas Spam o no deseadas? Se debe tener el SÍ explícito del cliente.
CLIENTE RESPONDE SÍ (Entregar contexto): Perfecto, con esto procederemos a deshabilitar gratis el prefijo 809 para que dejes de recibir llamadas sin tu consentimiento. Haremos la deshabilitación una vez que tu línea esté activa con nosotros.
CLIENTE RESPONDE NO (Entregar contexto): Al deshabilitar el prefijo 809 evitarás recibir llamadas molestas que tu no solicitaste, es una buena opción para controlar tus registros de llamadas, ¿Te interesa deshabilitarlo?
NO: Entiendo, de igual forma si más adelante lo deseas hacer, lo puedes autogestionar por la APP WOM.
CLIENTE CONSULTA MÁS SOBRE ESTE PROCESO (Entregar contexto): Existe una norma por la subsecretaría de telecomunicaciones que te permite a ti como usuario, poder controlar las llamadas que recibes bajo el prefijo 809, que son llamadas masivas que tu no has solicitado, al deshabilitar este prefijo, evitas las llamadas molestas que tu no deseas recibir.
Si el cliente acepta, debes derivar la solicitud de deshabilitación vía formulario.`,
  },
  {
    id: 13,
    titulo: "Referido",
    variables: ["nombre_cliente"],
    texto: `REFERIDO: {{nombre_cliente}}, me gustaría saber si conoces a alguien que quiera acceder a todos los beneficios de WOM. (Pedir nombre y teléfono de referido).`,
  },
  {
    id: 14,
    titulo: "Despedida",
    variables: ["correo_ejecutivo", "nombre_ejecutivo", "nombre_cliente"],
    texto: `DESPEDIDA: Te invito a tomar nota de mi correo electrónico el cual es {{correo_ejecutivo}} quedando a tu disposición para cualquier consulta adicional que tengas y para el seguimiento de tu venta.

Te recuerdo que fuiste atendido por {{nombre_ejecutivo}}.
Bienvenido a WOM, que tengas un excelente día!`,
  },
];
