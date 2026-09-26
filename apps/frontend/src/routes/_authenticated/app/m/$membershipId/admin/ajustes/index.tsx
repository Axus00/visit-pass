import { useMutation, useQuery } from '@confect/react';
import { createFileRoute } from '@tanstack/react-router';
import * as Result from 'effect/Result';
import { FileLock2, Scale } from 'lucide-react';

import refs from '@repo/backend/refs';
import * as ResidentialUnitsShared from '@repo/backend/shared/residentialUnits';
import * as VisitsShared from '@repo/backend/shared/visits';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Skeleton,
  toast,
} from '@repo/ui';

import * as Forms from '#modules/forms';
import * as VisitPass from '#modules/visit-pass';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';
import * as AdminRouteFeat from '#routes/_authenticated/app/m/$membershipId/admin/-feat';

export const Route = createFileRoute(
  '/_authenticated/app/m/$membershipId/admin/ajustes/'
)({
  component: AdminSettingsPage,
});

/** How long unused Pases are kept after they expire; set by the backend. */
const UNUSED_PASS_PURGE_DAYS = 30;

/** The unit's name, city and Visita retention, plus its Habeas Data notice. */
function AdminSettingsPage() {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const now = VisitPass.useNow();
  const overview = useQuery(refs.public.residentialUnits.getOverview, {
    membershipId: membership.membershipId,
    now,
  });

  return (
    <>
      <VisitPass.PageHeader
        eyebrow="Unidad residencial"
        title="Ajustes"
        description="Los datos de la unidad y cuánto tiempo se guardan los datos de los Visitantes."
      />
      <AdminRouteFeat.QueryView
        result={overview}
        loading={<Skeleton className="h-96" />}
      >
        {(value) => (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <UnitSettingsForm unit={value.unit} />
            <PrivacyCard unitName={value.unit.name} />
          </div>
        )}
      </AdminRouteFeat.QueryView>
    </>
  );
}

function UnitSettingsForm({
  unit,
}: {
  unit: AdminRouteFeat.UnitOverview['unit'];
}) {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const update = useMutation(refs.public.residentialUnits.update);

  const form = Forms.useAppForm({
    defaultValues: {
      name: unit.name,
      city: unit.city,
      visitRetentionMonths: unit.visitRetentionMonths,
    },
    validators: { onSubmit: AdminRouteFeat.UpdateUnitFormStandardSchema },
    onSubmit: async ({ value }) => {
      const result = await update({
        membershipId: membership.membershipId,
        name: value.name.trim(),
        city: value.city.trim(),
        visitRetentionMonths: value.visitRetentionMonths,
      });

      if (Result.isFailure(result)) {
        toast.error(VisitPass.describeBackendError(result.failure));
        return;
      }

      toast.success('Ajustes guardados.');
    },
  });

  return (
    <Card>
      <form
        className="contents"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <CardHeader>
          <CardTitle className="text-lg">Datos de la unidad</CardTitle>
          <CardDescription>
            Zona horaria: {unit.timeZone}. Los Pases y los Turnos se leen en
            esta hora.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form.AppField name="name">
            {(field) => (
              <field.InputField
                label="Nombre"
                maxLength={ResidentialUnitsShared.NAME_MAX_LENGTH}
                required
              />
            )}
          </form.AppField>
          <form.AppField name="city">
            {(field) => (
              <field.InputField
                label="Ciudad"
                maxLength={ResidentialUnitsShared.NAME_MAX_LENGTH}
                required
              />
            )}
          </form.AppField>
          <form.AppField name="visitRetentionMonths">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <field.InputField
                  label="Retención de Visitas (meses)"
                  min={ResidentialUnitsShared.MIN_VISIT_RETENTION_MONTHS}
                  max={ResidentialUnitsShared.MAX_VISIT_RETENTION_MONTHS}
                  step={1}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Entre {ResidentialUnitsShared.MIN_VISIT_RETENTION_MONTHS} y{' '}
                  {ResidentialUnitsShared.MAX_VISIT_RETENTION_MONTHS} meses.
                  Después, el nombre, el documento y la placa del Visitante se
                  anonimizan.
                </p>
              </div>
            )}
          </form.AppField>
        </CardContent>
        <CardFooter className="justify-end border-t">
          <form.Subscribe
            selector={(state) =>
              [state.isSubmitting, state.isDefaultValue] as const
            }
          >
            {([isSubmitting, isUnchanged]) => (
              <Button type="submit" disabled={isSubmitting || isUnchanged}>
                Guardar cambios
              </Button>
            )}
          </form.Subscribe>
        </CardFooter>
      </form>
    </Card>
  );
}

function PrivacyCard({ unitName }: { unitName: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Scale className="size-5 text-primary" aria-hidden="true" />
          Habeas Data
        </CardTitle>
        <CardDescription>
          La unidad es la Responsable del tratamiento de los datos de los
          Visitantes (Ley 1581 de 2012); Visit Pass es el Encargado.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        <ul className="flex list-disc flex-col gap-2 pl-5 text-muted-foreground">
          <li>
            Las Visitas se anonimizan cuando pasa el periodo de retención: se
            conserva que hubo una Visita, pero no quién fue.
          </li>
          <li>
            Los Pases que nunca se usaron se eliminan {UNUSED_PASS_PURGE_DAYS}{' '}
            días después de vencer.
          </li>
          <li>
            Los Residentes solo ven el documento de sus Visitantes parcialmente
            oculto.
          </li>
        </ul>
        <div className="flex flex-col gap-2 rounded-xl border bg-muted/40 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            <FileLock2 className="size-4" aria-hidden="true" />
            Aviso de privacidad
          </p>
          <p className="leading-relaxed">
            {VisitsShared.privacyNoticeText(unitName)}
          </p>
          <p className="text-xs text-muted-foreground">
            Portería lo muestra al Visitante antes de pedirle sus datos, y
            también aparece en cada Pase.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
