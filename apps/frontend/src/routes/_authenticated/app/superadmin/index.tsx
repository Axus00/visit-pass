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
  MapPin,
  ShieldAlert,
  UserCog,
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

const nameField = (emptyMessage: string) =>
  Schema.String.check(
    Schema.makeFilter((text: string) => text.trim().length > 0 || emptyMessage),
    Schema.isMaxLength(ResidentialUnitsShared.NAME_MAX_LENGTH, {
      message: `Usa máximo ${ResidentialUnitsShared.NAME_MAX_LENGTH} caracteres.`,
    })
  );

const CreateUnitFormStandardSchema = Forms.toSpanishStandardSchema(
  Schema.Struct({
    name: nameField('Escribe el nombre de la Unidad residencial.'),
    city: nameField('Escribe la ciudad.'),
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
  })
);

type PlatformUnitSummary = Ref.Returns<
  typeof refs.public.residentialUnits.listAll
>[number];

type CreatedUnit = {
  readonly name: string;
  readonly administratorEmail: string;
};

/** Platform page: every Unidad residencial, and creating one with its first Administrador. */
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
            <div className="flex items-start gap-2 pl-13 text-sm">
              <UserCog
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              {unit.administratorEmails.length === 0 ? (
                <span className="text-muted-foreground">
                  Sin Administradores activos
                </span>
              ) : (
                <span className="min-w-0 break-all text-muted-foreground">
                  {unit.administratorEmails.join(', ')}
                </span>
              )}
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function CreateUnitCard() {
  const create = useMutation(refs.public.residentialUnits.create);
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

      const result = await create({
        name,
        city: value.city.trim(),
        administratorEmail,
        administratorName:
          administratorName.length > 0 ? administratorName : undefined,
      });

      if (Result.isFailure(result)) {
        toast.error(VisitPass.describeBackendError(result.failure));
        return;
      }

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
          {createdUnit ? (
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
                creada. Su Administrador entra iniciando sesión (o creando su
                cuenta) con{' '}
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
