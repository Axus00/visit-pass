import { describe, expect, it } from 'vitest';

import {
  CreateApartmentsFormStandardSchema,
  InviteMemberFormStandardSchema,
  UpdateUnitFormStandardSchema,
} from './admin.models';

type Issue = {
  readonly message: string;
  readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }>;
};

async function issuesOf(
  schema: {
    readonly '~standard': {
      readonly validate: (
        value: unknown
      ) =>
        | { readonly issues?: ReadonlyArray<Issue> }
        | Promise<{ readonly issues?: ReadonlyArray<Issue> }>;
    };
  },
  value: unknown
) {
  const result = await schema['~standard'].validate(value);

  return (result.issues ?? []).map((issue) => ({
    path: (issue.path ?? [])
      .map((segment) =>
        typeof segment === 'object' ? String(segment.key) : String(segment)
      )
      .join('.'),
    message: issue.message,
  }));
}

const validInvite = {
  email: 'porteria@example.org',
  displayName: '',
  role: 'porter',
  apartmentId: '',
  occupancyType: 'owner',
};

describe('InviteMemberFormStandardSchema', () => {
  it('accepts a Portero without Apartamento', async () => {
    expect(await issuesOf(InviteMemberFormStandardSchema, validInvite)).toEqual(
      []
    );
  });

  it('reports an invalid email on the email field', async () => {
    expect(
      await issuesOf(InviteMemberFormStandardSchema, {
        ...validInvite,
        email: 'porteria',
      })
    ).toEqual([
      {
        path: 'email',
        message: 'Escribe un correo válido, como nombre@correo.com.',
      },
    ]);
  });

  it('asks a Residente for an Apartamento on that field', async () => {
    expect(
      await issuesOf(InviteMemberFormStandardSchema, {
        ...validInvite,
        role: 'resident',
      })
    ).toEqual([
      { path: 'apartmentId', message: 'Elige el Apartamento del Residente.' },
    ]);
  });
});

describe('CreateApartmentsFormStandardSchema', () => {
  it('shows the parser message on the numbers field', async () => {
    expect(
      await issuesOf(CreateApartmentsFormStandardSchema, {
        tower: '1',
        numbers: '104-101',
      })
    ).toEqual([
      {
        path: 'numbers',
        message:
          'El rango 104-101 está al revés: escribe primero el número menor.',
      },
    ]);
  });
});

describe('UpdateUnitFormStandardSchema', () => {
  it('keeps the Visita retention within the allowed months', async () => {
    const issues = await issuesOf(UpdateUnitFormStandardSchema, {
      name: 'Torres del Parque',
      city: 'Bogotá',
      visitRetentionMonths: 36,
    });

    expect(issues).toEqual([
      { path: 'visitRetentionMonths', message: 'Elige entre 3 y 24 meses.' },
    ]);
  });
});
