import { useRef, useState } from 'react';

import * as Predicate from 'effect/Predicate';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  ImageDown,
  MessageCircle,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  buttonVariants,
  cn,
  toast,
  useIsMobile,
} from '@repo/ui';

import * as VisitPass from '#modules/visit-pass';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';

import type { SharedAuthorization } from './authorize.models';
import {
  buildPassShareText,
  describePassValidity,
  passPageUrl,
  savePassImage,
  sharePassLink,
} from './pass-share.utils';

/** Open state for the "Pase listo" sheet; spread `sheetProps` on `PassShareSheet`. */
export function usePassShare() {
  const [shared, setShared] = useState<SharedAuthorization | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  return {
    show: (next: SharedAuthorization) => {
      setShared(next);
      setIsOpen(true);
    },
    sheetProps: { shared, open: isOpen, onOpenChange: setIsOpen },
  };
}

/**
 * Shows each new Pase with its QR and the ways to hand it to the Visitante:
 * WhatsApp, a saved image, or the copied link. Bottom sheet on mobile.
 */
export function PassShareSheet({
  shared,
  open,
  onOpenChange,
}: {
  shared: SharedAuthorization | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className="gap-0 data-[side=bottom]:max-h-[calc(100dvh-2.5rem)] data-[side=bottom]:rounded-t-2xl data-[side=right]:sm:max-w-md"
      >
        {Predicate.isNull(shared) ? null : (
          // Remount per share so the pager starts at the first Pase.
          <PassShareBody key={shared.passes[0]?.token} shared={shared} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function PassShareBody({ shared }: { shared: SharedAuthorization }) {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const [index, setIndex] = useState(0);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const pass = shared.passes[index];
  const passCount = shared.passes.length;
  const hasSeveralPasses = passCount > 1;
  const validityLabel = describePassValidity(shared);

  if (Predicate.isUndefined(pass)) return null;

  const url = passPageUrl(window.location.origin, pass.token);
  const shareText = buildPassShareText({
    visitorName: pass.visitorName,
    residentialUnitName: membership.residentialUnitName,
    apartmentLabel: membership.apartmentLabel,
    validityLabel,
    url,
  });

  const handleSaveImage = async () => {
    const qrCanvas = qrCanvasRef.current;
    if (Predicate.isNull(qrCanvas)) return;

    const outcome = await savePassImage({
      qrCanvas,
      residentialUnitName: membership.residentialUnitName,
      visitorName: pass.visitorName,
      validityLabel,
    });

    if (outcome === 'downloaded') toast.success('Imagen del Pase descargada');
  };

  const handleCopyLink = () =>
    navigator.clipboard.writeText(url).then(
      () => toast.success('Enlace del Pase copiado'),
      () => toast.error('No se pudo copiar el enlace.')
    );

  return (
    <>
      <SheetHeader className="shrink-0 pr-14">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
          <SheetTitle className="text-lg font-semibold">
            {hasSeveralPasses ? `${passCount} Pases listos` : 'Pase listo'}
          </SheetTitle>
        </div>
        <SheetDescription>
          {VisitPass.VISIT_TYPE_LABELS[shared.type]}
          {shared.eventName ? ` · ${shared.eventName}` : null} · {validityLabel}
        </SheetDescription>
      </SheetHeader>

      <div className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto px-4 pb-2">
        <div className="w-full max-w-64 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-foreground/10">
          <QRCodeCanvas
            ref={qrCanvasRef}
            value={url}
            size={512}
            level="M"
            marginSize={2}
            title={`Pase de ${pass.visitorName}`}
            style={{ width: '100%', height: 'auto' }}
          />
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-lg font-semibold">{pass.visitorName}</p>
          <p className="text-sm text-muted-foreground">{validityLabel}</p>
        </div>

        {hasSeveralPasses ? (
          <div className="flex w-full items-center justify-between gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Pase anterior"
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
            >
              <ChevronLeft />
            </Button>
            <p className="text-sm text-muted-foreground tabular-nums">
              Pase {index + 1} de {passCount}
            </p>
            <Button
              variant="outline"
              size="icon"
              aria-label="Pase siguiente"
              disabled={index === passCount - 1}
              onClick={() => setIndex(index + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        ) : null}
      </div>

      <SheetFooter className="shrink-0">
        <Button
          size="lg"
          className="w-full"
          onClick={() => void sharePassLink({ text: shareText, url })}
        >
          <MessageCircle data-icon="inline-start" />
          Enviar por WhatsApp
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => void handleSaveImage()}>
            <ImageDown data-icon="inline-start" />
            Guardar imagen
          </Button>
          <Button variant="outline" onClick={() => void handleCopyLink()}>
            <Copy data-icon="inline-start" />
            Copiar enlace
          </Button>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ variant: 'link' }), 'self-center')}
        >
          Ver página del Pase
          <ExternalLink data-icon="inline-end" />
        </a>
      </SheetFooter>
    </>
  );
}
