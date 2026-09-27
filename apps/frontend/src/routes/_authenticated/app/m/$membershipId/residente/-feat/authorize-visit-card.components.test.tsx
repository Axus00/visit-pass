// @vitest-environment jsdom
import type { ReactNode } from 'react';

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

const dateInput = (label: RegExp) =>
  screen.getByLabelText(label) as HTMLInputElement;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

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

  describe('when the Autorización fails after saving the Favorito', () => {
    const FAVORITE_ID = 'favorite_a';
    const CREATED = Result.succeed({
      passes: [{ token: 'token_a', visitorName: 'Ana' }],
    });
    const FAILED = Result.fail({ _tag: 'Memberships/AccessDeniedError' });

    const submitWithFavorite = async (card: ReturnType<typeof renderCard>) => {
      fireEvent.change(screen.getByLabelText(/Nombre del Visitante/), {
        target: { value: 'Ana' },
      });
      fireEvent.click(
        screen.getByRole('switch', { name: 'Guardar como Favorito' })
      );
      card.stubs.mutation
        .mockResolvedValueOnce(Result.succeed(FAVORITE_ID))
        .mockResolvedValueOnce(FAILED);
      fireEvent.click(
        screen.getByRole('button', { name: 'Crear Autorización' })
      );
      await waitFor(() => expect(card.stubs.mutation).toHaveBeenCalledTimes(2));
    };

    const retry = () =>
      fireEvent.click(
        screen.getByRole('button', { name: 'Crear Autorización' })
      );

    it('links the same Favorito on retry', async () => {
      const card = renderCard();
      await submitWithFavorite(card);

      card.stubs.mutation.mockResolvedValueOnce(CREATED);
      retry();

      await waitFor(() => expect(card.onShared).toHaveBeenCalledOnce());
      expect(card.stubs.mutation).toHaveBeenCalledTimes(3);
      expect(card.stubs.mutation).toHaveBeenLastCalledWith(
        expect.objectContaining({
          visitors: [expect.objectContaining({ favoriteId: FAVORITE_ID })],
        })
      );
    });

    it('saves a new Favorito when the Parentesco changed', async () => {
      const card = renderCard();
      await submitWithFavorite(card);

      fireEvent.click(screen.getByRole('combobox', { name: 'Parentesco' }));
      const friend = await screen.findByRole('option', { name: 'Amigo' });
      // Base UI commits a mouse selection only after a pointerdown on the item.
      fireEvent.pointerDown(friend, { pointerType: 'mouse' });
      fireEvent.click(friend);
      card.stubs.mutation
        .mockResolvedValueOnce(Result.succeed('favorite_b'))
        .mockResolvedValueOnce(CREATED);
      retry();

      await waitFor(() => expect(card.onShared).toHaveBeenCalledOnce());
      expect(card.stubs.mutation).toHaveBeenCalledTimes(4);
      expect(card.stubs.mutation).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ visitorName: 'Ana', relationship: 'friend' })
      );
      expect(card.stubs.mutation).toHaveBeenLastCalledWith(
        expect.objectContaining({
          visitors: [expect.objectContaining({ favoriteId: 'favorite_b' })],
        })
      );
    });
  });

  describe('when the page stays open past midnight', () => {
    // 23:59:30 on 27 September in Bogotá (UTC-5).
    const ALMOST_MIDNIGHT = Date.UTC(2026, 8, 28, 4, 59, 30);

    const passMidnight = () =>
      act(() => {
        vi.advanceTimersByTime(60_000);
      });

    it('moves the untouched dates to the new day', () => {
      vi.useFakeTimers({ now: ALMOST_MIDNIGHT });
      renderCard();
      fireEvent.change(screen.getByLabelText(/Nombre del Visitante/), {
        target: { value: 'Ana' },
      });
      fireEvent.click(typeButton(/Servicio/));

      passMidnight();

      expect(dateInput(/Fecha de inicio/).value).toBe('2026-09-28');
      expect(dateInput(/Fecha de inicio/).min).toBe('2026-09-28');
      expect(dateInput(/Fecha final/).value).toBe('2026-10-28');
      expect(dateInput(/Fecha final/).min).toBe('2026-09-28');
    });

    it('keeps a date the Residente chose', () => {
      vi.useFakeTimers({ now: ALMOST_MIDNIGHT });
      renderCard();
      fireEvent.change(dateInput(/^Fecha/), {
        target: { value: '2026-10-02' },
      });

      passMidnight();

      expect(dateInput(/^Fecha/).value).toBe('2026-10-02');
    });
  });
});
