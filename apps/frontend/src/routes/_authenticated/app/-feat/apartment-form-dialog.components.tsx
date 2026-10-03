import { useMutation } from '@confect/react';
import * as Predicate from 'effect/Predicate';
import * as Result from 'effect/Result';

import refs from '@repo/backend/refs';
import * as ApartmentsShared from '@repo/backend/shared/apartments';
import { Button, toast } from '@repo/ui';

import * as CommonUI from '#modules/common-ui';
import * as Forms from '#modules/forms';

import {
  type Apartment,
  type GroupingWord,
  formatGroupingWord,
  formatUnitAccessError,
  validateWith,
} from './unit-access.models';

/**
 * Creates an Apartamento, or renames `apartment` when one is given. Key it by
 * the Apartamento so the form starts from the right values.
 */
export function ApartmentFormDialog({
  open,
  onOpenChange,
  apartment,
  groupingWord,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apartment: Apartment | null;
  groupingWord: GroupingWord;
}) {
  const create = useMutation(refs.public.apartments.create);
  const rename = useMutation(refs.public.apartments.rename);

  const isRenaming = Predicate.isNotNull(apartment);
  const hasGroupings = Predicate.isNotNull(groupingWord);

  const form = Forms.useAppForm({
    defaultValues: {
      grouping: apartment?.grouping ?? '',
      number: apartment?.number ?? '',
    },
    onSubmit: async ({ value, formApi }) => {
      // A unit without Agrupaciones always sends null.
      const label = {
        grouping: hasGroupings ? value.grouping.trim() : null,
        number: value.number.trim(),
      };

      const result = isRenaming
        ? await rename({ apartmentId: apartment._id, ...label })
        : await create(label);

      if (Result.isFailure(result)) {
        toast.error(formatUnitAccessError(result.failure));
        return;
      }

      toast.success(
        isRenaming ? 'Apartamento actualizado.' : 'Apartamento creado.'
      );
      formApi.reset();
      onOpenChange(false);
    },
  });

  return (
    <CommonUI.FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isRenaming ? 'Editar Apartamento' : 'Agregar Apartamento'}
      description={
        hasGroupings
          ? 'Un Apartamento se identifica por su Agrupación y su número.'
          : 'Un Apartamento se identifica por su número.'
      }
      onSubmit={() => void form.handleSubmit()}
      actions={
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Guardar
              </Button>
            </>
          )}
        </form.Subscribe>
      }
    >
      <div className="flex flex-col gap-4 py-2">
        {hasGroupings ? (
          <form.AppField
            name="grouping"
            validators={{
              onSubmit: validateWith(
                ApartmentsShared.CreateApartmentDto.fields.grouping,
                `Escribe la ${formatGroupingWord(groupingWord)}.`
              ),
            }}
          >
            {(field) => (
              <field.InputField
                label={formatGroupingWord(groupingWord)}
                maxLength={ApartmentsShared.GROUPING_MAX_LENGTH}
                autoComplete="off"
                required
              />
            )}
          </form.AppField>
        ) : null}
        <form.AppField
          name="number"
          validators={{
            onSubmit: validateWith(
              ApartmentsShared.CreateApartmentDto.fields.number,
              'Escribe el número del Apartamento.'
            ),
          }}
        >
          {(field) => (
            <field.InputField
              label="Número"
              maxLength={ApartmentsShared.NUMBER_MAX_LENGTH}
              autoComplete="off"
              required
            />
          )}
        </form.AppField>
      </div>
    </CommonUI.FormDialog>
  );
}
