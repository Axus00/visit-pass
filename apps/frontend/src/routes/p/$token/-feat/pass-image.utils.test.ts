import { afterEach, describe, expect, it, vi } from 'vitest';

import { savePassImage } from './pass-image.utils';

describe('savePassImage', () => {
  const stubDevice = ({
    isTouchDevice,
    share = vi.fn(() => Promise.resolve()),
  }: {
    isTouchDevice: boolean;
    share?: (data: ShareData) => Promise<void>;
  }) => {
    const anchor = { href: '', download: '', click: vi.fn() };
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        fillRect: vi.fn(),
        fillText: vi.fn(),
        drawImage: vi.fn(),
      }),
      toDataURL: () => 'data:image/png;base64,iVBORw0KGgo=',
    };
    vi.stubGlobal('document', {
      createElement: (tag: string) => (tag === 'canvas' ? canvas : anchor),
    });
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: isTouchDevice }),
      setTimeout: vi.fn(),
    });
    vi.stubGlobal('navigator', { canShare: vi.fn(() => true), share });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pase');

    return { anchor, share };
  };

  const savePass = () =>
    savePassImage({
      qrCanvas: {} as HTMLCanvasElement,
      residentialUnitName: 'Edificio Central',
      visitorName: 'Ana Gómez',
      validityLabel: 'hoy',
    });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('offers the share sheet on touch devices', async () => {
    const { anchor, share } = stubDevice({ isTouchDevice: true });

    await expect(savePass()).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ files: [expect.any(File)] })
    );
    expect(anchor.click).not.toHaveBeenCalled();
  });

  it('downloads the image off touch devices even when they can share files', async () => {
    const { anchor, share } = stubDevice({ isTouchDevice: false });

    await expect(savePass()).resolves.toBe('downloaded');
    expect(share).not.toHaveBeenCalled();
    expect(anchor.download).toBe('pase-ana-gomez.png');
    expect(anchor.click).toHaveBeenCalledOnce();
  });

  it('downloads the image when the share sheet fails', async () => {
    const { anchor } = stubDevice({
      isTouchDevice: true,
      share: () => Promise.reject(new DOMException('', 'NotAllowedError')),
    });

    await expect(savePass()).resolves.toBe('downloaded');
    expect(anchor.click).toHaveBeenCalledOnce();
  });

  it('reports a dismissed share sheet as cancelled without downloading', async () => {
    const { anchor } = stubDevice({
      isTouchDevice: true,
      share: () => Promise.reject(new DOMException('', 'AbortError')),
    });

    await expect(savePass()).resolves.toBe('cancelled');
    expect(anchor.click).not.toHaveBeenCalled();
  });
});
