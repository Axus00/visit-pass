import type * as Ref from '@confect/core/Ref';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import * as Predicate from 'effect/Predicate';
import * as Schema from 'effect/Schema';

import type refs from '@repo/backend/refs';
import * as MembershipsShared from '@repo/backend/shared/memberships';

export type MyAccess = NonNullable<
  Ref.Returns<typeof refs.public.memberships.myAccess>
>;
export type AccessibleUnit = MyAccess['units'][number];
export type PendingInvitation = MyAccess['pendingInvitations'][number];
export type ResidentialUnitId = AccessibleUnit['residentialUnit']['_id'];
export type GroupingWord = AccessibleUnit['residentialUnit']['groupingWord'];

export type MembershipSummary = Ref.Returns<
  typeof refs.public.memberships.list
>[number];
export type MembershipId = MembershipSummary['_id'];
export type Role = MembershipSummary['role'];
export type OccupancyType = NonNullable<MembershipSummary['occupancyType']>;
export type InvitationDelivery = MembershipSummary['invitationDelivery'];

export type Apartment = Ref.Returns<typeof refs.public.apartments.list>[number];
export type ApartmentLabel = NonNullable<MembershipSummary['apartment']>;
export type ApartmentRemoval = Ref.Returns<
  typeof refs.public.apartments.remove
>;

/**
 * Every typed failure the `/app` screen can receive from the backend. Functions
 * whose failures another member already covers are left out.
 */
export type UnitAccessError =
  | Ref.Error<typeof refs.public.memberships.myAccess>
  | Ref.Error<typeof refs.public.memberships.accept>
  | Ref.Error<typeof refs.public.memberships.reject>
  | Ref.Error<typeof refs.public.memberships.ensureUnitAccess>
  | Ref.Error<typeof refs.public.memberships.list>
  | Ref.Error<typeof refs.public.memberships.invite>
  | Ref.Error<typeof refs.public.memberships.resendInvitation>
  | Ref.Error<typeof refs.public.memberships.revoke>
  | Ref.Error<typeof refs.public.apartments.list>
  | Ref.Error<typeof refs.public.apartments.create>
  | Ref.Error<typeof refs.public.apartments.rename>
  | Ref.Error<typeof refs.public.apartments.remove>;

export function formatRole(role: Role): string {
  return Match.value(role).pipe(
    Match.when('resident', () => 'Residente'),
    Match.when('gatekeeper', () => 'Portero'),
    Match.when('administrator', () => 'Administrador'),
    Match.exhaustive
  );
}

export function formatOccupancyType(occupancyType: OccupancyType): string {
  return Match.value(occupancyType).pipe(
    Match.when('owner', () => 'Propietario'),
    Match.when('tenant', () => 'Arrendatario'),
    Match.exhaustive
  );
}

export const OCCUPANCY_TYPE_OPTIONS = MembershipsShared.OCCUPANCY_TYPES.map(
  (occupancyType) => ({
    value: occupancyType,
    label: formatOccupancyType(occupancyType),
  })
);

/** The unit's word for its Agrupaciones as a label: "Torre", "Manzana". */
export function formatGroupingWord(
  groupingWord: NonNullable<GroupingWord>
): string {
  return `${groupingWord.charAt(0).toUpperCase()}${groupingWord.slice(1)}`;
}

/**
 * "Torre 3 · Apto 501", or "Apto 501" without an Agrupación. An Agrupación
 * left over from before the unit dropped its word shows by its own name.
 */
export function formatApartmentLabel(
  apartment: ApartmentLabel,
  groupingWord: GroupingWord
): string {
  const number = `Apto ${apartment.number}`;

  if (Predicate.isNull(apartment.grouping)) return number;

  const grouping = Predicate.isNull(groupingWord)
    ? apartment.grouping
    : `${formatGroupingWord(groupingWord)} ${apartment.grouping}`;

  return `${grouping} · ${number}`;
}

/** "Residente · Torre 3 · Apto 501"; a Rol without Apartamento stands alone. */
export function formatRoleWithApartment(
  membership: {
    readonly role: Role;
    readonly apartment: ApartmentLabel | null;
  },
  groupingWord: GroupingWord
): string {
  const role = formatRole(membership.role);

  return Predicate.isNull(membership.apartment)
    ? role
    : `${role} · ${formatApartmentLabel(membership.apartment, groupingWord)}`;
}

/** A revoked Membresía keeps its name in the list, marked as such. */
export function formatMemberName(
  membership: Pick<MembershipSummary, 'name' | 'status'>
): string {
  return membership.status === 'revoked'
    ? `${membership.name} (revocada)`
    : membership.name;
}

/** A Membresía pendiente past its date reads as "Caducada": no job flips its status. */
export function formatMembershipStatus(
  membership: Pick<MembershipSummary, 'status' | 'invitationExpiresAt'>,
  now: number
): string {
  return Match.value(membership.status).pipe(
    Match.when('pending', () =>
      MembershipsShared.isInvitationExpired(membership, now)
        ? 'Caducada'
        : 'Pendiente'
    ),
    Match.when('active', () => 'Activa'),
    Match.when('revoked', () => 'Revocada'),
    Match.when('rejected', () => 'Rechazada'),
    Match.when('withdrawn', () => 'Retirada'),
    Match.exhaustive
  );
}

export function formatInvitationDelivery(delivery: InvitationDelivery): string {
  return Match.value(delivery).pipe(
    Match.when('sending', () => 'Enviando Invitación…'),
    Match.when('sent', () => 'Invitación enviada'),
    Match.when(
      'skipped',
      () => 'Sin correo: este entorno no envía Invitaciones'
    ),
    Match.when('failed', () => 'No se pudo enviar la Invitación'),
    Match.exhaustive
  );
}

/** Says whether removing deleted the Apartamento or only deactivated it. */
export function formatApartmentRemoval(removal: ApartmentRemoval): string {
  return Match.value(removal).pipe(
    Match.when('deleted', () => 'Apartamento eliminado.'),
    Match.when(
      'deactivated',
      () =>
        'El Apartamento ya tuvo Membresías, así que se desactivó en lugar de eliminarse.'
    ),
    Match.exhaustive
  );
}

/** The message a toast shows for a typed backend failure. */
export function formatUnitAccessError(
  error: Pick<UnitAccessError, '_tag'>
): string {
  return Match.value(error._tag).pipe(
    Match.when(
      'Authentication/NoUserIdentityFoundError',
      () => 'Tu sesión terminó. Vuelve a iniciar sesión.'
    ),
    Match.when(
      'ExternalProviderError',
      () =>
        'No pudimos comunicarnos con el servicio de acceso. Inténtalo de nuevo.'
    ),
    Match.when(
      'Memberships/NoActiveResidentialUnitError',
      () =>
        'Tu sesión no está en una Unidad residencial. Vuelve a entrar a la unidad.'
    ),
    Match.when(
      'Memberships/MembershipRequiredError',
      () => 'No tienes una Membresía activa en esta Unidad residencial.'
    ),
    Match.when(
      'Memberships/RoleRequiredError',
      () => 'Solo un Administrador de la Unidad residencial puede hacer esto.'
    ),
    Match.when(
      'Memberships/MembershipNotFoundError',
      () => 'Esa Membresía ya no existe en esta Unidad residencial.'
    ),
    Match.when(
      'Memberships/InvalidResidentAssignmentError',
      () =>
        'Un Residente necesita un Apartamento y un Tipo de ocupación; los demás Roles no los llevan.'
    ),
    Match.when(
      'Memberships/DuplicateMembershipError',
      () =>
        'Ese correo ya tiene una Membresía pendiente o activa con ese Rol y Apartamento.'
    ),
    Match.when(
      'Memberships/InvitationNotFoundError',
      () => 'Esta Invitación ya no está disponible.'
    ),
    Match.when(
      'Memberships/InvitationExpiredError',
      () =>
        'La Invitación caducó. Pide a la administración de la unidad que la reenvíe.'
    ),
    Match.when(
      'Memberships/EmailNotVerifiedError',
      () => 'Verifica tu correo antes de aceptar la Invitación.'
    ),
    Match.when(
      'Memberships/CannotRevokeOwnMembershipError',
      () => 'No puedes revocar tu propia Membresía de Administrador.'
    ),
    Match.when(
      'Apartments/ApartmentNotFoundError',
      () => 'Ese Apartamento ya no existe en esta Unidad residencial.'
    ),
    Match.when(
      'Apartments/DuplicateApartmentError',
      () => 'Ya existe un Apartamento con esa Agrupación y ese número.'
    ),
    Match.when(
      'Apartments/ApartmentInUseError',
      () =>
        'El Apartamento tiene Membresías pendientes o activas. Revócalas o retíralas antes de eliminarlo.'
    ),
    Match.exhaustive
  );
}

/**
 * A form field validator that accepts what the backend's own schema decodes,
 * and answers `message` otherwise.
 */
export function validateWith(
  schema: Schema.Decoder<unknown>,
  message: string
): (field: { readonly value: unknown }) => string | undefined {
  const decode = Schema.decodeUnknownOption(schema);

  return ({ value }) => (Option.isSome(decode(value)) ? undefined : message);
}
