// PROTOTYPE (#15): in-memory fixtures for the public Pase page. Throw away
// once a variant is folded into the real `/p/$token` route.

export const TIPOS = ['temporal', 'evento', 'servicio'] as const;
export type Tipo = (typeof TIPOS)[number];

export const ESTADOS = [
  'vigente',
  'proxima',
  'hoy-no-permitido',
  'usado',
  'vencido',
  'cancelado',
  'reemplazado',
  'no-encontrado',
] as const;
export type Estado = (typeof ESTADOS)[number];

export const VISTAS = ['pagina', 'imagen', 'compartir'] as const;
export type Vista = (typeof VISTAS)[number];

export const ESTADO_LABEL: Record<Estado, string> = {
  vigente: 'Vigente hoy',
  proxima: 'Aún no vigente',
  'hoy-no-permitido': 'Hoy no permitido (Servicio)',
  usado: 'Usado (Temporal/Evento)',
  vencido: 'Vencido',
  cancelado: 'Cancelado',
  reemplazado: 'Reemplazado',
  'no-encontrado': 'No encontrado',
};

export const VISTA_LABEL: Record<Vista, string> = {
  pagina: 'Página pública /p/…',
  imagen: 'Imagen PNG guardada',
  compartir: 'Residente comparte',
};

export const TIPO_LABEL: Record<Tipo, string> = {
  temporal: 'Temporal',
  evento: 'Evento',
  servicio: 'Servicio',
};

/** Which estados a Pase of each Tipo can reach (ADR/ticket #8). */
export const ESTADOS_BY_TIPO: Record<Tipo, ReadonlyArray<Estado>> = {
  temporal: ESTADOS.filter((estado) => estado !== 'hoy-no-permitido'),
  evento: ESTADOS.filter((estado) => estado !== 'hoy-no-permitido'),
  servicio: ESTADOS.filter((estado) => estado !== 'usado'),
};

export const UNIDAD = {
  nombre: 'Conjunto Reservado Los Almendros',
  nit: '900.123.456-7',
  direccion: 'Cra. 43A # 18 Sur-120, Medellín',
  telefono: '604 444 1234',
  correo: 'administracion@losalmendros.co',
  politicaUrl: 'https://visitpass.co/u/los-almendros/privacidad',
  avisoVersion: 'Versión 1 – 26 de septiembre de 2026',
  retencionMeses: 12,
};

export type Pase = {
  token: string;
  url: string;
  tipo: Tipo;
  visitante: string;
  visitanteNombreCorto: string;
  apartamento: string;
  autorizadoPor: string;
  /** Short, human-readable date line. */
  vigencia: string;
  /** Long date line for the page body. */
  vigenciaLarga: string;
  diasPermitidos?: string;
  regla: string;
  evento?: { invitado: number; total: number };
  ingresoHora?: string;
};

const TOKEN = 'q7Hk2mZtR9vXw3LpN8cBfA';
const BASE_URL = 'https://visitpass.co/p/';

const BASE: Omit<
  Pase,
  'tipo' | 'vigencia' | 'vigenciaLarga' | 'regla' | 'diasPermitidos' | 'evento'
> = {
  token: TOKEN,
  url: `${BASE_URL}${TOKEN}`,
  visitante: 'Laura Gómez Restrepo',
  visitanteNombreCorto: 'Laura',
  apartamento: 'Torre 2 · Apto 402',
  autorizadoPor: 'Andrés M.',
  ingresoHora: '10:45 a. m.',
};

export const paseFor = (tipo: Tipo, estado: Estado): Pase => {
  const isFuture = estado === 'proxima';
  const isPast = estado === 'vencido';
  const fechaCorta = isFuture
    ? 'Sáb 3 oct'
    : isPast
      ? 'Jue 24 sep'
      : 'Hoy, sáb 26 sep';
  const fechaLarga = isFuture
    ? 'sábado 3 de octubre de 2026'
    : isPast
      ? 'jueves 24 de septiembre de 2026'
      : 'sábado 26 de septiembre de 2026';

  if (tipo === 'servicio') {
    return {
      ...BASE,
      visitante: 'Ana María Pérez',
      visitanteNombreCorto: 'Ana María',
      tipo,
      vigencia: isPast
        ? '1 jul – 20 sep'
        : isFuture
          ? '3 oct – 31 dic'
          : '1 sep – 31 dic',
      vigenciaLarga: isPast
        ? 'del 1 de julio al 20 de septiembre de 2026'
        : isFuture
          ? 'del 3 de octubre al 31 de diciembre de 2026'
          : 'del 1 de septiembre al 31 de diciembre de 2026',
      diasPermitidos:
        estado === 'hoy-no-permitido' ? 'Lun · Mié · Vie' : 'Lun · Mié · Sáb',
      regla: 'Varios ingresos en los días permitidos',
    };
  }

  if (tipo === 'evento') {
    return {
      ...BASE,
      tipo,
      vigencia: fechaCorta,
      vigenciaLarga: fechaLarga,
      regla: 'Válido para 1 ingreso durante todo el día',
      evento: { invitado: 3, total: 12 },
    };
  }

  return {
    ...BASE,
    tipo,
    vigencia: fechaCorta,
    vigenciaLarga: fechaLarga,
    regla: 'Válido para 1 ingreso durante todo el día',
  };
};

export type Tone = 'success' | 'info' | 'warning' | 'neutral' | 'error';

export type Status = {
  tone: Tone;
  pill: string;
  title: string;
  detail: string;
  /** Whether the QR is presentable at the gate. */
  showQr: boolean;
  /** Whether any Pase data may be shown at all. */
  showData: boolean;
};

export const statusFor = (pase: Pase, estado: Estado): Status => {
  switch (estado) {
    case 'vigente':
      return {
        tone: 'success',
        pill: 'Vigente',
        title:
          pase.tipo === 'servicio'
            ? 'Pase vigente hoy'
            : 'Tu Pase es válido hoy',
        detail:
          pase.tipo === 'servicio'
            ? `Hoy es un día permitido (${pase.diasPermitidos}).`
            : 'Muéstralo en portería cualquier hora de hoy.',
        showQr: true,
        showData: true,
      };
    case 'proxima':
      return {
        tone: 'info',
        pill: 'Programado',
        title: `Válido desde el ${pase.tipo === 'servicio' ? '3 de octubre' : 'sábado 3 de octubre'}`,
        detail:
          'Portería lo rechazará antes de esa fecha. Guárdalo para ese día.',
        showQr: true,
        showData: true,
      };
    case 'hoy-no-permitido':
      return {
        tone: 'warning',
        pill: 'Hoy no',
        title: 'Hoy no es un día permitido',
        detail: `Este Pase vale los días ${pase.diasPermitidos}.`,
        showQr: true,
        showData: true,
      };
    case 'usado':
      return {
        tone: 'neutral',
        pill: 'Usado',
        title: 'Pase usado',
        detail: `Registraste tu ingreso hoy a las ${pase.ingresoHora} Para volver a entrar, pide un nuevo Pase.`,
        showQr: false,
        showData: true,
      };
    case 'vencido':
      return {
        tone: 'neutral',
        pill: 'Vencido',
        title: 'Este Pase venció',
        detail: 'Pide un nuevo Pase a quien te invitó.',
        showQr: false,
        showData: true,
      };
    case 'cancelado':
      return {
        tone: 'error',
        pill: 'Cancelado',
        title: 'El residente canceló este Pase',
        detail: 'Si crees que es un error, comunícate con quien te invitó.',
        showQr: false,
        showData: true,
      };
    case 'reemplazado':
      return {
        tone: 'warning',
        pill: 'Reemplazado',
        title: 'Este enlace fue reemplazado',
        detail:
          'Quien te invitó generó un Pase nuevo. Pídele el enlace actualizado.',
        showQr: false,
        showData: false,
      };
    case 'no-encontrado':
      return {
        tone: 'neutral',
        pill: 'No disponible',
        title: 'Pase no encontrado',
        detail: 'El enlace no es válido. Revisa que lo hayas copiado completo.',
        showQr: false,
        showData: false,
      };
  }
};

export const INSTRUCCIONES = (pase: Pase): ReadonlyArray<string> => [
  'Muestra este código en portería.',
  'Lleva tu documento de identidad: el Portero lo verificará.',
  pase.tipo === 'servicio'
    ? `Puedes ingresar los días ${pase.diasPermitidos}.`
    : 'Vale para un solo ingreso durante todo el día.',
  'Sube el brillo de la pantalla para facilitar la lectura.',
];

export const AVISO_RESUMEN = `${UNIDAD.nombre} es responsable del tratamiento de tus datos (nombre, documento, apartamento visitado y placa) para controlar el acceso. Se conservan ${UNIDAD.retencionMeses} meses.`;

export const AVISO_COMPLETO: ReadonlyArray<string> = [
  `${UNIDAD.nombre}, NIT ${UNIDAD.nit}, con domicilio en ${UNIDAD.direccion}, teléfono ${UNIDAD.telefono} y correo ${UNIDAD.correo}, es responsable del tratamiento de los datos personales que usted suministra para ingresar: nombre, tipo y número de documento de identidad, apartamento que visita, tipo de visita y, si aplica, placa del vehículo.`,
  `Finalidad: controlar el ingreso y la salida de visitantes, verificar la autorización del residente, garantizar la seguridad de la copropiedad y elaborar los reportes de portería. Los datos se conservan durante ${UNIDAD.retencionMeses} meses contados desde su visita y luego se eliminan, salvo obligación legal o requerimiento de autoridad.`,
  'Los datos se registran en la plataforma Visit Pass, que actúa como encargada del tratamiento por cuenta de la copropiedad, y no se comparten con terceros distintos de las autoridades que los requieran conforme a la ley.',
  `Sus derechos: conocer, actualizar, rectificar y solicitar la supresión de sus datos; pedir prueba de la autorización; conocer el uso que se les ha dado; revocar la autorización; y presentar quejas ante la Superintendencia de Industria y Comercio. Puede ejercerlos gratuitamente escribiendo a ${UNIDAD.correo} o en la administración de la copropiedad.`,
  'Al suministrar sus datos para ingresar, usted autoriza este tratamiento.',
];

/** WhatsApp text: URL inside `text` so it survives iOS "Copiar" and wa.me. */
export const mensajeWhatsApp = (pase: Pase): string => {
  const cuando =
    pase.tipo === 'servicio'
      ? `${pase.vigenciaLarga}, los días ${pase.diasPermitidos?.replaceAll(' · ', ', ')}`
      : `el ${pase.vigenciaLarga}`;
  return `Hola ${pase.visitanteNombreCorto}, este es tu Pase para visitar ${pase.apartamento} en ${UNIDAD.nombre} ${cuando}. Muéstralo en portería junto con tu documento: ${pase.url}`;
};

export const EVENTO_INVITADOS = [
  { nombre: 'Laura Gómez Restrepo', enviado: true },
  { nombre: 'Camilo Restrepo', enviado: true },
  { nombre: 'Valentina Ortiz', enviado: false },
  { nombre: 'Julián Mesa', enviado: false },
];
