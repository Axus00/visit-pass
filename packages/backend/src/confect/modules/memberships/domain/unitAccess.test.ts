import { describe, expect, it } from 'vitest';

import { planUnitAccess } from './unitAccess';

const activeAccess = (roleSlugs: ReadonlyArray<string>) =>
  ({ id: 'om_1', status: 'active', roleSlugs }) as const;

describe('planUnitAccess', () => {
  it('grants the union of Roles to someone WorkOS does not know in the unit', () => {
    expect(
      planUnitAccess({
        current: null,
        roles: ['resident', 'administrator'],
        hasPendingInvitation: false,
      })
    ).toEqual({ type: 'grant', roleSlugs: ['administrador', 'residente'] });
  });

  it('keeps access that already mirrors the Roles, in any order', () => {
    expect(
      planUnitAccess({
        current: activeAccess(['residente', 'administrador']),
        roles: ['administrator', 'resident'],
        hasPendingInvitation: false,
      })
    ).toEqual({ type: 'keep' });
  });

  it('grants again when a Rol was added, dropped or the access is inactive', () => {
    const grantPortero = { type: 'grant', roleSlugs: ['portero'] };

    expect(
      planUnitAccess({
        current: activeAccess(['residente']),
        roles: ['gatekeeper'],
        hasPendingInvitation: false,
      })
    ).toEqual(grantPortero);
    expect(
      planUnitAccess({
        current: { id: 'om_1', status: 'inactive', roleSlugs: ['portero'] },
        roles: ['gatekeeper'],
        hasPendingInvitation: false,
      })
    ).toEqual(grantPortero);
  });

  it('withdraws access once no Membresía is active', () => {
    expect(
      planUnitAccess({
        current: activeAccess(['residente']),
        roles: [],
        hasPendingInvitation: false,
      })
    ).toEqual({ type: 'withdraw', externalMembershipId: 'om_1' });
  });

  it('leaves the access WorkOS gave through its link while an Invitación awaits an answer', () => {
    expect(
      planUnitAccess({
        current: activeAccess(['member']),
        roles: [],
        hasPendingInvitation: true,
      })
    ).toEqual({ type: 'keep' });
  });

  it('never creates access for someone who has not accepted', () => {
    expect(
      planUnitAccess({ current: null, roles: [], hasPendingInvitation: true })
    ).toEqual({ type: 'keep' });
  });
});
