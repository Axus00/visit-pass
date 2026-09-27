import * as Predicate from 'effect/Predicate';

// Mirrors the Residente share sheet's image (`residente/-feat/pass-share.utils.ts`);
// promote both to `#modules/visit-pass` together.

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

  // `María José Peña` → `pase-maria-jose-pena.png`.
  const fileSlug = visitorName
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const dataUrl = canvas.toDataURL('image/png');
  const bytes = Uint8Array.from(
    atob(dataUrl.slice(dataUrl.indexOf(',') + 1)),
    (char) => char.charCodeAt(0)
  );
  const file = new File([bytes], `pase-${fileSlug || 'visitante'}.png`, {
    type: 'image/png',
  });
  const canShareFile =
    'canShare' in navigator && navigator.canShare({ files: [file] });
  // A share sheet that fails for any reason but a dismissal falls back to a
  // download, as does a browser that cannot share files at all.
  const shareOutcome = canShareFile
    ? await navigator.share({ files: [file], title: 'Pase de visitante' }).then(
        () => 'shared' as const,
        (error: unknown) => {
          const isCancelled =
            error instanceof DOMException && error.name === 'AbortError';

          return isCancelled ? ('cancelled' as const) : ('failed' as const);
        }
      )
    : ('failed' as const);

  if (shareOutcome !== 'failed') return shareOutcome;

  const objectUrl = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = file.name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);

  return 'downloaded';
}
