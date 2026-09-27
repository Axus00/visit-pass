import { useMutation } from '@confect/react';
import * as Predicate from 'effect/Predicate';
import * as Result from 'effect/Result';

import refs from '@repo/backend/refs';
import * as VisitsShared from '@repo/backend/shared/visits';
import { Button, toast } from '@repo/ui';

import * as CommonUI from '#modules/common-ui';
import * as Forms from '#modules/forms';
import * as VisitPass from '#modules/visit-pass';
import * as AppRouteFeat from '#routes/_authenticated/app/-feat';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';

import { VoidVisitFormStandardSchema } from './admin.models';

/**
 * Asks why a Visita registered by mistake is voided. Open it with the Visita;
 * it closes itself through `onClose` once the backend accepts the reason.
 */
export function VoidVisitDialog({
  visit,
  onClose,
}: {
  visit: VisitPass.VisitSummary | null;
  onClose: () => void;
}) {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const voidVisit = useMutation(refs.public.visits.voidVisit);

  const form = Forms.useAppForm({
    defaultValues: { reason: '' },
    validators: { onSubmit: VoidVisitFormStandardSchema },
    onSubmit: async ({ value, formApi }) => {
      if (Predicate.isNull(visit)) return;

      const result = await AppRouteFeat.settleMutation(
        voidVisit({
          membershipId: membership.membershipId,
          visitId: visit._id,
          reason: value.reason.trim(),
        })
      );

      if (Result.isFailure(result)) {
        toast.error(VisitPass.describeBackendError(result.failure));
        return;
      }

      toast.success(`La Visita de ${visit.visitorName} quedó anulada.`);
      formApi.reset();
      onClose();
    },
  });

  return (
    <CommonUI.FormDialog
      open={Predicate.isNotNull(visit)}
      onOpenChange={(open) => {
        if (open) return;

        form.reset();
        onClose();
      }}
      title="Anular Visita"
      description={`${visit?.visitorName ?? ''} · ${visit?.apartmentLabel ?? ''}. La Visita no se borra: queda en el historial marcada como anulada, con este motivo, y deja de contar en los totales, en los Reportes de turno y en los Visitantes dentro.`}
      onSubmit={() => void form.handleSubmit()}
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              form.reset();
              onClose();
            }}
          >
            Cancelar
          </Button>
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button
                type="submit"
                variant="destructive"
                disabled={isSubmitting}
              >
                Anular Visita
              </Button>
            )}
          </form.Subscribe>
        </>
      }
    >
      <form.AppField name="reason">
        {(field) => (
          <field.TextareaField
            label="Motivo"
            placeholder="Ej.: registrada dos veces, Apartamento equivocado…"
            maxLength={VisitsShared.VOID_REASON_MAX_LENGTH}
            required
            autoFocus
          />
        )}
      </form.AppField>
    </CommonUI.FormDialog>
  );
}
