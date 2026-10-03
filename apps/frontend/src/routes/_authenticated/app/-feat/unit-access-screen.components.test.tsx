// @vitest-environment jsdom
import { QueryResult } from '@confect/react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import * as Predicate from 'effect/Predicate';
import * as Result from 'effect/Result';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import refs from '@repo/backend/refs';

import { type FrontendStubs, installFrontendStubs } from '#/test-harness';

import { UnitAccessScreen } from './unit-access-screen.components';
import type { MyAccess } from './unit-access.models';

vi.mock('@confect/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@confect/react')>()),
  useAction: vi.fn(),
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));
vi.mock('convex/react', () => ({ useConvexAuth: vi.fn() }));
vi.mock('@workos-inc/authkit-react', () => ({ useAuth: vi.fn() }));

const NOW = Date.UTC(2026, 0, 15);
const DAY_MS = 24 * 60 * 60 * 1000;

type AccessibleUnit = MyAccess['units'][number];
type PendingInvitation = MyAccess['pendingInvitations'][number];

const unit = (
  name: string,
  roles: ReadonlyArray<AccessibleUnit['memberships'][number]['role']>
) =>
  ({
    residentialUnit: {
      _id: `unit_${name}`,
      _creationTime: 0,
      name,
      slug: name.toLowerCase(),
      groupingWord: 'torre',
      externalOrganizationId: `org_${name}`,
    },
    memberships: roles.map((role) => ({
      _id: `membership_${name}_${role}`,
      role,
      apartment: role === 'resident' ? { grouping: '3', number: '501' } : null,
    })),
  }) as unknown as AccessibleUnit;

const invitation = (invitationExpiresAt: number) =>
  ({
    _id: 'membership_invited',
    role: 'resident',
    apartment: { grouping: '3', number: '501' },
    residentialUnit: { name: 'Altos', groupingWord: 'torre' },
    invitationExpiresAt,
  }) as unknown as PendingInvitation;

const setAccess = (stubs: FrontendStubs, access: Partial<MyAccess> | null) => {
  const value = Predicate.isNull(access)
    ? null
    : {
        email: 'ana@example.org',
        units: [],
        pendingInvitations: [],
        ...access,
      };

  stubs.setQuery(
    refs.public.memberships.myAccess,
    QueryResult.succeed(value) as never
  );
};

let stubs: FrontendStubs;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'], now: NOW });
  stubs = installFrontendStubs();
  stubs.signIn({ userId: 'user_a' });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const renderScreen = () =>
  render(<UnitAccessScreen />, { wrapper: stubs.Wrapper });

describe('UnitAccessScreen', () => {
  it('waits while the account is not yet synced', () => {
    setAccess(stubs, null);

    renderScreen();

    expect(screen.getByText('Sincronizando tu cuenta…')).toBeDefined();
  });

  it("shows the session's email when the Usuario has no Unidades residenciales", () => {
    setAccess(stubs, {});

    renderScreen();

    expect(screen.getByText('Sin Unidades residenciales')).toBeDefined();
    expect(screen.getByText('ana@example.org')).toBeDefined();
    expect(stubs.action).not.toHaveBeenCalled();
  });

  it('offers an Invitación instead of the empty screen and accepts it', async () => {
    setAccess(stubs, { pendingInvitations: [invitation(NOW + DAY_MS)] });
    stubs.mutation.mockResolvedValue(Result.succeed(null));

    renderScreen();

    expect(screen.queryByText('Sin Unidades residenciales')).toBeNull();
    expect(
      screen.getByText(
        'Te invitaron a Altos como Residente · Torre 3 · Apto 501'
      )
    ).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }));

    await waitFor(() => {
      expect(stubs.mutation).toHaveBeenCalledWith({
        membershipId: 'membership_invited',
      });
    });
  });

  it('shows an expired Invitación as Caducada with no way to accept it', () => {
    setAccess(stubs, { pendingInvitations: [invitation(NOW - DAY_MS)] });

    renderScreen();

    expect(screen.getByText('Caducada')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Aceptar' })).toBeNull();
    expect(screen.getByRole('button', { name: 'No soy yo' })).toBeDefined();
  });

  it('enters the only unit once, syncing access before switching the session', async () => {
    const calls: string[] = [];
    setAccess(stubs, { units: [unit('Altos', ['gatekeeper'])] });
    stubs.action.mockImplementation(async () => {
      calls.push('ensureUnitAccess');
      return Result.succeed('org_Altos');
    });
    stubs.switchToOrganization.mockImplementation(async () => {
      calls.push('switchToOrganization');
    });

    renderScreen();

    await waitFor(() => {
      expect(stubs.switchToOrganization).toHaveBeenCalledWith({
        organizationId: 'org_Altos',
      });
    });
    expect(calls).toEqual(['ensureUnitAccess', 'switchToOrganization']);
    expect(stubs.action).toHaveBeenCalledWith(
      refs.public.memberships.ensureUnitAccess,
      { residentialUnitId: 'unit_Altos' }
    );
  });

  it('keeps the session where it is when access to the unit cannot be synced', async () => {
    setAccess(stubs, { units: [unit('Altos', ['gatekeeper'])] });
    stubs.action.mockResolvedValue(
      Result.fail({ _tag: 'Memberships/MembershipRequiredError' })
    );

    renderScreen();

    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeDefined();
    expect(stubs.action).toHaveBeenCalledTimes(1);
    expect(stubs.switchToOrganization).not.toHaveBeenCalled();
  });

  it('lets a Usuario with several units choose instead of entering one for them', async () => {
    setAccess(stubs, {
      units: [unit('Altos', ['gatekeeper']), unit('Bosque', ['resident'])],
    });
    stubs.action.mockResolvedValue(Result.succeed('org_Bosque'));

    renderScreen();

    expect(stubs.action).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole('button', { name: 'Entrar' })[1]!);

    await waitFor(() => {
      expect(stubs.switchToOrganization).toHaveBeenCalledWith({
        organizationId: 'org_Bosque',
      });
    });
  });

  it('shows only the Roles of a member who is not Administrador of the active unit', () => {
    stubs.signIn({ userId: 'user_a', organizationId: 'org_Altos' });
    setAccess(stubs, { units: [unit('Altos', ['resident'])] });

    renderScreen();

    expect(screen.getByRole('heading', { name: 'Altos' })).toBeDefined();
    expect(screen.getByText('Residente · Torre 3 · Apto 501')).toBeDefined();
    expect(screen.queryByRole('tab', { name: 'Membresías' })).toBeNull();
    expect(stubs.action).not.toHaveBeenCalled();
  });

  it('gives the Administrador of the active unit the Membresías and Apartamentos tabs', () => {
    stubs.signIn({ userId: 'user_a', organizationId: 'org_Altos' });
    setAccess(stubs, { units: [unit('Altos', ['administrator'])] });

    renderScreen();

    expect(screen.getByRole('tab', { name: 'Membresías' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Apartamentos' })).toBeDefined();
  });
});
