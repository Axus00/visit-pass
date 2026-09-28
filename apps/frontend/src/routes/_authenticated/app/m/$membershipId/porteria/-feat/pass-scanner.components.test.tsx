// @vitest-environment jsdom
import { useState } from 'react';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PassScanner } from './pass-scanner.components';

/** Remounts the scanner on "Reintentar", as the Escanear page does. */
function ScannerWithRetry() {
  const [attempt, setAttempt] = useState(0);

  return (
    <PassScanner
      key={attempt}
      onCode={() => true}
      onRetry={() => setAttempt((current) => current + 1)}
    />
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('PassScanner', () => {
  it('reopens the camera when the Portero retries after a failure', async () => {
    const getUserMedia = vi.fn(() =>
      Promise.reject(new DOMException('', 'NotReadableError'))
    );
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });

    render(<ScannerWithRetry />);
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));

    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(
      await screen.findByRole('button', { name: 'Reintentar' })
    ).toBeDefined();
  });

  it('offers no retry when the camera permission is denied', async () => {
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: () =>
          Promise.reject(new DOMException('', 'NotAllowedError')),
      },
    });

    render(<ScannerWithRetry />);

    expect(
      await screen.findByText('Sin permiso para usar la cámara')
    ).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
  });
});
