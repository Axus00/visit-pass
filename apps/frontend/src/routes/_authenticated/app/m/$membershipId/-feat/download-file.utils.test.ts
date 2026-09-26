// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { downloadFile } from './download-file.utils';

describe('downloadFile', () => {
  afterEach(() => vi.restoreAllMocks());

  it('saves the fetched file under the given name from a same-origin blob', async () => {
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

    await downloadFile('https://example.convex.cloud/api/storage/1', 'r.xlsx');

    expect(clicked).toEqual([
      { href: 'blob:http://localhost/report', download: 'r.xlsx' },
    ]);
  });

  it('rejects when the file cannot be fetched', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 404 })
    );

    await expect(
      downloadFile('https://example.convex.cloud/api/storage/1', 'r.xlsx')
    ).rejects.toThrow('Download failed with 404');
  });
});
