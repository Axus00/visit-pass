// @vitest-environment jsdom
import { QueryResult } from '@confect/react';
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import * as Result from 'effect/Result';
import { afterEach, describe, expect, it, vi } from 'vitest';

import refs from '@repo/backend/refs';

import { installFrontendStubs } from '#/test-harness';

import type * as VisitPass from '#modules/visit-pass';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';
import * as EscanearRoute from '#routes/_authenticated/app/m/$membershipId/porteria/escanear';
import * as RegistroRoute from '#routes/_authenticated/app/m/$membershipId/porteria/registro';

vi.mock('@confect/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@confect/react')>()),
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));
vi.mock('convex/react', () => ({ useConvexAuth: vi.fn() }));
vi.mock('@workos-inc/authkit-react', () => ({ useAuth: vi.fn() }));

const MEMBERSHIP = {
  membershipId: 'membership_porter',
  residentialUnitTimeZone: 'America/Bogota',
} as unknown as VisitPass.MembershipSummary;

const TOKEN = 'rejectedPassToken_0123456789';

const APARTMENT = {
  _id: 'apartment_402',
  tower: '2',
  number: '402',
  label: 'Torre 2 · 402',
  activeResidentCount: 1,
};

const REJECTED_PASS = {
  outcome: 'rejected',
  reason: 'expired',
  pass: {
    passId: 'pass_1',
    visitorName: 'Ana Gómez',
    visitorDocument: '52123456',
    apartmentId: APARTMENT._id,
    entryCount: 0,
    type: 'service',
    startDate: '2026-09-01',
    endDate: '2026-09-20',
    weekdays: [1, 2, 3, 4, 5],
    apartmentLabel: APARTMENT.label,
  },
};

const HOME_PATH = '/app/m/$membershipId/porteria';
const SCAN_PATH = '/app/m/$membershipId/porteria/escanear';
const MANUAL_ENTRY_PATH = '/app/m/$membershipId/porteria/registro';

/**
 * Escanear and Registro manual under a memory history, as the app mounts them,
 * beside a placeholder Portería home they return to.
 */
function renderPorteria(initialPath: string) {
  const stubs = installFrontendStubs();
  // jsdom has no scrolling; the router scrolls to the top on every navigation.
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  stubs.setQuery(
    refs.public.visits.resolvePass,
    QueryResult.succeed(REJECTED_PASS) as never
  );
  stubs.setQuery(
    refs.public.residentialUnits.listApartments,
    QueryResult.succeed([APARTMENT]) as never
  );

  const rootRoute = createRootRoute({
    component: () => (
      <stubs.Wrapper>
        <MembershipRouteFeat.MembershipProvider
          membership={MEMBERSHIP}
          memberships={[MEMBERSHIP]}
          isSuperadmin={false}
        >
          <Outlet />
        </MembershipRouteFeat.MembershipProvider>
      </stubs.Wrapper>
    ),
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      createRoute({
        getParentRoute: () => rootRoute,
        path: HOME_PATH,
        component: () => <p>Inicio de Portería</p>,
      }),
      createRoute({
        getParentRoute: () => rootRoute,
        path: SCAN_PATH,
        component: EscanearRoute.Route.options.component,
      }),
      createRoute({
        getParentRoute: () => rootRoute,
        path: MANUAL_ENTRY_PATH,
        component: RegistroRoute.Route.options.component,
      }),
    ]),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });

  render(<RouterProvider router={router} />);

  return { router, stubs };
}

const nameInput = () =>
  screen.getByLabelText(/Nombre completo/) as HTMLInputElement;
const documentInput = () =>
  screen.getByLabelText(/Documento de identidad/) as HTMLInputElement;

/** Verifies the rejected Pase in Escanear and admits it through Registro manual. */
async function openPrefilledManualEntry() {
  fireEvent.change(
    await screen.findByLabelText('Ingresa o pega el código del Pase'),
    { target: { value: TOKEN } }
  );
  fireEvent.click(screen.getByRole('button', { name: 'Verificar Pase' }));
  fireEvent.click(
    await screen.findByRole('button', {
      name: /Registrar como ingreso manual/,
    })
  );

  await waitFor(() => expect(nameInput().value).toBe('Ana Gómez'));
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Escanear → Registro manual', () => {
  it('prefills a rejected Pase without putting the Visitante or token in the URL', async () => {
    const { router } = renderPorteria(
      '/app/m/membership_porter/porteria/escanear'
    );

    await openPrefilledManualEntry();
    expect(documentInput().value).toBe('52123456');
    expect(
      (screen.getByLabelText(/Apartamento destino/) as HTMLInputElement).value
    ).toBe('Torre 2 · 402');
    expect(screen.getByText(/Ingreso forzado/)).toBeDefined();

    const { href } = router.state.location;
    expect(href).toBe('/app/m/membership_porter/porteria/registro');
    for (const personalData of ['Ana', '52123456', TOKEN])
      expect(href).not.toContain(personalData);
  });

  it('opens a blank Registro manual when there is no prefill in history state', async () => {
    renderPorteria('/app/m/membership_porter/porteria/registro');

    expect(
      ((await screen.findByLabelText(/Nombre completo/)) as HTMLInputElement)
        .value
    ).toBe('');
    expect(documentInput().value).toBe('');
    expect(screen.getByText('Sin Autorización previa')).toBeDefined();
  });

  it('clears the prefilled Visitante when the Portero opens the plain Registro manual', async () => {
    const { router } = renderPorteria(
      '/app/m/membership_porter/porteria/registro'
    );

    await act(() =>
      router.navigate({
        to: MANUAL_ENTRY_PATH,
        params: { membershipId: 'membership_porter' },
        state: {
          manualEntryPrefill: {
            token: TOKEN,
            visitorName: 'Ana Gómez',
            visitorDocument: '52123456',
            apartmentId: REJECTED_PASS.pass.apartmentId,
            type: 'service',
            reason: 'expired',
          } as never,
        },
      })
    );
    await waitFor(() => expect(nameInput().value).toBe('Ana Gómez'));

    await act(() =>
      router.navigate({
        to: MANUAL_ENTRY_PATH,
        params: { membershipId: 'membership_porter' },
      })
    );

    await waitFor(() => expect(nameInput().value).toBe(''));
    expect(screen.getByText('Sin Autorización previa')).toBeDefined();
  });

  it.each([
    {
      exit: 'registering the Ingreso',
      leave: (stubs: ReturnType<typeof renderPorteria>['stubs']) => {
        stubs.mutation.mockResolvedValue(Result.succeed(null));
        fireEvent.click(
          screen.getByRole('button', { name: /Registrar ingreso/ })
        );
      },
    },
    {
      exit: 'cancelling',
      leave: () => {
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      },
    },
  ])(
    'does not reopen the prefilled Visitante on Back after $exit',
    async ({ leave }) => {
      const { router, stubs } = renderPorteria(
        '/app/m/membership_porter/porteria/escanear'
      );
      await openPrefilledManualEntry();

      leave(stubs);
      expect(await screen.findByText('Inicio de Portería')).toBeDefined();

      act(() => router.history.back());

      await waitFor(() =>
        expect(router.state.location.pathname).toBe(
          '/app/m/membership_porter/porteria/escanear'
        )
      );
      expect(screen.queryByLabelText(/Nombre completo/)).toBeNull();
    }
  );
});
