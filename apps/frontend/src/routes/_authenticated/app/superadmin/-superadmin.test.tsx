// @vitest-environment jsdom
import type { ComponentType } from 'react';

import { QueryResult } from '@confect/react';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { cleanup, render, screen, within } from '@testing-library/react';
import * as Predicate from 'effect/Predicate';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import refs from '@repo/backend/refs';

import { installFrontendStubs } from '#/test-harness';

import * as SuperadminRoute from '#routes/_authenticated/app/superadmin';

vi.mock('@confect/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@confect/react')>()),
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));
vi.mock('convex/react', () => ({ useConvexAuth: vi.fn() }));
vi.mock('@workos-inc/authkit-react', () => ({ useAuth: vi.fn() }));

const SuperadminPage = SuperadminRoute.Route.options.component as ComponentType;

const administrator = (fields: {
  email: string;
  status: 'active' | 'pending';
  isAccountDeleted: boolean;
}) => fields;

const DELETED_ADMINISTRATOR = administrator({
  email: 'borrado@example.org',
  status: 'active',
  isAccountDeleted: true,
});
const PENDING_ADMINISTRATOR = administrator({
  email: 'pendiente@example.org',
  status: 'pending',
  isAccountDeleted: false,
});

const unitWith = (
  name: string,
  administrators: ReadonlyArray<ReturnType<typeof administrator>>
) => ({
  _id: `unit_${name}`,
  _creationTime: 1,
  name,
  city: 'Bogotá',
  apartmentCount: 0,
  administrators,
});

function renderSuperadminPage(
  units: ReadonlyArray<ReturnType<typeof unitWith>>
) {
  const stubs = installFrontendStubs();
  stubs.setQuery(
    refs.public.memberships.listMine,
    QueryResult.succeed({ isSuperadmin: true, memberships: [] }) as never
  );
  stubs.setQuery(
    refs.public.residentialUnits.listAll,
    QueryResult.succeed(units) as never
  );

  const rootRoute = createRootRoute({
    component: () => (
      <stubs.Wrapper>
        <SuperadminPage />
      </stubs.Wrapper>
    ),
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      createRoute({ getParentRoute: () => rootRoute, path: '/app' }),
    ]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  render(<RouterProvider router={router} />);
}

const administratorRow = (email: string) => {
  const row = screen.getByText(email).closest('li');
  if (Predicate.isNull(row)) throw new Error(`Expected a row for ${email}`);

  return row;
};

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

describe('an Administrador whose Usuario was deleted', () => {
  it('is flagged, still counts as Activo and cannot be withdrawn as an invitation', async () => {
    renderSuperadminPage([
      unitWith('Torres del Parque', [
        DELETED_ADMINISTRATOR,
        PENDING_ADMINISTRATOR,
      ]),
    ]);

    await screen.findByText(DELETED_ADMINISTRATOR.email);
    const deletedRow = administratorRow(DELETED_ADMINISTRATOR.email);
    expect(within(deletedRow).getByText('Usuario eliminado')).toBeDefined();
    expect(within(deletedRow).getByText('Activo')).toBeDefined();
    expect(
      within(deletedRow).queryByRole('button', { name: /Retirar invitación/ })
    ).toBeNull();

    const pendingRow = administratorRow(PENDING_ADMINISTRATOR.email);
    expect(within(pendingRow).queryByText('Usuario eliminado')).toBeNull();
    expect(
      within(pendingRow).getByRole('button', { name: /Retirar invitación/ })
    ).toBeDefined();

    expect(screen.getByText(/invita a otro Administrador/)).toBeDefined();
  });

  it('asks for no replacement while every Administrador still has a Usuario', async () => {
    renderSuperadminPage([
      unitWith('Torres del Parque', [PENDING_ADMINISTRATOR]),
    ]);

    await screen.findByText(PENDING_ADMINISTRATOR.email);
    expect(screen.queryByText('Usuario eliminado')).toBeNull();
    expect(screen.queryByText(/invita a otro Administrador/)).toBeNull();
  });
});
