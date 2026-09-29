// @vitest-environment jsdom
import type { ComponentType, ReactNode } from 'react';

import { QueryResult } from '@confect/react';
import { cleanup, render, screen, within } from '@testing-library/react';
import * as Predicate from 'effect/Predicate';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import refs from '@repo/backend/refs';

import { installFrontendStubs } from '#/test-harness';

import type * as VisitPass from '#modules/visit-pass';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';
import * as MembresiasRoute from '#routes/_authenticated/app/m/$membershipId/admin/membresias';

import { ScheduleShiftDialog } from './schedule-shift-dialog.components';

vi.mock('@confect/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@confect/react')>()),
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));
vi.mock('convex/react', () => ({ useConvexAuth: vi.fn() }));
vi.mock('@workos-inc/authkit-react', () => ({ useAuth: vi.fn() }));

const MEMBERSHIP = {
  membershipId: 'membership_admin',
  residentialUnitTimeZone: 'America/Bogota',
} as unknown as VisitPass.MembershipSummary;

const member = (fields: {
  _id: string;
  name: string;
  isAccountDeleted: boolean;
}) => ({
  ...fields,
  _creationTime: 1,
  email: `${fields._id}@example.org`,
  role: 'porter',
  status: 'active',
});

const DELETED_PORTER = member({
  _id: 'porter_deleted',
  name: 'Luis Borrado',
  isAccountDeleted: true,
});
const ACTIVE_PORTER = member({
  _id: 'porter_active',
  name: 'Marta Activa',
  isAccountDeleted: false,
});

function renderWithMembers(
  members: ReadonlyArray<ReturnType<typeof member>>,
  children: ReactNode
) {
  const stubs = installFrontendStubs();
  stubs.setQuery(
    refs.public.memberships.listForUnit,
    QueryResult.succeed(members) as never
  );

  render(
    <stubs.Wrapper>
      <MembershipRouteFeat.MembershipProvider
        membership={MEMBERSHIP}
        memberships={[MEMBERSHIP]}
        isSuperadmin={false}
      >
        {children}
      </MembershipRouteFeat.MembershipProvider>
    </stubs.Wrapper>
  );
}

const MembershipsPage = MembresiasRoute.Route.options
  .component as ComponentType;

const NO_PORTERS_MESSAGE = /No hay Porteros activos/;

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('a Membresía whose Usuario was deleted', () => {
  it('is flagged in Membresías and can still be revoked', () => {
    renderWithMembers([DELETED_PORTER, ACTIVE_PORTER], <MembershipsPage />);

    const deletedRow = screen.getByText('Luis Borrado').closest('li');
    const activeRow = screen.getByText('Marta Activa').closest('li');
    if (Predicate.isNull(deletedRow) || Predicate.isNull(activeRow))
      throw new Error('Expected both Membresía rows');

    expect(within(deletedRow).getByText('Usuario eliminado')).toBeDefined();
    expect(
      within(deletedRow).getByRole('button', { name: /Revocar/ })
    ).toBeDefined();
    expect(within(activeRow).queryByText('Usuario eliminado')).toBeNull();
  });

  it('is not offered as the Portero of a new Turno', () => {
    renderWithMembers(
      [DELETED_PORTER],
      <ScheduleShiftDialog open onOpenChange={() => undefined} />
    );

    expect(screen.getByText(NO_PORTERS_MESSAGE)).toBeDefined();
  });

  it('leaves the other active Porteros available', () => {
    renderWithMembers(
      [DELETED_PORTER, ACTIVE_PORTER],
      <ScheduleShiftDialog open onOpenChange={() => undefined} />
    );

    expect(screen.queryByText(NO_PORTERS_MESSAGE)).toBeNull();
  });
});
