import {
  CameraOff,
  Flashlight,
  FlashlightOff,
  LoaderCircle,
} from 'lucide-react';

import { Button, cn } from '@repo/ui';

import { type ScannerStatus, usePassScanner } from './pass-scanner.hooks';

const STATUS_COPY: Partial<
  Record<ScannerStatus, { title: string; description: string }>
> = {
  denied: {
    title: 'Sin permiso para usar la cámara',
    description:
      'Permite el acceso a la cámara en la configuración del navegador y recarga la página, o ingresa el código del Pase abajo.',
  },
  unavailable: {
    title: 'No encontramos una cámara disponible',
    description:
      'Este dispositivo o navegador no ofrece cámara aquí. Ingresa el código del Pase abajo.',
  },
  failed: {
    title: 'No se pudo leer con la cámara',
    description:
      'Cierra otras apps que la estén usando y vuelve a intentarlo, o ingresa el código del Pase abajo.',
  },
};

/**
 * Full-width rear-camera viewport with a high-contrast tracking frame. It
 * mounts the camera while rendered, so unmount it once a Pase is read.
 */
export function PassScanner({
  onCode,
}: {
  onCode: (rawValue: string) => boolean;
}) {
  const { videoRef, status, hasTorch, isTorchOn, toggleTorch } =
    usePassScanner(onCode);
  const failureCopy = STATUS_COPY[status];
  const isLive = status === 'scanning' || status === 'starting';
  const canToggleTorch = hasTorch && status === 'scanning';

  return (
    <div className="relative isolate aspect-[3/4] max-h-[62dvh] w-full overflow-hidden rounded-2xl bg-black sm:aspect-video sm:max-h-[70dvh]">
      <video
        ref={videoRef}
        className={cn(
          'absolute inset-0 size-full object-cover',
          !isLive && 'hidden'
        )}
        muted
        playsInline
        aria-label="Vista de la cámara"
      />

      {isLive ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="relative aspect-square w-[68%] max-w-72 rounded-3xl shadow-[0_0_0_100vmax_rgb(0_0_0/0.6)]">
            <span className="absolute -top-0.5 -left-0.5 size-10 rounded-tl-3xl border-t-4 border-l-4 border-white" />
            <span className="absolute -top-0.5 -right-0.5 size-10 rounded-tr-3xl border-t-4 border-r-4 border-white" />
            <span className="absolute -bottom-0.5 -left-0.5 size-10 rounded-bl-3xl border-b-4 border-l-4 border-white" />
            <span className="absolute -right-0.5 -bottom-0.5 size-10 rounded-br-3xl border-r-4 border-b-4 border-white" />
            {status === 'scanning' ? (
              <span className="absolute inset-x-6 top-1/2 h-0.5 animate-pulse rounded-full bg-sky-400 shadow-[0_0_12px_2px_rgb(56_189_248/0.8)]" />
            ) : null}
          </div>
          <p className="absolute inset-x-0 bottom-5 px-6 text-center text-sm font-medium text-white">
            {status === 'starting'
              ? 'Abriendo la cámara…'
              : 'Centra el código QR del Pase dentro del recuadro'}
          </p>
        </div>
      ) : null}

      {status === 'starting' ? (
        <LoaderCircle
          className="absolute top-1/2 left-1/2 size-8 -translate-1/2 animate-spin text-white"
          aria-hidden="true"
        />
      ) : null}

      {canToggleTorch ? (
        <Button
          variant="secondary"
          size="icon-lg"
          className="absolute top-3 right-3 size-12 rounded-full bg-black/50 text-white hover:bg-black/70"
          aria-label={isTorchOn ? 'Apagar linterna' : 'Encender linterna'}
          aria-pressed={isTorchOn}
          onClick={() => void toggleTorch()}
        >
          {isTorchOn ? <FlashlightOff /> : <Flashlight />}
        </Button>
      ) : null}

      {failureCopy ? (
        <div
          role="alert"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center text-white"
        >
          <span className="grid size-14 place-items-center rounded-full bg-white/10">
            <CameraOff className="size-7" aria-hidden="true" />
          </span>
          <p className="text-lg font-semibold">{failureCopy.title}</p>
          <p className="max-w-sm text-sm text-white/80">
            {failureCopy.description}
          </p>
        </div>
      ) : null}
    </div>
  );
}
