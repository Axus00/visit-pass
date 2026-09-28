// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { toast } from '@repo/ui';

import { DownloadFileButton } from './download-file-button.components';

const FILE_URL = 'https://example.convex.cloud/api/storage/1';

function clickDownload() {
  render(
    <DownloadFileButton url={FILE_URL} fileName="r.xlsx">
      Descargar
    </DownloadFileButton>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Descargar' }));
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('DownloadFileButton', () => {
  it('saves the fetched file under its name from a same-origin blob', async () => {
    const blob = new Blob(['xlsx'], { type: 'application/octet-stream' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(blob));
    URL.createObjectURL = vi.fn(() => 'blob:http://localhost/report');
    URL.revokeObjectURL = vi.fn();
    const clicked: Array<{ href: string; download: string }> = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      clicked.push({ href: this.href, download: this.download });
    });

    clickDownload();

    await waitFor(() =>
      expect(clicked).toEqual([
        { href: 'blob:http://localhost/report', download: 'r.xlsx' },
      ])
    );
  });

  it('tells the user when the file cannot be fetched', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 404 })
    );
    const toastError = vi.spyOn(toast, 'error');

    clickDownload();

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        'No se pudo descargar el archivo.'
      )
    );
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Descargar' })
        .disabled
    ).toBe(false);
  });
});
