// PROTOTYPE (#15): shared pieces for the Pase variants. Tokens, fonts and
// icons copy the Stitch mockups ("Secure Access Logic" design system).
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';

import { cn } from '@repo/ui';

import {
  AVISO_COMPLETO,
  AVISO_RESUMEN,
  type Pase,
  type Status,
  type Tone,
  UNIDAD,
} from './pase-prototype.fixtures';

export const PASE_THEME_STYLE = {
  '--vp-bg': '#f8f9ff',
  '--vp-card': '#ffffff',
  '--vp-fg': '#0b1c30',
  '--vp-muted': '#45464d',
  '--vp-outline': '#76777d',
  '--vp-border': '#c6c6cd',
  '--vp-border-soft': '#e2e8f0',
  '--vp-low': '#eff4ff',
  '--vp-high': '#dce9ff',
  '--vp-navy': '#131b2e',
  '--vp-blue': '#0051d5',
  '--vp-blue-2': '#316bf3',
  '--vp-blue-dim': '#b4c5ff',
  '--vp-green': '#009668',
  '--vp-error': '#ba1a1a',
  '--vp-error-bg': '#ffdad6',
  '--vp-whatsapp': '#25d366',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
} as CSSProperties;

/** Loads Inter and Material Symbols (as the mockups do) and scopes the tokens. */
export function PaseTheme({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      style={PASE_THEME_STYLE}
      className={cn(
        'min-h-dvh bg-(--vp-bg) pb-32 text-(--vp-fg) antialiased',
        className
      )}
    >
      <link
        rel="stylesheet"
        precedence="default"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
      />
      <link
        rel="stylesheet"
        precedence="default"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
      />
      {children}
    </div>
  );
}

export function Icon({
  name,
  fill = false,
  className,
}: {
  name: string;
  fill?: boolean;
  className?: string;
}) {
  return (
    // Google's stylesheet pins `.material-symbols-outlined` to 24px outside
    // any cascade layer, so the size lives on a wrapper and is inherited.
    <span
      aria-hidden
      className={cn('inline-flex text-[24px] leading-none', className)}
    >
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: 'inherit',
          fontVariationSettings: `'FILL' ${fill ? 1 : 0}`,
        }}
      >
        {name}
      </span>
    </span>
  );
}

const PILL_TONE: Record<Tone, string> = {
  success: 'bg-green-100 text-green-700',
  info: 'bg-(--vp-high) text-(--vp-blue)',
  warning: 'bg-amber-100 text-amber-700',
  neutral: 'bg-(--vp-high) text-(--vp-muted)',
  error: 'bg-(--vp-error-bg) text-(--vp-error)',
};

export const BAR_TONE: Record<Tone, string> = {
  success: 'bg-green-500',
  info: 'bg-(--vp-blue)',
  warning: 'bg-amber-400',
  neutral: 'bg-(--vp-outline)',
  error: 'bg-(--vp-error)',
};

export const ICON_TONE: Record<Tone, string> = {
  success: 'verified_user',
  info: 'event_upcoming',
  warning: 'warning',
  neutral: 'history',
  error: 'block',
};

export function StatusPill({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-1 text-[11px] font-bold tracking-wider uppercase',
        PILL_TONE[status.tone],
        className
      )}
    >
      {status.pill}
    </span>
  );
}

/** On-screen QR: level M, 4-module quiet zone (research #5). */
export function PaseQr({
  pase,
  size,
  className,
}: {
  pase: Pase;
  size: number;
  className?: string;
}) {
  return (
    <QRCodeSVG
      value={pase.url}
      size={size}
      level="M"
      marginSize={4}
      title="Código QR del Pase"
      className={className}
    />
  );
}

/** Stand-in shown where the QR would be once it is no longer presentable. */
export function QrUnavailable({
  size,
  status,
}: {
  size: number;
  status: Status;
}) {
  return (
    <div
      style={{ width: size, height: size }}
      className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-(--vp-border) bg-(--vp-low) text-(--vp-outline)"
    >
      <Icon name="qr_code_2" className="text-[88px] opacity-30" />
      <span className="text-xs font-semibold tracking-wider uppercase">
        {status.pill}
      </span>
    </div>
  );
}

export function LabelSm({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'text-xs font-semibold tracking-[0.05em] text-(--vp-outline) uppercase',
        className
      )}
    >
      {children}
    </p>
  );
}

/** Short aviso with the full text behind a disclosure. */
export function PrivacyNotice({
  className,
  defaultOpen = false,
}: {
  className?: string;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        'group rounded-xl border border-(--vp-blue)/15 bg-(--vp-high)/60 p-4 text-sm',
        className
      )}
    >
      <summary className="flex cursor-pointer list-none items-start gap-3">
        <Icon name="info" className="mt-0.5 text-[20px] text-(--vp-blue)" />
        <span className="flex-1">
          <span className="block font-semibold text-(--vp-fg)">
            Aviso de privacidad
          </span>
          <span className="mt-1 block text-[13px] leading-5 text-(--vp-muted)">
            {AVISO_RESUMEN}
          </span>
          <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-(--vp-blue) group-open:hidden">
            Leer aviso completo
            <Icon name="expand_more" className="text-[18px]" />
          </span>
        </span>
      </summary>
      <PrivacyFullText className="mt-3 pl-8" />
    </details>
  );
}

export function PrivacyFullText({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'space-y-2 text-[13px] leading-5 text-(--vp-muted)',
        className
      )}
    >
      {AVISO_COMPLETO.map((parrafo) => (
        <p key={parrafo.slice(0, 24)}>{parrafo}</p>
      ))}
      <p>
        Política completa:{' '}
        <a
          href={UNIDAD.politicaUrl}
          className="font-medium text-(--vp-blue) underline"
        >
          {UNIDAD.politicaUrl.replace('https://', '')}
        </a>
      </p>
      <p className="text-[11px] text-(--vp-outline)">
        {UNIDAD.avisoVersion}. Ley 1581 de 2012 y Decreto 1074 de 2015.
      </p>
    </div>
  );
}

const IMAGE_WIDTH = 720;
const IMAGE_HEIGHT = 1080;

/**
 * Draws the saved-image version of the Pase: header band, QR at 512 px with
 * its quiet zone, who/where/when and a one-line aviso pointer.
 */
const composePaseImage = (qr: HTMLCanvasElement, pase: Pase) => {
  const canvas = document.createElement('canvas');
  canvas.width = IMAGE_WIDTH;
  canvas.height = IMAGE_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const center = IMAGE_WIDTH / 2;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);

  const gradient = ctx.createLinearGradient(0, 0, IMAGE_WIDTH, 160);
  gradient.addColorStop(0, '#0051d5');
  gradient.addColorStop(1, '#316bf3');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, IMAGE_WIDTH, 160);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 22px Inter, sans-serif';
  ctx.globalAlpha = 0.85;
  ctx.fillText(UNIDAD.nombre, center, 62);
  ctx.globalAlpha = 1;
  ctx.font = '700 40px Inter, sans-serif';
  ctx.fillText('Pase de visita', center, 116);

  ctx.drawImage(qr, center - 256, 190, 512, 512);

  ctx.fillStyle = '#0b1c30';
  ctx.font = '600 36px Inter, sans-serif';
  ctx.fillText(pase.visitante, center, 758);
  ctx.fillStyle = '#45464d';
  ctx.font = '400 26px Inter, sans-serif';
  ctx.fillText(pase.apartamento, center, 800);

  ctx.fillStyle = '#eff4ff';
  ctx.beginPath();
  ctx.roundRect(36, 832, IMAGE_WIDTH - 72, 96, 16);
  ctx.fill();
  ctx.fillStyle = '#0051d5';
  ctx.font = '600 26px Inter, sans-serif';
  const cuando =
    pase.tipo === 'servicio'
      ? `${pase.vigencia} · ${pase.diasPermitidos}`
      : pase.vigenciaLarga;
  ctx.fillText(cuando, center, 872);
  ctx.fillStyle = '#45464d';
  ctx.font = '400 20px Inter, sans-serif';
  ctx.fillText(`${pase.regla} · Presenta tu documento`, center, 906);

  ctx.fillStyle = '#76777d';
  ctx.font = '400 17px Inter, sans-serif';
  ctx.fillText(
    'Tus datos los trata la copropiedad para controlar el acceso.',
    center,
    980
  );
  ctx.fillText(
    `Aviso de privacidad y estado del Pase: ${pase.url.replace('https://', '')}`,
    center,
    1006
  );
  ctx.font = '600 16px Inter, sans-serif';
  ctx.fillText('Visit Pass', center, 1050);

  return canvas;
};

const toBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));

/**
 * Hidden 512 px QR canvas plus the composed PNG. `save` shares the file when
 * the browser can (`canShare({ files })`), otherwise downloads it.
 */
export function usePaseImage(pase: Pase) {
  const qrRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (cancelled || !qrRef.current) return;
      setDataUrl(composePaseImage(qrRef.current, pase).toDataURL('image/png'));
    });
    return () => {
      cancelled = true;
    };
  }, [pase]);

  const save = async () => {
    if (!qrRef.current) return;
    const blob = await toBlob(composePaseImage(qrRef.current, pase));
    if (!blob) return;
    const file = new File([blob], 'pase-visit-pass.png', { type: 'image/png' });
    const canShareFile = navigator.canShare?.({ files: [file] }) === true;
    if (canShareFile) {
      await navigator.share({ files: [file], title: 'Pase de visita' });
      return;
    }
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const hiddenCanvas = (
    <QRCodeCanvas
      ref={qrRef}
      value={pase.url}
      size={512}
      level="M"
      marginSize={4}
      className="hidden"
    />
  );

  return { hiddenCanvas, dataUrl, save };
}
