import { useState } from 'react';

import type * as Ref from '@confect/core/Ref';
import { QueryResult, useMutation, useQuery } from '@confect/react';
import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@workos-inc/authkit-react';
import * as Predicate from 'effect/Predicate';
import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import {
  ArrowLeft,
  Building2,
  CircleCheck,
  Crown,
  MailX,
  MapPin,
  ShieldAlert,
  UserCog,
  UserPlus,
} from 'lucide-react';

import refs from '@repo/backend/refs';
import * as MembershipsShared from '@repo/backend/shared/memberships';
import * as ResidentialUnitsShared from '@repo/backend/shared/residentialUnits';
import {
  Badge,
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

import * as Authentication from '#modules/authentication';
import * as CommonUI from '#modules/common-ui';
import * as Forms from '#modules/forms';
import * as VisitPass from '#modules/visit-pass';
import * as AppRouteFeat from '#routes/_authenticated/app/-feat';

export const Route = createFileRoute('/_authenticated/app/superadmin/')({
  component: SuperadminPage,
});

const ADMINISTRATOR_FIELDS = {
  administratorEmail: Schema.String.check(
    Schema.makeFilter(
      (email: string) =>
        MembershipsShared.isPlausibleEmailAddress(email.trim()) ||
        'Escribe un correo válido, como nombre@correo.com.'
    )
  ),
  administratorName: Schema.String.check(
    Schema.isMaxLength(ResidentialUnitsShared.NAME_MAX_LENGTH, {
      message: `Usa máximo ${ResidentialUnitsShared.NAME_MAX_LENGTH} caracteres.`,
    })
  ),
};

const CreateUnitFormStandardSchema = Forms.toSpanishStandardSchema(
  Schema.Struct({
    name: Schema.String.check(
      Schema.makeFilter(
        (text: string) =>
          text.trim().length > 0 ||
          'Escribe el nombre de la Unidad residencial.'
      ),
      Schema.isMaxLength(ResidentialUnitsShared.NAME_MAX_LENGTH, {
        message: `Usa máximo ${ResidentialUnitsShared.NAME_MAX_LENGTH} caracteres.`,
      })
    ),
    city: Schema.String.check(
      Schema.makeFilter(
        (text: string) => text.trim().length > 0 || 'Escribe la ciudad.'
      ),
      Schema.isMaxLength(ResidentialUnitsShared.NAME_MAX_LENGTH, {
        message: `Usa máximo ${ResidentialUnitsShared.NAME_MAX_LENGTH} caracteres.`,
      })
    ),
    ...ADMINISTRATOR_FIELDS,
  })
);

const InviteAdministratorFormStandardSchema = Forms.toSpanishStandardSchema(
  Schema.Struct(ADMINISTRATOR_FIELDS)
);

type PlatformUnitSummary = Ref.Returns<
  typeof refs.public.residentialUnits.listAll
>[number];

type AdministratorStatus =
  PlatformUnitSummary['administrators'][number]['status'];

/** `listAll` leaves revoked Administradores out; the label only covers the type. */
const ADMINISTRATOR_STATUS_BADGES = {
  active: { label: 'Activo', variant: 'success' },
  pending: { label: 'Pendiente', variant: 'warning' },
  revoked: { label: 'Revocado', variant: 'outline' },
} as const satisfies Record<
  AdministratorStatus,
  { label: string; variant: string }
>;

type CreatedUnit = {
  readonly name: string;
  readonly administratorEmail: string;
};

/** Platform page: every Unidad residencial, creating one with its first Administrador, and fixing its Administrador invitations. */
function SuperadminPage() {
  const { user } = useAuth();
  const access = AppRouteFeat.useMyAccess();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="bg-navy text-navy-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-6">
          <AppRouteFeat.BrandMark subtitle="Superadmin" />
          <Authentication.UserAvatarMenu user={user} />
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
        <CommonUI.NavLinkButton
          to="/app"
          variant="ghost"
          className="-ml-2 w-fit"
        >
          <ArrowLeft aria-hidden="true" />
          Mis Membresías
        </CommonUI.NavLinkButton>
        <SuperadminGate access={access} />
      </main>
    </div>
  );
}

function SuperadminGate({
  access,
}: {
  access: ReturnType<typeof AppRouteFeat.useMyAccess>;
}) {
  if (Predicate.isNull(access)) return <Skeleton className="h-64" />;
  if (access.isSuperadmin) return <SuperadminContent />;

  return (
    <VisitPass.EmptyState
      icon={ShieldAlert}
      title="Esta página es solo para Superadmin"
      description="El rol de Superadmin se asigna a nivel de plataforma. Si administras una Unidad residencial, entra desde tus Membresías."
      action={
        <CommonUI.NavLinkButton to="/app" variant="default">
          Ver mis Membresías
        </CommonUI.NavLinkButton>
      }
    />
  );
}

function SuperadminContent() {
  const units = useQuery(refs.public.residentialUnits.listAll, {});

  return (
    <>
      <VisitPass.PageHeader
        eyebrow={
          <span className="flex items-center gap-1.5">
            <Crown className="size-3.5" aria-hidden="true" />
            Plataforma
          </span>
        }
        title="Unidades residenciales"
        description="Crea cada Unidad residencial con su primer Administrador. Desde ahí, la administración da de alta sus Apartamentos, Residentes y Porteros."
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section
          aria-label="Unidades residenciales"
          className="flex flex-col gap-3"
        >
          <UnitList units={units} />
        </section>
        <CreateUnitCard />
      </div>
    </>
  );
}

function UnitList({
  units: unitsResult,
}: {
  units: ReturnType<
    typeof useQuery<typeof refs.public.residentialUnits.listAll>
  >;
}) {
  if (QueryResult.isLoading(unitsResult))
    return (
      <>
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </>
    );

  if (QueryResult.isFailure(unitsResult))
    return (
      <VisitPass.EmptyState
        icon={ShieldAlert}
        title="No pudimos cargar las Unidades residenciales"
        description={VisitPass.describeBackendError(unitsResult.error)}
      />
    );

  const units: ReadonlyArray<PlatformUnitSummary> = unitsResult.value;

  if (units.length === 0)
    return (
      <VisitPass.EmptyState
        icon={Building2}
        title="Aún no hay Unidades residenciales"
        description="Crea la primera con el formulario."
      />
    );

  return (
    <ul className="flex flex-col gap-3">
      {units.map((unit) => (
        <li key={unit._id}>
          <Card className="gap-3 px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                <Building2 className="size-5" aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="truncate font-semibold">{unit.name}</p>
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  {unit.city}
                </p>
              </div>
              <Badge variant="secondary">
                {unit.apartmentCount === 1
                  ? '1 Apartamento'
                  : `${unit.apartmentCount} Apartamentos`}
              </Badge>
            </div>
            <div className="flex flex-col gap-2 pl-13 text-sm">
              {unit.administrators.length === 0 ? (
                <p className="text-muted-foreground">
                  Sin Administradores ni invitaciones
                </p>
              ) : (
                <ul
                  aria-label={`Administradores de ${unit.name}`}
                  className="flex flex-col gap-1"
                >
                  {unit.administrators.map(({ email, status }) => (
                    <li
                      key={email}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <UserCog
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 break-all text-muted-foreground">
                        {email}
                      </span>
                      <Badge
                        variant={ADMINISTRATOR_STATUS_BADGES[status].variant}
                      >
                        {ADMINISTRATOR_STATUS_BADGES[status].label}
                      </Badge>
                      {status === 'pending' ? (
                        <RevokeAdministratorInvitationDialog
                          unit={unit}
                          email={email}
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              <InviteAdministratorButton unit={unit} />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

/** "Invitar Administrador" button that opens the invitation form for `unit`. */
function InviteAdministratorButton({ unit }: { unit: PlatformUnitSummary }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => setOpen(true)}
      >
        <UserPlus aria-hidden="true" />
        Invitar Administrador
      </Button>
      <InviteAdministratorDialog
        unit={unit}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

/**
 * Invites another Administrador to `unit` by email, e.g. when the first one's
 * email was mistyped. The Membresía stays pending until that email signs in.
 */
function InviteAdministratorDialog({
  unit,
  open,
  onOpenChange,
}: {
  unit: PlatformUnitSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const inviteAdministrator = useMutation(
    refs.public.residentialUnits.inviteAdministrator
  );
  const activatePending = useMutation(refs.public.memberships.activatePending);

  const form = Forms.useAppForm({
    defaultValues: { administratorEmail: '', administratorName: '' },
    validators: { onSubmit: InviteAdministratorFormStandardSchema },
    onSubmit: async ({ value, formApi }) => {
      const administratorName = value.administratorName.trim();
      const administratorEmail = value.administratorEmail.trim();

      const result = await AppRouteFeat.settleMutation(
        inviteAdministrator({
          residentialUnitId: unit._id,
          administratorEmail,
          administratorName:
            administratorName.length > 0 ? administratorName : undefined,
        })
      );

      if (Result.isFailure(result)) {
        toast.error(VisitPass.describeBackendError(result.failure));
        return;
      }

      toast.success(
        `Invitación creada: se activará cuando ${administratorEmail} inicie sesión.`,
        {
          description: `Administrador de ${unit.name}. Aún no enviamos correos: comparte el enlace de la app, ${window.location.origin}.`,
          duration: 10_000,
        }
      );
      // Invitations stay pending until the invitee's own session claims them;
      // when the Superadmin invited their own email, claim it right away.
      void AppRouteFeat.settleMutation(activatePending({}));
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
      title="Invitar Administrador"
      description={`Registra el correo con el que el Administrador de ${unit.name} iniciará sesión. La invitación queda pendiente hasta que inicie sesión con ese correo, aunque ya tenga cuenta.`}
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
        <form.AppField name="administratorEmail">
          {(field) => (
            <field.InputField
              label="Correo"
              type="email"
              autoComplete="off"
              placeholder="administracion@correo.com"
              required
              autoFocus
            />
          )}
        </form.AppField>
        <form.AppField name="administratorName">
          {(field) => (
            <field.InputField
              label="Nombre"
              optional
              placeholder="Se muestra hasta que inicie sesión"
              maxLength={ResidentialUnitsShared.NAME_MAX_LENGTH}
            />
          )}
        </form.AppField>
      </div>
    </CommonUI.FormDialog>
  );
}

/**
 * "Retirar invitación" button that confirms, then withdraws the pending
 * Administrador invitation for `email`. An accepted one is left untouched.
 */
function RevokeAdministratorInvitationDialog({
  unit,
  email,
}: {
  unit: PlatformUnitSummary;
  email: string;
}) {
  const revokeInvitation = useMutation(
    refs.public.residentialUnits.revokeAdministratorInvitation
  );

  const handleRevoke = async () => {
    const result = await AppRouteFeat.settleMutation(
      revokeInvitation({ residentialUnitId: unit._id, email })
    );

    if (Result.isFailure(result)) {
      const isNotPending = Predicate.isTagged(
        result.failure,
        'Memberships/MembershipNotFoundError'
      );

      toast.error(
        isNotPending
          ? `${email} ya aceptó su invitación o no tiene una pendiente; no se retiró.`
          : VisitPass.describeBackendError(result.failure)
      );
      return false;
    }

    toast.success(`Retiraste la invitación de ${email}.`);
    return true;
  };

  return (
    <AppRouteFeat.ConfirmActionDialog
      trigger={<Button variant="ghost" size="xs" />}
      triggerContent={
        <>
          <MailX aria-hidden="true" />
          Retirar invitación
        </>
      }
      title="¿Retirar esta invitación?"
      description={`${email} ya no podrá entrar como Administrador de ${unit.name}. Si inicia sesión antes de que confirmes, la invitación ya estará activa y no se retira.`}
      confirmLabel="Retirar invitación"
      destructive
      onConfirm={handleRevoke}
    />
  );
}

function CreateUnitCard() {
  const create = useMutation(refs.public.residentialUnits.create);
  const activatePending = useMutation(refs.public.memberships.activatePending);
  const [createdUnit, setCreatedUnit] = useState<CreatedUnit | null>(null);

  const form = Forms.useAppForm({
    defaultValues: {
      name: '',
      city: '',
      administratorEmail: '',
      administratorName: '',
    },
    validators: { onSubmit: CreateUnitFormStandardSchema },
    onSubmit: async ({ value, formApi }) => {
      const administratorName = value.administratorName.trim();
      const administratorEmail = value.administratorEmail.trim();
      const name = value.name.trim();

      const result = await AppRouteFeat.settleMutation(
        create({
          name,
          city: value.city.trim(),
          administratorEmail,
          administratorName:
            administratorName.length > 0 ? administratorName : undefined,
        })
      );

      if (Result.isFailure(result)) {
        toast.error(VisitPass.describeBackendError(result.failure));
        return;
      }

      // The first Administrador stays pending until their own session claims
      // it; when the Superadmin used their own email, claim it right away.
      void AppRouteFeat.settleMutation(activatePending({}));
      toast.success(`Creaste ${name}.`);
      setCreatedUnit({ name, administratorEmail });
      formApi.reset();
    },
  });

  return (
    <Card className="lg:sticky lg:top-6">
      <form
        className="contents"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <CardHeader>
          <CardTitle className="text-lg">Crear Unidad residencial</CardTitle>
          <CardDescription>
            La zona horaria es la de Colombia (America/Bogota).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {Predicate.isNotNull(createdUnit) ? (
            <div
              role="status"
              className="flex gap-3 rounded-xl border border-success/30 bg-success/10 p-3 text-sm"
            >
              <CircleCheck
                className="mt-0.5 size-4 shrink-0 text-success"
                aria-hidden="true"
              />
              <p>
                <span className="font-medium">{createdUnit.name}</span> quedó
                creada. La invitación de su Administrador queda pendiente hasta
                que inicie sesión (o cree su cuenta) con{' '}
                <span className="font-medium break-all">
                  {createdUnit.administratorEmail}
                </span>
                . Aún no enviamos correos: compártele el enlace{' '}
                <span className="font-medium break-all">
                  {window.location.origin}
                </span>
                .
              </p>
            </div>
          ) : null}
          <form.AppField name="name">
            {(field) => (
              <field.InputField
                label="Nombre"
                placeholder="Ej.: Conjunto Torres del Parque"
                maxLength={ResidentialUnitsShared.NAME_MAX_LENGTH}
                required
              />
            )}
          </form.AppField>
          <form.AppField name="city">
            {(field) => (
              <field.InputField
                label="Ciudad"
                placeholder="Ej.: Bogotá"
                maxLength={ResidentialUnitsShared.NAME_MAX_LENGTH}
                required
              />
            )}
          </form.AppField>
          <form.AppField name="administratorEmail">
            {(field) => (
              <field.InputField
                label="Correo del primer Administrador"
                type="email"
                autoComplete="off"
                placeholder="administracion@correo.com"
                required
              />
            )}
          </form.AppField>
          <form.AppField name="administratorName">
            {(field) => (
              <field.InputField
                label="Nombre del Administrador"
                optional
                maxLength={ResidentialUnitsShared.NAME_MAX_LENGTH}
              />
            )}
          </form.AppField>
        </CardContent>
        <CardFooter className="justify-end border-t">
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" disabled={isSubmitting}>
                <Building2 aria-hidden="true" />
                Crear Unidad residencial
              </Button>
            )}
          </form.Subscribe>
        </CardFooter>
      </form>
    </Card>
  );
}
