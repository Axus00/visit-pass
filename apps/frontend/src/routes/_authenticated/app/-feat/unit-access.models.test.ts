import { describe, expect, it } from 'vitest';

import * as ApartmentsShared from '@repo/backend/shared/apartments';
import * as MembershipsShared from '@repo/backend/shared/memberships';

import {
  formatApartmentLabel,
  formatMemberName,
  formatMembershipStatus,
  formatRoleWithApartment,
  validateWith,
} from './unit-access.models';

describe('formatApartmentLabel', () => {
  it("names the Agrupación with the unit's own word", () => {
    expect(
      formatApartmentLabel({ grouping: '3', number: '501' }, 'torre')
    ).toBe('Torre 3 · Apto 501');
    expect(
      formatApartmentLabel({ grouping: 'B', number: '12' }, 'manzana')
    ).toBe('Manzana B · Apto 12');
  });

  it('shows only the number for an Apartamento without Agrupación', () => {
    expect(formatApartmentLabel({ grouping: null, number: '501' }, null)).toBe(
      'Apto 501'
    );
    expect(
      formatApartmentLabel({ grouping: null, number: '501' }, 'torre')
    ).toBe('Apto 501');
  });

  it('keeps an Agrupación distinguishable after the unit drops its word', () => {
    expect(formatApartmentLabel({ grouping: '3', number: '501' }, null)).toBe(
      '3 · Apto 501'
    );
  });
});

describe('formatRoleWithApartment', () => {
  it('appends the Apartamento only to a Rol that has one', () => {
    expect(
      formatRoleWithApartment(
        { role: 'resident', apartment: { grouping: '3', number: '501' } },
        'torre'
      )
    ).toBe('Residente · Torre 3 · Apto 501');
    expect(
      formatRoleWithApartment({ role: 'gatekeeper', apartment: null }, 'torre')
    ).toBe('Portero');
  });
});

describe('formatMembershipStatus', () => {
  const NOW = 1_000_000;

  it('reads a Membresía pendiente as Caducada from its expiry onwards', () => {
    expect(
      formatMembershipStatus(
        { status: 'pending', invitationExpiresAt: NOW + 1 },
        NOW
      )
    ).toBe('Pendiente');
    expect(
      formatMembershipStatus(
        { status: 'pending', invitationExpiresAt: NOW },
        NOW
      )
    ).toBe('Caducada');
  });

  it('ignores the Invitación date once the Membresía was answered', () => {
    expect(
      formatMembershipStatus(
        { status: 'active', invitationExpiresAt: NOW - 1 },
        NOW
      )
    ).toBe('Activa');
    expect(
      formatMembershipStatus(
        { status: 'rejected', invitationExpiresAt: NOW - 1 },
        NOW
      )
    ).toBe('Rechazada');
  });
});

describe('formatMemberName', () => {
  it('marks only a revoked Membresía', () => {
    expect(formatMemberName({ name: 'Ana Pérez', status: 'revoked' })).toBe(
      'Ana Pérez (revocada)'
    );
    expect(formatMemberName({ name: 'Ana Pérez', status: 'withdrawn' })).toBe(
      'Ana Pérez'
    );
  });
});

describe('validateWith', () => {
  it('accepts what the backend schema decodes and answers the message otherwise', () => {
    const validateEmail = validateWith(
      MembershipsShared.InviteMembershipDto.fields.email,
      'Escribe un correo válido.'
    );

    expect(validateEmail({ value: ' ana@example.org ' })).toBeUndefined();
    expect(validateEmail({ value: 'ana@example' })).toBe(
      'Escribe un correo válido.'
    );
  });

  it('rejects a blank Agrupación in a unit that uses them', () => {
    const validateGrouping = validateWith(
      ApartmentsShared.CreateApartmentDto.fields.grouping,
      'Escribe la Torre.'
    );

    expect(validateGrouping({ value: '3' })).toBeUndefined();
    expect(validateGrouping({ value: '   ' })).toBe('Escribe la Torre.');
  });
});
