import { describe, expect, it } from 'vitest';

import { describeBackendError } from './backend-errors.utils';

describe('describeBackendError', () => {
  it('names the Apartamento limit the unit reached', () => {
    expect(
      describeBackendError({
        _tag: 'ResidentialUnits/ApartmentLimitReachedError',
        limit: 2000,
      })
    ).toBe('La unidad alcanzó el máximo de 2000 Apartamentos.');
  });

  it('names the Favoritos limit the Residente reached', () => {
    expect(
      describeBackendError({
        _tag: 'Authorizations/FavoriteLimitReachedError',
        limit: 200,
      })
    ).toBe(
      'Llegaste al máximo de 200 Favoritos; elimina alguno para guardar otro.'
    );
  });

  it('asks to cancel a Turno when the unit has too many scheduled', () => {
    expect(
      describeBackendError({
        _tag: 'Shifts/InvalidShiftScheduleError',
        reason: 'tooManyScheduled',
      })
    ).toBe(
      'La unidad ya tiene el máximo de Turnos programados; cancela alguno antes de programar otro.'
    );
  });

  it('describes a reason before its tag', () => {
    expect(
      describeBackendError({
        _tag: 'Memberships/InvalidMembershipError',
        reason: 'invalidEmail',
      })
    ).toBe('El correo no es válido.');
  });

  it('falls back for an unknown error', () => {
    expect(describeBackendError(new Error('boom'))).toBe(
      'Algo salió mal. Inténtalo de nuevo.'
    );
  });
});
