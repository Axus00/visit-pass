import { useState } from 'react';

import { QueryResult, useQuery } from '@confect/react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import * as Match from 'effect/Match';
import * as Predicate from 'effect/Predicate';
import { KeyRound, LoaderCircle } from 'lucide-react';

import refs from '@repo/backend/refs';
import { Button, Card, toast } from '@repo/ui';

import * as Forms from '#modules/forms';
import * as VisitPass from '#modules/visit-pass';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';
import * as PorteriaRouteFeat from '#routes/_authenticated/app/m/$membershipId/porteria/-feat';

export const Route = createFileRoute(
  '/_authenticated/app/m/$membershipId/porteria/escanear/'
)({
  component: PorteriaScanPage,
});

const NOT_A_PASS_MESSAGE = 'Ese código no es un Pase de Visit Pass.';

function PorteriaScanPage() {
  const { membershipId } = MembershipRouteFeat.useCurrentMembership();
  const navigate = useNavigate();
  const shiftState = PorteriaRouteFeat.usePorterShiftState();
  /**
   * The Pase being checked and when it was read. `now` stays fixed per scan so
   * the resolution does not re-subscribe (and remount the card) every minute.
   */
  const [scan, setScan] = useState<{ token: string; now: number } | null>(null);
  const token = scan?.token ?? null;
  /**
   * Holds an admitted Pase while its Ingreso saves and the Pase turns used,
   * keyed by token so it never stands in for a Pase scanned since.
   */
  const [heldResolution, setHeldResolution] = useState<{
    token: string;
    resolution: PorteriaRouteFeat.PassResolution;
  } | null>(null);

  const liveResolution = useQuery(
    refs.public.visits.resolvePass,
    Predicate.isNull(scan)
      ? 'skip'
      : { membershipId, token: scan.token, now: scan.now }
  );
  const isHeldForScan =
    Predicate.isNotNull(heldResolution) && heldResolution.token === token;
  const liveValue = QueryResult.isSuccess(liveResolution)
    ? liveResolution.value
    : null;
  const resolution = isHeldForScan ? heldResolution.resolution : liveValue;
  const hasNoOpenShift =
    Predicate.isNotNull(shiftState) && Predicate.isNull(shiftState.openShift);
  /** Bumped by "Reintentar" to remount the scanner, which reopens the camera. */
  const [scannerAttempt, setScannerAttempt] = useState(0);

  const scanAnother = () => {
    setHeldResolution(null);
    setScan(null);
  };

  /** Stamps each scan with the real time it was read, not the ticking `now`. */
  const startScan = (nextToken: string) => {
    setHeldResolution(null);
    setScan({ token: nextToken, now: Date.now() });
  };

  /**
   * Clears a registered Pase, unless the Portero already moved on to another
   * one while its Ingreso was saving.
   */
  const finishRegistration = (registeredToken: string) => {
    setHeldResolution((held) =>
      held?.token === registeredToken ? null : held
    );
    setScan((current) => (current?.token === registeredToken ? null : current));
  };

  const acceptCode = (rawValue: string) => {
    const parsedToken = PorteriaRouteFeat.parsePassToken(rawValue);

    if (Predicate.isNull(parsedToken)) {
      toast.error(NOT_A_PASS_MESSAGE);
      return false;
    }

    navigator.vibrate?.(80);
    startScan(parsedToken);
    return true;
  };

  const goToManualEntry = (search: ManualEntrySearch) =>
    void navigate({
      to: '/app/m/$membershipId/porteria/registro',
      params: { membershipId },
      search,
    });

  return (
    <>
      <VisitPass.PageHeader
        eyebrow="Portería"
        title="Escanear Pase"
        description="Apunta la cámara al código QR del Visitante."
      />

      {hasNoOpenShift ? <PorteriaRouteFeat.StartShiftBanner /> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          {Predicate.isNull(token) ? (
            <PorteriaRouteFeat.PassScanner
              key={scannerAttempt}
              onCode={acceptCode}
              onRetry={() => setScannerAttempt((attempt) => attempt + 1)}
            />
          ) : Predicate.isNull(resolution) ? (
            <ResolvingCard
              error={
                QueryResult.isFailure(liveResolution)
                  ? (VisitPass.describeBackendError(liveResolution.error) ??
                    'No se pudo verificar el Pase.')
                  : null
              }
              onScanAnother={scanAnother}
            />
          ) : (
            Match.value(resolution).pipe(
              Match.when({ outcome: 'admissible' }, ({ pass }) => (
                <PorteriaRouteFeat.AdmissiblePassCard
                  key={token}
                  pass={pass}
                  token={token}
                  canRegister={!hasNoOpenShift}
                  onSubmittingChange={(submittingToken, isSubmitting) =>
                    setHeldResolution((held) => {
                      if (isSubmitting)
                        return { token: submittingToken, resolution };

                      return held?.token === submittingToken ? null : held;
                    })
                  }
                  onRegistered={finishRegistration}
                  onScanAnother={scanAnother}
                />
              )),
              Match.when({ outcome: 'rejected' }, ({ pass, reason }) => (
                <PorteriaRouteFeat.RejectedPassCard
                  pass={pass}
                  reason={reason}
                  onScanAnother={scanAnother}
                  onForceManualEntry={() =>
                    goToManualEntry({
                      token,
                      name: pass.visitorName,
                      document: pass.visitorDocument,
                      apartmentId: pass.apartmentId,
                      visitType: pass.type,
                      reason,
                    })
                  }
                />
              )),
              Match.when({ outcome: 'notFound' }, () => (
                <PorteriaRouteFeat.PassNotFoundCard
                  onScanAnother={scanAnother}
                  onManualEntry={() => goToManualEntry({})}
                />
              )),
              Match.exhaustive
            )
          )}
        </div>

        <ManualCodeCard onToken={startScan} />
      </div>
    </>
  );
}

type ManualEntrySearch = {
  token?: string | undefined;
  name?: string | undefined;
  document?: string | undefined;
  apartmentId?: string | undefined;
  visitType?: VisitPass.VisitType | undefined;
  reason?: VisitPass.PassRejectionReason | undefined;
};

function ResolvingCard({
  error,
  onScanAnother,
}: {
  error: string | null;
  onScanAnother: () => void;
}) {
  return (
    <Card className="items-center gap-4 px-6 py-12 text-center">
      {Predicate.isNull(error) ? (
        <>
          <LoaderCircle
            className="size-8 animate-spin text-primary"
            aria-hidden="true"
          />
          <p className="font-medium">Verificando el Pase…</p>
        </>
      ) : (
        <>
          <p className="font-medium text-destructive">{error}</p>
          <Button className="h-12 px-6 text-base" onClick={onScanAnother}>
            Escanear otro
          </Button>
        </>
      )}
    </Card>
  );
}

/** Fallback when the camera is unavailable or the QR will not read. */
function ManualCodeCard({ onToken }: { onToken: (token: string) => void }) {
  const form = Forms.useAppForm({
    defaultValues: { code: '' },
    validators: {
      onSubmit: ({ value }) =>
        Predicate.isNull(PorteriaRouteFeat.parsePassToken(value.code))
          ? { fields: { code: NOT_A_PASS_MESSAGE } }
          : undefined,
    },
    // Keeps the code in the field: resetting would re-run the validator on
    // the empty value and flag an error the Portero did not cause.
    onSubmit: ({ value }) => {
      const parsedToken = PorteriaRouteFeat.parsePassToken(value.code);
      if (Predicate.isNull(parsedToken)) return;

      onToken(parsedToken);
    },
  });

  return (
    <Card className="gap-4 px-5 py-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
          <KeyRound className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-0.5">
          <p className="font-semibold">¿No lee el código?</p>
          <p className="text-sm text-muted-foreground">
            Pide al Visitante el enlace o el código de su Pase.
          </p>
        </div>
      </div>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <form.AppField name="code">
          {(field) => (
            <field.InputField
              label="Ingresa o pega el código del Pase"
              placeholder="Código o enlace /p/…"
              className="h-12 text-base"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          )}
        </form.AppField>
        <Button type="submit" variant="secondary" className="h-12 text-base">
          Verificar Pase
        </Button>
      </form>
    </Card>
  );
}
