import * as SystemFields from '@confect/core/SystemFields';
import * as Schema from 'effect/Schema';

const ActiveUser = Schema.Struct({
  /**
   * WorkOS id
   */
  externalId: Schema.String,
  identityTokenIdentifier: Schema.String,
  email: Schema.String,
  emailVerified: Schema.Boolean,
  firstName: Schema.NullOr(Schema.String),
  lastName: Schema.NullOr(Schema.String),
  profilePictureUrl: Schema.NullOr(Schema.String),
  lastSignInAt: Schema.NullOr(Schema.Finite),
  locale: Schema.NullOr(Schema.String),
  externalCreatedAt: Schema.Finite,
  externalUpdatedAt: Schema.Finite,
});

/** A deleted User keeps only its id, so rows that reference it stay valid (ADR 0010). */
const DeletedUser = Schema.Struct({
  deletedAt: Schema.Finite,
});

export const UsersTableSchema = Schema.Union([ActiveUser, DeletedUser]);

export const UsersDocSchema = SystemFields.extendWithSystemFields(
  'users',
  UsersTableSchema
);

export const ActiveUsersDocSchema = SystemFields.extendWithSystemFields(
  'users',
  ActiveUser
);

export type ActiveUsersDoc = typeof ActiveUsersDocSchema.Type;
