import { QueryResult, useMutation, useQuery } from '@confect/react';
import * as Result from 'effect/Result';

import refs from '@repo/backend/refs';
import { Button, toast } from '@repo/ui';

import * as CommonUI from '#modules/common-ui';
import * as Forms from '#modules/forms';
import * as VisitPass from '#modules/visit-pass';
import * as AppRouteFeat from '#routes/_authenticated/app/-feat';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';

import { InviteMemberFormStandardSchema } from './admin.models';
import { copyAppLink } from './app-link.utils';
import { SelectField } from './select-field.components';

const ROLE_OPTIONS = [
  { value: 'resident', label: VisitPass.ROLE_LABELS.resident },
  { value: 'porter', label: VisitPass.ROLE_LABELS.porter },
  { value: 'administrator', label: VisitPass.ROLE_LABELS.administrator },
] as const;

const OCCUPANCY_OPTIONS = [
  { value: 'owner', label: VisitPass.OCCUPANCY_LABELS.owner },
  { value: 'tenant', label: VisitPass.OCCUPANCY_LABELS.tenant },
] as const;

const ROLE_HINTS: Record<VisitPass.Role, string> = {
  resident:
    'El Residente autoriza Visitas para su Apartamento. El Tipo de ocupación no cambia sus permisos.',
  porter:
    'El Portero registra Ingresos y Salidas durante su Turno. Prográmale Turnos en Turnos.',
  administrator:
    'El Administrador tiene los mismos permisos que tú en esta Unidad residencial.',
};

const DEFAULT_VALUES = {
  email: '',
  displayName: '',
  role: 'resident' as VisitPass.Role,
  apartmentId: '',
  occupancyType: 'owner' as VisitPass.OccupancyType,
};

/**
 * Invites a Residente, Portero or Administrador by email. The Membresía stays
 * pending until that email signs in, so the success toast offers the app link
 * to share.
 */
export function InviteMemberDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const invite = useMutation(refs.public.memberships.invite);
  const apartmentsResult = useQuery(
    refs.public.residentialUnits.listApartments,
    open ? { membershipId: membership.membershipId } : 'skip'
  );
  const apartments = QueryResult.isSuccess(apartmentsResult)
    ? apartmentsResult.value
    : [];

  const form = Forms.useAppForm({
    defaultValues: DEFAULT_VALUES,
    validators: { onSubmit: InviteMemberFormStandardSchema },
    onSubmit: async ({ value, formApi }) => {
      const isResident = value.role === 'resident';
      const apartment = apartments.find(
        (candidate) => candidate._id === value.apartmentId
      );
      const displayName = value.displayName.trim();
      const email = value.email.trim();

      const result = await AppRouteFeat.settleMutation(
        invite({
          membershipId: membership.membershipId,
          email,
          displayName: displayName.length > 0 ? displayName : undefined,
          role: value.role,
          apartmentId: isResident ? apartment?._id : undefined,
          occupancyType: isResident ? value.occupancyType : undefined,
        })
      );

      if (Result.isFailure(result)) {
        toast.error(VisitPass.describeBackendError(result.failure));
        return;
      }

      toast.success(
        `Invitaste a ${email} como ${VisitPass.ROLE_LABELS[value.role]}`,
        {
          description:
            'Aún no enviamos correos: comparte el enlace de la app. La Membresía se activa cuando esa persona inicie sesión con este correo.',
          action: { label: 'Copiar enlace', onClick: () => void copyAppLink() },
          duration: 10_000,
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
      title="Invitar persona"
      description="Registra el correo con el que la persona iniciará sesión. Si ya tiene cuenta, su Membresía queda activa de inmediato."
      onSubmit={() => void form.handleSubmit()}
      actions={
        <>
          <Button type="button" variant="outline" onClick={close}>
            Cancelar
          </Button>
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" disabled={isSubmitting}>
                Invitar
              </Button>
            )}
          </form.Subscribe>
        </>
      }
    >
      <div className="flex flex-col gap-4 pb-1">
        <form.AppField name="email">
          {(field) => (
            <field.InputField
              label="Correo"
              type="email"
              autoComplete="off"
              placeholder="nombre@correo.com"
              required
              autoFocus
            />
          )}
        </form.AppField>
        <form.AppField name="displayName">
          {(field) => (
            <field.InputField
              label="Nombre"
              optional
              placeholder="Se muestra hasta que la persona inicie sesión"
              maxLength={120}
            />
          )}
        </form.AppField>
        <form.AppField name="role">
          {(field) => (
            <SelectField
              label="Rol"
              required
              value={field.state.value}
              onValueChange={field.handleChange}
              options={ROLE_OPTIONS}
              error={Forms.getFieldErrorMessage(field)}
            />
          )}
        </form.AppField>
        <form.Subscribe selector={(state) => state.values.role}>
          {(role) =>
            role === 'resident' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <form.AppField name="apartmentId">
                  {(field) => (
                    <SelectField
                      label="Apartamento"
                      required
                      placeholder={
                        QueryResult.isSuccess(apartmentsResult)
                          ? 'Elige el Apartamento'
                          : 'Cargando…'
                      }
                      value={field.state.value}
                      onValueChange={field.handleChange}
                      options={apartments.map((apartment) => ({
                        value: apartment._id as string,
                        label: apartment.label,
                      }))}
                      error={Forms.getFieldErrorMessage(field)}
                      description={
                        QueryResult.isSuccess(apartmentsResult) &&
                        apartments.length === 0
                          ? 'Aún no hay Apartamentos: agrégalos primero en Apartamentos.'
                          : undefined
                      }
                    />
                  )}
                </form.AppField>
                <form.AppField name="occupancyType">
                  {(field) => (
                    <SelectField
                      label="Tipo de ocupación"
                      required
                      value={field.state.value}
                      onValueChange={field.handleChange}
                      options={OCCUPANCY_OPTIONS}
                      error={Forms.getFieldErrorMessage(field)}
                    />
                  )}
                </form.AppField>
              </div>
            ) : null
          }
        </form.Subscribe>
        <form.Subscribe selector={(state) => state.values.role}>
          {(role) => (
            <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              {ROLE_HINTS[role]}
            </p>
          )}
        </form.Subscribe>
      </div>
    </CommonUI.FormDialog>
  );
}
