import { afterEach, describe, expect, it, vi } from 'vitest';

import * as VisitPass from '#modules/visit-pass';

import {
  buildPassShareText,
  describePassValidity,
  formatWeekdays,
  passImageFileName,
  sharePassLink,
} from './pass-share.utils';

describe('formatWeekdays', () => {
  it('names the usual schedules', () => {
    expect(formatWeekdays([1, 2, 3, 4, 5])).toBe('Lun a Vie');
    expect(formatWeekdays([0, 1, 2, 3, 4, 5, 6])).toBe('Todos los días');
    expect(formatWeekdays([6, 0])).toBe('Fines de semana');
  });

  it('lists other days Monday first, ignoring order and repeats', () => {
    expect(formatWeekdays([0, 5, 1, 1])).toBe('Lun, Vie, Dom');
  });
});

describe('describePassValidity', () => {
  it('shows a single day for Temporal and Evento', () => {
    expect(
      describePassValidity({
        type: 'event',
        startDate: '2026-10-03',
        endDate: '2026-10-03',
        weekdays: [0, 1, 2, 3, 4, 5, 6],
      })
    ).toBe(VisitPass.formatLocalDate('2026-10-03'));
  });

  it('adds the range and weekdays for Servicio', () => {
    expect(
      describePassValidity({
        type: 'service',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        weekdays: [1, 2, 3, 4, 5],
      })
    ).toBe(
      `${VisitPass.formatLocalDateRange('2026-10-01', '2026-10-31')} · Lun a Vie`
    );
  });
});

describe('buildPassShareText', () => {
  const url = 'https://visitpass.co/p/token';

  it('greets the Visitante by first name and carries the link inside the text', () => {
    const text = buildPassShareText({
      visitorName: '  Juan Carlos Pérez',
      residentialUnitName: 'Conjunto Los Pinos',
      apartmentLabel: 'Torre 2 - 402',
      validityLabel: '26 sep 2026',
      url,
    });

    expect(text).toMatch(/^Hola Juan, /);
    expect(text).toContain('Conjunto Los Pinos (Torre 2 - 402)');
    expect(text).toContain('documento de identidad');
    expect(text.endsWith(url)).toBe(true);
  });

  it('omits the Apartamento when the Membresía has none', () => {
    expect(
      buildPassShareText({
        visitorName: 'Ana',
        residentialUnitName: 'Edificio Central',
        apartmentLabel: undefined,
        validityLabel: 'hoy',
        url,
      })
    ).toContain('ingresar a Edificio Central: hoy');
  });
});

describe('passImageFileName', () => {
  it('slugs the Visitante name without accents', () => {
    expect(passImageFileName('María José Peña')).toBe(
      'pase-maria-jose-pena.png'
    );
    expect(passImageFileName('  ')).toBe('pase-visitante.png');
  });
});

describe('sharePassLink', () => {
  const text =
    'Hola Ana, te autoricé para ingresar a Edificio Central: hoy. Muestra este Pase en portería junto con tu documento de identidad: https://visitpass.co/p/a?b=1&c=2';

  const stubDevice = ({
    isTouchDevice,
    share = vi.fn(() => Promise.resolve()),
  }: {
    isTouchDevice: boolean;
    share?: (data: ShareData) => Promise<void>;
  }) => {
    const open = vi.fn();
    const canShare = vi.fn(() => true);
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: isTouchDevice }),
      open,
    });
    vi.stubGlobal('navigator', { canShare, share });

    return { open, canShare, share };
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shares only the text, which already carries the link once', async () => {
    const { canShare, share, open } = stubDevice({ isTouchDevice: true });

    await expect(sharePassLink(text)).resolves.toBe('shared');
    expect(canShare).toHaveBeenCalledWith({ text });
    expect(share).toHaveBeenCalledWith({ text });
    expect(open).not.toHaveBeenCalled();
  });

  it('reports a dismissed share sheet as cancelled', async () => {
    const { open } = stubDevice({
      isTouchDevice: true,
      share: () => Promise.reject(new DOMException('', 'AbortError')),
    });

    await expect(sharePassLink(text)).resolves.toBe('cancelled');
    expect(open).not.toHaveBeenCalled();
  });

  it('opens WhatsApp Web with the whole text off touch devices', async () => {
    const { open, share } = stubDevice({ isTouchDevice: false });

    await expect(sharePassLink(text)).resolves.toBe('whatsApp');
    expect(share).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledWith(
      expect.any(String),
      '_blank',
      'noopener,noreferrer'
    );
    const shareUrl = new URL(String(open.mock.calls[0]?.[0]));
    expect(shareUrl.origin).toBe('https://wa.me');
    expect(shareUrl.searchParams.get('text')).toBe(text);
  });
});
