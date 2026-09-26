import { QueryResult, useMutation, useQuery } from '@confect/react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';
import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import { Info, UserCheck } from 'lucide-react';

import refs from '@repo/backend/refs';
import * as AuthorizationsShared from '@repo/backend/shared/authorizations';
import * as VisitsShared from '@repo/backend/shared/visits';
import {
  Badge,
  Button,
  Card,
  Label,
  ToggleGroup,
  ToggleGroupItem,
  toast,
} from '@repo/ui';

import * as Forms from '#modules/forms';
import * as VisitPass from '#modules/visit-pass';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';

import * as PorteriaRouteFeat from '../-feat';

/** Search values may arrive as numbers (a document typed into the URL). */
const SearchText = Schema.optionalKey(
  Schema.UndefinedOr(Schema.Union([Schema.String, Schema.Finite])).pipe(
    Schema.catchDecoding(() => Effect.succeedSome(undefined))
  )
);

const ManualEntrySearchSchema = Schema.Struct({
  token: SearchText,
  name: SearchText,
  document: SearchText,
  apartmentId: SearchText,
  visitType: Schema.optionalKey(
    Schema.UndefinedOr(VisitsShared.VisitType).pipe(
      Schema.catchDecoding(() => Effect.succeedSome(undefined))
    )
  ),
  reason: Schema.optionalKey(
    Schema.UndefinedOr(AuthorizationsShared.PassRejectionReason).pipe(
      Schema.catchDecoding(() => Effect.succeedSome(undefined))
    )
  ),
});

const toText = (value: string | number | undefined) =>
  Predicate.isUndefined(value) ? undefined : String(value);

/** Every key is optional, so plain links to the Registro manual need no search. */
type ManualEntrySearch = {
  token?: string;
  name?: string;
  document?: string;
  apartmentId?: string;
  visitType?: VisitPass.VisitType;
  reason?: VisitPass.PassRejectionReason;
};

export const Route = createFileRoute(
  '/_authenticated/app/m/$membershipId/porteria/registro/'
)({
  /** Prefill from a rejected Pase the Portero decides to admit anyway. */
  validateSearch: (search): ManualEntrySearch => {
    // oxlint-disable-next-line effecttsgo/schema-sync -- TanStack Router requires synchronous search validation.
    const decoded = Schema.decodeSync(ManualEntrySearchSchema)(search);

    return {
      token: toText(decoded.token),
      name: toText(decoded.name),
      document: toText(decoded.document),
      apartmentId: toText(decoded.apartmentId),
      visitType: decoded.visitType,
      reason: decoded.reason,
    };
  },
  component: PorteriaManualEntryPage,
});

const RegisterManualEntryFormStandardSchema = Forms.toSpanishStandardSchema(
  Schema.Struct({
    ...Struct.omit(VisitsShared.RegisterManualEntryDto.fields, [
      'apartmentId',
      'plate',
      'rejectedPassToken',
    ]),
    apartmentId: Schema.String.check(
      Schema.isMinLength(1, { message: 'Elige el Apartamento destino.' })
    ),
    plate: Schema.Trim.check(Schema.isMaxLength(VisitsShared.PLATE_MAX_LENGTH)),
  })
);

const VISIT_TYPES = ['temporary', 'event', 'service'] as const;

function PorteriaManualEntryPage() {
  const search = Route.useSearch();
  const { membershipId } = MembershipRouteFeat.useCurrentMembership();
  const navigate = useNavigate();
  const shiftState = PorteriaRouteFeat.usePorterShiftState();
  const apartments = useQuery(refs.public.residentialUnits.listApartments, {
    membershipId,
  });
  const registerManualEntry = useMutation(
    refs.public.visits.registerManualEntry
  );
  const apartmentList = QueryResult.isSuccess(apartments)
    ? apartments.value
    : null;
  const hasNoOpenShift =
    Predicate.isNotNull(shiftState) && Predicate.isNull(shiftState.openShift);
  const forcedReason = search.reason;

  const goHome = () =>
    void navigate({
      to: '/app/m/$membershipId/porteria',
      params: { membershipId },
    });

  const form = Forms.useAppForm({
    defaultValues: {
      visitorName: search.name ?? '',
      visitorDocument: search.document ?? '',
      apartmentId: search.apartmentId ?? '',
      visitType: search.visitType ?? ('temporary' as VisitPass.VisitType),
      plate: '',
    },
    validators: { onSubmit: RegisterManualEntryFormStandardSchema },
    onSubmit: async ({ value }) => {
      const apartment = apartmentList?.find(
        (candidate) => candidate._id === value.apartmentId
      );
      if (Predicate.isUndefined(apartment)) {
        toast.error('Elige un Apartamento de la lista.');
        return;
      }

      const plate = value.plate.trim().toUpperCase();
      const result = await PorteriaRouteFeat.settleMutation(
        registerManualEntry({
          membershipId,
          visitorName: value.visitorName.trim(),
          visitorDocument: value.visitorDocument.trim(),
          apartmentId: apartment._id,
          visitType: value.visitType,
          plate: plate.length > 0 ? plate : undefined,
          rejectedPassToken: search.token,
        })
      );

      if (Result.isFailure(result)) {
        toast.error(VisitPass.describeBackendError(result.failure));
        return;
      }

      toast.success('Ingreso registrado', {
        description: `${value.visitorName.trim()} · ${apartment.label}`,
      });
      goHome();
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        {Predicate.isUndefined(forcedReason) ? (
          <Badge variant="destructive" className="h-6 px-2.5 uppercase">
            Sin Autorización previa
          </Badge>
        ) : (
          <Badge
            variant="warning"
            className="h-auto min-h-6 px-2.5 whitespace-normal"
          >
            Ingreso forzado · {VisitPass.PASS_REJECTION_LABELS[forcedReason]}
          </Badge>
        )}
        <VisitPass.PageHeader
          title="Registro manual"
          description="Registra el Ingreso de un Visitante que llega sin un Pase válido."
        />
      </div>

      {hasNoOpenShift ? <PorteriaRouteFeat.StartShiftBanner /> : null}

      <Card className="gap-0 px-5 py-6 sm:px-6">
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.AppField name="visitorName">
            {(field) => (
              <field.InputField
                label="Nombre completo"
                placeholder="Ej. Juan Pérez"
                className="h-12 text-base"
                autoComplete="off"
                maxLength={AuthorizationsShared.VISITOR_NAME_MAX_LENGTH}
                required
              />
            )}
          </form.AppField>
          <form.AppField name="visitorDocument">
            {(field) => (
              <field.InputField
                label="Documento de identidad"
                placeholder="Número de documento"
                className="h-12 text-base"
                autoComplete="off"
                maxLength={AuthorizationsShared.VISITOR_DOCUMENT_MAX_LENGTH}
                required
              />
            )}
          </form.AppField>
          <form.AppField name="apartmentId">
            {(field) => (
              <PorteriaRouteFeat.ApartmentCombobox
                apartments={apartmentList}
                apartmentId={field.state.value}
                onApartmentIdChange={field.handleChange}
                onBlur={field.handleBlur}
                error={Forms.getFieldErrorMessage(field)}
              />
            )}
          </form.AppField>
          <form.AppField name="visitType">
            {(field) => (
              <div
                className="flex flex-col gap-1.5"
                role="group"
                aria-labelledby="visit-type-label"
              >
                <Label id="visit-type-label">Tipo de visita</Label>
                <ToggleGroup
                  variant="outline"
                  spacing={0}
                  className="grid w-full grid-cols-3"
                  value={[field.state.value]}
                  onValueChange={(values: Array<unknown>) => {
                    const nextType = VISIT_TYPES.find(
                      (visitType) => visitType === values[0]
                    );
                    if (Predicate.isNotUndefined(nextType))
                      field.handleChange(nextType);
                  }}
                >
                  {VISIT_TYPES.map((visitType) => (
                    <ToggleGroupItem
                      key={visitType}
                      value={visitType}
                      className="h-12 text-base data-pressed:bg-primary data-pressed:text-primary-foreground"
                    >
                      {VisitPass.VISIT_TYPE_LABELS[visitType]}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            )}
          </form.AppField>
          <div className="rounded-xl border border-dashed border-primary/30 bg-secondary/60 p-4">
            <form.AppField name="plate">
              {(field) => (
                <field.InputField
                  label="Placa (opcional)"
                  placeholder="ABC123"
                  className="h-12 bg-card text-base tracking-widest uppercase placeholder:tracking-normal placeholder:normal-case"
                  autoComplete="off"
                  maxLength={VisitsShared.PLATE_MAX_LENGTH}
                />
              )}
            </form.AppField>
          </div>

          <PorteriaRouteFeat.PrivacyNotice />

          <div className="flex flex-col gap-2">
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button
                  type="submit"
                  className="h-14 bg-navy text-lg font-semibold text-navy-foreground hover:bg-navy/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/85"
                  disabled={isSubmitting || hasNoOpenShift}
                >
                  <UserCheck data-icon="inline-start" className="size-5" />
                  Registrar ingreso
                </Button>
              )}
            </form.Subscribe>
            <Button
              type="button"
              variant="outline"
              className="h-12 text-base"
              onClick={goHome}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Card>

      <p className="flex gap-3 rounded-xl bg-secondary px-4 py-3 text-sm text-secondary-foreground">
        <Info
          className="mt-0.5 size-5 shrink-0 text-primary"
          aria-hidden="true"
        />
        Verifica físicamente el documento antes de registrar. El Residente verá
        el ingreso en tiempo real.
      </p>
    </div>
  );
}
