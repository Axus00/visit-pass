import { FunctionSpec, GroupSpec } from '@confect/core';
import * as Schema from 'effect/Schema';

import { Id } from './_generated/id';
import RequireUserIdentity from './middleware/RequireUserIdentity.spec';
import * as AuthorizationsDomain from './modules/authorizations/domain';
import * as MembershipsDomain from './modules/memberships/domain';

export default GroupSpec.make()
  // -*******************************************************************************-
  // Public
  // -*******************************************************************************-
  .addFunction(
    /** Residente: authorizes Visitantes to the Membresía's Apartamento, one Pase each. */
    FunctionSpec.publicMutation({
      name: 'create',
      args: () => ({
        membershipId: Id('memberships'),
        ...AuthorizationsDomain.CreateAuthorizationDto.fields,
      }),
      returns: () => AuthorizationsDomain.CreatedAuthorization,
      error: () =>
        Schema.Union([
          MembershipsDomain.AccessDeniedError,
          AuthorizationsDomain.InvalidAuthorizationError,
          AuthorizationsDomain.FavoriteNotFoundError,
        ]),
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /** Residente: the Apartamento's latest Autorizaciones with their Pases. */
    FunctionSpec.publicQuery({
      name: 'listForApartment',
      args: () => ({ membershipId: Id('memberships') }),
      returns: () => Schema.Array(AuthorizationsDomain.AuthorizationSummary),
      error: () => MembershipsDomain.AccessDeniedError,
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /** Residente: cancels the Autorización and every Pase in it. */
    FunctionSpec.publicMutation({
      name: 'cancel',
      args: () => ({
        membershipId: Id('memberships'),
        authorizationId: Id('authorizations'),
      }),
      returns: () => Schema.Null,
      error: () =>
        Schema.Union([
          MembershipsDomain.AccessDeniedError,
          AuthorizationsDomain.AuthorizationNotFoundError,
        ]),
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /**
     * Residente: replaces an active Pase with a new one (new token, same
     * Visitante). The old Pase becomes `replaced`, so its QR is rejected with
     * that reason. Returns the new Pase.
     */
    FunctionSpec.publicMutation({
      name: 'regeneratePass',
      args: () => ({
        membershipId: Id('memberships'),
        passId: Id('passes'),
      }),
      returns: () => AuthorizationsDomain.PassSummary,
      error: () =>
        Schema.Union([
          MembershipsDomain.AccessDeniedError,
          AuthorizationsDomain.PassNotFoundError,
          AuthorizationsDomain.PassNotActiveError,
        ]),
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    /** Anyone with the link: the Pase page at `/p/$token`. Null for unknown tokens. */
    FunctionSpec.publicQuery({
      name: 'getPublicPass',
      args: () => ({ token: Schema.String }),
      returns: () => Schema.NullOr(AuthorizationsDomain.PublicPass),
      error: () => Schema.Never,
    })
  )
  .addFunction(
    /** Residente: their Favoritos, most recently authorized first. */
    FunctionSpec.publicQuery({
      name: 'listFavorites',
      args: () => ({ membershipId: Id('memberships') }),
      returns: () => Schema.Array(AuthorizationsDomain.FavoriteSummary),
      error: () => MembershipsDomain.AccessDeniedError,
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: 'createFavorite',
      args: () => ({
        membershipId: Id('memberships'),
        ...AuthorizationsDomain.CreateFavoriteDto.fields,
      }),
      returns: () => Id('favorites'),
      error: () => MembershipsDomain.AccessDeniedError,
    }).middleware(RequireUserIdentity)
  )
  .addFunction(
    FunctionSpec.publicMutation({
      name: 'removeFavorite',
      args: () => ({
        membershipId: Id('memberships'),
        favoriteId: Id('favorites'),
      }),
      returns: () => Schema.Null,
      error: () =>
        Schema.Union([
          MembershipsDomain.AccessDeniedError,
          AuthorizationsDomain.FavoriteNotFoundError,
        ]),
    }).middleware(RequireUserIdentity)
  );
