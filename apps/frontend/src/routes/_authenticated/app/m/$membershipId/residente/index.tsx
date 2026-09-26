import { createFileRoute } from '@tanstack/react-router';
import { QrCode, ShieldCheck } from 'lucide-react';

import { Button } from '@repo/ui';

import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';
import * as ResidenteRouteFeat from '#routes/_authenticated/app/m/$membershipId/residente/-feat';

export const Route = createFileRoute(
  '/_authenticated/app/m/$membershipId/residente/'
)({
  component: ResidenteHomePage,
});

function ResidenteHomePage() {
  const share = ResidenteRouteFeat.usePassShare();

  return (
    <>
      <QuickPassHero />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <ResidenteRouteFeat.AuthorizeVisitCard onShared={share.show} />
        <ResidenteRouteFeat.FavoritesPreviewCard onShared={share.show} />
      </div>
      <ResidenteRouteFeat.RecentVisitsCard />
      <ResidenteRouteFeat.PassShareSheet {...share.sheetProps} />
    </>
  );
}

/** "Generar Pase rápido": jumps to the authorize form's first field. */
function QuickPassHero() {
  const membership = MembershipRouteFeat.useCurrentMembership();

  const focusAuthorizeForm = () => {
    const input = document.getElementById(
      ResidenteRouteFeat.AUTHORIZE_FIRST_INPUT_ID
    );

    input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    input?.focus({ preventScroll: true });
  };

  return (
    <section className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary to-primary/80 px-6 py-7 text-primary-foreground shadow-md sm:px-8 sm:py-9">
      <ShieldCheck
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 -bottom-8 size-44 opacity-15 sm:right-6 sm:size-56"
        strokeWidth={1.5}
      />
      <div className="relative flex max-w-xl flex-col gap-3">
        <p className="w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-[0.08em] uppercase">
          {membership.apartmentLabel
            ? `Apartamento ${membership.apartmentLabel}`
            : 'Acceso express'}
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
          Generar Pase rápido
        </h1>
        <p className="text-sm opacity-90 sm:text-base">
          Crea un código QR para tu Visitante y envíaselo por WhatsApp en
          segundos. Lo muestra en portería junto con su documento.
        </p>
        <Button
          size="lg"
          className="mt-2 w-fit rounded-full bg-background px-5 text-primary hover:bg-background/90"
          onClick={focusAuthorizeForm}
        >
          <QrCode data-icon="inline-start" />
          Generar Pase
        </Button>
      </div>
    </section>
  );
}
