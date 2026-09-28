import { useMutation } from '@confect/react';
import * as Result from 'effect/Result';

import refs from '@repo/backend/refs';
import { Button, toast } from '@repo/ui';

import * as CommonUI from '#modules/common-ui';
import * as Forms from '#modules/forms';
import * as VisitPass from '#modules/visit-pass';
import * as AppRouteFeat from '#routes/_authenticated/app/-feat';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';

import { CreateApartmentsFormStandardSchema } from './admin.models';
import { parseApartmentNumbers } from './apartment-numbers.utils';

const PREVIEW_LIMIT = 12;

/**
 * Adds a tower's Apartamentos in one go from numbers and ranges such as
 * `101-104, 201-204`. Existing ones are skipped, so repeating a range is safe.
 */
export function CreateApartmentsDialog({
  open,
  onOpenChange,
  defaultTower = '',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTower?: string;
}) {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const createApartments = useMutation(
    refs.public.residentialUnits.createApartments
  );

  const form = Forms.useAppForm({
    defaultValues: { tower: defaultTower, numbers: '' },
    validators: { onSubmit: CreateApartmentsFormStandardSchema },
    onSubmit: async ({ value, formApi }) => {
      const parsed = parseApartmentNumbers(value.numbers);

      if (Result.isFailure(parsed)) {
        toast.error(parsed.failure);
        return;
      }

      const tower = value.tower.trim();
      const result = await AppRouteFeat.settleMutation(
        createApartments({
          membershipId: membership.membershipId,
          tower,
          numbers: parsed.success,
        })
      );

      if (Result.isFailure(result)) {
        toast.error(VisitPass.describeBackendError(result.failure));
        return;
      }

      const created = result.success;
      const skipped = parsed.success.length - created;

      toast.success(
        created === 1
          ? `Se agregó 1 Apartamento a la Torre ${tower}.`
          : `Se agregaron ${created} Apartamentos a la Torre ${tower}.`,
        {
          description:
            skipped > 0
              ? `${skipped} ya existían y se dejaron igual.`
              : undefined,
        }
      );
      formApi.reset();
      onOpenChange(false);
    },
  });

  const close = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <CommonUI.FormDialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title="Agregar apartamentos"
      description="Escribe la Torre y los números. Acepta rangos y listas, como 101-104, 201-204, 301."
      onSubmit={() => void form.handleSubmit()}
      actions={
        <>
          <Button type="button" variant="outline" onClick={close}>
            Cancelar
          </Button>
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" disabled={isSubmitting}>
                Agregar
              </Button>
            )}
          </form.Subscribe>
        </>
      }
    >
      <div className="flex flex-col gap-4 pb-1">
        <form.AppField name="tower">
          {(field) => (
            <field.InputField
              label="Torre"
              placeholder="Ej.: 1, A, Norte"
              required
              autoFocus
            />
          )}
        </form.AppField>
        <form.AppField name="numbers">
          {(field) => (
            <field.TextareaField
              label="Números"
              placeholder="101-104, 201-204, 301"
              maxLength={2000}
              required
            />
          )}
        </form.AppField>
        <form.Subscribe selector={(state) => state.values.numbers}>
          {(numbers) => {
            const parsed = parseApartmentNumbers(numbers);
            const hasNoPreview =
              numbers.trim().length === 0 || Result.isFailure(parsed);

            if (hasNoPreview) return null;

            const preview = parsed.success.slice(0, PREVIEW_LIMIT).join(', ');
            const remaining = parsed.success.length - PREVIEW_LIMIT;

            return (
              <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {parsed.success.length === 1
                    ? '1 Apartamento'
                    : `${parsed.success.length} Apartamentos`}
                  :
                </span>{' '}
                {preview}
                {remaining > 0 ? ` y ${remaining} más` : null}
              </p>
            );
          }}
        </form.Subscribe>
      </div>
    </CommonUI.FormDialog>
  );
}
