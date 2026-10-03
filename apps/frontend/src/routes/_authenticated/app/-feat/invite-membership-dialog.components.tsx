import { useMutation } from '@confect/react';
import * as Predicate from 'effect/Predicate';
import * as Result from 'effect/Result';

import refs from '@repo/backend/refs';
import * as MembershipsShared from '@repo/backend/shared/memberships';
import { Button, toast } from '@repo/ui';

import * as CommonUI from '#modules/common-ui';
import * as Forms from '#modules/forms';

import { OptionSelect } from './option-select.components';
import {
  type Apartment,
  type GroupingWord,
  OCCUPANCY_TYPE_OPTIONS,
  type OccupancyType,
  type Role,
  formatApartmentLabel,
  formatRole,
  formatUnitAccessError,
  validateWith,
} from './unit-access.models';

type InviteMembershipFormValues = {
  name: string;
  email: string;
  role: Role;
  apartmentId: Apartment['_id'] | null;
  occupancyType: OccupancyType;
};

const DEFAULT_VALUES: InviteMembershipFormValues = {
  name: '',
  email: '',
  role: 'resident',
  apartmentId: null,
  occupancyType: 'owner',
};

const ROLE_OPTIONS = MembershipsShared.ROLES.map((role) => ({
  value: role,
  label: formatRole(role),
}));

/** Creates a Membresía pendiente; only a Residente takes Apartamento and Tipo de ocupación. */
export function InviteMembershipDialog({
  open,
  onOpenChange,
  apartments,
  groupingWord,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apartments: ReadonlyArray<Apartment>;
  groupingWord: GroupingWord;
}) {
  const invite = useMutation(refs.public.memberships.invite);

  const apartmentOptions = apartments
    .filter((apartment) => Predicate.isUndefined(apartment.deactivatedAt))
    .map((apartment) => ({
      value: apartment._id,
      label: formatApartmentLabel(apartment, groupingWord),
    }));
  const hasApartments = apartmentOptions.length > 0;

  const form = Forms.useAppForm({
    defaultValues: DEFAULT_VALUES,
    onSubmit: async ({ value, formApi }) => {
      const residentAssignment =
        value.role === 'resident' && Predicate.isNotNull(value.apartmentId)
          ? {
              apartmentId: value.apartmentId,
              occupancyType: value.occupancyType,
            }
          : {};

      const result = await invite({
        name: value.name.trim(),
        email: value.email.trim(),
        role: value.role,
        ...residentAssignment,
      });

      if (Result.isFailure(result)) {
        toast.error(formatUnitAccessError(result.failure));
        return;
      }

      toast.success(`Invitaste a ${value.name.trim()}.`);
      formApi.reset();
      onOpenChange(false);
    },
  });

  return (
    <CommonUI.FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Invitar"
      description="La persona recibe una Invitación en su correo y debe aceptarla para activar su Membresía."
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
                Invitar
              </Button>
            </>
          )}
        </form.Subscribe>
      }
    >
      <div className="flex flex-col gap-4 py-2">
        <form.AppField
          name="name"
          validators={{
            onSubmit: validateWith(
              MembershipsShared.InviteMembershipDto.fields.name,
              'Escribe el nombre.'
            ),
          }}
        >
          {(field) => (
            <field.InputField
              label="Nombre"
              maxLength={MembershipsShared.NAME_MAX_LENGTH}
              autoComplete="off"
              required
            />
          )}
        </form.AppField>
        <form.AppField
          name="email"
          validators={{
            onSubmit: validateWith(
              MembershipsShared.InviteMembershipDto.fields.email,
              'Escribe un correo válido.'
            ),
          }}
        >
          {(field) => (
            <field.InputField
              label="Correo"
              type="email"
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              required
            />
          )}
        </form.AppField>
        <form.AppField name="role">
          {(field) => (
            <OptionSelect
              label="Rol"
              value={field.state.value}
              options={ROLE_OPTIONS}
              onValueChange={field.handleChange}
            />
          )}
        </form.AppField>
        <form.Subscribe selector={(state) => state.values.role === 'resident'}>
          {(isResident) =>
            isResident ? (
              <>
                <form.AppField
                  name="apartmentId"
                  validators={{
                    onSubmit: ({ value, fieldApi }) => {
                      const isMissingApartment =
                        fieldApi.form.getFieldValue('role') === 'resident' &&
                        Predicate.isNull(value);

                      return isMissingApartment
                        ? 'Elige un Apartamento.'
                        : undefined;
                    },
                  }}
                >
                  {(field) => (
                    <OptionSelect
                      label="Apartamento"
                      value={field.state.value}
                      options={apartmentOptions}
                      onValueChange={field.handleChange}
                      placeholder={
                        hasApartments
                          ? 'Elige un Apartamento'
                          : 'Primero crea un Apartamento'
                      }
                      disabled={!hasApartments}
                      error={Forms.getFieldErrorMessage(field)}
                    />
                  )}
                </form.AppField>
                <form.AppField name="occupancyType">
                  {(field) => (
                    <OptionSelect
                      label="Tipo de ocupación"
                      value={field.state.value}
                      options={OCCUPANCY_TYPE_OPTIONS}
                      onValueChange={field.handleChange}
                    />
                  )}
                </form.AppField>
              </>
            ) : null
          }
        </form.Subscribe>
      </div>
    </CommonUI.FormDialog>
  );
}
