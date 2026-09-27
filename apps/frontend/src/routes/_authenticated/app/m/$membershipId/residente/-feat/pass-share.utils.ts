import * as Predicate from 'effect/Predicate';

import * as VisitPass from '#modules/visit-pass';

/** The days an Autorización is valid on, as the share sheet and cards show them. */
export type PassValidity = {
  type: VisitPass.VisitType;
  startDate: string;
  endDate: string;
  weekdays: ReadonlyArray<number>;
};

/** The public page a Pase's QR and shared link point to. */
export function passPageUrl(origin: string, token: string) {
  return `${origin}/p/${encodeURIComponent(token)}`;
}

/** Monday-first weekday summary: `Lun a Vie`, `Todos los días`, `Lun, Mié, Vie`. */
export function formatWeekdays(weekdays: ReadonlyArray<number>) {
  const mondayFirst = [...new Set(weekdays)].sort(
    (a, b) => ((a + 6) % 7) - ((b + 6) % 7)
  );
  const key = mondayFirst.join(',');

  if (mondayFirst.length === 7) return 'Todos los días';
  if (key === '1,2,3,4,5') return 'Lun a Vie';
  if (key === '1,2,3,4,5,6') return 'Lun a Sáb';
  if (key === '6,0') return 'Fines de semana';

  return mondayFirst
    .map((weekday) => VisitPass.WEEKDAY_SHORT_LABELS[weekday] ?? '')
    .join(', ');
}

/** `26 sep 2026` for Temporal and Evento; range plus weekdays for Servicio. */
export function describePassValidity(validity: PassValidity) {
  if (validity.type !== 'service')
    return VisitPass.formatLocalDate(validity.startDate);

  return `${VisitPass.formatLocalDateRange(validity.startDate, validity.endDate)} · ${formatWeekdays(validity.weekdays)}`;
}

/**
 * The message sent with a Pase. The link goes inside the text too, because iOS
 * copies only the text when the target app ignores `url`.
 */
export function buildPassShareText({
  visitorName,
  residentialUnitName,
  apartmentLabel,
  validityLabel,
  url,
}: {
  visitorName: string;
  residentialUnitName: string;
  apartmentLabel: string | undefined;
  validityLabel: string;
  url: string;
}) {
  const firstName = visitorName.trim().split(/\s+/)[0] ?? visitorName;
  const destination = Predicate.isUndefined(apartmentLabel)
    ? residentialUnitName
    : `${residentialUnitName} (${apartmentLabel})`;

  return `Hola ${firstName}, te autoricé para ingresar a ${destination}: ${validityLabel}. Muestra este Pase en portería junto con tu documento de identidad: ${url}`;
}

export function whatsAppShareUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** `María José Peña` → `pase-maria-jose-pena.png`. */
export function passImageFileName(visitorName: string) {
  const slug = visitorName
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `pase-${slug || 'visitante'}.png`;
}

/**
 * Sends the Pase message from `buildPassShareText`: the native share sheet on
 * touch devices (where WhatsApp lives), else WhatsApp Web through `wa.me`. The
 * text already carries the link, so it is shared alone; adding `url` would
 * repeat the link in apps that append it.
 */
export async function sharePassLink(
  text: string
): Promise<'shared' | 'cancelled' | 'whatsApp'> {
  const openWhatsApp = () => {
    window.open(whatsAppShareUrl(text), '_blank', 'noopener,noreferrer');
    return 'whatsApp' as const;
  };
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
  const canShareNatively =
    isTouchDevice && 'canShare' in navigator && navigator.canShare({ text });

  if (!canShareNatively) return openWhatsApp();

  return navigator.share({ text }).then(
    () => 'shared' as const,
    (error: unknown) => {
      const isCancelled =
        error instanceof DOMException && error.name === 'AbortError';
      if (isCancelled) return 'cancelled' as const;

      return openWhatsApp();
    }
  );
}

const IMAGE_WIDTH = 600;
const IMAGE_QR_SIZE = 512;
const IMAGE_QR_TOP = 116;
const IMAGE_HEIGHT = IMAGE_QR_TOP + IMAGE_QR_SIZE + 160;

/**
 * Saves a printable Pase image: the QR with the unit, Visitante and validity.
 * Built synchronously so the share call keeps the click's user activation.
 */
export async function savePassImage({
  qrCanvas,
  residentialUnitName,
  visitorName,
  validityLabel,
}: {
  qrCanvas: HTMLCanvasElement;
  residentialUnitName: string;
  visitorName: string;
  validityLabel: string;
}): Promise<'shared' | 'cancelled' | 'downloaded'> {
  const canvas = document.createElement('canvas');
  canvas.width = IMAGE_WIDTH;
  canvas.height = IMAGE_HEIGHT;
  const context = canvas.getContext('2d');

  if (Predicate.isNull(context)) return 'cancelled';

  const center = IMAGE_WIDTH / 2;
  const maxTextWidth = IMAGE_WIDTH - 64;
  const fontFamily = 'Inter, system-ui, sans-serif';

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);
  context.textAlign = 'center';
  context.fillStyle = '#0b1c30';
  context.font = `700 30px ${fontFamily}`;
  context.fillText(residentialUnitName, center, 56, maxTextWidth);
  context.fillStyle = '#45464d';
  context.font = `500 18px ${fontFamily}`;
  context.fillText('Pase de visitante', center, 88, maxTextWidth);
  context.drawImage(
    qrCanvas,
    (IMAGE_WIDTH - IMAGE_QR_SIZE) / 2,
    IMAGE_QR_TOP,
    IMAGE_QR_SIZE,
    IMAGE_QR_SIZE
  );
  const textTop = IMAGE_QR_TOP + IMAGE_QR_SIZE;
  context.fillStyle = '#0b1c30';
  context.font = `700 30px ${fontFamily}`;
  context.fillText(visitorName, center, textTop + 48, maxTextWidth);
  context.font = `500 20px ${fontFamily}`;
  context.fillText(validityLabel, center, textTop + 84, maxTextWidth);
  context.fillStyle = '#45464d';
  context.font = `400 16px ${fontFamily}`;
  context.fillText(
    'Muéstralo en portería junto con tu documento de identidad',
    center,
    textTop + 124,
    maxTextWidth
  );

  const dataUrl = canvas.toDataURL('image/png');
  const bytes = Uint8Array.from(
    atob(dataUrl.slice(dataUrl.indexOf(',') + 1)),
    (char) => char.charCodeAt(0)
  );
  const file = new File([bytes], passImageFileName(visitorName), {
    type: 'image/png',
  });
  const canShareFile =
    'canShare' in navigator && navigator.canShare({ files: [file] });

  if (!canShareFile) {
    downloadFile(file);
    return 'downloaded';
  }

  return navigator.share({ files: [file], title: 'Pase de visitante' }).then(
    () => 'shared' as const,
    (error: unknown) => {
      const isCancelled =
        error instanceof DOMException && error.name === 'AbortError';
      if (isCancelled) return 'cancelled' as const;

      downloadFile(file);
      return 'downloaded' as const;
    }
  );
}

function downloadFile(file: File) {
  const objectUrl = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = file.name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
}
