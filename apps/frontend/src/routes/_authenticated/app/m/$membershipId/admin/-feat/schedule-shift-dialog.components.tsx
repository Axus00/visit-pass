import { useEffect } from 'react';

import { QueryResult, useMutation, useQuery } from '@confect/react';
import * as Predicate from 'effect/Predicate';
import * as Result from 'effect/Result';
import { MoonStar } from 'lucide-react';

import refs from '@repo/backend/refs';
import { Button, toast } from '@repo/ui';

import * as CommonUI from '#modules/common-ui';
import * as Forms from '#modules/forms';
import * as VisitPass from '#modules/visit-pass';
import * as AppRouteFeat from '#routes/_authenticated/app/-feat';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';

import { ScheduleShiftFormStandardSchema } from './admin.models';
import { SelectField } from './select-field.components';
import { toShiftWindow } from './zoned-time.utils';

/**
 * Plans a Turno for an active Portero. Times are read in the unit's time zone,
 * and an end at or before the start means the Turno ends the next day.
 */
export function ScheduleShiftDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const timeZone = membership.residentialUnitTimeZone;
  const schedule = useMutation(refs.public.shifts.schedule);
  const membershipsResult = useQuery(
    refs.public.memberships.listForUnit,
    open ? { membershipId: membership.membershipId } : 'skip'
  );
  const porters = QueryResult.isSuccess(membershipsResult)
    ? membershipsResult.value.filter(
        (candidate) =>
          candidate.role === 'porter' && candidate.status === 'active'
      )
    : [];

  const form = Forms.useAppForm({
    defaultValues: {
      porterMembershipId: '',
      date: VisitPass.todayIn(timeZone),
      startTime: '06:00',
      endTime: '18:00',
    },
    validators: { onSubmit: ScheduleShiftFormStandardSchema },
    onSubmit: async ({ value, formApi }) => {
      const porter = porters.find(
        (candidate) => candidate._id === value.porterMembershipId
      );

      if (Predicate.isUndefined(porter)) {
        toast.error('Elige un Portero activo.');
        return;
      }

      const shiftWindow = toShiftWindow({ ...value, timeZone });
      const result = await AppRouteFeat.settleMutation(
        schedule({
          membershipId: membership.membershipId,
          porterMembershipId: porter._id,
          plannedStart: shiftWindow.plannedStart,
          plannedEnd: shiftWindow.plannedEnd,
        })
      );

      if (Result.isFailure(result)) {
        toast.error(VisitPass.describeBackendError(result.failure));
        return;
      }

      toast.success(
        `Turno programado para ${porter.name ?? porter.email}: ${VisitPass.formatDateTime(shiftWindow.plannedStart, timeZone)} – ${VisitPass.formatDateTime(shiftWindow.plannedEnd, timeZone)}`
      );
      formApi.reset();
      onOpenChange(false);
    },
  });

  // Each opening starts from today, even if the page stayed open past midnight.
  useEffect(() => {
    if (!open) return;

    form.setFieldValue('date', VisitPass.todayIn(timeZone), {
      dontUpdateMeta: true,
      dontValidate: true,
    });
  }, [form, open, timeZone]);

  const close = () => {
    form.reset();
    onOpenChange(false);
  };

  const hasNoPorters =
    QueryResult.isSuccess(membershipsResult) && porters.length === 0;

  return (
    <CommonUI.FormDialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title="Programar turno"
      description={`El Portero marca el inicio y el fin reales desde portería. Horas en la zona horaria de la unidad (${timeZone}).`}
      onSubmit={() => void form.handleSubmit()}
      actions={
        <>
          <Button type="button" variant="outline" onClick={close}>
            Cancelar
          </Button>
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" disabled={isSubmitting || hasNoPorters}>
                Programar
              </Button>
            )}
          </form.Subscribe>
        </>
      }
    >
      <div className="flex flex-col gap-4 pb-1">
        <form.AppField name="porterMembershipId">
          {(field) => (
            <SelectField
              label="Portero"
              required
              placeholder={
                QueryResult.isSuccess(membershipsResult)
                  ? 'Elige el Portero'
                  : 'Cargando…'
              }
              value={field.state.value}
              onValueChange={field.handleChange}
              options={porters.map((porter) => ({
                value: porter._id as string,
                label: porter.name ?? porter.email,
              }))}
              error={Forms.getFieldErrorMessage(field)}
              description={
                hasNoPorters
                  ? 'No hay Porteros activos. Invita uno en Membresías; aparece aquí cuando inicie sesión.'
                  : undefined
              }
            />
          )}
        </form.AppField>
        <form.AppField name="date">
          {(field) => <field.InputField label="Fecha" type="date" required />}
        </form.AppField>
        <div className="grid grid-cols-2 gap-4">
          <form.AppField name="startTime">
            {(field) => (
              <field.InputField label="Hora de inicio" type="time" required />
            )}
          </form.AppField>
          <form.AppField name="endTime">
            {(field) => (
              <field.InputField label="Hora de fin" type="time" required />
            )}
          </form.AppField>
        </div>
        <form.Subscribe selector={(state) => state.values}>
          {(values) => {
            const isComplete =
              values.date.length > 0 &&
              values.startTime.length > 0 &&
              values.endTime.length > 0;

            if (!isComplete) return null;

            const shiftWindow = toShiftWindow({ ...values, timeZone });
            const hours =
              (shiftWindow.plannedEnd - shiftWindow.plannedStart) / 3_600_000;

            return (
              <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                {shiftWindow.endsNextDay ? (
                  <MoonStar
                    className="mt-px size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                ) : null}
                <span>
                  Del{' '}
                  {VisitPass.formatDateTime(shiftWindow.plannedStart, timeZone)}{' '}
                  al{' '}
                  {VisitPass.formatDateTime(shiftWindow.plannedEnd, timeZone)} (
                  {VisitPass.formatDuration(
                    shiftWindow.plannedEnd - shiftWindow.plannedStart
                  )}
                  )
                  {shiftWindow.endsNextDay
                    ? ', termina al día siguiente'
                    : null}
                  .{hours > 12 ? ' Revisa que el Turno sea tan largo.' : null}
                </span>
              </p>
            );
          }}
        </form.Subscribe>
      </div>
    </CommonUI.FormDialog>
  );
}
