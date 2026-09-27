import { useMutation } from '@confect/react';
import * as Predicate from 'effect/Predicate';
import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import { Info } from 'lucide-react';

import refs from '@repo/backend/refs';
import * as VisitsShared from '@repo/backend/shared/visits';
import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  toast,
  useIsMobile,
} from '@repo/ui';

import * as Forms from '#modules/forms';
import * as VisitPass from '#modules/visit-pass';
import * as AppRouteFeat from '#routes/_authenticated/app/-feat';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';

const VoidVisitFormStandardSchema = Forms.toSpanishStandardSchema(
  Schema.Struct({ reason: VisitsShared.VoidVisitDto.fields.reason })
);

/**
 * Voids a Visita registered by mistake, with a reason. Open it by passing the
 * Visita; `null` closes it.
 */
export function VoidVisitSheet({
  visit,
  onClose,
}: {
  visit: VisitPass.VisitSummary | null;
  onClose: () => void;
}) {
  const isMobile = useIsMobile();

  return (
    <Sheet
      open={Predicate.isNotNull(visit)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className="max-h-[90dvh] rounded-t-2xl sm:max-w-md md:rounded-none"
      >
        {Predicate.isNull(visit) ? null : (
          <VoidVisitForm key={visit._id} visit={visit} onDone={onClose} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function VoidVisitForm({
  visit,
  onDone,
}: {
  visit: VisitPass.VisitSummary;
  onDone: () => void;
}) {
  const { membershipId } = MembershipRouteFeat.useCurrentMembership();
  const voidVisit = useMutation(refs.public.visits.voidVisit);

  const form = Forms.useAppForm({
    defaultValues: { reason: '' },
    validators: { onSubmit: VoidVisitFormStandardSchema },
    onSubmit: async ({ value }) => {
      const result = await AppRouteFeat.settleMutation(
        voidVisit({
          membershipId,
          visitId: visit._id,
          reason: value.reason.trim(),
        })
      );

      if (Result.isFailure(result)) {
        toast.error(VisitPass.describeBackendError(result.failure));
        return;
      }

      toast.success('Visita anulada');
      onDone();
    },
  });

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <SheetHeader className="pr-12">
        <SheetTitle className="text-lg font-semibold">Anular visita</SheetTitle>
        <SheetDescription>
          {visit.visitorName} · {visit.apartmentLabel}
        </SheetDescription>
      </SheetHeader>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4">
        <p className="flex gap-2 rounded-lg bg-secondary px-3 py-2.5 text-sm text-secondary-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          La Visita no se borra: queda en el historial marcada como anulada, con
          su motivo, y sale de los conteos y del Reporte de turno.
        </p>
        <form.AppField name="reason">
          {(field) => (
            <field.TextareaField
              label="Motivo"
              maxLength={VisitsShared.VOID_REASON_MAX_LENGTH}
              placeholder="Ej. Registré el Apartamento equivocado"
              rows={3}
              required
            />
          )}
        </form.AppField>
      </div>
      <SheetFooter>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button
              type="submit"
              variant="destructive"
              className="h-12 text-base"
              disabled={isSubmitting}
            >
              Anular visita
            </Button>
          )}
        </form.Subscribe>
        <Button
          type="button"
          variant="outline"
          className="h-12 text-base"
          onClick={onDone}
        >
          Cancelar
        </Button>
      </SheetFooter>
    </form>
  );
}
