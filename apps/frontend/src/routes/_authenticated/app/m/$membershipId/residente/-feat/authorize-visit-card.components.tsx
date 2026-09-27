import { useId } from 'react';

import * as Predicate from 'effect/Predicate';
import {
  BriefcaseBusiness,
  PartyPopper,
  Plus,
  ShieldCheck,
  Timer,
  Trash2,
} from 'lucide-react';

import * as AuthorizationsShared from '@repo/backend/shared/authorizations';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Switch,
  ToggleGroup,
  ToggleGroupItem,
} from '@repo/ui';

import * as Forms from '#modules/forms';
import * as VisitPass from '#modules/visit-pass';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';

import {
  type SharedAuthorization,
  WEEKDAY_TOGGLE_ORDER,
  buildCreateAuthorizationPayload,
  defaultAuthorizeFormValues,
  validateAuthorizeForm,
} from './authorize.models';
import { RelationshipSelect } from './favorites.components';
import {
  useCreateAuthorization,
  useCreateFavorite,
} from './use-authorize.hooks';

/** The first input of the authorize form, focused by "Generar Pase". */
export const AUTHORIZE_FIRST_INPUT_ID = 'autorizar-visita-primer-campo';

const AUTHORIZATION_TYPES = [
  { type: 'temporary', icon: Timer, hint: 'Un día, un ingreso' },
  { type: 'event', icon: PartyPopper, hint: 'Varios Visitantes' },
  { type: 'service', icon: BriefcaseBusiness, hint: 'Días recurrentes' },
] as const satisfies ReadonlyArray<{
  type: VisitPass.VisitType;
  icon: unknown;
  hint: string;
}>;

/**
 * "Autorizar visita": Temporal, Evento or Servicio. Hands the created Pases to
 * `onShared` for the share sheet.
 */
export function AuthorizeVisitCard({
  onShared,
}: {
  onShared: (shared: SharedAuthorization) => void;
}) {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const timeZone = membership.residentialUnitTimeZone;
  const createAuthorization = useCreateAuthorization();
  const createFavorite = useCreateFavorite();
  const saveFavoriteId = useId();
  const relationshipId = useId();
  const weekdaysLabelId = useId();
  const today = VisitPass.todayIn(timeZone);

  const form = Forms.useAppForm({
    defaultValues: defaultAuthorizeFormValues(today),
    validators: {
      onSubmit: ({ value }) =>
        validateAuthorizeForm(value, VisitPass.todayIn(timeZone)),
    },
    onSubmit: async ({ value, formApi }) => {
      const visitorName = value.visitorName.trim();
      const visitorDocument = value.visitorDocument.trim();
      const shouldSaveFavorite = value.saveAsFavorite && value.type !== 'event';
      const savedFavorite = value.savedFavorite;
      const canReuseSavedFavorite =
        Predicate.isNotNull(savedFavorite) &&
        savedFavorite.visitorName === visitorName &&
        savedFavorite.visitorDocument === visitorDocument;

      const favoriteId = await (async () => {
        if (!shouldSaveFavorite) return undefined;
        if (canReuseSavedFavorite) return savedFavorite.id;

        const createdId = await createFavorite({
          visitorName,
          visitorDocument: visitorDocument || undefined,
          relationship: value.favoriteRelationship,
        });
        if (Predicate.isNull(createdId)) return null;

        formApi.setFieldValue(
          'savedFavorite',
          { id: createdId, visitorName, visitorDocument },
          { dontUpdateMeta: true, dontValidate: true }
        );
        return createdId;
      })();

      if (Predicate.isNull(favoriteId)) return;

      const shared = await createAuthorization(
        buildCreateAuthorizationPayload(value, favoriteId)
      );

      if (Predicate.isNull(shared)) return;

      formApi.reset(
        defaultAuthorizeFormValues(VisitPass.todayIn(timeZone), value.type)
      );
      onShared(shared);
    },
  });

  return (
    <Card className="gap-5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
          Autorizar visita
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-5"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.Field name="type">
            {(field) => (
              <ToggleGroup
                aria-label="Tipo de autorización"
                value={[field.state.value]}
                onValueChange={(next) => {
                  const nextType = AUTHORIZATION_TYPES.find(
                    (option) => option.type === next[0]
                  )?.type;
                  if (Predicate.isNotUndefined(nextType))
                    field.handleChange(nextType);
                }}
                className="grid w-full grid-cols-3"
              >
                {AUTHORIZATION_TYPES.map(({ type, icon: Icon, hint }) => (
                  <ToggleGroupItem
                    key={type}
                    value={type}
                    variant="outline"
                    className="h-auto flex-col gap-1 rounded-xl px-2 py-3 aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary"
                  >
                    <Icon className="size-5" aria-hidden="true" />
                    <span className="font-semibold">
                      {VisitPass.VISIT_TYPE_LABELS[type]}
                    </span>
                    <span className="hidden text-[0.7rem] font-normal text-muted-foreground sm:block">
                      {hint}
                    </span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
          </form.Field>

          <form.Subscribe selector={(state) => state.values.type}>
            {(type) => (
              <div className="flex flex-col gap-4">
                {type === 'event' ? (
                  <form.AppField name="eventName">
                    {(field) => (
                      <field.InputField
                        id={AUTHORIZE_FIRST_INPUT_ID}
                        label="Nombre del evento (opcional)"
                        placeholder="Ej. Cumpleaños de Sofía"
                        maxLength={AuthorizationsShared.EVENT_NAME_MAX_LENGTH}
                        autoComplete="off"
                      />
                    )}
                  </form.AppField>
                ) : (
                  <form.AppField name="visitorName">
                    {(field) => (
                      <field.InputField
                        id={AUTHORIZE_FIRST_INPUT_ID}
                        label="Nombre del Visitante"
                        placeholder="Ej. Juan Pérez"
                        maxLength={AuthorizationsShared.VISITOR_NAME_MAX_LENGTH}
                        autoComplete="off"
                        required
                      />
                    )}
                  </form.AppField>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <form.AppField name="startDate">
                    {(field) => (
                      <field.InputField
                        type="date"
                        label={type === 'service' ? 'Fecha de inicio' : 'Fecha'}
                        min={today}
                        required
                      />
                    )}
                  </form.AppField>
                  {type === 'service' ? (
                    <form.AppField name="endDate">
                      {(field) => (
                        <field.InputField
                          type="date"
                          label="Fecha final"
                          min={today}
                          required
                        />
                      )}
                    </form.AppField>
                  ) : null}
                  {type === 'temporary' ? (
                    <form.AppField name="visitorDocument">
                      {(field) => (
                        <field.InputField
                          label="Documento (opcional)"
                          placeholder="Cédula o pasaporte"
                          maxLength={
                            AuthorizationsShared.VISITOR_DOCUMENT_MAX_LENGTH
                          }
                          autoComplete="off"
                        />
                      )}
                    </form.AppField>
                  ) : null}
                </div>

                {type === 'service' ? (
                  <>
                    <form.AppField name="visitorDocument">
                      {(field) => (
                        <field.InputField
                          label="Documento (opcional)"
                          placeholder="Cédula o pasaporte"
                          maxLength={
                            AuthorizationsShared.VISITOR_DOCUMENT_MAX_LENGTH
                          }
                          autoComplete="off"
                        />
                      )}
                    </form.AppField>
                    <form.Field name="weekdays">
                      {(field) => {
                        const error = Forms.getFieldErrorMessage(field);

                        return (
                          <div className="flex flex-col gap-1.5">
                            <p
                              className="text-sm font-medium"
                              id={weekdaysLabelId}
                            >
                              Días permitidos
                            </p>
                            <ToggleGroup
                              multiple
                              aria-labelledby={weekdaysLabelId}
                              value={field.state.value.map(String)}
                              onValueChange={(next) =>
                                field.handleChange(next.map(Number))
                              }
                              className="grid w-full grid-cols-7 gap-1"
                            >
                              {WEEKDAY_TOGGLE_ORDER.map((weekday) => (
                                <ToggleGroupItem
                                  key={weekday}
                                  value={String(weekday)}
                                  variant="outline"
                                  size="sm"
                                  aria-label={VisitPass.WEEKDAY_LABELS[weekday]}
                                  className="min-w-0 rounded-lg px-0 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                                >
                                  {VisitPass.WEEKDAY_SHORT_LABELS[weekday]}
                                </ToggleGroupItem>
                              ))}
                            </ToggleGroup>
                            {error ? (
                              <p className="text-xs text-destructive">
                                {error}
                              </p>
                            ) : null}
                          </div>
                        );
                      }}
                    </form.Field>
                  </>
                ) : null}

                {type === 'event' ? (
                  <form.Field name="guests" mode="array">
                    {(guestsField) => {
                      const guestCount = guestsField.state.value.length;
                      const isFull =
                        guestCount >= AuthorizationsShared.MAX_EVENT_VISITORS;

                      return (
                        <fieldset className="flex flex-col gap-3">
                          <legend className="mb-1 text-sm font-medium">
                            Lista de Visitantes{' '}
                            <span className="font-normal text-muted-foreground tabular-nums">
                              ({guestCount}/
                              {AuthorizationsShared.MAX_EVENT_VISITORS})
                            </span>
                          </legend>
                          {guestsField.state.value.map((_, index) => (
                            <div
                              // Rows have no identity of their own; TanStack Form addresses them by index.
                              key={index}
                              className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-xl border p-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:border-0 sm:p-0"
                            >
                              <form.AppField name={`guests[${index}].name`}>
                                {(field) => (
                                  <field.InputField
                                    label={`Visitante ${index + 1}`}
                                    placeholder="Nombre completo"
                                    maxLength={
                                      AuthorizationsShared.VISITOR_NAME_MAX_LENGTH
                                    }
                                    autoComplete="off"
                                    required
                                  />
                                )}
                              </form.AppField>
                              <div className="col-start-1 row-start-2 sm:col-start-auto sm:row-start-auto">
                                <form.AppField
                                  name={`guests[${index}].document`}
                                >
                                  {(field) => (
                                    <field.InputField
                                      label="Documento (opcional)"
                                      placeholder="Cédula"
                                      maxLength={
                                        AuthorizationsShared.VISITOR_DOCUMENT_MAX_LENGTH
                                      }
                                      autoComplete="off"
                                    />
                                  )}
                                </form.AppField>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="col-start-2 row-start-1 mt-5.5 sm:col-start-auto sm:row-start-auto"
                                aria-label={`Quitar Visitante ${index + 1}`}
                                disabled={guestCount === 1}
                                onClick={() => guestsField.removeValue(index)}
                              >
                                <Trash2 />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            className="border-dashed"
                            disabled={isFull}
                            onClick={() =>
                              guestsField.pushValue({ name: '', document: '' })
                            }
                          >
                            <Plus data-icon="inline-start" />
                            Agregar Visitante
                          </Button>
                        </fieldset>
                      );
                    }}
                  </form.Field>
                ) : null}

                {type === 'event' ? null : (
                  <div className="flex flex-col gap-3 rounded-xl bg-muted/50 px-3 py-3">
                    <form.Field name="saveAsFavorite">
                      {(field) => (
                        <div className="flex items-center justify-between gap-3">
                          <Label htmlFor={saveFavoriteId}>
                            Guardar como Favorito
                          </Label>
                          <Switch
                            id={saveFavoriteId}
                            checked={field.state.value}
                            onCheckedChange={(checked) =>
                              field.handleChange(checked)
                            }
                          />
                        </div>
                      )}
                    </form.Field>
                    <form.Subscribe
                      selector={(state) => state.values.saveAsFavorite}
                    >
                      {(saveAsFavorite) =>
                        saveAsFavorite ? (
                          <form.Field name="favoriteRelationship">
                            {(field) => (
                              <div className="flex flex-col gap-1.5">
                                <Label htmlFor={relationshipId}>
                                  Parentesco
                                </Label>
                                <RelationshipSelect
                                  id={relationshipId}
                                  value={field.state.value}
                                  onValueChange={field.handleChange}
                                />
                              </div>
                            )}
                          </form.Field>
                        ) : null
                      }
                    </form.Subscribe>
                  </div>
                )}
              </div>
            )}
          </form.Subscribe>

          <div className="flex gap-2">
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button
                  type="submit"
                  size="lg"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creando Pase…' : 'Crear Autorización'}
                </Button>
              )}
            </form.Subscribe>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() =>
                form.reset(
                  defaultAuthorizeFormValues(
                    VisitPass.todayIn(timeZone),
                    form.state.values.type
                  )
                )
              }
            >
              Limpiar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
