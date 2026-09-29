// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Button, toast } from '@repo/ui';

import { ConfirmActionDialog } from './confirm-action-dialog.components';

const DESKTOP_WIDTH = 1280;
const MOBILE_WIDTH = 390;

function setViewportWidth(width: number) {
  vi.stubGlobal('innerWidth', width);
}

function renderDialog(onConfirm: () => Promise<boolean>) {
  render(
    <ConfirmActionDialog
      trigger={<Button />}
      triggerContent="Terminar turno"
      title="¿Terminar tu Turno?"
      description="Se marcará la hora de fin."
      confirmLabel="Confirmar"
      onConfirm={onConfirm}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Terminar turno' }));
}

const confirmButton = () => screen.getByRole('button', { name: 'Confirmar' });

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
  setViewportWidth(DESKTOP_WIDTH);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ConfirmActionDialog', () => {
  it('asks in a bottom sheet on mobile and an alert dialog elsewhere', () => {
    renderDialog(() => Promise.resolve(true));
    expect(
      screen.getByRole('alertdialog', { name: '¿Terminar tu Turno?' })
    ).toBeTruthy();
    cleanup();

    setViewportWidth(MOBILE_WIDTH);
    renderDialog(() => Promise.resolve(true));
    expect(
      screen.getByRole('dialog', { name: '¿Terminar tu Turno?' })
    ).toBeTruthy();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('disables the confirm button while the action runs, then closes', async () => {
    const hasFinished = Deferred.makeUnsafe<boolean>();
    renderDialog(() => Effect.runPromise(Deferred.await(hasFinished)));

    fireEvent.click(confirmButton());
    await waitFor(() =>
      expect(confirmButton()).toHaveProperty('disabled', true)
    );

    Deferred.doneUnsafe(hasFinished, Effect.succeed(true));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  });

  it('stays open when the action reports it did not finish', async () => {
    renderDialog(() => Promise.resolve(false));

    fireEvent.click(confirmButton());

    await waitFor(() =>
      expect(confirmButton()).toHaveProperty('disabled', false)
    );
    expect(screen.getByRole('alertdialog')).toBeTruthy();
  });

  it('toasts a rejected action and stays open so it can be retried', async () => {
    const toastError = vi.spyOn(toast, 'error');
    setViewportWidth(MOBILE_WIDTH);
    renderDialog(() =>
      Promise.reject({
        _tag: 'ShiftReports/ShiftReportNotAllowedError',
        reason: 'noRecipients',
      })
    );

    fireEvent.click(confirmButton());

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        'La unidad no tiene Administradores activos con correo; genera el Excel para descargarlo.'
      )
    );
    expect(confirmButton()).toHaveProperty('disabled', false);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
