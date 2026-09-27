// @vitest-environment jsdom
import type { ReactNode } from 'react';

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import * as Result from 'effect/Result';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { installFrontendStubs } from '#/test-harness';

import type * as VisitPass from '#modules/visit-pass';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';

import { AuthorizeVisitCard } from './authorize-visit-card.components';

vi.mock('@confect/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@confect/react')>()),
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));
vi.mock('convex/react', () => ({ useConvexAuth: vi.fn() }));
vi.mock('@workos-inc/authkit-react', () => ({ useAuth: vi.fn() }));

const MEMBERSHIP = {
  membershipId: 'membership_a',
  residentialUnitTimeZone: 'America/Bogota',
} as unknown as VisitPass.MembershipSummary;

function renderCard() {
  const stubs = installFrontendStubs();
  const onShared = vi.fn();
  const Wrapper = ({ children }: { children: ReactNode }) => (
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
  const view = render(<AuthorizeVisitCard onShared={onShared} />, {
    wrapper: Wrapper,
  });

  return {
    stubs,
    onShared,
    rerender: () => view.rerender(<AuthorizeVisitCard onShared={onShared} />),
  };
}

const typeButton = (name: RegExp) => screen.getByRole('button', { name });

afterEach(cleanup);

describe('AuthorizeVisitCard', () => {
  it('keeps the chosen type after "Limpiar" and a re-render', () => {
    const card = renderCard();

    fireEvent.click(typeButton(/Evento/));
    fireEvent.change(screen.getByLabelText(/Nombre del evento/), {
      target: { value: 'Cumpleaños' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
    card.rerender();

    expect(typeButton(/Evento/).getAttribute('aria-pressed')).toBe('true');
    expect(
      (screen.getByLabelText(/Nombre del evento/) as HTMLInputElement).value
    ).toBe('');
  });

  it('keeps the chosen type after creating an Autorización and a re-render', async () => {
    const card = renderCard();
    card.stubs.mutation.mockResolvedValue(
      Result.succeed({ passes: [{ token: 'token_a', visitorName: 'Ana' }] })
    );

    fireEvent.click(typeButton(/Evento/));
    fireEvent.change(screen.getByLabelText(/^Visitante 1/), {
      target: { value: 'Ana' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Crear Autorización' }));

    await waitFor(() => expect(card.onShared).toHaveBeenCalledOnce());
    card.rerender();

    expect(typeButton(/Evento/).getAttribute('aria-pressed')).toBe('true');
    expect(
      (screen.getByLabelText(/^Visitante 1/) as HTMLInputElement).value
    ).toBe('');
  });
});
